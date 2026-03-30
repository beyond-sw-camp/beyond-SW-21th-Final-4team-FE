<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
    Receipt,
    Calendar,
    Clock,
    CheckCircle,
    Send,
    DollarSign,
    Eye,
    Download,
    Search,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    CreditCard,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useContractStore, type EmployerSettlementWithDetails } from '@/stores/contractStore';
import SettlementDetailModal from './components/SettlementDetailModal.vue';
import { useNow } from '@vueuse/core';

const now = useNow();
const router = useRouter();

const authStore = useAuthStore();
const contractStore = useContractStore();

const selectedSettlement = ref<EmployerSettlementWithDetails | null>(null);
const selectedStatus = ref<string>('ALL');
const isDropdownOpen = ref(false);
const currentPage = ref(1);
const itemsPerPage = 10;
const searchQuery = ref('');
const selectedDateRange = ref('ALL');

const dateRangeOptions = [
    { value: 'ALL', label: '전체 기간' },
    { value: 'THIS_MONTH', label: '이번 달' },
    { value: 'LAST_MONTH', label: '지난 달' },
    { value: 'LAST_3_MONTHS', label: '최근 3개월' },
];

const statusFilters = [
    { value: 'ALL', label: '전체' },
    { value: 'ISSUED', label: '청구됨' },
    { value: 'PAID', label: '결제 완료' },
    { value: 'DISBURSED', label: '지급 완료' },
    { value: 'CANCELLED', label: '취소됨' },
];

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle }> = {
    ISSUED: { label: '청구됨', icon: Clock },
    PAID: { label: '결제 완료', icon: CheckCircle },
    DISBURSED: { label: '지급 완료', icon: Send },
    CANCELLED: { label: '취소됨', icon: AlertCircle },
};

// Filter settlements by current employer
const mySettlements = computed(() => {
    if (!authStore.user) return [];
    return contractStore.employerSettlementsWithDetails.filter(
        (s) => s.employerId === Number(authStore.user!.id)
    );
});

// Get next upcoming settlement (first ISSUED settlement by due date)
const nextSettlement = computed(() => {
    if (!mySettlements.value || mySettlements.value.length === 0) return null;
    const issuedSettlements = mySettlements.value
        .filter((s) => s.status === 'ISSUED')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return issuedSettlements[0] || null;
});

// Filter by status, search query, and date range
const filteredSettlements = computed(() => {
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
                s.freelancerName.toLowerCase().includes(query)
        );
    }

    // Date Range Filter
    const today = new Date();
    if (selectedDateRange.value === 'THIS_MONTH') {
        result = result.filter((s) => {
            const d = new Date(s.dueDate);
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });
    } else if (selectedDateRange.value === 'LAST_MONTH') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        result = result.filter((s) => {
            const d = new Date(s.dueDate);
            return (
                d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear()
            );
        });
    } else if (selectedDateRange.value === 'LAST_3_MONTHS') {
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        result = result.filter((s) => new Date(s.dueDate) >= threeMonthsAgo);
    }

    // Sort by due date ascending (upcoming payments first)
    result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return result;
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredSettlements.value.length / itemsPerPage));

const paginatedSettlements = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSettlements.value.slice(start, end);
});

// Status counts
const statusCounts = computed(() => ({
    ISSUED: mySettlements.value.filter((s) => s.status === 'ISSUED').length,
    PAID: mySettlements.value.filter((s) => s.status === 'PAID').length,
    DISBURSED: mySettlements.value.filter((s) => s.status === 'DISBURSED').length,
    CANCELLED: mySettlements.value.filter((s) => s.status === 'CANCELLED').length,
}));

// Total amounts
const totalPending = computed(() =>
    mySettlements.value
        .filter((s) => s.status === 'ISSUED')
        .reduce((sum, s) => sum + s.billingAmount, 0)
);

const totalPaid = computed(() =>
    contractStore.employerSettlementSummary?.totalPaidAmount ??
    mySettlements.value
        .filter((s) => s.status === 'PAID' || s.status === 'DISBURSED')
        .reduce((sum, s) => sum + s.billingAmount, 0)
);

