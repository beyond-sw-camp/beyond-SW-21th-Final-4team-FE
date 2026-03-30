<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Crown, Lock, Send, Star, TrendingUp } from "lucide-vue-next";
import { getEmployerSubscription } from "@/api/MyPage/accountApi";
import { getFreelancerProfilePreview } from "@/api/profilePreviewApi";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useFreelancerStore } from "@/stores/freelancerStore";
import { useJobStore } from "@/stores/jobStore";
import { useAlertStore } from "@/stores/alertStore";
import { normalizeEmployerPlan } from "@/utils/employerSubscription";
import type { JobPosting, User } from "@/types";
import ProposalModal from "./components/ProposalModal.vue";
import FreelancerProfilePreviewModal from "@/components/profile/FreelancerProfilePreviewModal.vue";

const freelancerStore = useFreelancerStore();
const favoritesStore = useFavoritesStore();
const jobStore = useJobStore();
const alertStore = useAlertStore();
const router = useRouter();

const selectedFreelancer = ref<User | null>(null);
const isFreelancerProfileOpen = ref(false);
const isFreelancerProfileLoading = ref(false);
const lastFreelancerProfileRequestId = ref(0);
const freelancerProfile = ref({
  name: "",
  avatarUrl: null as string | null,
  job: null as string | null,
  careerYears: null as number | null,
  wage: null as number | null,
  grade: null as string | null,
  introduction: null as string | null,
  skills: [] as string[],
  phone: null as string | null,
  email: null as string | null,
  address: null as string | null,
  educations: [] as Array<{
    schoolType?: string | null;
    schoolName?: string | null;
    major?: string | null;
    status?: string | null;
    entranceDate?: string | null;
    graduationDate?: string | null;
  }>,
  careers: [] as Array<{
    companyName?: string | null;
    department?: string | null;
    position?: string | null;
    jobType?: string | null;
    employmentType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
  }>,
  certifications: [] as Array<{
    name?: string | null;
    issuer?: string | null;
    acquisitionDate?: string | null;
  }>,
  portfolioUrl: null as string | null,
  portfolioFileName: null as string | null,
  portfolioLastUpdated: null as string | null,
});
const selectedJobId = ref("");
const recommendationRequestId = ref(0);
const planLoading = ref(true);
const initLoading = ref(false);
const isJobSelectionLoading = ref(false);
const planFetchError = ref<string | null>(null);

let activeRecommendationController: AbortController | null = null;

type PlanType = "FREE" | "PRO" | "PRIME";

const currentPlan = ref<PlanType>("FREE");

const formatSkills = (skills?: string[]) => skills?.slice(0, 4) || [];

const isFavorite = (id: string | number) =>
  favoritesStore.favoriteIds.includes(String(id));

const toggleFavorite = (id: string | number) =>
  favoritesStore.toggleFavorite(String(id));

const seedFreelancerProfile = (freelancer: User) => ({
  name: freelancer.name,
  avatarUrl: null,
  job: null,
  careerYears: freelancer.experience ?? null,
  wage: freelancer.monthlySalary ?? null,
  grade: null,
  introduction: freelancer.bio ?? null,
  skills: freelancer.skills ?? [],
  phone: null,
  email: null,
  address: null,
  educations: [],
  careers: [],
  certifications: [],
  portfolioUrl: null,
  portfolioFileName: null,
  portfolioLastUpdated: null,
});

