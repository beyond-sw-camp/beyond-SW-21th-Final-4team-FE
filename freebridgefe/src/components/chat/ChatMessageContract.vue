<template>
    <div class="my-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <div class="flex items-center gap-3 border-b border-sky-200/70 bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-4 py-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80">
                <FileTextIcon class="w-4 h-4 text-[#0f2b2e]" />
            </div>
            <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-[#0f2b2e]/80">계약 알림</p>
                <p class="text-sm font-bold text-[#0f2b2e]">{{ contractTitle }}</p>
            </div>
        </div>

        <div class="p-4 space-y-3">
            <div class="flex justify-between items-center text-sm gap-3">
                <span class="text-slate-500">상태</span>
                <span :class="statusBadgeClass">
                    {{ statusLabel }}
                </span>
            </div>

            <div class="space-y-1">
                <p class="text-xs text-slate-500">프로젝트명</p>
                <p class="truncate text-sm font-medium text-slate-800">{{ contractProjectName }}</p>
            </div>

            <div v-if="contractNumberLabel" class="text-xs text-slate-500">
                계약번호 · {{ contractNumberLabel }}
            </div>

            <div v-if="isLoadingContract" class="text-xs text-slate-500">
                계약 정보를 불러오는 중입니다.
            </div>

            <p class="text-xs leading-relaxed text-slate-600">
                채팅에서는 계약 상태만 볼 수 있습니다. 상세 확인과 서명은 계약 기능에서 진행하세요.
            </p>

            <button
                class="w-full rounded-lg bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] py-2 text-xs font-semibold text-[#0f2b2e] transition-all hover:brightness-105"
                @click="openContractPage"
            >
                계약으로 이동
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { FileText as FileTextIcon } from 'lucide-vue-next';
import type { ChatMessage } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useContractStore } from '@/stores/contractStore';

const props = defineProps<{
    message?: ChatMessage;
}>();

const authStore = useAuthStore();
const contractStore = useContractStore();
const router = useRouter();

const contractIdentifier = computed(() => {
    const raw = props.message?.metadata?.contractId;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
});

const contractDetails = computed(() => {
    if (!contractIdentifier.value) return null;
    return contractStore.findContractByAnyId(contractIdentifier.value);
});

const isEmployer = computed(() => authStore.user?.role === 'EMPLOYER');
const isLoadingContract = computed(() => contractStore.isContractsLoading && !contractDetails.value);
const contractTitle = computed(() => contractDetails.value?.projectName || '계약 상태 알림');
const contractProjectName = computed(() => contractDetails.value?.projectName || props.message?.content || '계약 정보 확인 필요');
const contractNumberLabel = computed(() => {
    if (contractDetails.value?.contractId) return String(contractDetails.value.contractId);
    if (contractIdentifier.value) return String(contractIdentifier.value);
    return '';
});

const resolvedStatus = computed(() => contractDetails.value?.status || props.message?.metadata?.status || '');

const statusLabel = computed(() => {
    if (resolvedStatus.value === 'WAITING_SIGNATURE') return '서명 대기중';
    if (resolvedStatus.value === 'IN_PROGRESS') return '진행 중';
    if (resolvedStatus.value === 'COMPLETED') return '완료';
    if (resolvedStatus.value === 'REJECTED') return '거절됨';
    if (isLoadingContract.value) return '조회 중';
    return '확인 필요';
});

const statusBadgeClass = computed(() => {
    if (resolvedStatus.value === 'WAITING_SIGNATURE') {
        return 'px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-slate-700 border border-amber-200';
    }
    if (resolvedStatus.value === 'IN_PROGRESS') {
        return 'px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-slate-700 border border-sky-200';
    }
    if (resolvedStatus.value === 'COMPLETED') {
        return 'px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-slate-700 border border-emerald-200';
    }
    if (resolvedStatus.value === 'REJECTED') {
        return 'px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-slate-700 border border-rose-200';
    }
    return 'px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200';
});

function openContractPage() {
    const query: Record<string, string> = {};
    if (props.message?.roomId) {
        query.roomId = props.message.roomId;
    }
    if (contractDetails.value?.contractId) {
        query.contractId = String(contractDetails.value.contractId);
    } else if (contractIdentifier.value) {
        query.contractId = String(contractIdentifier.value);
    }

    router.push({
        name: isEmployer.value ? 'employer.contracts' : 'freelancer.contracts',
        query,
    });
}

onMounted(() => {
    if (contractStore.isContractsLoading) return;
    const loadContracts = contractIdentifier.value && !contractDetails.value
        ? contractStore.fetchContracts()
        : contractStore.ensureContractsLoaded();

    void loadContracts.catch((error) => {
        console.error('Failed to load contracts for contract alert:', error);
    });
});
</script>
