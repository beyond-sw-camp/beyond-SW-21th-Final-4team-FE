<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { X, FileText, Calendar, DollarSign, CheckCircle, User, PenTool, Clock, MapPin, Briefcase, Shield, ScrollText, Loader2, Scale, Sparkles } from 'lucide-vue-next';
import type { ContractWithDetails } from '@/stores/contractStore';
import ContractPreview from '@/components/contract/ContractPreview.vue';
import { getContract, requestAiLegalReview } from '@/api/contractApi';
import { getUserById } from '@/api/authApi';

type ViewTab = 'details' | 'contract' | 'ai-advice';

const props = defineProps<{
    contract: ContractWithDetails;
    isFreelancer?: boolean;
    initialTab?: ViewTab;
}>();

defineEmits<{
    (e: 'close'): void;
    (e: 'sign'): void;
}>();

const statusLabels: Record<string, string> = {
    WAITING_SIGNATURE: '서명 대기',
    IN_PROGRESS: '진행 중',
    COMPLETED: '완료',
    REJECTED: '거절됨',
};

// Full contract detail (fetched on open; falls back to prop if fetch fails)
const fullContract = ref<ContractWithDetails>(props.contract);
const isLoadingDetail = ref(false);
const isRequestingAiLegalReview = ref(false);
const hasRequestedAiLegalReview = ref(false);
const route = useRoute();

const placeholderPattern = /(user|사용자)\s*#\s*\d+/i;
const numericOnlyPattern = /^\s*#?\d+\s*$/;
const needsName = (name?: string | null) => {
    if (!name) return true;
    const trimmed = name.trim();
    return (
        trimmed.length === 0 ||
        trimmed === 'Unknown' ||
        placeholderPattern.test(trimmed) ||
        numericOnlyPattern.test(trimmed)
    );
};

const resolveUserName = async (userId?: number, currentName?: string | null) => {
    if (!userId || !needsName(currentName)) return currentName || '';
    try {
        const user = await getUserById(userId);
        const payload = (user as any)?.data ?? user;
        return (
            payload?.name ||
            payload?.fullName ||
            payload?.username ||
            payload?.nickname ||
            payload?.userName ||
            payload?.memberName ||
            payload?.realName ||
            currentName ||
            ''
        );
    } catch {
        return currentName || '';
    }
};

const loadContractDetail = async () => {
    isLoadingDetail.value = true;
    try {
        const detail = await getContract(props.contract.contractId);
        const merged = { ...props.contract, ...detail };
        const [freelancerName, employerName] = await Promise.all([
            resolveUserName(merged.freelancerId, merged.freelancerName),
            resolveUserName(merged.employerId, merged.employerName),
        ]);
        fullContract.value = {
            ...merged,
            freelancerName: freelancerName || merged.freelancerName,
            employerName: employerName || merged.employerName,
        };
    } catch {
        // keep prop data as fallback
    } finally {
        isLoadingDetail.value = false;
    }
};

// Use employerSigned / freelancerSigned from API response (available in both list & detail)
const canSign = computed(() => {
    if (fullContract.value.status !== 'WAITING_SIGNATURE') return false;
    if (props.isFreelancer) {
        return fullContract.value.employerSigned && !fullContract.value.freelancerSigned;
    }
    return false;
});

const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR');
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
};

const isFlexibleWork = computed(() => fullContract.value.workStartTime === '자율');
const hasAiLegalAdvice = computed(() => {
    const advice = fullContract.value.aiLegalAdvice;
    return typeof advice === 'string' && advice.trim().length > 0;
});
const normalizedAiLegalAdvice = computed(() => {
    if (!hasAiLegalAdvice.value) {
        return '아직 AI 법률 자문 결과가 준비되지 않았습니다.';
    }

    return fullContract.value.aiLegalAdvice!.replace(/\r\n/g, '\n').trim();
});
const activeTab = ref<ViewTab>(
    props.initialTab ||
        (route.query.contractTab === 'ai-advice' ? 'ai-advice' : 'details'),
);

const ensureAiLegalReviewRequested = async () => {
    if (activeTab.value !== 'ai-advice') return;
    if (isRequestingAiLegalReview.value || hasRequestedAiLegalReview.value) return;
    if (fullContract.value.aiLegalAdvice?.trim()) return;

    isRequestingAiLegalReview.value = true;
    try {
        const response = await requestAiLegalReview(props.contract.contractId);
        fullContract.value = {
            ...fullContract.value,
            ...response,
        };
        hasRequestedAiLegalReview.value = true;
    } catch {
        // keep the current advice state if the request fails
    } finally {
        isRequestingAiLegalReview.value = false;
    }
};