const openFreelancerProfile = async (freelancer: User) => {
  const requestId = ++lastFreelancerProfileRequestId.value;
  freelancerProfile.value = seedFreelancerProfile(freelancer);
  isFreelancerProfileOpen.value = true;
  isFreelancerProfileLoading.value = true;

  try {
    const preview = await getFreelancerProfilePreview(freelancer.id);
    if (requestId !== lastFreelancerProfileRequestId.value) {
      return;
    }
    freelancerProfile.value = {
      name: preview.name ?? freelancer.name,
      avatarUrl: preview.avatarUrl ?? null,
      job: preview.job ?? null,
      careerYears: preview.careerYears ?? freelancer.experience ?? null,
      wage: preview.wage ?? freelancer.monthlySalary ?? null,
      grade: preview.grade ?? null,
      introduction: preview.introduction ?? freelancer.bio ?? null,
      skills: preview.skills ?? freelancer.skills ?? [],
      phone: preview.phone,
      email: preview.email,
      address: preview.address,
      educations: preview.educations ?? [],
      careers: preview.careers ?? [],
      certifications: preview.certifications ?? [],
      portfolioUrl: preview.portfolioFileUrl,
      portfolioFileName: preview.portfolioFileName,
      portfolioLastUpdated: preview.portfolioLastUpdated,
    };
  } catch (error) {
    if (requestId !== lastFreelancerProfileRequestId.value) {
      return;
    }
    console.error("Failed to load recommended freelancer profile preview:", error);
    alertStore.open({
      message: "프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      type: "error",
    });
  } finally {
    if (requestId === lastFreelancerProfileRequestId.value) {
      isFreelancerProfileLoading.value = false;
    }
  }
};

const hasAccess = computed(
  () => !planLoading.value && ["PRO", "PRIME"].includes(currentPlan.value),
);

const employerJobs = computed(() => jobStore.myJobs);
const recommendableEmployerJobs = computed(() =>
  employerJobs.value.filter((job) => {
    if (job.status === "CLOSED" || job.status === "CONTRACTED") {
      return false;
    }

    if (
      typeof job.headcount === "number" &&
      typeof job.matchedHeadcount === "number" &&
      job.headcount > 0 &&
      job.matchedHeadcount >= job.headcount
    ) {
      return false;
    }

    return true;
  }),
);

const selectedJob = computed<JobPosting | null>(
  () =>
    recommendableEmployerJobs.value.find((job) => job.id === selectedJobId.value) ??
    null,
);

const isJobSelectDisabled = computed(
  () => initLoading.value || isJobSelectionLoading.value,
);

const showEmptyRecommendations = computed(
  () =>
    hasAccess.value &&
    !planLoading.value &&
    !initLoading.value &&
    !freelancerStore.isFetchingRecommended &&
    !freelancerStore.recommendedFetchError &&
    freelancerStore.freelancers.length === 0,
);

const fetchCurrentPlan = async () => {
  planLoading.value = true;
  planFetchError.value = null;

  try {
    const subscription = await getEmployerSubscription();
    currentPlan.value = normalizeEmployerPlan(subscription.currentPlan);
  } catch (error) {
    console.error("Failed to fetch employer plan:", error);
    planFetchError.value = "subscription_fetch_failed";
  } finally {
    planLoading.value = false;
  }
};

const ensureSelectedJob = (jobs: JobPosting[]) => {
  if (!jobs.some((job) => job.id === selectedJobId.value)) {
    selectedJobId.value = jobs[0]?.id ?? "";
  }
};

const parseSelectedJobId = (): number | string | null => {
  const rawJobId = selectedJobId.value.trim();
  if (!/^\d+$/.test(rawJobId)) {
    freelancerStore.freelancers = [];
    freelancerStore.recommendedFetchError =
      "유효한 프로젝트 공고를 선택해 주세요.";
    return null;
  }

  const numericJobId = Number(rawJobId);
  if (Number.isSafeInteger(numericJobId) && numericJobId > 0) {
    return numericJobId;
  }

  try {
    const bigIntJobId = BigInt(rawJobId);
    if (bigIntJobId > 0n) {
      return rawJobId;
    }
  } catch {
    // Fall through to the shared validation error below.
  }

  freelancerStore.freelancers = [];
  freelancerStore.recommendedFetchError =
    "유효하지 않은 프로젝트 공고 ID입니다.";
  return null;
};

