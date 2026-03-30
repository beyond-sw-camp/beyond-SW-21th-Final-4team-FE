<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  X,
  Calendar,
  FileText,
  CreditCard,
  Loader2,
  TrendingUp,
  MapPin,
  Clock3,
  Sparkles,
  FileDown,
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { getContract, type ContractResponseDto } from '@/api/contractApi';

const props = defineProps<{
  contractId: number | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isLoading = ref(false);
const contract = ref<ContractResponseDto | null>(null);
const lastLoadRequestId = ref(0);
const router = useRouter();

const toDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string | null) => {
  const parsed = toDate(value);
  if (!parsed) return '-';
  return parsed.toLocaleDateString('ko-KR');
};

const formatCurrency = (amount?: number | null) => {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) return '-';
  return `${amount.toLocaleString()}원`;
};

const openExternal = (url?: string | null) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const openContractPage = (contractTab?: 'details' | 'ai-advice') => {
  if (!contract.value?.contractId) return;

  void router.push({
    name: 'freelancer.contracts',
    query: {
      contractId: String(contract.value.contractId),
      contractTab: contractTab ?? 'details',
    },
  });
  emit('close');
};

const contractStatusLabel = computed(() => {
  switch (contract.value?.status) {
    case 'WAITING_SIGNATURE':
      return '시작전';
    case 'IN_PROGRESS':
      return '진행중';
    case 'COMPLETED':
      return '완료';
    case 'REJECTED':
      return '종료';
    default:
      return '-';
  }
});

const signatureStatusLabel = computed(() => {
  if (!contract.value) return '-';

  return [
    contract.value.employerSigned ? '고용주 서명 완료' : '고용주 서명 대기',
    contract.value.freelancerSigned ? '프리랜서 서명 완료' : '프리랜서 서명 대기',
  ].join(' / ');
});

const progress = computed(() => {
  switch (contract.value?.status) {
    case 'COMPLETED':
      return 100;
    case 'REJECTED':
    case 'WAITING_SIGNATURE':
      return 0;
  }

  const start = toDate(contract.value?.startDate);
  const end = toDate(contract.value?.endDate);

  if (!start || !end) return 0;
  if (end <= start) return 0;

  const now = new Date();
  if (now <= start) return 0;
  if (now >= end) return 100;

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
});

const progressLabel = computed(() => {
  switch (contract.value?.status) {
    case 'COMPLETED':
      return '프로젝트 완료';
    case 'WAITING_SIGNATURE':
      return '서명 대기';
    case 'REJECTED':
      return '일정 확인 필요';
  }

  const start = toDate(contract.value?.startDate);
  const end = toDate(contract.value?.endDate);

  if (!start || !end) return '일정 확인 필요';

  const now = new Date();
  const startDiff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const endDiff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (now < start) {
    return startDiff > 0 ? `시작까지 D-${startDiff}` : '곧 시작';
  }

  if (now > end) {
    return '프로젝트 완료';
  }

  return endDiff >= 0 ? `종료까지 D-${endDiff}` : '진행중';
});

const summaryItems = computed(() => {
  if (!contract.value) return [];

  return [
    {
      label: '계약 금액',
      value: formatCurrency(contract.value.budget),
    },
    {
      label: '계약 기간',
      value: `${formatDate(contract.value.startDate)} ~ ${formatDate(contract.value.endDate)}`,
    },
    {
      label: '진행률',
      value: `${progress.value}%`,
    },
  ];
});

const formatWorkDaysPerWeek = (value?: number | null) => {
  if (value == null) return '-';
  return `${value}일`;
};

const loadContract = async (requestedContractId: number) => {
  if (!requestedContractId || !props.isOpen) return;

  const requestId = ++lastLoadRequestId.value;
  isLoading.value = true;
  try {
    const response = await getContract(requestedContractId);
    if (
      requestId !== lastLoadRequestId.value
      || !props.isOpen
      || props.contractId !== requestedContractId
    ) {
      return;
    }
    contract.value = response;
  } catch (error) {
    if (requestId !== lastLoadRequestId.value) {
      return;
    }
    console.error('Failed to load contract detail:', error);
    contract.value = null;
  } finally {
    if (requestId === lastLoadRequestId.value) {
      isLoading.value = false;
    }
  }
};

