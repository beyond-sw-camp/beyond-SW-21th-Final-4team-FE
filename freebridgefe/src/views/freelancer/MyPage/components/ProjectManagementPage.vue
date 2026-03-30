<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Search,
  User as UserIcon,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useContractStore, type ContractWithDetails } from '@/stores/contractStore';
import ContractProjectDetailModal from './ContractProjectDetailModal.vue';

defineEmits<{
  (e: 'back'): void;
}>();

type ProjectStage = 'ALL' | 'BEFORE_START' | 'IN_PROGRESS' | 'COMPLETED';

interface ContractProjectCard {
  id: number;
  contractId: number;
  title: string;
  employerName: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: ContractWithDetails['status'];
  statusLabel: string;
  stage: Exclude<ProjectStage, 'ALL'>;
  stageLabel: string;
  stageDescription: string;
  progress: number;
}

const authStore = useAuthStore();
const contractStore = useContractStore();
const isDetailModalOpen = ref(false);
const selectedContractId = ref<number | null>(null);

const tabs: Array<{ id: ProjectStage; label: string }> = [
  { id: 'ALL', label: '전체' },
  { id: 'BEFORE_START', label: '시작전' },
  { id: 'IN_PROGRESS', label: '진행중' },
  { id: 'COMPLETED', label: '완료' },
];

const activeTab = ref<ProjectStage>('ALL');
const searchQuery = ref('');
const isLoading = ref(false);
const loadError = ref<unknown | null>(null);

const toDate = (value?: string | Date | null) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string | Date | null) => {
  const parsed = toDate(value);
  if (!parsed) return '-';
  return parsed.toLocaleDateString('ko-KR');
};

const formatBudget = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return '-';
  return `${value.toLocaleString()}원`;
};

const getContractStatusLabel = (status: ContractWithDetails['status']) => {
  switch (status) {
    case 'WAITING_SIGNATURE':
      return '서명 대기';
    case 'IN_PROGRESS':
      return '진행 계약';
    case 'COMPLETED':
      return '계약 완료';
    case 'REJECTED':
      return '계약 종료';
    default:
      return '상태 확인 필요';
  }
};

const calculateProgress = (contract: ContractWithDetails) => {
  if (contract.status === 'COMPLETED') return 100;
  if (contract.status === 'REJECTED' || contract.status === 'WAITING_SIGNATURE') return 0;

  const start = toDate(contract.startDate);
  const end = toDate(contract.endDate);
  if (!start || !end || end <= start) return 0;

  const now = new Date();
  if (now <= start) return 0;
  if (now >= end) return 100;

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
};

const normalizeProjectStage = (contract: ContractWithDetails): Exclude<ProjectStage, 'ALL'> | null => {
  if (contract.status === 'WAITING_SIGNATURE') return 'BEFORE_START';
  if (contract.status === 'REJECTED') return null;
  if (contract.status === 'COMPLETED') return 'COMPLETED';

  const now = new Date();
  const startDate = toDate(contract.startDate);
  const endDate = toDate(contract.endDate);

  if (startDate && endDate) {
    if (now < startDate) return 'BEFORE_START';
    if (now > endDate) return 'COMPLETED';
    return 'IN_PROGRESS';
  }
  if (contract.status === 'IN_PROGRESS') return 'IN_PROGRESS';

  return 'BEFORE_START';
};

const getStageLabel = (stage: Exclude<ProjectStage, 'ALL'>) => {
  switch (stage) {
    case 'BEFORE_START':
      return '시작전';
    case 'IN_PROGRESS':
      return '진행중';
    case 'COMPLETED':
      return '완료';
  }
};

const getStageDescription = (stage: Exclude<ProjectStage, 'ALL'>, startDate: string | Date, endDate: string | Date) => {
  const now = new Date();
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) return '일정 확인 필요';

  const startDiff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const endDiff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (stage === 'BEFORE_START') {
    return startDiff > 0 ? `시작까지 D-${startDiff}` : '곧 시작';
  }

  if (stage === 'IN_PROGRESS') {
    return endDiff >= 0 ? `종료까지 D-${endDiff}` : '일정 확인 필요';
  }

  return '프로젝트 완료';
};

const getStageConfig = (stage: Exclude<ProjectStage, 'ALL'>) => {
  switch (stage) {
    case 'BEFORE_START':
      return {
        labelClass: 'bg-sky-50 text-sky-700 border-sky-200',
        cardClass: 'bg-white border-slate-200 hover:bg-sky-50/70 hover:border-sky-200 shadow-[0_20px_60px_-46px_rgba(14,165,233,0.16)]',
        icon: Clock3,
      };
    case 'IN_PROGRESS':
      return {
        labelClass: 'bg-amber-50 text-amber-700 border-amber-200',
        cardClass: 'bg-white border-slate-200 hover:bg-amber-50/70 hover:border-amber-200 shadow-[0_20px_60px_-46px_rgba(245,158,11,0.14)]',
        icon: Briefcase,
      };
    case 'COMPLETED':
      return {
        labelClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        cardClass: 'bg-white border-slate-200 hover:bg-emerald-50/70 hover:border-emerald-200 shadow-[0_20px_60px_-46px_rgba(16,185,129,0.14)]',
        icon: CheckCircle2,
      };
  }
};

const myContracts = computed(() => {
  if (!authStore.user) return [];
  return contractStore.contractsWithDetails.filter(
    (contract) => Number(contract.freelancerId) === Number(authStore.user?.id),
  );
});

