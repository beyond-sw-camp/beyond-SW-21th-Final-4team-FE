<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  Check,
  X,
  FileText,
  Link as LinkIcon,
  AlertCircle,
  Sparkles,
  Send,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import { useJobStore } from '@/stores/jobStore';
import { useFreelancerStore } from '@/stores/freelancerStore';
import type { Application, ApplicationStatus } from '@/types';
import { getFreelancerProfilePreview } from '@/api/profilePreviewApi';
import FreelancerProfilePreviewModal from '@/components/profile/FreelancerProfilePreviewModal.vue';
import ProfileIdentityAvatar from '@/components/profile/ProfileIdentityAvatar.vue';

const authStore = useAuthStore();
const router = useRouter();
const jobStore = useJobStore();
const freelancerStore = useFreelancerStore();
const isFreelancerProfileOpen = ref(false);
const isFreelancerProfileLoading = ref(false);
const freelancerProfile = ref({
  name: '정보 없음',
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
  educations: [] as Array<Record<string, string | null>>,
  careers: [] as Array<Record<string, string | null>>,
  certifications: [] as Array<Record<string, string | null>>,
  portfolioUrl: null as string | null,
  portfolioFileName: null as string | null,
  portfolioLastUpdated: null as string | null,
});

onMounted(async () => {
  const [jobsResult, proposalsResult, applicationsResult] = await Promise.allSettled([
    jobStore.fetchJobPostings(),
    freelancerStore.fetchEmployerProposals(),
    jobStore.fetchEmployerApplications(),
  ]);

  if (jobsResult.status === 'rejected') {
    console.error('Failed to load employer jobs for applications view:', jobsResult.reason);
    window.alert('공고 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (proposalsResult.status === 'rejected') {
    console.error('Failed to load employer proposals:', proposalsResult.reason);
    window.alert('보낸 제안 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (applicationsResult.status === 'rejected') {
    console.error('Failed to load employer applications:', applicationsResult.reason);
    window.alert('지원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
});

const currentUser = computed(() => authStore.user);
const myJobs = computed(() => jobStore.myJobs);

const sortByCreatedAtDesc = <T extends { id: string; createdAt: Date | string }>(items: T[]) => {
  const latestById = new Map<string, T>();

  items.forEach((item) => {
    const existing = latestById.get(item.id);
    if (!existing || new Date(item.createdAt).getTime() >= new Date(existing.createdAt).getTime()) {
      latestById.set(item.id, item);
    }
  });

  return Array.from(latestById.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
};

const myReceivedApplications = computed(() =>
  sortByCreatedAtDesc(
    jobStore.applications.filter((app) => myJobs.value.some((job) => job.id === app.jobId)),
  ),
);

const mySentProposals = computed(() => {
  if (!currentUser.value) return [];

  return sortByCreatedAtDesc(freelancerStore.proposals);
});

const statusConfig: Record<ApplicationStatus, { icon: any; label: string; gradient: string }> = {
  PENDING: {
    icon: Clock,
    label: '검토중',
    gradient: 'from-sky-200 to-cyan-200',
  },
  ACCEPTED: {
    icon: CheckCircle,
    label: '수락됨',
    gradient: 'from-green-200 to-emerald-200',
  },
  REJECTED: {
    icon: XCircle,
    label: '거절됨',
    gradient: 'from-rose-200 to-red-200',
  },
};

const getJobTitle = (jobId?: string) => {
  if (!jobId) return '프로젝트 정보 없음';
  return jobStore.getJobById(jobId)?.title || '프로젝트 정보 없음';
};

const handleAccept = async (app: Application) => {
  if (!confirm(`${app.freelancerName}님의 지원을 수락하시겠습니까?`)) return;

  try {
    const roomId = await jobStore.updateApplicationStatus(app.id, 'ACCEPTED');
    if (roomId) {
      const shouldMove = confirm('채팅방이 생성되었습니다. 이동하겠습니까?');
      if (shouldMove) {
        router.push('/chat');
      }
    }
    alert('지원이 수락되었습니다!');
  } catch (error: any) {
    console.error('Failed to accept application:', error);
    alert(error?.response?.data?.message || error?.message || '지원 수락에 실패했습니다.');
  }
};

const handleReject = (app: Application) => {
  const jobTitle = getJobTitle(app.jobId);
  router.push({
    name: 'employer.applications.reject',
    params: { applicationId: app.id },
    query: {
      jobId: app.jobId,
      title: jobTitle,
      freelancerId: app.freelancerId,
      freelancerName: app.freelancerName,
    },
  });
};

const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('ko-KR');

const openFreelancerProfile = async (freelancerId: string | number) => {
  isFreelancerProfileOpen.value = true;
  isFreelancerProfileLoading.value = true;

  try {
    const preview = await getFreelancerProfilePreview(freelancerId);
    freelancerProfile.value = {
      name: preview.name || '정보 없음',
      avatarUrl: preview.avatarUrl,
      job: preview.job,
      careerYears: preview.careerYears,
      wage: preview.wage,
      grade: preview.grade,
      introduction: preview.introduction,
      skills: preview.skills ?? [],
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
    console.error('Failed to load freelancer preview:', error);
    isFreelancerProfileOpen.value = false;
    freelancerProfile.value = {
      name: '정보 없음',
      avatarUrl: null,
      job: null,
      careerYears: null,
      wage: null,
      grade: null,
      introduction: null,
      skills: [],
      phone: null,
      email: null,
      address: null,
      educations: [],
      careers: [],
      certifications: [],
      portfolioUrl: null,
      portfolioFileName: null,
      portfolioLastUpdated: null,
    };
    window.alert('프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  } finally {
    isFreelancerProfileLoading.value = false;
  }
};
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-white">
    <div class="mb-12">
      <h1 class="mb-3 text-4xl font-bold tracking-tight text-white">
        지원/제안 관리
      </h1>
      <p class="text-white/70">내가 보낸 제안과 내 공고에 들어온 지원서를 함께 관리하세요</p>
    </div>

    <div
      v-if="mySentProposals.length === 0 && myReceivedApplications.length === 0"
      class="rounded-3xl border border-white/10 bg-slate-900/75 p-16 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
    >
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
        <AlertCircle class="h-10 w-10 text-white/60" />
      </div>
      <h3 class="mb-3 text-2xl font-semibold text-white">아직 보낸 제안과 받은 지원서가 없습니다</h3>
      <p class="text-white/70">프리랜서에게 제안을 보내거나 공고를 등록해보세요</p>
    </div>

    <div v-else class="space-y-8">
      <section class="rounded-3xl border border-white/10 bg-slate-900/75 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div class="mb-6 flex items-center gap-2">
          <Send class="h-5 w-5 text-purple-300" />
          <h2 class="text-2xl font-bold">내가 보낸 제안</h2>
        </div>

        <div v-if="freelancerStore.isFetchingProposals" class="py-10 text-center text-white/50">
          제안 목록을 불러오는 중입니다.
        </div>

        <div
          v-else-if="freelancerStore.proposalFetchError"
          class="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200"
        >
          {{ freelancerStore.proposalFetchError }}
        </div>

        <div class="space-y-4">
          <div v-if="!freelancerStore.isFetchingProposals && mySentProposals.length === 0" class="py-10 text-center text-white/50">
            아직 보낸 제안이 없습니다.
          </div>

          <article
            v-for="proposal in mySentProposals"
            :key="proposal.id"
            class="rounded-2xl border border-white/10 bg-slate-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
          >
            <div class="mb-5 flex flex-col items-start justify-between gap-6 lg:flex-row">
              <div class="flex-1">
                <div class="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 class="text-2xl font-bold text-white">{{ proposal.freelancerName }}</h3>
                  <div
                    class="flex items-center gap-2 self-start rounded-full bg-gradient-to-r px-4 py-2 text-sm font-medium text-slate-900 shadow-sm sm:self-auto"
                    :class="statusConfig[proposal.status].gradient"
                  >
                    <component :is="statusConfig[proposal.status].icon" class="h-4 w-4" />
                    {{ statusConfig[proposal.status].label }}
                  </div>
                </div>
                <div class="mb-2 flex items-center gap-2 text-white/80">
                  <Sparkles class="h-4 w-4" />
                  <span>{{ formatDate(proposal.createdAt) }} 제안 발송</span>
                </div>
                <div v-if="proposal.jobId" class="text-sm text-white/85">
                  제안 프로젝트: {{ getJobTitle(proposal.jobId) }}
                </div>
              </div>
            </div>

            <div class="mb-4">
              <div class="mb-2 text-sm text-white/80">제안 메시지</div>
              <div class="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/95">
                {{ proposal.message }}
              </div>
            </div>

            <div class="mb-4">
              <button
                type="button"
                class="flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300"
                @click="openFreelancerProfile(proposal.freelancerId)"
              >
                프로필 보기
              </button>
            </div>

            <div
              v-if="proposal.status === 'ACCEPTED'"
              class="flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4"
            >
              <CheckCircle class="h-5 w-5 text-green-600" />
              <span class="font-semibold text-slate-900">
                프리랜서가 제안을 수락했습니다. 계약 진행을 시작해 주세요.
              </span>
            </div>

            <div
              v-if="proposal.status === 'REJECTED'"
              class="rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
            >
                <div class="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <AlertCircle class="h-5 w-5 text-red-500" />
                  프리랜서가 제안을 거절했습니다.
                </div>
                <div v-if="proposal.rejectionReason" class="text-sm text-slate-700">
                  사유: {{ proposal.rejectionReason }}
                </div>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-slate-900/75 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div class="mb-6 flex items-center gap-2">
          <Inbox class="h-5 w-5 text-blue-300" />
          <h2 class="text-2xl font-bold">내가 받은 지원서</h2>
        </div>

        <div v-if="jobStore.isFetchingApplications" class="py-10 text-center text-white/50">
          지원 목록을 불러오는 중입니다.
        </div>

        <div
          v-else-if="jobStore.applicationFetchError"
          class="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200"
        >
          {{ jobStore.applicationFetchError }}
        </div>

        <div v-else-if="myReceivedApplications.length === 0" class="py-10 text-center text-white/50">
          아직 받은 지원서가 없습니다.
        </div>

        <div v-else class="space-y-4">
          <article
            v-for="app in myReceivedApplications"
            :key="app.id"
            class="rounded-2xl border border-white/10 bg-slate-800/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
          >
            <div class="mb-5 flex flex-col items-start justify-between gap-6 lg:flex-row">
              <div class="flex-1">
                <div class="mb-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex items-center gap-4">
                    <ProfileIdentityAvatar
                      :label="app.freelancerName"
                      variant="freelancer"
                      shape="circle"
                      size-class="h-14 w-14"
                      text-class="text-xl font-bold"
                      ring-class="shadow-lg"
                    />
                    <div>
                      <div class="text-2xl font-bold text-white">{{ app.freelancerName }}</div>
                      <div class="mb-2 flex items-center gap-2 text-white/80">
                        <Sparkles class="h-4 w-4 text-yellow-400" />
                        <span>{{ formatDate(app.createdAt) }} 지원</span>
                      </div>
                      <div class="text-sm text-white/85">
                        지원 공고: {{ getJobTitle(app.jobId) }}
                      </div>
                    </div>
                  </div>

                  <div v-if="app.status === 'PENDING'" class="flex gap-2 self-start sm:self-auto">
                    <button
                      @click="handleAccept(app)"
                      class="flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-2.5 font-medium text-white transition-all hover:shadow-lg"
                    >
                      <Check class="h-4 w-4" />
                      수락
                    </button>
                    <button
                      @click="handleReject(app)"
                      class="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 font-medium text-white transition-all hover:shadow-lg"
                    >
                      <X class="h-4 w-4" />
                      거절
                    </button>
                  </div>
                  <div
                    v-else
                    class="flex items-center gap-2 self-start rounded-full border bg-gradient-to-r px-4 py-2 text-sm font-medium text-slate-900 shadow-sm sm:self-auto"
                    :class="app.status === 'ACCEPTED'
                      ? 'border-green-300/60 from-green-200 to-emerald-200'
                      : 'border-red-300/60 from-rose-200 to-red-200'"
                  >
                    <component :is="app.status === 'ACCEPTED' ? CheckCircle : XCircle" class="h-4 w-4" />
                    {{ app.status === 'ACCEPTED' ? '수락됨' : '거절됨' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <div class="mb-2 text-sm text-white/80">지원 메시지</div>
              <div class="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/95">
                {{ app.message }}
              </div>
            </div>

            <div class="mb-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                class="flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300"
                @click="openFreelancerProfile(app.freelancerId)"
              >
                프로필 보기
              </button>

              <a
                v-if="app.portfolioUrl"
                :href="app.portfolioUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                <LinkIcon class="h-4 w-4" />
                포트폴리오 보기
              </a>
              <a
                v-if="app.resumeUrl"
                :href="app.resumeUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 text-sm font-medium text-purple-400 hover:text-purple-300"
              >
                <FileText class="h-4 w-4" />
                이력서 보기
              </a>
            </div>

            <div
              v-if="app.status === 'REJECTED'"
              class="rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
            >
              <div class="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                <AlertCircle class="h-5 w-5 text-red-500" />
                프리랜서 지원서를 거절했습니다.
              </div>
              <div v-if="app.rejectionReason" class="text-sm text-slate-700">
                사유: {{ app.rejectionReason }}
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
    <FreelancerProfilePreviewModal
      :is-open="isFreelancerProfileOpen"
      :is-loading="isFreelancerProfileLoading"
      :profile="freelancerProfile"
      @close="isFreelancerProfileOpen = false"
    />
  </div>
</template>
