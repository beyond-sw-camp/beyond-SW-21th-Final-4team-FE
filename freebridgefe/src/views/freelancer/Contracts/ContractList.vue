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
    Search,
    ChevronDown,
    PenTool,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useContractStore, type ContractWithDetails } from '@/stores/contractStore';
import ContractDetailModal from '@/views/employer/Contracts/components/ContractDetailModal.vue';
import SignaturePadModal from '@/views/employer/Contracts/components/SignaturePadModal.vue';
import { signContract } from '@/api/contractApi';

const authStore = useAuthStore();
const chatStore = useChatStore();
const contractStore = useContractStore();
const route = useRoute();
const router = useRouter();

const selectedContract = ref<ContractWithDetails | null>(null);
const selectedContractTab = ref<'details' | 'contract' | 'ai-advice'>('details');
const signingContract = ref<ContractWithDetails | null>(null);

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
    // Filter contracts where user is freelancer
    return contractStore.contractsWithDetails.filter((c) => c.freelancerId === Number(authStore.user!.id));
});

const filteredAndSortedContracts = computed(() => {
    let result = [...myContracts.value];

    // Filter by search query
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase().trim();
        result = result.filter(
            (c) =>
                c.projectName.toLowerCase().includes(query) ||
                c.employerName.toLowerCase().includes(query)
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
    { label: string; badgeClass: string; icon: typeof CheckCircle | typeof Clock }
> = {
    DRAFT: {
        label: '작성 중',
        badgeClass: 'border border-slate-200/80 bg-slate-50 text-slate-700',
        icon: PenTool,
    },
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

const signError = ref('');

const handleFreelancerSign = async (data: { signature: string; freelancerAddress?: string; freelancerPhone?: string }) => {
    if (!signingContract.value) return;
    signError.value = '';
    try {
        const response = await signContract(signingContract.value.contractId, {
            signature: data.signature,
            freelancerAddress: data.freelancerAddress,
            freelancerPhone: data.freelancerPhone,
        });
        contractStore.updateContract(signingContract.value.id, response);
        signingContract.value = null;
        selectedContract.value = null;
    } catch (err: any) {
        signError.value = err?.response?.data?.message || err?.message || '서명에 실패했습니다.';
    }
};

const openSignModal = (contract: ContractWithDetails) => {
    signingContract.value = contract;
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
        try {
            await contractStore.fetchContracts();
        } catch (error) {
            console.error('계약 목록 재조회 중 오류가 발생했습니다:', error);
        }
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
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 text-slate-900 font-sans">
    <!-- Header -->
    <div
      class="mb-12"
      data-tour="freelancer-contracts-header"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <div class="flex items-center gap-3 mb-3">
        <FileText class="w-10 h-10 text-[#21AFBF]" />
        <h1 class="text-4xl font-bold text-slate-950">
          내 계약서
        </h1>
      </div>
      <p class="text-slate-600">
        진행 중인 프로젝트 계약을 안전하게 관리하세요
      </p>
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
                    <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="프로젝트명 또는 고용주 이름으로 검색..."
                        class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#21AFBF]/50 focus:outline-none transition-colors"
                    />
                </div>

                <button
                    @click="resetFilters"
                    class="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors min-w-[96px]"
                >
                    초기화
                </button>

                <!-- Sort Dropdown -->
                <div class="relative">
                    <button
                        @click="isDropdownOpen = !isDropdownOpen"
                        class="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors min-w-[160px] justify-between"
                    >
                        <span>{{ currentSortLabel }}</span>
                        <ChevronDown
                            class="w-4 h-4 transition-transform"
                            :class="{ 'rotate-180': isDropdownOpen }"
                        />
                    </button>
                    <div
                        v-if="isDropdownOpen"
                        class="absolute top-full mt-2 right-0 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl"
                    >
                        <button
                            v-for="option in sortOptions"
                            :key="option.value"
                            @click="selectSortOption(option.value)"
                            class="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors"
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
                            ? 'border border-sky-200/80 bg-sky-50 text-slate-900 shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    "
                >
                    {{ filter.label }}
                </button>
            </div>
        </div>

        <!-- Results Count -->
        <div class="mb-6 text-slate-500 text-sm">
            {{ filteredAndSortedContracts.length }}개의 계약서
        </div>

        <!-- Empty State -->
        <div
            v-if="filteredAndSortedContracts.length === 0"
            class="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
            v-motion
            :initial="{ opacity: 0, scale: 0.95 }"
            :enter="{ opacity: 1, scale: 1 }"
        >
            <div
                class="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-6"
                v-motion
                :initial="{ scale: 0 }"
                :enter="{ scale: 1, transition: { type: 'spring', delay: 0.2 } }"
            >
                <FileText class="w-10 h-10 text-[#21AFBF]" />
            </div>
            <h3 class="text-2xl font-semibold mb-3 text-slate-950">
                {{ searchQuery || selectedStatus !== 'ALL' ? '검색 결과가 없습니다' : '계약이 없습니다' }}
            </h3>
            <p class="text-slate-500">
                {{ searchQuery || selectedStatus !== 'ALL' ? '다른 검색어나 필터를 시도해보세요' : '새로운 프로젝트를 찾아서 계약을 진행해보세요' }}
            </p>
        </div>

        <!-- Contract List -->
        <div v-else class="space-y-6">
            <div
                v-for="(contract, index) in filteredAndSortedContracts"
                :key="contract.id"
                class="bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] hover:border-sky-200 transition-all"
                v-motion
                :initial="{ opacity: 0, y: 20 }"
                :enter="{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }"
                :hover="{ y: -4 }"
            >
                <!-- Header -->
                <div class="mb-8">
                    <div class="flex flex-col gap-3 mb-3 sm:flex-row sm:items-start sm:justify-between">
                        <h2 class="text-3xl font-bold text-slate-950">{{ contract.projectName }}</h2>
                        <div
                            v-if="statusConfig[contract.status]"
                            :class="`ml-auto px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 self-end ${statusConfig[contract.status].badgeClass}`"
                        >
                            <component
                                :is="statusConfig[contract.status].icon"
                                class="w-4 h-4"
                            />
                            {{ statusConfig[contract.status].label }}
                        </div>
                    </div>
                    <div class="text-slate-500 flex items-center gap-2">
                        <Sparkles class="w-4 h-4 text-[#21AFBF]" />
                        고용주: {{ contract.employerName }}
                    </div>
                </div>

                <!-- Footer -->
                <div
                    class="flex flex-col lg:flex-row items-start lg:items-center justify-between pt-8 border-t border-slate-200 gap-4"
                >
                    <div class="flex flex-wrap gap-6 text-slate-500">
                        <div class="flex items-center gap-2">
                            <Calendar class="w-4 h-4" />
                            <span class="text-sm">
                                {{ formatDate(contract.startDate) }} ~
                                {{ formatDate(contract.endDate) }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <DollarSign class="w-4 h-4" />
                            <span class="text-sm font-medium text-slate-700"
                                >총 {{ formatCurrency(contract.budget) }}</span
                            >
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <button
                            v-if="contract.status === 'WAITING_SIGNATURE' && contract.employerSigned && !contract.freelancerSigned"
                            @click="openSignModal(contract)"
                            class="px-6 py-3 rounded-full font-semibold flex items-center gap-2 border border-orange-200 bg-orange-50 text-slate-700 shadow-sm hover:bg-orange-100 hover:scale-105 active:scale-95 transition-all"
                        >
                            <PenTool class="w-4 h-4" />
                            서명하기
                        </button>
                    <button
                      @click="openContractDetail(contract)"
                      class="px-6 py-3 rounded-full font-semibold flex items-center gap-2 bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] text-slate-900 shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                            <Eye class="w-4 h-4" />
                            상세보기
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contract Detail Modal -->
        <ContractDetailModal
            v-if="selectedContract"
            :contract="selectedContract"
            :isFreelancer="true"
            :initial-tab="selectedContractTab"
            @close="selectedContract = null"
            @sign="openSignModal(selectedContract!)"
        />

        <!-- Freelancer Signature Modal -->
        <SignaturePadModal
            v-if="signingContract && authStore.user"
            :signerName="authStore.user.name"
            :error="signError"
            :isFreelancer="true"
            @sign="handleFreelancerSign"
            @close="signingContract = null; signError = ''"
        />
    </div>
</template>
