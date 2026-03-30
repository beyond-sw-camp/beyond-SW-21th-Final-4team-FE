<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    FileText,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    TrendingUp,
    Eye,
    Sparkles,
    FilePlus,
    Search,
    ChevronDown,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useContractStore, type ContractWithDetails } from '@/stores/contractStore';
import ContractDetailModal from './components/ContractDetailModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const contractStore = useContractStore();

const selectedContract = ref<ContractWithDetails | null>(null);
const selectedContractTab = ref<'details' | 'contract' | 'ai-advice'>('details');

// Search and filter state
const searchQuery = ref('');
const selectedStatus = ref<string>('ALL');
const sortOption = ref<string>('most_recent');
const isDropdownOpen = ref(false);

const sortOptions = [
    { value: 'most_recent', label: '최신순' },
    { value: 'oldest', label: '오래된순' },
    { value: 'most_expensive', label: '금액 높은순' },
    { value: 'least_expensive', label: '금액 낮은순' },
];

const statusFilters = [
    { value: 'ALL', label: '전체' },
    { value: 'WAITING_SIGNATURE', label: '서명 대기' },
    { value: 'IN_PROGRESS', label: '진행 중' },
    { value: 'COMPLETED', label: '완료' },
    { value: 'REJECTED', label: '거절됨' },
];

const myContracts = computed(() => {
    if (!authStore.user) return [];
    return contractStore.contractsWithDetails.filter((c) => c.employerId === Number(authStore.user!.id));
});

const filteredAndSortedContracts = computed(() => {
    let result = [...myContracts.value];

    // Filter by search query
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase().trim();
        result = result.filter(
            (c) =>
                c.projectName.toLowerCase().includes(query) ||
                c.freelancerName.toLowerCase().includes(query)
        );
    }

    // Filter by status
    if (selectedStatus.value !== 'ALL') {
        result = result.filter((c) => c.status === selectedStatus.value);
    }

    // Sort
    switch (sortOption.value) {
        case 'most_recent':
            result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            break;
        case 'oldest':
            result.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            break;
        case 'most_expensive':
            result.sort((a, b) => b.budget - a.budget);
            break;
        case 'least_expensive':
            result.sort((a, b) => a.budget - b.budget);
            break;
    }

    return result;
});

const statusConfig: Record<
    string,
    { label: string; badgeClass: string; icon: typeof CheckCircle }
> = {
    WAITING_SIGNATURE: {
        label: '서명 대기',
        badgeClass: 'border border-orange-200/80 bg-orange-50 text-slate-700',
        icon: Clock,
    },
    IN_PROGRESS: {
        label: '진행 중',
        badgeClass: 'border border-sky-200/80 bg-sky-50 text-slate-700',
        icon: TrendingUp,
    },
    COMPLETED: {
        label: '완료',
        badgeClass: 'border border-emerald-200/80 bg-emerald-50 text-slate-700',
        icon: CheckCircle,
    },
    REJECTED: {
        label: '거절됨',
        badgeClass: 'border border-rose-200/80 bg-rose-50 text-slate-700',
        icon: Clock,
    },
};

const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR');
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
};

const navigateToCreateContract = () => {
    router.push('/employer/contracts/create');
};

const selectSortOption = (value: string) => {
    sortOption.value = value;
    isDropdownOpen.value = false;
};

const currentSortLabel = computed(() => {
    return sortOptions.find((o) => o.value === sortOption.value)?.label || '정렬';
});

const resetFilters = () => {
    searchQuery.value = '';
    selectedStatus.value = 'ALL';
    sortOption.value = 'most_recent';
    isDropdownOpen.value = false;
};

const getNumericQueryValue = (value: unknown) => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getStringQueryValue = (value: unknown) => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (rawValue === undefined || rawValue === null) return null;
    const normalizedValue = String(rawValue).trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
};

async function syncRoomContract(contract: ContractWithDetails) {
    const routeRoomId = getStringQueryValue(route.query.roomId);
    if (!routeRoomId) return;
    const contractRoomId = await chatStore.ensureContractRoomFromSourceRoom(
        routeRoomId,
        contract.contractId ?? contract.id
    );
    if (!contractRoomId) return;

    if (routeRoomId !== contractRoomId || Number(route.query.contractId) !== Number(contract.contractId)) {
        await router.replace({
            query: {
                ...route.query,
                roomId: contractRoomId,
                contractId: String(contract.contractId),
            },
        }).catch(() => undefined);
    }
}

async function openContractDetail(
    contract: ContractWithDetails,
    initialTab: 'details' | 'contract' | 'ai-advice' = 'details'
) {
    selectedContract.value = contract;
    selectedContractTab.value = initialTab;
    await syncRoomContract(contract);
}

async function syncSelectedContractFromRoute() {
    const routeContractId = getNumericQueryValue(route.query.contractId);
    if (!routeContractId) return;

    if (!contractStore.findContractByAnyId(routeContractId)) {
        await contractStore.fetchContracts();
    }

    const matchedContract = contractStore.findContractByAnyId(routeContractId);
    if (matchedContract) {
        await openContractDetail(
            matchedContract,
            route.query.contractTab === 'ai-advice' ? 'ai-advice' : 'details'
        );
    }
}

onMounted(async () => {
    await contractStore.fetchContracts();
    await syncSelectedContractFromRoute();
});

watch(
    () => route.query.contractId,
    () => {
        void syncSelectedContractFromRoute();
    }
);
</script>