const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR');
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
};

const selectStatusFilter = (value: string) => {
    selectedStatus.value = value;
    isDropdownOpen.value = false;
    currentPage.value = 1;
};

const currentStatusLabel = computed(() => {
    return statusFilters.find((f) => f.value === selectedStatus.value)?.label || '전체';
});

watch(searchQuery, () => {
    currentPage.value = 1;
});

watch(selectedDateRange, () => {
    currentPage.value = 1;
});

const triggerPdfDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const handleDownload = (settlement: EmployerSettlementWithDetails) => {
    if (!settlement.invoicePdfUrl) {
        alert('다운로드 가능한 청구서가 없습니다.');
        return;
    }
    triggerPdfDownload(settlement.invoicePdfUrl, `invoice-${settlement.id}.pdf`);
};

const downloadSettlementList = () => {
    const downloadable = filteredSettlements.value.filter((s) => !!s.invoicePdfUrl);
    if (downloadable.length === 0) {
        alert('다운로드 가능한 청구서가 없습니다.');
        return;
    }

    downloadable.forEach((settlement) => {
        if (!settlement.invoicePdfUrl) return;
        triggerPdfDownload(settlement.invoicePdfUrl, `invoice-${settlement.id}.pdf`);
    });
};

const goToPaymentPage = () => {
    router.push({ name: 'employer.payments' });
};

const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
};

const resetFilters = () => {
    searchQuery.value = '';
    selectedStatus.value = 'ALL';
    selectedDateRange.value = 'ALL';
    isDropdownOpen.value = false;
    currentPage.value = 1;
};

onMounted(async () => {
    try {
        await Promise.all([
            contractStore.fetchContracts(),
            contractStore.fetchEmployerSettlements(),
            contractStore.fetchEmployerSettlementSummary().catch(() => undefined),
            contractStore.fetchEmployerNextSettlement().catch(() => undefined),
        ]);
    } catch {
        // Initial load failures surface via UI that depends on store data.
    }
});
</script>

