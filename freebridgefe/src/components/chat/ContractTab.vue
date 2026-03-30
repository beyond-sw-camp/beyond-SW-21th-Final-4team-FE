<template>
    <div class="custom-scrollbar flex h-full flex-col overflow-y-auto bg-slate-50">
        <div class="sticky top-0 z-10 border-b border-sky-200/70 bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] p-6">
            <h2 class="text-xl font-bold text-[#0f2b2e]">계약 관리</h2>
            <p class="mt-1 text-sm text-[#0f2b2e]/80">
                채팅에서는 계약 상태만 확인하고, 실제 작성과 서명은 계약 화면에서 진행합니다.
            </p>
        </div>

        <div class="p-6 flex-1">
            <div
                v-if="isContractLookupPending"
                class="h-full min-h-[320px] flex flex-col items-center justify-center text-center space-y-4"
            >
                <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <Loader2Icon class="w-8 h-8 animate-spin text-[#21AFBF]" />
                </div>
                <div>
                    <h3 class="text-lg font-bold text-slate-900">계약 정보를 불러오는 중입니다</h3>
                    <p class="mt-2 text-sm text-slate-500">잠시 후 현재 대화와 연결된 계약 상태를 확인합니다.</p>
                </div>
            </div>

            <div
                v-else-if="!displayContract && !hasContractCandidates"
                class="h-full min-h-[320px] flex flex-col items-center justify-center text-center space-y-4"
            >
                <div class="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <FileTextIcon class="w-10 h-10 text-slate-400" />
                </div>
                <div class="space-y-2">
                    <h3 class="text-lg font-bold text-slate-900">연결된 계약이 없습니다</h3>
                    <p class="max-w-md text-sm leading-relaxed text-slate-500">
                        {{ emptyStateDescription }}
                    </p>
                </div>
                <div class="mt-2 flex flex-col gap-3">
                    <button
                        @click="openContractPage"
                        class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-6 py-3 font-semibold text-[#0f2b2e] transition-all hover:brightness-105"
                    >
                        {{ primaryActionLabel }}
                        <ArrowRightIcon class="w-4 h-4" />
                    </button>
                    <button
                        @click="openLegalAdvicePage"
                        class="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-sky-100"
                    >
                        <ScaleIcon class="w-4 h-4" />
                        법률 자문 AI 보기
                    </button>
                </div>
            </div>

            <div v-else class="space-y-6">
                <div
                    v-if="hasContractCandidates"
                    class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                    <div class="border-b border-slate-200 px-6 py-4">
                        <p class="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">계약 목록</p>
                        <h3 class="text-lg font-bold text-slate-900">
                            {{ contractCandidates.length > 1 ? '이 대화와 연결된 계약들' : '이 대화와 연결된 계약' }}
                        </h3>
                        <p class="mt-1 text-sm text-slate-500">
                            {{ contractCandidates.length > 1 ? '여러 계약이 있어 목록 중에 계약을 선택하여 확인할 수 있습니다.' : '현재 대화 상대와 연결된 계약입니다.' }}
                        </p>
                    </div>

                    <div class="p-4 space-y-3">
                        <button
                            v-for="contract in contractCandidates"
                            :key="contract.contractId"
                            type="button"
                            @click="openContractModule(contract.contractId)"
                            :class="[
                                'w-full rounded-2xl border px-4 py-4 text-left transition-colors',
                                Number(displayContract?.contractId) === Number(contract.contractId)
                                    ? 'border-[#21AFBF]/35 bg-[#21AFBF]/10'
                                    : 'border-slate-200 bg-white hover:border-[#21AFBF]/25 hover:bg-slate-50'
                            ]"
                        >
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0">
                                    <p class="truncate text-base font-semibold text-slate-900">{{ contract.projectName }}</p>
                                    <p class="mt-1 text-sm text-slate-500">계약번호 · {{ contract.contractId }}</p>
                                    <p class="mt-2 text-sm text-slate-500">
                                        {{ formatDate(contract.startDate) }} ~ {{ formatDate(contract.endDate) }}
                                    </p>
                                </div>
                                <div class="text-right shrink-0">
                                    <span
                                        :class="statusConfig[contract.status].badgeClass"
                                        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border"
                                    >
                                        {{ statusConfig[contract.status].label }}
                                    </span>
                                    <p class="mt-3 text-sm font-semibold text-slate-900">{{ formatCurrency(contract.budget) }}</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                <div
                    v-if="hasContractCandidates"
                    class="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm"
                >
                    <p class="text-base font-semibold text-slate-900">확인할 계약을 선택하세요</p>
                    <p class="mt-2 text-sm text-slate-500">위 목록에서 계약을 선택하시면 계약 정보 모듈이 열립니다.</p>
                </div>
            </div>
        </div>
    </div>

    <div
        v-if="displayContract && isContractModuleOpen"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-sm"
        @click.self="closeContractModule"
    >
        <div class="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                    <p class="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">현재 계약</p>
                    <h3 class="text-xl font-bold text-slate-900">{{ displayContract.projectName }}</h3>
                    <p class="mt-1 text-sm text-slate-500">
                        계약번호 · {{ displayContract.contractId }}
                    </p>
                </div>
                <div class="flex items-center gap-3">
                    <div
                        :class="currentStatusConfig.badgeClass"
                        class="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold border"
                    >
                        <component :is="currentStatusConfig.icon" class="w-4 h-4" />
                        {{ currentStatusConfig.label }}
                    </div>
                    <button
                        type="button"
                        @click="closeContractModule"
                        class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        aria-label="계약 정보 닫기"
                    >
                        닫기
                    </button>
                </div>
            </div>

            <div class="custom-scrollbar max-h-[calc(90vh-88px)] overflow-y-auto p-6 space-y-6">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-sm leading-relaxed text-slate-700">
                        {{ currentStatusConfig.description }}
                    </p>
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p class="text-xs uppercase tracking-wider text-slate-500">상대방</p>
                        <p class="mt-2 text-base font-semibold text-slate-900">{{ otherParticipantName }}</p>
                    </div>
                    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p class="text-xs uppercase tracking-wider text-slate-500">총 계약금액</p>
                        <p class="mt-2 text-base font-semibold text-slate-900">{{ formatCurrency(displayContract.budget) }}</p>
                    </div>
                    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p class="text-xs uppercase tracking-wider text-slate-500">계약 기간</p>
                        <p class="mt-2 text-base font-semibold text-slate-900">
                            {{ formatDate(displayContract.startDate) }} ~ {{ formatDate(displayContract.endDate) }}
                        </p>
                    </div>
                    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p class="text-xs uppercase tracking-wider text-slate-500">정산일</p>
                        <p class="mt-2 text-base font-semibold text-slate-900">
                            매월 {{ displayContract.paymentDay || 25 }}일
                        </p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div>
                            <p class="text-sm font-semibold text-slate-900">고용주 서명</p>
                            <p class="mt-1 text-xs text-slate-500">계약 화면에서만 서명할 수 있습니다.</p>
                        </div>
                        <span
                            :class="displayContract.employerSignedDate ? 'text-slate-700 border-emerald-200 bg-emerald-50' : 'text-slate-600 border-slate-200 bg-white'"
                            class="px-3 py-1.5 rounded-full text-xs font-semibold border"
                        >
                            {{ displayContract.employerSignedDate ? '완료' : '대기중' }}
                        </span>
                    </div>
                    <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div>
                            <p class="text-sm font-semibold text-slate-900">프리랜서 서명</p>
                            <p class="mt-1 text-xs text-slate-500">계약 화면에서만 서명할 수 있습니다.</p>
                        </div>
                        <span
                            :class="displayContract.freelancerSignedDate ? 'text-slate-700 border-emerald-200 bg-emerald-50' : 'text-slate-600 border-slate-200 bg-white'"
                            class="px-3 py-1.5 rounded-full text-xs font-semibold border"
                        >
                            {{ displayContract.freelancerSignedDate ? '완료' : '대기중' }}
                        </span>
                    </div>
                </div>

                <button
                    @click="openContractPage"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-6 py-3 font-semibold text-[#0f2b2e] transition-all hover:brightness-105"
                >
                    {{ primaryActionLabel }}
                    <ArrowRightIcon class="w-4 h-4" />
                </button>
                <button
                    @click="openLegalAdvicePage"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-6 py-3 font-semibold text-slate-700 transition-colors hover:bg-sky-100"
                >
                    <ScaleIcon class="w-4 h-4" />
                    법률 자문 AI 보기
                </button>
            </div>
        </div>
    </div>

    <ContractDetailModal
        v-if="selectedLegalAdviceContract"
        :contract="selectedLegalAdviceContract"
        :is-freelancer="!isEmployer"
        initial-tab="ai-advice"
        @close="selectedLegalAdviceContract = null"
    />

</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useContractStore, type ContractWithDetails } from '@/stores/contractStore';
import ContractDetailModal from '@/views/employer/Contracts/components/ContractDetailModal.vue';
import {
    AlertCircle as AlertCircleIcon,
    ArrowRight as ArrowRightIcon,
    CheckCircle as CheckCircleIcon,
    Clock as ClockIcon,
    FileText as FileTextIcon,
    Loader2 as Loader2Icon,
    Scale as ScaleIcon,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const props = defineProps<{
    roomId: string;
    isActive?: boolean;
}>();

const authStore = useAuthStore();
const chatStore = useChatStore();
const contractStore = useContractStore();
const router = useRouter();
const selectedLegalAdviceContract = ref<ContractWithDetails | null>(null);

const currentRoom = computed(() => chatStore.rooms.find((room) => room.id === props.roomId));
const isEmployer = computed(() => authStore.user?.role === 'EMPLOYER');
const otherParticipantId = computed(() => {
    if (!currentRoom.value) return null;
    return chatStore.getOtherParticipantId(currentRoom.value) || null;
});
const otherParticipantName = computed(() => {
    if (!currentRoom.value) return '알 수 없음';
    return chatStore.getOtherParticipantName(currentRoom.value);
});

function getContractSortTimestamp(value: Date | string | undefined) {
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function parseParticipantNumericId(participantId: string | null) {
    if (!participantId) return null;
    const matchedParticipant = String(participantId).match(/^[efa](\d+)$/i);
    if (matchedParticipant) {
        return Number(matchedParticipant[1]);
    }
    const numericId = Number(participantId);
    return Number.isFinite(numericId) ? numericId : null;
}

const roomParticipantIds = computed(() => {
    if (!authStore.user || !otherParticipantId.value) return null;

    const myUserId = Number(authStore.user.id);
    const counterpartId = parseParticipantNumericId(otherParticipantId.value);
    if (!Number.isFinite(myUserId) || !Number.isFinite(counterpartId)) return null;

    return {
        employerId: isEmployer.value ? myUserId : counterpartId,
        freelancerId: isEmployer.value ? counterpartId : myUserId,
    };
});

const relatedContracts = computed(() => {
    if (!roomParticipantIds.value) return [];

    return [...contractStore.contracts]
        .filter(
            (contract) =>
                Number(contract.employerId) === roomParticipantIds.value!.employerId &&
                Number(contract.freelancerId) === roomParticipantIds.value!.freelancerId
        )
        .sort((left, right) => {
            const endDateDiff = getContractSortTimestamp(right.endDate) - getContractSortTimestamp(left.endDate);
            if (endDateDiff !== 0) return endDateDiff;
            return Number(right.contractId) - Number(left.contractId);
        });
});

const linkedContract = computed(() => contractStore.findContractForChatRoom(currentRoom.value));
const isEnsuringContractRoom = ref(false);
const selectedContractId = ref<number | null>(null);
const isContractModuleOpen = ref(false);

const autoConnectableContract = computed(() => {
    if (!props.isActive || !currentRoom.value || currentRoom.value.contractId) {
        return null;
    }
    if (relatedContracts.value.length === 1) {
        return relatedContracts.value[0];
    }

    const contextMatchedContracts = relatedContracts.value.filter((contract) =>
        contractStore.matchesRoomContractContext(contract, currentRoom.value)
    );
    if (contextMatchedContracts.length === 1) {
        return contextMatchedContracts[0];
    }

    return null;
});

const contractCandidates = computed(() => {
    if (linkedContract.value) {
        return relatedContracts.value.some((contract) => Number(contract.contractId) === Number(linkedContract.value?.contractId))
            ? relatedContracts.value
            : [linkedContract.value, ...relatedContracts.value];
    }
    return relatedContracts.value;
});

const displayContract = computed(() => {
    if (selectedContractId.value != null) {
        return contractCandidates.value.find(
            (contract) => Number(contract.contractId) === Number(selectedContractId.value)
        ) || null;
    }

    if (linkedContract.value) {
        return linkedContract.value;
    }

    if (autoConnectableContract.value) {
        return autoConnectableContract.value;
    }

    return null;
});

const hasContractCandidates = computed(() => {
    return contractCandidates.value.length > 0;
});
const isContractLookupPending = computed(() => {
    return contractStore.isContractsLoading && !displayContract.value && !hasContractCandidates.value;
});

watch(
    [() => props.isActive, currentRoom, autoConnectableContract],
    ([isActive, room, contract]) => {
        if (!isActive || !room || room.contractId || !contract?.contractId || isEnsuringContractRoom.value) {
            return;
        }

        isEnsuringContractRoom.value = true;
        void chatStore
            .ensureContractRoomFromSourceRoom(room.id, contract.contractId)
            .catch((error) => {
                console.warn('Failed to ensure contract room from chat tab.', error);
            })
            .finally(() => {
                isEnsuringContractRoom.value = false;
            });
    },
    { immediate: true },
);

watch(
    [contractCandidates, linkedContract],
    ([contracts, linked]) => {
        if (linked?.contractId) {
            selectedContractId.value = linked.contractId;
            return;
        }

        if (contracts.length === 1) {
            selectedContractId.value = contracts[0].contractId;
            return;
        }

        if (
            selectedContractId.value != null &&
            contracts.some((contract) => Number(contract.contractId) === Number(selectedContractId.value))
        ) {
            return;
        }

        selectedContractId.value = null;
    },
    { immediate: true },
);

const statusConfig = {
    WAITING_SIGNATURE: {
        label: '서명 대기중',
        badgeClass: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
        description: '실제 서명은 계약 화면에서만 진행합니다. 채팅에서는 현재 서명 진행 상태만 확인할 수 있습니다.',
        icon: ClockIcon,
    },
    IN_PROGRESS: {
        label: '진행중',
        badgeClass: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
        description: '계약이 활성화되었습니다. 세부 계약서와 정산 상태는 계약/정산 화면에서 확인하세요.',
        icon: CheckCircleIcon,
    },
    COMPLETED: {
        label: '완료됨',
        badgeClass: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
        description: '완료된 계약입니다. 최종 계약 내용과 정산 내역은 계약 화면에서 확인하세요.',
        icon: CheckCircleIcon,
    },
    REJECTED: {
        label: '거절됨',
        badgeClass: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
        description: '거절된 계약입니다. 조건을 조정해 다시 진행하려면 계약 화면에서 새 계약을 작성하세요.',
        icon: AlertCircleIcon,
    },
} as const;

const currentStatusConfig = computed(() => {
    if (!displayContract.value) {
        return statusConfig.WAITING_SIGNATURE;
    }
    return statusConfig[displayContract.value.status];
});

const primaryActionLabel = computed(() => {
    if (!displayContract.value) {
        if (hasContractCandidates.value) return '계약 목록으로 이동';
        return isEmployer.value ? '계약서 작성 화면으로 이동' : '계약 목록으로 이동';
    }
    if (displayContract.value.status === 'REJECTED' && isEmployer.value) {
        return '계약서 다시 작성 화면으로 이동';
    }
    return '계약 화면으로 이동';
});

const emptyStateDescription = computed(() => {
    if (hasContractCandidates.value) {
        return '계약은 계약별 채팅방에 따로 연결됩니다. 이 대화방은 일반 대화방이므로 계약 상태는 해당 계약 채팅방이나 계약 탭에서 확인하세요.';
    }
    if (isEmployer.value) {
        return '채팅에서는 계약서를 작성하지 않습니다. 계약서 생성은 계약 탭에서 진행하고, 생성된 상태만 이 탭에서 확인합니다.';
    }
    return '채팅에서는 계약 요청이나 서명을 진행하지 않습니다. 계약 상태 확인과 서명은 계약 탭에서 진행하세요.';
});

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

function formatDate(date: Date | string | undefined) {
    if (!date) return '-';
    return format(new Date(date), 'yyyy.MM.dd', { locale: ko });
}

function openContractPage() {
    const targetRouteName =
        hasContractCandidates.value
            ? isEmployer.value
                ? 'employer.contracts'
                : 'freelancer.contracts'
            : !displayContract.value && isEmployer.value
            ? 'employer.contracts.create'
            : displayContract.value?.status === 'REJECTED' && isEmployer.value
              ? 'employer.contracts.create'
              : isEmployer.value
                ? 'employer.contracts'
                : 'freelancer.contracts';

    const query: Record<string, string> = {
        roomId: props.roomId,
    };

    if (currentRoom.value?.relatedJobId) {
        query.jobId = String(currentRoom.value.relatedJobId);
    }
    if (currentRoom.value?.relatedApplicationId) {
        query.applicationId = String(currentRoom.value.relatedApplicationId);
    }
    if (currentRoom.value?.relatedProposalId) {
        query.proposalId = String(currentRoom.value.relatedProposalId);
    }
    if (displayContract.value?.contractId) {
        query.contractId = String(displayContract.value.contractId);
    } else if (currentRoom.value?.contractId) {
        query.contractId = String(currentRoom.value.contractId);
    }

    router.push({ name: targetRouteName, query });
}

function openContractModule(contractId: number) {
    selectedContractId.value = contractId;
    isContractModuleOpen.value = true;
}

function closeContractModule() {
    isContractModuleOpen.value = false;
}

function openLegalAdvicePage() {
    const contractToOpen = displayContract.value || linkedContract.value || autoConnectableContract.value || null;

    if (!contractToOpen) {
        window.alert('채팅과 바로 연결된 계약이 없어 법률 자문 모달을 열 수 없습니다. 계약 목록에서 먼저 계약을 확인해 주세요.');
        return;
    }

    selectedLegalAdviceContract.value = contractToOpen;
}
</script>
