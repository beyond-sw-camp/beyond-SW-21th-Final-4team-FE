<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useMotion } from '@vueuse/motion';
import {
  Briefcase,
  Clock,
  DollarSign,
  Filter,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useJobStore } from '@/stores/jobStore';
import {
  getJobRecommendationsForFreelancer,
  type AiRecommendationResponseDTO,
} from '@/api/recommendationApi';
import type { JobPosting } from '@/types';
import JobDetailModal from './components/JobDetailModal.vue';

type RecommendedJob = JobPosting & {
  matchScore?: number;
  recommendationSource: 'ai' | 'fallback';
};

const jobStore = useJobStore();
const authStore = useAuthStore();
const selectedJob = ref<JobPosting | null>(null);
const searchTermInput = ref('');
const favoriteOnlyInput = ref(false);
const searchTerm = ref('');
const favoriteOnly = ref(false);
const aiRecommendationResults = ref<AiRecommendationResponseDTO[]>([]);
const isAiRecommendationLoading = ref(false);
const hasLoadedAiRecommendations = ref(false);
const aiRecommendationError = ref<string | null>(null);
let activeRecommendationController: AbortController | null = null;

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === 'AbortError' || error.name === 'CanceledError');

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as any).response?.data?.message === 'string'
  ) {
    return (error as any).response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'AI 추천 공고를 불러오지 못했습니다.';
};

const loadAiRecommendations = async () => {
  if (!authStore.user || authStore.user.role !== 'FREELANCER') {
    aiRecommendationResults.value = [];
    hasLoadedAiRecommendations.value = true;
    return;
  }

  activeRecommendationController?.abort();
  const controller = new AbortController();
  activeRecommendationController = controller;
  isAiRecommendationLoading.value = true;
  aiRecommendationError.value = null;

  try {
    aiRecommendationResults.value = await getJobRecommendationsForFreelancer(
      controller.signal,
    );
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }
    console.error('Failed to load AI job recommendations:', error);
    aiRecommendationResults.value = [];
    aiRecommendationError.value = getErrorMessage(error);
  } finally {
    if (activeRecommendationController === controller) {
      isAiRecommendationLoading.value = false;
      hasLoadedAiRecommendations.value = true;
      activeRecommendationController = null;
    }
  }
};

