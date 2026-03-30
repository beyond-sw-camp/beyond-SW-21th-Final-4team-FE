<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import {
  FileText,
  AlertCircle,
  Check,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Send,
  Inbox,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import { useJobStore } from '@/stores/jobStore';
import { useFreelancerStore } from '@/stores/freelancerStore';
import type { ApplicationStatus } from '@/types';
import { getEmployerProfilePreview } from '@/api/profilePreviewApi';
import EmployerProfilePreviewModal from '@/components/profile/EmployerProfilePreviewModal.vue';

const authStore = useAuthStore();
const router = useRouter();
const jobStore = useJobStore();
const freelancerStore = useFreelancerStore();
const isEmployerProfileOpen = ref(false);
const isEmployerProfileLoading = ref(false);
const employerProfile = ref({
  companyName: '정보 없음',
  logoUrl: null as string | null,
  industry: null as string | null,
  scale: null as string | null,
  location: null as string | null,
  phone: null as string | null,
  website: null as string | null,
  description: null as string | null,
});

onMounted(async () => {
  const [jobsResult, proposalsResult, applicationsResult] = await Promise.allSettled([
    jobStore.fetchJobPostings(),
    freelancerStore.fetchFreelancerProposals(),
    jobStore.fetchFreelancerApplications(),
  ]);

  if (jobsResult.status === 'rejected') {
    console.error('Failed to load freelancer jobs for application history:', jobsResult.reason);
    window.alert('공고 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (proposalsResult.status === 'rejected') {
    console.error('Failed to load freelancer proposals:', proposalsResult.reason);
    window.alert('받은 제안 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (applicationsResult.status === 'rejected') {
    console.error('Failed to load freelancer applications:', applicationsResult.reason);
    window.alert('지원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
});

const currentUser = computed(() => authStore.user);

const myApplications = computed(() => {
  if (!currentUser.value) return [];
  return jobStore.applications;
});

const receivedProposals = computed(() => {
  if (!currentUser.value) return [];
  return freelancerStore.proposals;
});

const getJobTitle = (jobId: string) => {
  return jobStore.getJobById(jobId)?.title || '알 수 없음';
};

const statusConfig: Record<ApplicationStatus, { icon: any; label: string; gradient: string }> = {
  PENDING: {
    icon: Clock,
    label: '검토중',
    gradient: 'from-blue-500 to-cyan-500',
  },
  ACCEPTED: {
    icon: CheckCircle,
    label: '수락됨',
    gradient: 'from-green-500 to-emerald-500',
  },
  REJECTED: {
    icon: XCircle,
    label: '거절됨',
    gradient: 'from-red-500 to-red-600',
  },
};

const stats = computed(() => {
  const apps = myApplications.value;
  const proposals = receivedProposals.value;
  const combined = [...apps, ...proposals];

  return {
    proposalCount: proposals.length,
    applicationCount: apps.length,
    pending: combined.filter((item) => item.status === 'PENDING').length,
    accepted: combined.filter((item) => item.status === 'ACCEPTED').length,
    rejected: combined.filter((item) => item.status === 'REJECTED').length,
  };
});

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ko-KR');
};

const extractNumericId = (value?: string | number | null) => {
  if (value == null) return null;
  const matched = String(value).match(/(\d+)$/);
  return matched ? matched[1] : String(value);
};

const openEmployerProfile = async (employerId?: string | number | null) => {
  const resolvedEmployerId = extractNumericId(employerId);
  if (!resolvedEmployerId) return;

  isEmployerProfileOpen.value = true;
  isEmployerProfileLoading.value = true;

  try {
    const preview = await getEmployerProfilePreview(resolvedEmployerId);
    employerProfile.value = {
      companyName: preview.companyName || '정보 없음',
      logoUrl: preview.logoUrl,
      industry: preview.industry,
      scale: preview.scale,
      location: preview.location,
      phone: preview.phone,
      website: preview.websiteUrl,
      description: preview.description,
    };
  } catch (error) {
    console.error('Failed to load employer preview:', error);
  } finally {
    isEmployerProfileLoading.value = false;
  }
};

const actionFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const handleAcceptProposal = async (proposalId: string) => {
  if (!window.confirm('이 제안을 수락하시겠습니까?')) return;

  try {
    const roomId = await freelancerStore.updateProposalStatus(proposalId, 'ACCEPTED');
    if (!roomId) {
      actionFeedback.value = { type: 'error', message: '제안 상태 변경에 실패했습니다. 다시 시도해 주세요.' };
      alert('제안 상태 변경에 실패했습니다.');
      return;
    }

    const shouldMove = confirm('채팅방이 생성되었습니다. 이동하겠습니까?');
    if (shouldMove) {
      router.push('/chat');
    }
    actionFeedback.value = { type: 'success', message: '제안을 수락했습니다. 상태가 수락됨으로 변경되었습니다.' };
    alert('제안을 수락했습니다.');
  } catch (error: any) {
    console.error('Failed to accept proposal:', error);
    let errMsg = '제안 상태 변경에 실패했습니다. 다시 시도해 주세요.';
    if (error?.response?.data?.error?.message) {
      errMsg = error.response.data.error.message;
    } else if (error?.response?.data?.message) {
      errMsg = error.response.data.message;
    } else if (error instanceof Error && error.message) {
      errMsg = error.message;
    }
    actionFeedback.value = { type: 'error', message: errMsg };
    alert(errMsg);
  }
};

const handleRejectProposal = async (proposalId: string) => {
  if (!window.confirm('이 제안을 거절하시겠습니까?')) return;

  try {
    const updated = await freelancerStore.updateProposalStatus(proposalId, 'REJECTED');
    if (!updated) {
      actionFeedback.value = { type: 'error', message: '제안 상태 변경에 실패했습니다. 다시 시도해 주세요.' };
      alert('제안 상태 변경에 실패했습니다.');
      return;
    }

    actionFeedback.value = { type: 'success', message: '제안을 거절했습니다. 상태가 거절됨으로 변경되었습니다.' };
    alert('제안을 거절했습니다.');
  } catch (error: any) {
    console.error('Failed to reject proposal:', error);
    let errMsg = '제안 상태 변경에 실패했습니다. 다시 시도해 주세요.';
    if (error?.response?.data?.error?.message) {
      errMsg = error.response.data.error.message;
    } else if (error?.response?.data?.message) {
      errMsg = error.response.data.message;
    } else if (error instanceof Error && error.message) {
      errMsg = error.message;
    }
    actionFeedback.value = { type: 'error', message: errMsg };
    alert(errMsg);
  }
};
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-slate-900">
    <div
      class="mb-12"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <h1 class="mb-3 text-4xl font-bold tracking-tight text-slate-950">
        내 지원/제안
      </h1>
      <p class="text-slate-500">기업이 보낸 제안과 내가 보낸 지원서를 한눈에 확인하세요</p>
    </div>

    <div
      v-if="actionFeedback"
      class="mb-6 rounded-2xl border px-5 py-4 text-sm font-medium"
      :class="
        actionFeedback.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-rose-50 border-rose-200 text-rose-700'
      "
    >
      {{ actionFeedback.message }}
    </div>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div
        class="fb-card p-6 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
        v-motion
        :initial="{ opacity: 0, scale: 0.9 }"
        :enter="{ opacity: 1, scale: 1 }"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Inbox class="w-6 h-6 text-white" />
          </div>
          <div>
            <div class="text-sm text-slate-500">받은 제안</div>
            <div class="text-3xl font-bold text-slate-950">{{ stats.proposalCount }}</div>
          </div>
        </div>
      </div>

      <div
        class="fb-card p-6 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
        v-motion
        :initial="{ opacity: 0, scale: 0.9 }"
        :enter="{ opacity: 1, scale: 1, transition: { delay: 100 } }"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <Send class="w-6 h-6 text-white" />
          </div>
          <div>
            <div class="text-sm text-slate-500">보낸 지원</div>
            <div class="text-3xl font-bold text-slate-950">{{ stats.applicationCount }}</div>
          </div>
        </div>
      </div>

      <div
        class="fb-card p-6 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
        v-motion
        :initial="{ opacity: 0, scale: 0.9 }"
        :enter="{ opacity: 1, scale: 1, transition: { delay: 200 } }"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
            <Clock class="w-6 h-6 text-white" />
          </div>
          <div>
            <div class="text-sm text-slate-500">검토중</div>
            <div class="text-3xl font-bold text-slate-950">{{ stats.pending }}</div>
          </div>
        </div>
      </div>

      <div
        class="fb-card p-6 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
        v-motion
        :initial="{ opacity: 0, scale: 0.9 }"
        :enter="{ opacity: 1, scale: 1, transition: { delay: 300 } }"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <CheckCircle class="w-6 h-6 text-white" />
          </div>
          <div>
            <div class="text-sm text-slate-500">수락</div>
            <div class="text-3xl font-bold text-slate-950">{{ stats.accepted }}</div>
          </div>
        </div>
      </div>

      <div
        class="fb-card p-6 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
        v-motion
        :initial="{ opacity: 0, scale: 0.9 }"
        :enter="{ opacity: 1, scale: 1, transition: { delay: 400 } }"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg">
            <XCircle class="w-6 h-6 text-white" />
          </div>
          <div>
            <div class="text-sm text-slate-500">거절</div>
            <div class="text-3xl font-bold text-slate-950">{{ stats.rejected }}</div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="myApplications.length === 0 && receivedProposals.length === 0"
      class="fb-card p-16 text-center"
      v-motion
      :initial="{ opacity: 0, scale: 0.95 }"
      :enter="{ opacity: 1, scale: 1 }"
    >
      <div
        class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e7f9fb]"
        v-motion
        :initial="{ scale: 0 }"
        :enter="{ scale: 1, transition: { type: 'spring', delay: 200 } }"
      >
        <FileText class="h-10 w-10 text-[#21AFBF]" />
      </div>
      <h3 class="mb-3 text-2xl font-semibold text-slate-950">아직 받은 제안과 보낸 지원서가 없습니다</h3>
      <p class="text-slate-500">공고에 지원하거나 기업 제안을 기다려보세요</p>
    </div>

    <div v-else class="grid gap-8">
      <div
        class="fb-card p-8"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0 }"
      >
        <div class="flex items-center gap-2 mb-6">
          <Inbox class="h-5 w-5 text-[#21AFBF]" />
          <h2 class="text-2xl font-bold text-slate-950">기업이 보낸 제안</h2>
        </div>

        <div v-if="freelancerStore.isFetchingProposals" class="py-10 text-center text-slate-400">
          제안 목록을 불러오는 중입니다.
        </div>

        <div
          v-else-if="freelancerStore.proposalFetchError"
          class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"
        >
          {{ freelancerStore.proposalFetchError }}
        </div>

        <div v-else-if="receivedProposals.length === 0" class="py-10 text-center text-slate-400">
          아직 받은 제안이 없습니다.
        </div>

        <div v-else class="space-y-4">
          <article
            v-for="proposal in receivedProposals"
            :key="proposal.id"
            class="fb-card-soft p-6"
          >
            <div class="mb-5 flex flex-col items-start justify-between gap-6 lg:flex-row">
              <div class="flex-1">
                <div class="mb-2 flex flex-wrap items-center gap-3">
                  <h3 class="text-2xl font-bold text-slate-950">{{ proposal.employerName }}</h3>
                  <div
                    class="flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2 text-sm font-medium text-white shadow-lg"
                    :class="statusConfig[proposal.status].gradient"
                  >
                    <component :is="statusConfig[proposal.status].icon" class="h-4 w-4" />
                    {{ statusConfig[proposal.status].label }}
                  </div>
                </div>
                <div class="mb-2 flex items-center gap-2 text-slate-500">
                  <Sparkles class="h-4 w-4 text-[#21AFBF]" />
                  <span>{{ formatDate(proposal.createdAt) }} 제안</span>
                </div>
                <div v-if="proposal.jobId" class="text-sm text-slate-600">
                  제안 프로젝트: {{ getJobTitle(proposal.jobId) }}
                </div>
              </div>
            </div>

            <div class="mb-4">
              <div class="mb-2 text-sm text-slate-500">제안 메시지</div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {{ proposal.message }}
              </div>
            </div>

            <div v-if="proposal.status === 'PENDING'" class="mb-4 flex flex-wrap gap-3">
              <button
                type="button"
                @click="handleAcceptProposal(proposal.id)"
                class="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:shadow-lg transition-all flex items-center gap-2 font-medium"
              >
                <Check class="w-4 h-4" />
                제안 수락
              </button>
              <button
                type="button"
                @click="handleRejectProposal(proposal.id)"
                class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:shadow-lg transition-all flex items-center gap-2 font-medium"
              >
                <X class="w-4 h-4" />
                제안 거절
              </button>
            </div>

            <div class="mb-4">
              <button
                type="button"
                class="flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
                @click="openEmployerProfile(proposal.employerId)"
              >
                프로필 보기
              </button>
            </div>

            <div
              v-if="proposal.status === 'ACCEPTED'"
              class="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <CheckCircle class="h-5 w-5 text-emerald-500" />
              <span class="font-medium text-emerald-700">
                제안이 수락되었습니다. 계약 진행 정보를 확인해주세요.
              </span>
            </div>

            <div
              v-if="proposal.status === 'REJECTED'"
              class="rounded-2xl border border-rose-200 bg-rose-50 p-4"
            >
              <div class="mb-2 flex items-center gap-2 font-medium text-rose-700">
                <AlertCircle class="h-4 w-4" />
                거절 사유
              </div>
              <div class="text-sm text-rose-600">
                {{ proposal.rejectionReason || '사유가 입력되지 않았습니다.' }}
              </div>
            </div>
          </article>
        </div>
      </div>

      <div
        class="fb-card p-8"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 100 } }"
      >
        <div class="flex items-center gap-2 mb-6">
          <Send class="h-5 w-5 text-violet-500" />
          <h2 class="text-2xl font-bold text-slate-950">내가 보낸 지원서</h2>
        </div>

        <div v-if="jobStore.isFetchingApplications" class="py-10 text-center text-slate-400">
          지원 목록을 불러오는 중입니다.
        </div>

        <div
          v-else-if="jobStore.applicationFetchError"
          class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"
        >
          {{ jobStore.applicationFetchError }}
        </div>

        <div v-else-if="myApplications.length === 0" class="py-10 text-center text-slate-400">
          아직 보낸 지원서가 없습니다.
        </div>

        <div v-else class="space-y-4">
          <article
            v-for="app in myApplications"
            :key="app.id"
            class="fb-card-soft p-6"
          >
            <div class="mb-5 flex flex-col items-start justify-between gap-6 lg:flex-row">
              <div class="flex-1">
                <div class="mb-2 flex flex-wrap items-center gap-3">
                  <h3 class="text-2xl font-bold text-slate-950">{{ getJobTitle(app.jobId) }}</h3>
                  <div
                    class="flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2 text-sm font-medium text-white shadow-lg"
                    :class="statusConfig[app.status].gradient"
                  >
                    <component :is="statusConfig[app.status].icon" class="h-4 w-4" />
                    {{ statusConfig[app.status].label }}
                  </div>
                </div>
                <div class="mb-2 flex items-center gap-2 text-slate-500">
                  <Sparkles class="h-4 w-4 text-[#21AFBF]" />
                  <span>{{ formatDate(app.createdAt) }} 지원</span>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <div class="mb-2 text-sm text-slate-500">지원 메시지</div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {{ app.message }}
              </div>
            </div>

            <div
              v-if="app.status === 'REJECTED' && app.rejectionReason"
              class="rounded-2xl border border-rose-200 bg-rose-50 p-4"
            >
              <div class="mb-2 flex items-center gap-2 font-medium text-rose-700">
                <AlertCircle class="h-4 w-4" />
                거절 사유
              </div>
              <div class="text-sm text-rose-600">
                {{ app.rejectionReason }}
              </div>
            </div>

            <div
              v-if="app.status === 'ACCEPTED'"
              class="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <CheckCircle class="h-5 w-5 text-emerald-500" />
              <span class="font-medium text-emerald-700">
                축하합니다! 지원이 수락되었습니다. 곧 계약이 진행될 예정입니다.
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>
    <EmployerProfilePreviewModal
      :is-open="isEmployerProfileOpen"
      :is-loading="isEmployerProfileLoading"
      :profile="employerProfile"
      @close="isEmployerProfileOpen = false"
    />
  </div>
</template>
