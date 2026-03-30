<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Award,
  AlertCircle,
  Download,
  Zap,
  Wallet,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useContractStore, type FreelancerSettlementWithDetails } from '@/stores/contractStore';
import SettlementDetailModal from './components/SettlementDetailModal.vue';

const authStore = useAuthStore();
const contractStore = useContractStore();

const selectedSettlement = ref<FreelancerSettlementWithDetails | null>(null);

// Filters & Pagination State
const searchQuery = ref('');
const selectedStatus = ref<string>('ALL');
const selectedDateRange = ref('ALL');
const isDropdownOpen = ref(false);
const currentPage = ref(1);
const itemsPerPage = 10;

const dateRangeOptions = [
    { value: 'ALL', label: '전체 기간' },
    { value: 'THIS_MONTH', label: '이번 달' },
    { value: 'LAST_MONTH', label: '지난 달' },
    { value: 'LAST_3_MONTHS', label: '최근 3개월' },
];

const statusFilters = [
    { value: 'ALL', label: '전체' },
    { value: 'PENDING', label: '지급 예정' },
    { value: 'PAID', label: '지급 완료' },
    { value: 'CANCELLED', label: '취소됨' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; badgeBg: string; icon: any }> = {
    PENDING: { label: '지급 예정', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100', badgeBg: 'bg-sky-50 border border-sky-100 text-sky-700', icon: Calendar },
    PAID: { label: '지급 완료', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', badgeBg: 'bg-emerald-50 border border-emerald-100 text-emerald-700', icon: CheckCircle },
    CANCELLED: { label: '취소됨', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100', badgeBg: 'bg-rose-50 border border-rose-100 text-rose-700', icon: AlertCircle },
};

const getStatusMeta = (status: string) => {
    return statusConfig[status] || statusConfig.PENDING;
};

// Base Data
const mySettlements = computed(() => {
  if (!authStore.user) return [];
  return contractStore.freelancerSettlementsWithDetails || [];
});

// Filtered Data
const filteredSettlements = computed(() => {
    if (!mySettlements.value || mySettlements.value.length === 0) return [];
    let result = [...mySettlements.value];

    // Status Filter
    if (selectedStatus.value !== 'ALL') {
        result = result.filter((s) => s.status === selectedStatus.value);
    }

    // Search Filter
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
            (s) =>
                s.projectName.toLowerCase().includes(query) ||
                s.employerName.toLowerCase().includes(query)
        );
    }

    // Date Range Filter
    const today = new Date();
    if (selectedDateRange.value === 'THIS_MONTH') {
        result = result.filter((s) => {
            const d = new Date(s.scheduledDate);
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });
    } else if (selectedDateRange.value === 'LAST_MONTH') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        result = result.filter((s) => {
            const d = new Date(s.scheduledDate);
            return (
                d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear()
            );
        });
    } else if (selectedDateRange.value === 'LAST_3_MONTHS') {
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        result = result.filter((s) => new Date(s.scheduledDate) >= threeMonthsAgo);
    }

    result.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    return result;
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredSettlements.value.length / itemsPerPage));

const paginatedSettlements = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSettlements.value.slice(start, end);
});


// 지급 예정 금액 (PENDING)
const pendingAmount = computed(() => mySettlements.value
    .filter((s) => s.status === 'PENDING')
    .reduce((sum, s) => sum + s.netAmount, 0)
);

// 지급 완료 금액 (PAID)
const paidAmount = computed(() => mySettlements.value
    .filter((s) => s.status === 'PAID')
    .reduce((sum, s) => sum + s.netAmount, 0)
);

const pendingAmountDisplay = computed(() =>
    contractStore.freelancerSettlementSummary?.pendingAmount ?? pendingAmount.value
);

const paidAmountDisplay = computed(() =>
    contractStore.freelancerSettlementSummary?.paidAmount ?? paidAmount.value
);



const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ko-KR');
};



const selectStatusFilter = (value: string) => {
    selectedStatus.value = value;
    isDropdownOpen.value = false;
    currentPage.value = 1;
};

const currentStatusLabel = computed(() => {
    return statusFilters.find((f) => f.value === selectedStatus.value)?.label || '전체';
});

const resetFilters = () => {
    searchQuery.value = '';
    selectedStatus.value = 'ALL';
    selectedDateRange.value = 'ALL';
    isDropdownOpen.value = false;
    currentPage.value = 1;
};

const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
};

const handleDownload = (settlement: FreelancerSettlementWithDetails) => {
    // Mock download
    alert(`정산 내역서 다운로드: ${settlement.projectName}`);
};

watch([selectedStatus, searchQuery, selectedDateRange], () => {
    currentPage.value = 1;
});