onMounted(async () => {
  const [jobsResult] = await Promise.allSettled([
    jobStore.fetchJobPostings(),
    loadAiRecommendations(),
  ]);

  if (jobsResult.status === 'rejected') {
    console.error('Failed to load freelancer job postings:', jobsResult.reason);
    window.alert('프로젝트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
});

onBeforeUnmount(() => {
  activeRecommendationController?.abort();
});

const openJobs = computed(() =>
  jobStore.jobPostings.filter((job) => job.status === 'OPEN')
);

const jobsById = computed(() => {
  const entries = jobStore.jobPostings.map((job) => [job.id, job] as const);
  return new Map(entries);
});

const fallbackRecommendedJobs = computed<RecommendedJob[]>(() => {
  const limit = authStore.user ? 5 : 3;
  if (!authStore.user || !authStore.user.skills?.length) {
    return openJobs.value.slice(0, limit).map((job) => ({
      ...job,
      recommendationSource: 'fallback',
    }));
  }

  const userSkills = authStore.user.skills.map((skill) => skill.toLowerCase());

  return openJobs.value
    .map((job) => {
      const matchCount = job.techStack.filter((tech) =>
        userSkills.some((skill) => tech.toLowerCase() === skill)
      ).length;

      return {
        ...job,
        matchCount,
        recommendationSource: 'fallback' as const,
      };
    })
    .filter((job) => job.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit);
});

const recommendedJobs = computed<RecommendedJob[]>(() => {
  if (!hasLoadedAiRecommendations.value && authStore.user?.role === 'FREELANCER') {
    return [];
  }

  const canUseAiResults =
    authStore.user?.role === 'FREELANCER' &&
    hasLoadedAiRecommendations.value &&
    !aiRecommendationError.value;

  if (canUseAiResults) {
    const aiRecommendedJobs = aiRecommendationResults.value
      .map((recommendation) => {
        const matchedJob = jobsById.value.get(String(recommendation.id));
        if (!matchedJob) {
          return null;
        }
      const fallbackDescription = `프로필과 잘 맞는 공고입니다. AI 매칭 점수 ${Math.round(
        (recommendation.matchScore ?? 0) * 100
      )}%.`;

      return {
        id: String(recommendation.id),
        employerId: matchedJob?.employerId ?? '',
        employerName: matchedJob?.employerName ?? '기업',
        title: matchedJob?.title ?? recommendation.nameOrTitle,
        description:
          recommendation.description ??
          matchedJob?.description ??
          fallbackDescription,
        techStack:
          recommendation.skills && recommendation.skills.length > 0
            ? recommendation.skills
            : matchedJob?.techStack ?? [],
        budget: recommendation.budget ?? matchedJob?.budget ?? 0,
        duration: recommendation.duration ?? matchedJob?.duration ?? 0,
        status: matchedJob?.status ?? 'OPEN',
        createdAt: matchedJob?.createdAt ?? new Date(),
        updatedAt: matchedJob?.updatedAt ?? new Date(),
        headcount: matchedJob?.headcount,
        matchedHeadcount: matchedJob?.matchedHeadcount,
        favorite: matchedJob?.favorite ?? false,
        matchScore: recommendation.matchScore,
        recommendationSource: 'ai',
      };
      })
      .filter((job): job is RecommendedJob => job !== null);

    if (aiRecommendedJobs.length > 0) {
      return aiRecommendedJobs;
    }
  }

  return fallbackRecommendedJobs.value;
});

const filteredJobs = computed(() =>
  openJobs.value.filter((job) => {
    const normalizedSearchTerm = searchTerm.value.toLowerCase();
    const matchesSearch =
      job.title.toLowerCase().includes(normalizedSearchTerm) ||
      job.description.toLowerCase().includes(normalizedSearchTerm) ||
      job.techStack.some((tech) =>
        tech.toLowerCase().includes(normalizedSearchTerm)
      );

    const matchesFavorite = !favoriteOnly.value || isFavorite(job.id);

    return matchesSearch && matchesFavorite;
  })
);

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('ko-KR');

const isFavorite = (id: string) => jobStore.isFavorite(id);

const toggleFavorite = async (id: string) => {
  try {
    await jobStore.toggleFavorite(id);
  } catch (error) {
    console.error('Failed to toggle favorite job posting:', error);
    window.alert(
      '즐겨찾기 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    );
  }
};

const applyFilters = () => {
  searchTerm.value = searchTermInput.value;
  favoriteOnly.value = favoriteOnlyInput.value;
};

const resetFilters = () => {
  searchTermInput.value = '';
  favoriteOnlyInput.value = false;
  searchTerm.value = '';
  favoriteOnly.value = false;
};
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-slate-900">
    <div
      class="mb-12"
      data-tour-freelancer="header"
      v-motion="{
        initial: { opacity: 0, y: 20 },
        enter: { opacity: 1, y: 0 }
      }"
    >
      <h1 class="mb-3 text-4xl font-bold tracking-tight text-slate-950">
        프로젝트
      </h1>
      <p class="text-slate-500">
        추천 공고와 전체 공고를 한 번에 확인하세요.
      </p>
    </div>

    <section class="mb-14" data-tour="freelancer.recommended">
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <Sparkles class="w-7 h-7 text-amber-400" />
            <h2 class="text-2xl font-bold text-slate-950">추천 공고</h2>
          </div>
          <p class="mt-2 text-sm text-slate-500">
            <span v-if="isAiRecommendationLoading">
              AI가 맞춤 공고를 분석 중입니다.
            </span>
            <span v-else-if="aiRecommendationError">
              AI 추천을 불러오지 못해 스킬 기반 추천을 표시합니다.
            </span>
            <span v-else>
              AI 추천 결과를 우선 표시합니다.
            </span>
          </p>
        </div>
      </div>

      <div
        v-if="isAiRecommendationLoading"
        class="fb-card p-10 text-center text-slate-500"
      >
        <div
          class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-sky-500"
        ></div>
        AI 추천 공고를 불러오는 중입니다.
      </div>

      <div
        v-else-if="recommendedJobs.length === 0"
        class="fb-card p-10 text-center text-slate-500"
      >
        추천 공고가 없습니다.
      </div>

      <div v-else class="grid gap-6">
        <div
          v-for="(job, index) in recommendedJobs"
          :key="`rec-${job.id}`"
          @click="selectedJob = job"
          class="fb-card cursor-pointer p-8 transition-all group hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: index * 50 } }"
        >
          <div class="flex items-start justify-between mb-6">
            <div class="flex-1">
              <div class="flex items-start gap-3 mb-3">
                <h3
                  class="flex-1 text-2xl font-semibold text-slate-950 transition-colors group-hover:text-sky-700"
                >
                  {{ job.title }}
                </h3>
                <div class="flex flex-col items-end gap-2">
                  <div
                    class="px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1"
                    :class="
                      job.recommendationSource === 'ai'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-sky-50 text-sky-600 border-sky-200'
                    "
                  >
                    <Sparkles
                      v-if="job.recommendationSource === 'ai'"
                      class="w-3 h-3"
                    />
                    <TrendingUp v-else class="w-3 h-3" />
                    {{ job.recommendationSource === 'ai' ? 'AI 추천' : '스킬 기반 추천' }}
                  </div>
                  <div
                    v-if="job.matchScore !== undefined"
                    class="flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-bold text-sky-600"
                  >
                    <TrendingUp class="w-3 h-3" />
                    AI 매칭 {{ ((job.matchScore ?? 0) * 100).toFixed(0) }}%
                  </div>
                </div>
              </div>

              <p class="mb-6 line-clamp-2 leading-relaxed text-slate-500">
                {{ job.description }}
              </p>

              <div class="flex flex-wrap gap-2 mb-6">
                <span
                  v-for="tech in job.techStack"
                  :key="tech"
                  class="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700"
                >
                  {{ tech }}
                </span>
              </div>

              <div class="flex flex-wrap gap-6 text-slate-500">
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-[#eefbf7]"
                  >
                    <DollarSign class="w-4 h-4 text-emerald-500" />
                  </div>
                  <span class="font-medium">
                    예산 {{ job.budget.toLocaleString() }}원
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f9fb]"
                  >
                    <Clock class="w-4 h-4 text-[#21AFBF]" />
                  </div>
                  <span class="font-medium">{{ job.duration }}개월</span>
                </div>
                <div class="flex items-center gap-2">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50"
                  >
                    <Briefcase class="w-4 h-4 text-violet-500" />
                  </div>
                  <span class="font-medium">{{ job.employerName }}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              class="ml-4 h-10 w-10 rounded-full border transition-all"
              :class="
                isFavorite(job.id)
                  ? 'border-amber-200 bg-amber-50 text-amber-500'
                  : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
              "
              @click.stop="toggleFavorite(job.id)"
            >
              <Star
                class="mx-auto h-5 w-5"
                :class="isFavorite(job.id) ? 'fill-yellow-400 text-yellow-400' : ''"
              />
            </button>
          </div>
        </div>
      </div>
    </section>

    <div
      class="mb-8"
      data-tour-freelancer="search"
      v-motion="{
        initial: { opacity: 0, y: 20 },
        enter: { opacity: 1, y: 0, transition: { delay: 100 } }
      }"
    >
      <div class="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
        <div class="relative">
          <Search
            class="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
          />
          <input
            v-model="searchTermInput"
            type="text"
            @keyup.enter="applyFilters"
            placeholder="프로젝트 제목, 설명, 기술 스택으로 검색하세요."
            class="fb-input w-full pl-14 pr-6 py-4"
          />
        </div>
        <label
          class="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        >
          <Filter class="h-4 w-4 text-slate-400" />
          <input
            v-model="favoriteOnlyInput"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 bg-transparent text-[#21AFBF]"
          />
          즐겨찾기만 보기
        </label>
        <button
          type="button"
          @click="applyFilters"
          class="fb-button-primary px-6 py-4"
        >
          검색
        </button>
        <button
          type="button"
          @click="resetFilters"
          class="fb-button-secondary px-6 py-4"
        >
          초기화
        </button>
      </div>
    </div>

    <div
      class="mb-8 flex items-center gap-6"
      data-tour-freelancer="stats"
      v-motion="{
        initial: { opacity: 0, y: 20 },
        enter: { opacity: 1, y: 0, transition: { delay: 200 } }
      }"
    >
      <div class="flex items-center gap-2 text-slate-500">
        <TrendingUp class="h-5 w-5 text-emerald-500" />
        <span class="font-medium">
          전체 <span class="text-slate-950">{{ filteredJobs.length }}</span>개 프로젝트
        </span>
      </div>
    </div>

    <div
      v-if="filteredJobs.length === 0"
      class="fb-card p-16 text-center"
      v-motion="{
        initial: { opacity: 0, scale: 0.95 },
        enter: { opacity: 1, scale: 1 }
      }"
    >
      <div
        class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e7f9fb]"
        v-motion="{
          initial: { scale: 0 },
          enter: { scale: 1, transition: { type: 'spring', delay: 200 } }
        }"
      >
        <Briefcase class="h-10 w-10 text-[#21AFBF]" />
      </div>
      <h3 class="mb-3 text-2xl font-semibold text-slate-950">
        조건에 맞는 프로젝트가 없습니다
      </h3>
      <p class="text-slate-500">
        검색 조건을 바꾸거나 필터를 초기화해 보세요.
      </p>
    </div>

    <div v-else class="grid gap-6" data-tour-freelancer="job-list">
      <div
        v-for="(job, index) in filteredJobs"
        :key="job.id"
        @click="selectedJob = job"
        class="fb-card cursor-pointer p-8 transition-all group hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
        v-motion="{
          initial: { opacity: 0, y: 20 },
          enter: { opacity: 1, y: 0, transition: { delay: index * 50 } }
        }"
      >
        <div class="flex items-start justify-between mb-6">
          <div class="flex-1">
            <div class="flex items-start gap-3 mb-3">
              <h3
                class="flex-1 text-2xl font-semibold text-slate-950 transition-colors group-hover:text-sky-700"
              >
                {{ job.title }}
              </h3>
              <div
                class="mt-1 transition-transform group-hover:rotate-180 group-hover:scale-125 duration-300"
              >
                <Sparkles class="w-6 h-6 text-yellow-400" />
              </div>
            </div>

            <p class="mb-6 line-clamp-2 leading-relaxed text-slate-500">
              {{ job.description }}
            </p>

            <div class="flex flex-wrap gap-2 mb-6">
              <span
                v-for="tech in job.techStack"
                :key="tech"
                class="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700"
              >
                {{ tech }}
              </span>
            </div>

            <div class="flex flex-wrap gap-6 text-slate-500">
              <div class="flex items-center gap-2">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-[#eefbf7]"
                >
                  <DollarSign class="w-4 h-4 text-emerald-500" />
                </div>
                <span class="font-medium">
                  예산 {{ job.budget.toLocaleString() }}원
                </span>
              </div>
              <div class="flex items-center gap-2">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f9fb]"
                >
                  <Clock class="w-4 h-4 text-[#21AFBF]" />
                </div>
                <span class="font-medium">{{ job.duration }}개월</span>
              </div>
              <div class="flex items-center gap-2">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50"
                >
                  <Briefcase class="w-4 h-4 text-violet-500" />
                </div>
                <span class="font-medium">{{ job.employerName }}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="ml-4 h-10 w-10 rounded-full border transition-all"
            :class="
              isFavorite(job.id)
                ? 'border-amber-200 bg-amber-50 text-amber-500'
                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
            "
            @click.stop="toggleFavorite(job.id)"
          >
            <Star
              class="mx-auto h-5 w-5"
              :class="isFavorite(job.id) ? 'fill-yellow-400 text-yellow-400' : ''"
            />
          </button>
        </div>

        <div class="flex items-center justify-between border-t border-slate-100 pt-6">
          <div class="text-sm text-slate-400">
            {{ formatDate(job.createdAt) }} 등록
          </div>
          <div
            class="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition-all group-hover:scale-105"
          >
            자세히 보기
          </div>
        </div>
      </div>
    </div>

    <JobDetailModal
      v-if="selectedJob"
      :job="selectedJob"
      @close="selectedJob = null"
    />
  </div>
</template>