watch(
  () => [props.contractId, props.isOpen] as const,
  ([contractId, isOpen]) => {
    if (contractId && isOpen) {
      void loadContract(contractId);
      return;
    }

    if (!isOpen) {
      lastLoadRequestId.value += 1;
      isLoading.value = false;
      contract.value = null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="$emit('close')"></div>

    <div class="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_-52px_rgba(15,23,42,0.22)]">
      <div class="fb-modal-header flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
        <div>
          <div class="mb-2 text-xs tracking-[0.2em] text-white/75">PROJECT DETAIL</div>
          <h2 class="text-2xl font-bold text-white">{{ contract?.projectName || '프로젝트 상세' }}</h2>
          <p class="mt-2 text-sm text-white/80">프로젝트 정보와 계약 진행 상태를 한 번에 확인할 수 있습니다.</p>
        </div>
        <button
          type="button"
          @click="$emit('close')"
          class="rounded-xl border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-6">
        <div v-if="isLoading" class="flex min-h-[360px] items-center justify-center text-slate-500">
          <Loader2 class="mr-3 h-6 w-6 animate-spin" />
          계약 정보를 불러오는 중입니다.
        </div>

        <div v-else-if="contract" class="space-y-6">
          <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
            <div class="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-5">
              <div class="mb-4 flex flex-wrap items-center gap-2">
                <div class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {{ contractStatusLabel }}
                </div>
                <div class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  #{{ contract.contractId }}
                </div>
                <div class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {{ contract.employerName || '-' }}
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div
                  v-for="item in summaryItems"
                  :key="item.label"
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div class="mb-1 text-[11px] font-medium tracking-[0.12em] text-slate-400">{{ item.label }}</div>
                  <div class="text-sm font-semibold text-slate-950">{{ item.value }}</div>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="mb-3 text-sm font-semibold text-slate-950">빠른 액션</div>
              <div class="space-y-2">
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl border border-sky-200 bg-white px-4 py-3 text-left text-sm text-slate-950 transition-colors hover:bg-sky-50"
                  @click="openContractPage('details')"
                >
                  <span>계약 화면에서 보기</span>
                  <FileText class="h-4 w-4 text-sky-500" />
                </button>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-left text-sm text-slate-950 transition-colors hover:bg-cyan-100"
                  @click="openContractPage('ai-advice')"
                >
                  <span>AI 법률 자문 보기</span>
                  <Sparkles class="h-4 w-4 text-cyan-600" />
                </button>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-950 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!contract.contractPdfUrl"
                  @click="openExternal(contract.contractPdfUrl)"
                >
                  <span>계약서 보기</span>
                  <FileDown class="h-4 w-4 text-slate-500" />
                </button>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-950 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!contract.signedPdfUrl"
                  @click="openExternal(contract.signedPdfUrl)"
                >
                  <span>서명본 보기</span>
                  <FileDown class="h-4 w-4 text-slate-500" />
                </button>
              </div>
            </div>
          </section>

          <section class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <FileText class="w-4 h-4 text-sky-300" />
                프로젝트 정보
              </div>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div class="mb-1 text-xs text-slate-400">프로젝트명</div>
                  <div class="text-sm text-slate-950">{{ contract.projectName }}</div>
                </div>
                <div>
                  <div class="mb-1 text-xs text-slate-400">고용주</div>
                  <div class="text-sm text-slate-950">{{ contract.employerName || '-' }}</div>
                </div>
                <div>
                  <div class="mb-1 text-xs text-slate-400">프로젝트 설명</div>
                  <div class="whitespace-pre-wrap text-sm text-slate-700">{{ contract.jobDescription || '-' }}</div>
                </div>
                <div>
                  <div class="mb-1 text-xs text-slate-400">근무 위치</div>
                  <div class="flex items-center gap-2 text-sm text-slate-700">
                    <MapPin class="w-4 h-4 text-slate-400" />
                    {{ contract.workLocation || '-' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <TrendingUp class="w-4 h-4 text-emerald-300" />
                진행률
              </div>
              <div class="mb-2 text-4xl font-bold text-slate-950">{{ progress }}%</div>
              <div class="mb-4 text-sm text-slate-500">{{ progressLabel }}</div>
              <div class="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 transition-all"
                  :style="{ width: `${progress}%` }"
                ></div>
              </div>
            </div>
          </section>

          <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <CreditCard class="w-4 h-4 text-violet-300" />
                계약 정보
              </div>
              <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">계약 번호</span>
                  <span class="text-slate-950">#{{ contract.contractId }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">계약 상태</span>
                  <span class="text-slate-950">{{ contractStatusLabel }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">계약 금액</span>
                  <span class="text-slate-950">{{ formatCurrency(contract.budget) }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">계약 시작일</span>
                  <span class="text-slate-950">{{ formatDate(contract.startDate) }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">계약 종료일</span>
                  <span class="text-slate-950">{{ formatDate(contract.endDate) }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">서명 상태</span>
                  <span class="text-right text-slate-950">{{ signatureStatusLabel }}</span>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5">
              <div class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Calendar class="w-4 h-4 text-amber-300" />
                일정 및 근무 조건
              </div>
              <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">근무 시간</span>
                  <span class="text-slate-950">
                    {{ contract.workStartTime || '-' }} ~ {{ contract.workEndTime || '-' }}
                  </span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">휴게 시간</span>
                  <span class="text-slate-950">
                    {{ contract.breakStartTime || '-' }} ~ {{ contract.breakEndTime || '-' }}
                  </span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">주 근무일</span>
                  <span class="text-slate-950">{{ formatWorkDaysPerWeek(contract.workDaysPerWeek) }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">주휴일</span>
                  <span class="text-slate-950">{{ contract.weeklyHoliday || '-' }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">프리랜서 연락처</span>
                  <span class="text-slate-950">{{ contract.freelancerPhone || '-' }}</span>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <span class="text-slate-400">프리랜서 주소</span>
                  <span class="text-slate-950">{{ contract.freelancerAddress || '-' }}</span>
                </div>
              </div>
            </div>
          </section>

          <section
            v-if="contract.aiLegalAdvice"
            class="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"
          >
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Sparkles class="h-4 w-4 text-cyan-600" />
              AI 법률 가이드
            </div>
            <p class="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {{ contract.aiLegalAdvice }}
            </p>
          </section>
        </div>

        <div v-else class="flex min-h-[360px] items-center justify-center text-slate-400">
          <Clock3 class="mr-3 h-5 w-5" />
          계약 상세 정보를 불러오지 못했습니다.
        </div>
      </div>
    </div>
  </div>
</template>