<template>
    <div class="mx-auto max-w-[1400px] px-4 py-12 text-slate-900 md:px-8">
        <!-- Header -->
        <div v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0 }" class="mb-8">
            <div class="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div class="flex items-center gap-3">
                    <Receipt class="h-10 w-10 text-[#21AFBF]" />
                    <h1 class="text-4xl font-bold text-slate-950">정산 관리</h1>
                </div>
                <button
                    @click="goToPaymentPage"
                    class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-4 py-2 font-semibold text-slate-900 transition-colors hover:brightness-105"
                >
                    <CreditCard class="h-4 w-4" />
                    결제 페이지 이동
                </button>
            </div>
            <p class="text-slate-600">프리랜서 정산 내역을 확인하고 관리하세요</p>
        </div>

        <!-- Next Settlement Card -->
        <div
            class="mb-8"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 0.1 } }"
        >
            <div
                v-if="nextSettlement"
                class="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
            >
                <div class="relative z-10">
                    <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div>
                            <div class="mb-2 flex items-center gap-2 font-medium text-[#21AFBF]">
                                <AlertCircle class="h-4 w-4" />
                                다음 정산 예정
                            </div>
                            <div class="mb-2 text-3xl font-bold text-slate-950">
                                {{ nextSettlement.projectName }}
                            </div>
                            <div class="mb-4 text-slate-500">
                                {{ nextSettlement.freelancerName }} · {{ nextSettlement.installmentNumber }}차 청구
                            </div>
                            <div class="flex items-center gap-6">
                                <div>
                                    <div class="mb-1 text-sm text-slate-400">청구 금액</div>
                                    <div class="text-2xl font-bold text-slate-950">
                                        {{ formatCurrency(nextSettlement.billingAmount) }}
                                    </div>
                                </div>
                                <div>
                                    <div class="mb-1 text-sm text-slate-400">결제일</div>
                                    <div class="text-lg font-medium text-slate-900">
                                        {{ formatDate(nextSettlement.dueDate) }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col items-center gap-4">
                            <div class="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 font-medium text-slate-700">
                                결제 대기
                            </div>
                            <button
                                @click="goToPaymentPage"
                                class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-6 py-3 font-semibold text-slate-900 transition-colors hover:brightness-105"
                                v-motion
                                :hover="{ scale: 1.02 }"
                                :tap="{ scale: 0.98 }"
                            >
                                <CreditCard class="h-5 w-5" />
                                결제하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- No upcoming settlements -->
            <div
                v-else
                class="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
            >
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle class="h-8 w-8 text-emerald-500" />
                </div>
                <h3 class="mb-2 text-xl font-semibold text-slate-900">예정된 정산이 없습니다</h3>
                <p class="text-slate-500">모든 청구서가 처리되었습니다</p>
            </div>
        </div>

        <!-- Summary Stats -->
        <div
            class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 0.2 } }"
        >
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-2 flex items-center gap-2 text-sm text-slate-500">
                    <DollarSign class="w-4 h-4" />
                    미결제 금액
                </div>
                <div class="text-2xl font-bold text-slate-950">{{ formatCurrency(totalPending) }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-2 flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle class="w-4 h-4" />
                    결제 완료
                </div>
                <div class="text-2xl font-bold text-slate-950">{{ formatCurrency(totalPaid) }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-2 flex items-center gap-2 text-sm text-slate-500">
                    <Clock class="w-4 h-4" />
                    청구 대기
                </div>
                <div class="text-2xl font-bold text-slate-950">{{ statusCounts.ISSUED }}건</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-2 flex items-center gap-2 text-sm text-slate-500">
                    <Send class="w-4 h-4" />
                    지급 완료
                </div>
                <div class="text-2xl font-bold text-slate-950">{{ statusCounts.DISBURSED }}건</div>
            </div>
        </div>

        <!-- Filters & Search -->
        <div
            class="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 relative z-20"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 0.3 } }"
        >
            <div class="flex items-center gap-4 w-full md:w-auto">
                <!-- Search Bar -->
                <div class="relative flex-1 md:flex-initial">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="프로젝트 또는 프리랜서 검색"
                        class="w-full md:w-64 rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus:border-[#21AFBF] focus:outline-none"
                    />
                </div>

                <!-- Date Range Filter -->
                <div class="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                        v-for="option in dateRangeOptions"
                        :key="option.value"
                        @click="selectedDateRange = option.value"
                        class="px-3 py-1 text-sm rounded-lg transition-colors"
                        :class="
                            selectedDateRange === option.value
                                ? 'bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] font-semibold text-[#0f2b2e] shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        "
                    >
                        {{ option.label }}
                    </button>
                </div>

                <button
                    type="button"
                    @click="resetFilters"
                    class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                    초기화
                </button>
            </div>

            <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div class="text-sm text-slate-500">
                    {{ filteredSettlements.length }}개의 정산 내역
                </div>

                <button
                    type="button"
                    @click="downloadSettlementList"
                    class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                    <Download class="w-4 h-4" />
                    다운로드
                </button>

                <!-- Status Dropdown -->
                <div class="relative z-30">
                    <button
                        @click="isDropdownOpen = !isDropdownOpen"
                        class="flex min-w-[140px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    >
                        <span>{{ currentStatusLabel }}</span>
                        <ChevronDown
                            class="w-4 h-4 transition-transform"
                            :class="{ 'rotate-180': isDropdownOpen }"
                        />
                    </button>
                    <div
                        v-if="isDropdownOpen"
                        class="absolute top-full right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                    >
                        <button
                            v-for="filter in statusFilters"
                            :key="filter.value"
                            @click="selectStatusFilter(filter.value)"
                            class="w-full px-4 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50"
                            :class="{ 'bg-slate-50 font-medium text-slate-900': selectedStatus === filter.value }"
                        >
                            {{ filter.label }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Settlement List -->
        <div
            v-if="paginatedSettlements.length === 0"
            class="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm"
            v-motion
            :initial="{ opacity: 0, scale: 0.95 }"
            :enter="{ opacity: 1, scale: 1 }"
        >
            <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <Receipt class="w-10 h-10 text-slate-400" />
            </div>
            <h3 class="mb-3 text-2xl font-semibold text-slate-900">정산 내역이 없습니다</h3>
            <p class="text-slate-500">선택한 필터에 해당하는 정산 내역이 없습니다</p>
        </div>

        <div v-else class="space-y-4 relative z-10">
            <div
                v-for="(settlement, index) in paginatedSettlements"
                :key="settlement.id"
                class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#21AFBF]/25 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
                v-motion
                :initial="{ opacity: 0, y: 20 }"
                :enter="{ opacity: 1, y: 0, transition: { delay: 0.3 + index * 0.05 } }"
            >
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <!-- Left: Info -->
                    <div class="flex items-center gap-4 flex-1">
                        <div
                            class="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
                        >
                            <component
                                :is="statusConfig[settlement.status].icon"
                                class="w-6 h-6 text-slate-500"
                            />
                        </div>
                        <div>
                            <div class="mb-1 font-bold text-slate-900">
                                {{ settlement.projectName }}
                            </div>
                            <div class="text-sm text-slate-500">
                                {{ settlement.freelancerName }} · {{ settlement.installmentNumber }}차 청구
                            </div>
                        </div>
                    </div>

                    <!-- Center: Amount -->
                    <div class="text-center lg:text-right">
                        <div class="mb-1 text-sm text-slate-400">
                            {{ settlement.status === 'ISSUED' ? '청구 금액' : '결제 금액' }}
                        </div>
                        <div class="text-xl font-bold text-slate-950">
                            {{ formatCurrency(settlement.billingAmount) }}
                        </div>
                    </div>

                    <!-- Right: Status & Actions -->
                    <div class="flex items-center gap-3">
                        <!-- Status Badge -->
                        <div
                            v-if="settlement.status === 'ISSUED'"
                            class="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-slate-700"
                        >
                            결제 대기
                            <span
                                v-if="new Date(settlement.dueDate) < now"
                                class="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600"
                            >
                                연체
                            </span>
                        </div>
                        <div
                            v-else-if="settlement.status === 'PAID'"
                            class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-slate-700"
                        >
                            결제 완료
                        </div>
                        <div
                            v-else-if="settlement.status === 'DISBURSED'"
                            class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-slate-700"
                        >
                            지급 완료
                        </div>
                        <div
                            v-else
                            class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-slate-700"
                        >
                            취소됨
                        </div>

                        <!-- Pay Button (only for ISSUED) -->
                        <button
                            v-if="settlement.status === 'ISSUED'"
                            @click="goToPaymentPage"
                            class="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-4 py-2 text-sm font-semibold text-[#0f2b2e] transition-all hover:brightness-105"
                        >
                            <CreditCard class="w-4 h-4" />
                            결제
                        </button>

                        <button
                            @click="selectedSettlement = settlement"
                            class="rounded-lg p-2 transition-colors hover:bg-slate-100"
                            title="상세보기"
                        >
                            <Eye class="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <div
            v-if="totalPages > 1"
            class="mt-8 flex items-center justify-center gap-2"
            v-motion
            :initial="{ opacity: 0 }"
            :enter="{ opacity: 1, transition: { delay: 0.5 } }"
        >
            <button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="rounded-lg border border-slate-200 bg-white p-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <ChevronLeft class="w-5 h-5 text-slate-600" />
            </button>

            <template v-for="page in totalPages" :key="page">
                <button
                    @click="goToPage(page)"
                    class="w-10 h-10 rounded-lg font-medium transition-colors"
                    :class="
                        currentPage === page
                            ? 'bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] text-[#0f2b2e]'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    "
                >
                    {{ page }}
                </button>
            </template>

            <button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="rounded-lg border border-slate-200 bg-white p-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <ChevronRight class="w-5 h-5 text-slate-600" />
            </button>
        </div>

        <!-- Settlement Detail Modal -->
        <SettlementDetailModal
            v-if="selectedSettlement"
            :settlement="selectedSettlement"
            @close="selectedSettlement = null"
            @download="handleDownload"
        />

    </div>
</template>