onMounted(async () => {
    await loadContractDetail();
    await ensureAiLegalReviewRequested();
});

watch(activeTab, (tab) => {
    if (tab !== 'ai-advice') return;
    void ensureAiLegalReviewRequested();
});
</script>

<template>
    <div
        class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
        <div
            class="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            v-motion
            :initial="{ opacity: 0, scale: 0.95, y: 20 }"
            :enter="{ opacity: 1, scale: 1, y: 0 }"
            :leave="{ opacity: 0, scale: 0.95, y: 20 }"
        >
            <!-- Header -->
            <div
                class="sticky top-0 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 backdrop-blur-xl border-b border-sky-200/60 z-10"
            >
                <div class="p-6 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-12 h-12 rounded-xl bg-white/20 border border-white/35 flex items-center justify-center shadow-[0_16px_32px_-18px_rgba(255,255,255,0.5)]"
                        >
                            <FileText class="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-white">계약서 상세</h2>
                        </div>
                    </div>
                    <button
                        @click="$emit('close')"
                        class="p-2 hover:bg-white/15 rounded-xl transition-colors"
                        v-motion
                        :hover="{ scale: 1.1, rotate: 90 }"
                        :tap="{ scale: 0.9 }"
                    >
                        <X class="w-6 h-6 text-white" />
                    </button>
                </div>

                <!-- Tab Navigation -->
                <div class="px-6 pb-4 flex gap-2">
                    <button
                        @click="activeTab = 'details'"
                        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        :class="activeTab === 'details'
                            ? 'bg-white text-sky-700 shadow-md'
                            : 'text-white/80 hover:text-white hover:bg-white/10'"
                    >
                        <Briefcase class="w-4 h-4" />
                        상세 정보
                    </button>
                    <button
                        @click="activeTab = 'contract'"
                        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        :class="activeTab === 'contract'
                            ? 'bg-white text-sky-700 shadow-md'
                            : 'text-white/80 hover:text-white hover:bg-white/10'"
                    >
                        <ScrollText class="w-4 h-4" />
                        계약서 보기
                    </button>
                    <button
                        @click="activeTab = 'ai-advice'"
                        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                        :class="activeTab === 'ai-advice'
                            ? 'bg-white text-sky-700 shadow-md'
                            : 'text-white/80 hover:text-white hover:bg-white/10'"
                    >
                        <Scale class="w-4 h-4" />
                        법률 자문 AI
                    </button>
                </div>
            </div>

            <!-- Loading state -->
            <div v-if="isLoadingDetail" class="p-16 flex items-center justify-center">
                <Loader2 class="w-8 h-8 animate-spin text-white/40" />
            </div>

            <!-- Details Tab Content -->
            <div v-else-if="activeTab === 'details'" class="p-6 space-y-6 text-white">
                <!-- Project Info -->
                <div
                    class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg"
                >
                    <h3 class="text-xl font-bold mb-4">프로젝트 정보</h3>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm text-white/60 mb-1">프로젝트명</div>
                            <div class="text-lg font-medium">{{ fullContract.projectName }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-white/60 mb-1">계약번호</div>
                            <div class="text-lg font-medium">#{{ fullContract.contractId }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-white/60 mb-1">계약 상태</div>
                            <div class="text-lg font-medium">{{ statusLabels[fullContract.status] || fullContract.status }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-white/60 mb-1">프리랜서</div>
                            <div class="text-lg font-medium flex items-center gap-2">
                                <User class="w-4 h-4" />
                                {{ fullContract.freelancerName }}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-white/60 mb-1">고용주</div>
                            <div class="text-lg font-medium flex items-center gap-2">
                                <User class="w-4 h-4" />
                                {{ fullContract.employerName }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Period & Budget -->
                <div class="grid md:grid-cols-2 gap-6">
                    <div
                        class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg"
                    >
                        <div class="flex items-center gap-3 mb-3">
                            <Calendar class="w-6 h-6 text-blue-400" />
                            <h3 class="text-lg font-bold">계약 기간</h3>
                        </div>
                        <div class="text-sm text-white/60 mb-1">시작일</div>
                        <div class="text-lg font-medium mb-3">{{ formatDate(fullContract.startDate) }}</div>
                        <div class="text-sm text-white/60 mb-1">종료일</div>
                        <div class="text-lg font-medium">{{ formatDate(fullContract.endDate) }}</div>
                    </div>

                    <div
                        class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg"
                    >
                        <div class="flex items-center gap-3 mb-3">
                            <DollarSign class="w-6 h-6 text-green-400" />
                            <h3 class="text-lg font-bold">계약 금액</h3>
                        </div>
                        <div class="text-sm text-white/60 mb-1">월 급여</div>
                        <div class="text-3xl font-bold text-green-400">
                            {{ formatCurrency(fullContract.budget) }}
                        </div>
                        <div v-if="fullContract.paymentDay" class="text-sm text-white/50 mt-2">
                            매월 {{ fullContract.paymentDay }}일 지급
                        </div>
                    </div>
                </div>

                <!-- Work Details -->
                <div
                    class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <Briefcase class="w-6 h-6 text-purple-400" />
                        <h3 class="text-lg font-bold">업무 정보</h3>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm text-white/60 mb-1">업무 내용</div>
                            <div class="font-medium">{{ fullContract.jobDescription || '-' }}</div>
                        </div>
                        <div>
                            <div class="text-sm text-white/60 mb-1">근무 장소</div>
                            <div class="font-medium flex items-center gap-2">
                                <MapPin class="w-4 h-4" />
                                {{ fullContract.workLocation || '원격근무' }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Work Schedule -->
                <div
                    class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <Clock class="w-6 h-6 text-cyan-400" />
                        <h3 class="text-lg font-bold">근무 시간</h3>
                    </div>
                    <div v-if="isFlexibleWork" class="p-4 bg-cyan-500/10 rounded-xl">
                        <div class="font-medium text-cyan-400 mb-1">자율 근무</div>
                        <div class="text-sm text-white/60">업무 마감일 기준 자유롭게 근무</div>
                    </div>
                    <div v-else class="grid md:grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm text-white/60 mb-1">근무 시간</div>
                            <div class="font-medium">
                                {{ fullContract.workStartTime || '--:--' }} ~ {{ fullContract.workEndTime || '--:--' }}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-white/60 mb-1">휴게 시간</div>
                            <div class="font-medium">
                                {{ fullContract.breakStartTime || '--:--' }} ~ {{ fullContract.breakEndTime || '--:--' }}
                            </div>
                        </div>
                        <div>
                            <div class="text-sm text-white/60 mb-1">주 근무일수</div>
                            <div class="font-medium">{{ fullContract.workDaysPerWeek || '-' }}일</div>
                        </div>
                        <div>
                            <div class="text-sm text-white/60 mb-1">주휴일</div>
                            <div class="font-medium">{{ fullContract.weeklyHoliday || '-' }}</div>
                        </div>
                    </div>
                </div>

                <!-- Insurance Status -->
                <div
                    class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg"
                >
                    <div class="flex items-center gap-3 mb-4">
                        <Shield class="w-6 h-6 text-emerald-400" />
                        <h3 class="text-lg font-bold">사회보험</h3>
                    </div>
                    <div class="flex flex-wrap gap-3">
                        <span class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">✓ 고용보험</span>
                        <span class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">✓ 산재보험</span>
                        <span class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">✓ 국민연금</span>
                        <span class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">✓ 건강보험</span>
                    </div>
                </div>

                <!-- Signatures -->
                <div
                    class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg"
                >
                    <h3 class="text-lg font-bold mb-4">서명 정보</h3>
                    <div class="grid md:grid-cols-2 gap-6">
                        <!-- Employer Signature -->
                        <div class="p-4 rounded-xl" :class="fullContract.employerSigned ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'">
                            <div class="flex items-center gap-3 mb-3">
                                <CheckCircle v-if="fullContract.employerSigned" class="w-6 h-6 text-green-400" />
                                <Clock v-else class="w-6 h-6 text-white/40" />
                                <div>
                                    <div class="text-sm text-white/60">고용주</div>
                                    <div class="font-medium" :class="fullContract.employerSigned ? 'text-green-400' : 'text-white/60'">
                                        {{ fullContract.employerSigned ? '서명 완료' : '서명 대기' }}
                                    </div>
                                </div>
                            </div>
                            <div v-if="fullContract.employerSignedDate" class="text-xs text-white/50">
                                서명일: {{ formatDate(fullContract.employerSignedDate) }}
                            </div>
                        </div>
                        <!-- Freelancer Signature -->
                        <div class="p-4 rounded-xl" :class="fullContract.freelancerSigned ? 'bg-green-500/10 border border-green-500/30' : 'bg-orange-500/10 border border-orange-500/30'">
                            <div class="flex items-center gap-3 mb-3">
                                <CheckCircle v-if="fullContract.freelancerSigned" class="w-6 h-6 text-green-400" />
                                <Clock v-else class="w-6 h-6 text-orange-400" />
                                <div>
                                    <div class="text-sm text-white/60">프리랜서</div>
                                    <div class="font-medium" :class="fullContract.freelancerSigned ? 'text-green-400' : 'text-orange-400'">
                                        {{ fullContract.freelancerSigned ? '서명 완료' : '서명 대기' }}
                                    </div>
                                </div>
                            </div>
                            <div v-if="fullContract.freelancerSignedDate" class="text-xs text-white/50">
                                서명일: {{ formatDate(fullContract.freelancerSignedDate) }}
                            </div>
                        </div>
                    </div>
                    <div v-if="fullContract.signedDate" class="mt-4 pt-4 border-t border-white/10">
                        <div class="text-sm text-white/60">
                            계약 체결일: {{ formatDate(fullContract.signedDate) }}
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-3">
                    <button
                        v-if="canSign"
                        @click="$emit('sign')"
                        class="flex-1 py-4 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                        v-motion
                        :hover="{ scale: 1.02 }"
                        :tap="{ scale: 0.98 }"
                    >
                        <PenTool class="w-5 h-5" />
                        서명하기
                    </button>
                    <button
                        @click="$emit('close')"
                        class="flex-1 py-4 bg-white/10 border border-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl hover:shadow-xl transition-all"
                        v-motion
                        :hover="{ scale: 1.02 }"
                        :tap="{ scale: 0.98 }"
                    >
                        닫기
                    </button>
                </div>
            </div>

            <!-- Contract Tab Content -->
            <div v-else-if="activeTab === 'contract'" class="p-6">
                <ContractPreview :contract="fullContract" />

                <!-- Action Buttons -->
                <div class="flex gap-3 mt-6 max-w-4xl mx-auto">
                    <button
                        v-if="canSign"
                        @click="$emit('sign')"
                        class="flex-1 py-4 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                        v-motion
                        :hover="{ scale: 1.02 }"
                        :tap="{ scale: 0.98 }"
                    >
                        <PenTool class="w-5 h-5" />
                        서명하기
                    </button>
                    <button
                        @click="$emit('close')"
                        class="flex-1 py-4 bg-white/10 border border-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl hover:shadow-xl transition-all"
                        v-motion
                        :hover="{ scale: 1.02 }"
                        :tap="{ scale: 0.98 }"
                    >
                        닫기
                    </button>
                </div>
            </div>

            <!-- AI Advice Tab Content -->
            <div v-else class="p-6 text-white">
                <div class="max-w-4xl mx-auto space-y-6">
                    <div class="rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-transparent p-6">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center shrink-0">
                                <Sparkles class="w-6 h-6 text-sky-300" />
                            </div>
                            <div class="space-y-2">
                                <h3 class="text-xl font-bold">법률 자문 AI</h3>
                                <p class="text-sm text-white/70 leading-relaxed">
                                    현재 계약서를 기준으로 핵심 요약, 독소 조항 여부, 체결 전 확인할 권장 사항을 안내합니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
                        <div class="flex items-center gap-2 mb-4 text-white/80">
                            <Scale class="w-5 h-5 text-sky-300" />
                            <span class="font-semibold">AI 분석 결과</span>
                        </div>
                        <div
                            class="rounded-2xl bg-slate-950/70 border border-white/5 p-5 text-sm leading-7 whitespace-pre-line"
                            :class="hasAiLegalAdvice ? 'text-white/90' : 'text-white/50'"
                        >
                            {{ normalizedAiLegalAdvice }}
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <button
                            @click="activeTab = 'contract'"
                            class="flex-1 py-4 bg-sky-500 text-white font-semibold rounded-2xl hover:bg-sky-400 transition-all"
                            v-motion
                            :hover="{ scale: 1.02 }"
                            :tap="{ scale: 0.98 }"
                        >
                            계약서 보기
                        </button>
                        <button
                            @click="$emit('close')"
                            class="flex-1 py-4 bg-white/10 border border-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl hover:shadow-xl transition-all"
                            v-motion
                            :hover="{ scale: 1.02 }"
                            :tap="{ scale: 0.98 }"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