onMounted(async () => {
    try {
        await Promise.all([
            contractStore.fetchContracts(),
            contractStore.fetchFreelancerSettlements(),
            contractStore.fetchFreelancerSettlementSummary().catch(() => undefined),
        ]);
    } catch (error) {
        console.error('Failed to initialize freelancer settlements:', error);
    }
});
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-slate-900">
    <!-- Header -->
    <div
      class="mb-12"
      data-tour="freelancer-settlement-header"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <div class="mb-3">
             <h1 class="mb-2 flex items-center gap-4 text-4xl font-bold tracking-tight text-slate-950">
                <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-200">
                  <Wallet class="w-7 h-7" />
                </span>
                정산 관리
             </h1>
             <p class="text-slate-500">수입 내역과 정산을 손쉽게 관리하세요</p>
      </div>
    </div>

    <!-- Summary Stats Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div
            class="fb-card relative overflow-hidden p-8 group transition-all"
            v-motion
            :initial="{ opacity: 0, x: 20 }"
            :enter="{ opacity: 1, x: 0, transition: { delay: 200 } }"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2 text-lg font-medium text-slate-500">
                    <Calendar class="w-5 h-5 text-blue-400" />
                    지급 예정
                </div>
                <div class="rounded-xl bg-sky-50 p-2 text-sky-500 transition-colors group-hover:bg-sky-100">
                    <TrendingUp class="w-5 h-5" />
                </div>
            </div>
            <div class="mb-1 text-4xl font-bold text-slate-950">{{ pendingAmountDisplay.toLocaleString() }}<span class="ml-1 text-xl text-slate-400">원</span></div>
        </div>

        <div
            class="fb-card relative overflow-hidden p-8 group transition-all"
            v-motion
            :initial="{ opacity: 0, x: 20 }"
            :enter="{ opacity: 1, x: 0, transition: { delay: 300 } }"
        >
            <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-2 text-lg font-medium text-slate-500">
                        <CheckCircle class="w-5 h-5 text-green-500" />
                    총 지급 완료
                </div>
                <div class="rounded-xl bg-emerald-50 p-2 text-emerald-500 transition-colors group-hover:bg-emerald-100">
                    <Award class="w-5 h-5" />
                </div>
            </div>
                <div class="mb-1 text-4xl font-bold text-slate-950">{{ paidAmountDisplay.toLocaleString() }}<span class="ml-1 text-xl text-slate-400">원</span></div>
        </div>
    </div>
    


    <div class="grid lg:grid-cols-3 gap-6">
        <!-- Settlement History -->
        <div
            class="fb-card lg:col-span-2 p-8"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 500 } }"
        >
            <div class="flex items-center justify-between mb-8">
                <h2 class="flex items-center gap-2 text-xl font-bold text-slate-950">
                    <Clock class="w-5 h-5 text-blue-400" />
                    정산 내역
                </h2>
                <div class="text-sm text-slate-400">
                    {{ filteredSettlements.length }}건의 내역
                </div>
            </div>

            <!-- Filters & Search -->
            <div class="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-4 w-full md:w-auto">
                    <!-- Search Bar -->
                    <div class="relative flex-1 md:flex-initial">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="프로젝트 검색"
                            class="fb-input w-full md:w-64 pl-10 pr-4 py-2.5"
                        />
                    </div>

                    <!-- Date Range Filter -->
                    <div class="hidden rounded-2xl border border-sky-100 bg-sky-50/70 p-1 md:flex">
                        <button
                            v-for="option in dateRangeOptions"
                            :key="option.value"
                            @click="selectedDateRange = option.value"
                            class="px-3 py-1 text-sm rounded-lg transition-colors"
                            :class="
                                selectedDateRange === option.value
                                    ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                            "
                        >
                            {{ option.label }}
                        </button>
                    </div>

                    <button
                        type="button"
                        @click="resetFilters"
                        class="fb-button-secondary px-3 py-2 text-sm text-slate-600"
                    >
                        초기화
                    </button>
                </div>

                <!-- Status Filter Dropdown -->
                <div class="relative z-30 w-full md:w-auto">
                    <button
                        @click="isDropdownOpen = !isDropdownOpen"
                        class="fb-input flex min-w-[140px] w-full items-center justify-between gap-2 px-4 py-2 md:w-auto"
                    >
                        <span>{{ currentStatusLabel }}</span>
                        <ChevronDown
                            class="w-4 h-4 transition-transform"
                            :class="{ 'rotate-180': isDropdownOpen }"
                        />
                    </button>
                    <div
                        v-if="isDropdownOpen"
                        class="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xl md:w-48"
                    >
                        <button
                            v-for="filter in statusFilters"
                            :key="filter.value"
                            @click="selectStatusFilter(filter.value)"
                            class="w-full px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:bg-sky-50 hover:text-slate-900"
                            :class="{ 'bg-sky-50 text-slate-900': selectedStatus === filter.value }"
                        >
                            {{ filter.label }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- List -->
            <div v-if="paginatedSettlements.length === 0" class="text-center py-20">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50">
                    <DollarSign class="w-8 h-8 text-sky-300" />
                </div>
                <p class="text-slate-400">정산 내역이 없습니다</p>
            </div>

            <div v-else class="space-y-3">
                <div
                    v-for="settlement in paginatedSettlements"
                    :key="settlement.id"
                    class="fb-card-soft group flex items-center justify-between p-5 transition-all"
                >
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 rounded-xl flex items-center justify-center border"
                            :class="getStatusMeta(settlement.status).bg"
                        >
                             <component :is="getStatusMeta(settlement.status).icon" class="w-5 h-5" :class="getStatusMeta(settlement.status).color" />
                        </div>
                        <div>
                            <div class="mb-1 font-bold text-slate-900 transition-colors group-hover:text-sky-700">
                                {{ settlement.projectName }}
                            </div>
                            <div class="text-xs text-slate-400">
                                {{ settlement.installmentNumber }}차 정산
                                <span v-if="settlement.paidDate"> · {{ formatDate(settlement.paidDate) }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-right">
                             <div class="text-lg font-bold text-slate-900">{{ settlement.netAmount.toLocaleString() }}원</div>
                             <div class="text-xs text-slate-400">실 수령액</div>
                        </div>
                        <!-- Status Badge -->
                        <div
                            class="px-3 py-1.5 rounded-full text-sm font-medium"
                            :class="getStatusMeta(settlement.status).badgeBg"
                        >
                            {{ getStatusMeta(settlement.status).label }}
                        </div>
                        <button
                            @click="selectedSettlement = settlement"
                            class="rounded-lg p-2 transition-colors hover:bg-sky-50"
                            aria-label="상세보기"
                            title="상세보기"
                        >
                            <Eye class="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Pagination -->
            <div
                v-if="totalPages > 1"
                class="mt-8 flex items-center justify-center gap-2"
            >
                <button
                    @click="goToPage(currentPage - 1)"
                    :disabled="currentPage === 1"
                    class="rounded-xl border border-sky-100 bg-white p-2 transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <ChevronLeft class="w-5 h-5 text-slate-700" />
                </button>

                <template v-for="page in totalPages" :key="page">
                    <button
                        @click="goToPage(page)"
                        class="w-10 h-10 rounded-lg font-medium transition-colors"
                        :class="
                            currentPage === page
                                ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-md'
                                : 'border border-sky-100 bg-white text-slate-500 hover:bg-sky-50'
                        "
                    >
                        {{ page }}
                    </button>
                </template>

                <button
                    @click="goToPage(currentPage + 1)"
                    :disabled="currentPage === totalPages"
                    class="rounded-xl border border-sky-100 bg-white p-2 transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <ChevronRight class="w-5 h-5 text-slate-700" />
                </button>
            </div>
        </div>

        <!-- Right Column Actions -->
        <div class="space-y-6">
            <div
                class="fb-card p-6"
                v-motion
                :initial="{ opacity: 0, x: 20 }"
                :enter="{ opacity: 1, x: 0, transition: { delay: 600 } }"
            >
                <h2 class="mb-6 flex items-center gap-2 text-lg font-bold text-slate-950">
                    <Zap class="w-5 h-5 text-amber-500" />
                    빠른 작업
                </h2>
                <div class="space-y-3">
                    <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="준비 중"
                        class="group flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-left opacity-70 transition-all"
                    >
                         <div class="rounded-lg bg-sky-100 p-2 text-sky-600">
                             <Download class="w-5 h-5" />
                         </div>
                         <div class="flex-1">
                             <div class="text-sm font-bold text-slate-900">내역 다운로드</div>
                             <div class="text-xs text-slate-500">PDF/Excel 형식 지원</div>
                         </div>
                         <span class="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200">준비 중</span>
                    </button>
                    <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="준비 중"
                        class="group flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-left opacity-70 transition-all"
                    >
                         <div class="rounded-lg bg-teal-100 p-2 text-teal-600">
                             <Award class="w-5 h-5" />
                         </div>
                         <div class="flex-1">
                             <div class="text-sm font-bold text-slate-900">세금계산서 발행</div>
                             <div class="text-xs text-slate-500">전자세금계산서 신청</div>
                         </div>
                         <span class="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200">준비 중</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    <SettlementDetailModal
        v-if="selectedSettlement"
        :settlement="selectedSettlement"
        @close="selectedSettlement = null"
        @download="handleDownload"
    />
  </div>
</template>