const loadRecommendationForSelectedJob = async (requestId: number) => {
  const parsedJobId = parseSelectedJobId();
  if (parsedJobId === null) {
    console.warn("[employer-reco-view] invalid selected job id", {
      requestId,
      rawSelectedJobId: selectedJobId.value,
    });
    return;
  }

  activeRecommendationController?.abort();
  const controller = new AbortController();
  activeRecommendationController = controller;
  isJobSelectionLoading.value = true;
  console.info("[employer-reco-view] load recommendation", {
    requestId,
    jobId: String(parsedJobId),
  });

  try {
    await freelancerStore.fetchRecommendedFreelancers(
      parsedJobId,
      controller.signal,
    );
    console.info("[employer-reco-view] load completed", {
      requestId,
      jobId: String(parsedJobId),
      count: freelancerStore.freelancers.length,
      hasError: Boolean(freelancerStore.recommendedFetchError),
    });
  } finally {
    if (requestId === recommendationRequestId.value) {
      isJobSelectionLoading.value = false;
      if (activeRecommendationController === controller) {
        activeRecommendationController = null;
      }
    }
  }
};

const loadRecommendedFreelancers = async () => {
  initLoading.value = true;
  let jobs = recommendableEmployerJobs.value;
  const shouldRefreshJobs = true;
  console.info("[employer-reco-view] init load start", {
    currentJobCount: employerJobs.value.length,
    recommendableJobCount: jobs.length,
  });

  try {
    if (shouldRefreshJobs) {
      try {
        await jobStore.fetchJobPostings();
        jobs = recommendableEmployerJobs.value;
        console.info("[employer-reco-view] jobs fetched", {
          totalJobs: employerJobs.value.length,
          recommendableJobs: jobs.length,
        });
      } catch {
        console.error("[employer-reco-view] failed to fetch jobs", {
          message: jobStore.errorMessage,
        });
        freelancerStore.freelancers = [];
        freelancerStore.recommendedFetchError =
          jobStore.errorMessage || "프로젝트 공고를 불러오지 못했습니다.";
        return;
      }
    }

    if (!jobs.length) {
      console.warn("[employer-reco-view] no recommendable jobs");
      freelancerStore.freelancers = [];
      freelancerStore.recommendedFetchError =
        "등록된 프로젝트 공고가 없습니다. 공고를 먼저 등록해 주세요.";
      selectedJobId.value = "";
      freelancerStore.recommendedFetchError = null;
      return;
    }

    ensureSelectedJob(jobs);
    console.info("[employer-reco-view] selected job", {
      selectedJobId: selectedJobId.value,
      selectedJobTitle: selectedJob.value?.title,
    });
    recommendationRequestId.value += 1;
    await loadRecommendationForSelectedJob(recommendationRequestId.value);
  } finally {
    initLoading.value = false;
  }
};

const handleJobChange = async (event: Event) => {
  selectedJobId.value = (event.target as HTMLSelectElement).value;
  console.info("[employer-reco-view] job changed", {
    selectedJobId: selectedJobId.value,
  });
  recommendationRequestId.value += 1;
  await loadRecommendationForSelectedJob(recommendationRequestId.value);
};

const goToUpgrade = () => {
  router.push({ name: "employer.mypage", query: { tab: "account" } });
};

onMounted(async () => {
  await fetchCurrentPlan();
  console.info("[employer-reco-view] plan loaded", {
    plan: currentPlan.value,
    hasAccess: hasAccess.value,
    planFetchError: planFetchError.value,
  });

  if (planFetchError.value) {
    freelancerStore.freelancers = [];
    freelancerStore.recommendedFetchError =
      "구독 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return;
  }

  if (!hasAccess.value) {
    freelancerStore.recommendedFetchError = null;
    return;
  }

  await loadRecommendedFreelancers();
});