<template>
    <div class="max-w-[1400px] mx-auto px-4 py-12 text-slate-900 md:px-8">
        <!-- Header -->
        <div v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0 }" class="mb-8">
            <div class="flex items-center justify-between flex-wrap gap-4 mb-3">
                <div class="flex items-center gap-3">
                    <FileText class="h-10 w-10 text-[#21AFBF]" />
                    <h1 class="text-4xl font-bold text-slate-950">
                        계약서
                    </h1>
                </div>
                <button
                    @click="navigateToCreateContract"
                    class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-5 py-3 font-semibold text-slate-900 shadow-lg"
                    v-motion
                    :hover="{ scale: 1.05 }"
                    :tap="{ scale: 0.95 }"
                >
                    <FilePlus class="h-5 w-5" />
                    계약서 작성
                </button>
            </div>
            <p class="text-slate-600">프리랜서와의 계약을 확인하세요</p>
        </div>

        <!-- Search, Sort, and Filter -->
        <div
            class="mb-8 space-y-4 relative z-20"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 0.1 } }"
        >
            <!-- Search Bar and Sort Dropdown -->
            <div class="flex flex-col sm:flex-row gap-4">
                <!-- Search Bar -->
                <div class="relative flex-1">
                    <Search class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="프로젝트명 또는 프리랜서 이름으로 검색..."
                        class="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-slate-900 placeholder-slate-400 transition-colors focus:border-[#21AFBF] focus:outline-none"
                    />
                </div>

                <button
                    @click="resetFilters"
                    class="min-w-[96px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50"
                >
                    초기화
                </button>

                <!-- Sort Dropdown -->
                <div class="relative">
                    <button
                        @click="isDropdownOpen = !isDropdownOpen"
                        class="flex min-w-[160px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        <span>{{ currentSortLabel }}</span>
                        <ChevronDown
                            class="h-4 w-4 transition-transform"
                            :class="{ 'rotate-180': isDropdownOpen }"
                        />
                    </button>
                    <div
                        v-if="isDropdownOpen"
                        class="absolute right-0 top-full mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                    >
                        <button
                            v-for="option in sortOptions"
                            :key="option.value"
                            @click="selectSortOption(option.value)"
                            class="w-full px-4 py-3 text-left text-slate-700 transition-colors hover:bg-slate-50"
                            :class="{ 'bg-sky-50 text-slate-900': sortOption === option.value }"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Status Filter Chips -->
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="filter in statusFilters"
                    :key="filter.value"
                    @click="selectedStatus = filter.value"
                    class="px-4 py-2 rounded-full text-sm font-medium transition-all"
                    :class="
                        selectedStatus === filter.value
                            ? 'border border-sky-200 bg-sky-50 text-slate-900 shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    "
                >
                    {{ filter.label }}
                </button>
            </div>
        </div>

        <!-- Results Count -->
        <div class="mb-6 text-sm text-slate-500">
            {{ filteredAndSortedContracts.length }}개의 계약서
        </div>

        <!-- Empty State -->
        <div
            v-if="filteredAndSortedContracts.length === 0"
            class="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
            v-motion
            :initial="{ opacity: 0, scale: 0.95 }"
            :enter="{ opacity: 1, scale: 1 }"
        >
            <div
                class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sky-50"
                v-motion
                :initial="{ scale: 0 }"
                :enter="{ scale: 1, transition: { type: 'spring', delay: 0.2 } }"
            >
                <FileText class="h-10 w-10 text-[#21AFBF]" />
            </div>
            <h3 class="mb-3 text-2xl font-semibold text-slate-900">
                {{ searchQuery || selectedStatus !== 'ALL' ? '검색 결과가 없습니다' : '계약이 없습니다' }}
            </h3>
            <p class="text-slate-500">
                {{ searchQuery || selectedStatus !== 'ALL' ? '다른 검색어나 필터를 시도해보세요' : '새로운 프로젝트를 시작해보세요' }}
            </p>
        </div>

        <!-- Contract List -->
        <div v-else class="space-y-6">
            <div
                v-for="(contract, index) in filteredAndSortedContracts"
                :key="contract.id"
                class="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all hover:border-sky-200"
                v-motion
                :initial="{ opacity: 0, y: 20 }"
                :enter="{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }"
                :hover="{ y: -4 }"
            >
                <!-- Header -->
                <div class="mb-8">
                    <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <h2 class="text-3xl font-bold text-slate-950">{{ contract.projectName }}</h2>
                        <div
                            v-if="statusConfig[contract.status]"
                            :class="`ml-auto flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-medium shadow-sm sm:self-auto ${statusConfig[contract.status].badgeClass}`"
                        >
                            <component
                                :is="statusConfig[contract.status].icon"
                                class="h-4 w-4"
                            />
                            {{ statusConfig[contract.status].label }}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 text-slate-500">
                        <Sparkles class="h-4 w-4 text-[#21AFBF]" />
                        담당자: {{ contract.freelancerName }}
                    </div>
                </div>

                <!-- Footer -->
                <div
                    class="flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-8 lg:flex-row lg:items-center"
                >
                    <div class="flex flex-wrap gap-6 text-slate-500">
                        <div class="flex items-center gap-2">
                            <Calendar class="h-4 w-4 text-[#21AFBF]" />
                            <span class="text-sm">
                                {{ formatDate(contract.startDate) }} ~
                                {{ formatDate(contract.endDate) }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <DollarSign class="h-4 w-4 text-[#21AFBF]" />
                            <span class="text-sm font-medium text-slate-700"
                                >총 {{ formatCurrency(contract.budget) }}</span
                            >
                        </div>
                    </div>

                    <button
                        @click="openContractDetail(contract)"
                        class="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-6 py-3 font-semibold text-slate-900 shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        <Eye class="h-4 w-4" />
                        상세보기
                    </button>
                </div>
            </div>
        </div>

        <!-- Contract Detail Modal -->
        <ContractDetailModal
            v-if="selectedContract"
            :contract="selectedContract"
            :initial-tab="selectedContractTab"
            @close="selectedContract = null"
        />
    </div>
</template>