const contractCards = computed<ContractProjectCard[]>(() => {
  return myContracts.value
    .map((contract) => {
      const stage = normalizeProjectStage(contract);
      if (!stage) return null;

      return {
        id: Number(contract.id),
        contractId: Number(contract.contractId ?? contract.id),
        title: contract.projectName ?? '프로젝트명 미정',
        employerName: contract.employerName ?? '고용주 정보 없음',
        startDate: formatDate(contract.startDate),
        endDate: formatDate(contract.endDate),
        budget: contract.budget ?? 0,
        status: contract.status,
        statusLabel: getContractStatusLabel(contract.status),
        stage,
        stageLabel: getStageLabel(stage),
        stageDescription: getStageDescription(stage, contract.startDate, contract.endDate),
        progress: calculateProgress(contract),
      };
    })
    .filter((card): card is ContractProjectCard => card !== null);
});

const filteredProjects = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLowerCase();

  return contractCards.value.filter((project) => {
    const matchesTab = activeTab.value === 'ALL' || project.stage === activeTab.value;
    const matchesSearch =
      !normalizedQuery ||
      project.title.toLowerCase().includes(normalizedQuery) ||
      project.employerName.toLowerCase().includes(normalizedQuery);

    return matchesTab && matchesSearch;
  });
});

const loadProjects = async () => {
  isLoading.value = true;
  loadError.value = null;
  try {
    await contractStore.fetchAllContracts();
  } catch (error) {
    console.error('Failed to load contract projects:', error);
    loadError.value = error;
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await loadProjects();
});

const openDetailModal = (contractId: number) => {
  selectedContractId.value = contractId;
  isDetailModalOpen.value = true;
};
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto h-full flex flex-col animate-fade-in-up text-slate-800">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div class="flex items-center gap-4">
        <button
          @click="$emit('back')"
          class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft class="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <h2 class="text-2xl font-bold text-slate-950 mb-2">프로젝트 관리</h2>
          <p class="text-slate-500 text-sm">계약된 프로젝트를 상태별 카드로 확인해보세요.</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative">
          <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="프로젝트명 또는 고용주 검색"
            class="bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-950 focus:outline-none focus:border-sky-400 w-72"
          />
        </div>
      </div>
    </div>

    <div class="flex gap-2 mb-8 border-b border-slate-200">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-6 py-3 text-sm font-medium transition-all relative"
        :class="activeTab === tab.id ? 'text-sky-600' : 'text-slate-500 hover:text-slate-950'"
      >
        {{ tab.label }}
        <div
          v-if="activeTab === tab.id"
          class="absolute bottom-0 left-0 w-full h-0.5 bg-sky-500"
        ></div>
      </button>
    </div>

    <div v-if="isLoading" class="flex-1 flex items-center justify-center text-slate-500">
      계약 프로젝트를 불러오는 중입니다.
    </div>

    <div v-else-if="filteredProjects.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="project in filteredProjects"
        :key="project.contractId"
        @click="openDetailModal(project.contractId)"
        @keydown.enter="openDetailModal(project.contractId)"
        @keydown.space.prevent="openDetailModal(project.contractId)"
        role="button"
        tabindex="0"
        class="border rounded-2xl p-6 transition-all group flex flex-col min-h-[320px]"
        :class="getStageConfig(project.stage).cardClass"
      >
        <div class="flex justify-between items-start mb-5">
          <div class="flex flex-wrap items-center gap-2">
            <div
              class="px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5"
              :class="getStageConfig(project.stage).labelClass"
            >
              <component :is="getStageConfig(project.stage).icon" class="w-3.5 h-3.5" />
              {{ project.stageLabel }}
            </div>
            <div class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
              {{ project.statusLabel }}
            </div>
          </div>
          <div class="text-xs text-slate-400 font-mono">#{{ project.contractId }}</div>
        </div>

        <div class="flex-1 space-y-4">
          <div>
            <h3 class="text-lg font-bold text-slate-950 mb-2 line-clamp-2">
              {{ project.title }}
            </h3>
            <div class="flex items-center gap-2 text-sm text-slate-600">
              <UserIcon class="w-4 h-4 text-slate-400" />
              <span>{{ project.employerName }}</span>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2 text-slate-400">
                <Calendar class="w-4 h-4" />
                <span>계약 기간</span>
              </div>
              <span class="text-slate-700">{{ project.startDate }} ~ {{ project.endDate }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2 text-slate-400">
                <DollarSign class="w-4 h-4" />
                <span>계약 금액</span>
              </div>
              <span class="text-slate-950 font-semibold">{{ formatBudget(project.budget) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-400">프로젝트 상태</span>
              <span class="text-slate-700">{{ project.stageDescription }}</span>
            </div>
            <div class="space-y-2 pt-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400">진행률</span>
                <span class="text-slate-950 font-semibold">{{ project.progress }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 transition-all duration-500"
                  :style="{ width: `${project.progress}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-xs">
          <span class="text-slate-400">계약 상태</span>
          <span class="text-slate-700">{{ project.statusLabel }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="loadError" class="flex-1 flex items-center justify-center">
      <div class="text-center max-w-md rounded-3xl border border-red-200 bg-red-50 px-8 py-10">
        <Briefcase class="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-slate-950 mb-2">프로젝트를 불러오지 못했습니다.</h3>
        <p class="text-slate-600 leading-relaxed mb-5">
          요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          @click="loadProjects"
          class="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          다시 불러오기
        </button>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center max-w-md rounded-3xl border border-slate-200 bg-white px-8 py-10">
        <Briefcase class="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-slate-950 mb-2">진행할 프로젝트가 없습니다</h3>
        <p class="text-slate-500 leading-relaxed">
          아직 연결된 계약 프로젝트가 없거나, 현재 필터 조건에 맞는 프로젝트가 없습니다.
        </p>
      </div>
    </div>

    <ContractProjectDetailModal
      :is-open="isDetailModalOpen"
      :contract-id="selectedContractId"
      @close="isDetailModalOpen = false"
    />
  </div>
</template>