onBeforeUnmount(() => {
  activeRecommendationController?.abort();
});
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-8 text-white">
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-2">
        <TrendingUp class="w-6 h-6 text-[#2D5BFF]" />
        <h1 class="text-3xl font-bold">추천 프리랜서</h1>
      </div>
      <p class="text-white/60">AI가 분석한 최적의 프리랜서를 만나보세요.</p>
    </div>

    <div
      v-if="hasAccess && recommendableEmployerJobs.length"
      class="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold text-white">추천 기준 공고</p>
          <p class="text-xs text-white/50">
            공고를 바꾸면 해당 프로젝트 기준으로 추천 결과를 다시 불러옵니다.
          </p>
        </div>
        <div class="w-full md:w-[360px]">
          <select
            :value="selectedJobId"
            :disabled="isJobSelectDisabled"
            @change="handleJobChange"
            class="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#2D5BFF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option
              v-for="job in recommendableEmployerJobs"
              :key="job.id"
              :value="job.id"
            >
              {{ job.title }}
            </option>
          </select>
        </div>
      </div>
      <p v-if="selectedJob" class="mt-3 text-sm text-white/60">
        현재 선택: <span class="font-medium text-white">{{ selectedJob.title }}</span>
      </p>
    </div>

    <div v-if="planLoading || initLoading" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="n in 6"
        :key="n"
        class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 animate-pulse"
      >
        <div class="flex items-start gap-4 mb-4">
          <div class="w-16 h-16 rounded-full bg-white/10"></div>
          <div class="flex-1 space-y-2">
            <div class="h-6 bg-white/10 rounded w-3/4"></div>
            <div class="h-4 bg-white/10 rounded w-1/4"></div>
          </div>
        </div>
        <div class="space-y-2 mb-4">
          <div class="h-4 bg-white/10 rounded"></div>
          <div class="h-4 bg-white/10 rounded w-5/6"></div>
        </div>
        <div class="flex gap-2 mb-4">
          <div class="h-6 w-16 bg-white/10 rounded-full"></div>
          <div class="h-6 w-16 bg-white/10 rounded-full"></div>
        </div>
        <div class="pt-4 border-t border-white/10 flex justify-between items-center">
          <div class="h-4 w-24 bg-white/10 rounded"></div>
          <div class="flex gap-2">
            <div class="w-10 h-10 bg-white/10 rounded-lg"></div>
            <div class="w-24 h-10 bg-white/10 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="freelancerStore.recommendedFetchError"
      class="bg-red-500/5 backdrop-blur-sm rounded-xl border border-red-500/10 p-12 text-center"
    >
      <div
        class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4"
      >
        <TrendingUp class="w-8 h-8 text-red-400" />
      </div>
      <h3 class="text-xl font-semibold mb-2 text-red-200">
        추천을 불러오지 못했습니다.
      </h3>
      <p class="text-red-300/60">{{ freelancerStore.recommendedFetchError }}</p>
    </div>

    <div
      v-else-if="freelancerStore.isFetchingRecommended"
      class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 flex flex-col items-center justify-center text-center"
    >
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4 opacity-70"
      ></div>
      <h3 class="text-xl font-semibold mb-2 text-white/80">AI 분석 중...</h3>
      <p class="text-white/50">
        등록하신 프로젝트에 맞는 프리랜서를 찾고 있습니다.
      </p>
      <p class="mt-2 text-sm text-white/40">
        AI가 추천 프리랜서를 고르는 중입니다. 정확한 결과가 준비될 때까지 계속 기다려 주세요.
      </p>
    </div>

    <div
      v-else-if="showEmptyRecommendations"
      class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center"
    >
      <div
        class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4"
      >
        <TrendingUp class="w-8 h-8 text-white/70" />
      </div>
      <h3 class="text-xl font-semibold mb-2 text-white">
        현재 조건에 맞는 추천 프리랜서가 없습니다.
      </h3>
      <p class="text-white/60">
        공고 설명을 조금 더 구체적으로 작성하거나 기술 스택을 조정한 뒤 다시 확인해 보세요.
      </p>
    </div>

    <div v-else-if="hasAccess" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="freelancer in freelancerStore.freelancers"
        :key="freelancer.id"
        class="cursor-pointer bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:border-white/20 hover:bg-white/10 transition-all"
        role="button"
        tabindex="0"
        @click="openFreelancerProfile(freelancer)"
        @keyup.enter.self="openFreelancerProfile(freelancer)"
        @keyup.space.self.prevent="openFreelancerProfile(freelancer)"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0 }"
      >
        <div class="flex items-start gap-4 mb-4">
          <div
            class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
          >
            {{ freelancer.name[0] }}
          </div>
          <div class="flex-1">
            <div
              class="text-xl font-bold mb-1 hover:text-blue-400 transition-colors"
            >
              {{ freelancer.name }}
            </div>
            <p class="text-sm text-white/60">
              {{ freelancer.experience }}년 경력
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 mb-2">
          <div
            v-if="freelancer.matchScore !== undefined"
            class="px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1"
          >
            <TrendingUp class="w-3 h-3" />
            AI 적합도 {{ (freelancer.matchScore * 100).toFixed(0) }}%
          </div>
        </div>
        <p class="text-white/60 text-sm mb-4 line-clamp-2 h-10">
          {{ freelancer.bio }}
        </p>

        <div class="flex flex-wrap gap-2 mb-4 h-16 content-start">
          <span
            v-for="skill in formatSkills(freelancer.skills)"
            :key="skill"
            class="px-3 py-1 bg-[#2D5BFF]/10 text-[#2D5BFF] text-xs rounded-full border border-[#2D5BFF]/20"
          >
            {{ skill }}
          </span>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-white/10">
          <div class="text-sm">
            <span class="text-white/60">희망 급여 </span>
            <span
              class="font-medium text-white"
              v-if="freelancer.monthlySalary"
            >
              {{ freelancer.monthlySalary?.toLocaleString() }}원
            </span>
            <span class="font-medium text-white/50" v-else> 협의 필요 </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click.stop="toggleFavorite(freelancer.id)"
              class="px-3 py-2 rounded-lg border transition-all"
              :class="
                isFavorite(freelancer.id)
                  ? 'bg-yellow-400/20 border-yellow-400/40 text-yellow-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              "
            >
              <Star
                class="w-4 h-4"
                :class="
                  isFavorite(freelancer.id)
                    ? 'fill-yellow-400 text-yellow-400'
                    : ''
                "
              />
            </button>
            <button
              type="button"
              @click.stop="selectedFreelancer = freelancer"
              class="px-4 py-2 bg-[#2D5BFF] text-white rounded-lg hover:bg-[#2D5BFF]/90 hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Send class="w-4 h-4" />
              제안하기
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm"
    >
      <div
        class="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6"
      >
        <Lock class="w-10 h-10 text-slate-400" />
      </div>
      <h2 class="text-2xl font-bold mb-2 text-white">
        프로 플랜 이상 전용 서비스입니다
      </h2>
      <p class="text-slate-400 mb-8 max-w-md mx-auto">
        AI 기반 맞춤형 프리랜서 추천 기능은 프로 플랜 이상 구독자만 이용할 수
        있습니다. 지금 바로 업그레이드하고 최적의 인재를 만나보세요.
      </p>
      <button
        @click="goToUpgrade"
        class="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 group"
      >
        <Crown class="w-5 h-5 group-hover:text-yellow-300 transition-colors" />
        구독 플랜 업그레이드하기
      </button>
    </div>

    <ProposalModal
      v-if="selectedFreelancer"
      :freelancer="selectedFreelancer"
      @close="selectedFreelancer = null"
    />
    <FreelancerProfilePreviewModal
      :is-open="isFreelancerProfileOpen"
      :is-loading="isFreelancerProfileLoading"
      :profile="freelancerProfile"
      @close="isFreelancerProfileOpen = false"
    />
  </div>
</template>
