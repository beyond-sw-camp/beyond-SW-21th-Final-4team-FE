<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { requestPayment, PaymentPayMethod } from '@portone/browser-sdk/v2';
import {
    CreditCard,
    Search,
    Filter,
    Wallet,
    Calendar,
    CircleDollarSign,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useContractStore, type ContractWithDetails } from '@/stores/contractStore';
import { updateEmployerSubscription } from '@/api/MyPage/accountApi';

const authStore = useAuthStore();
const contractStore = useContractStore();
const route = useRoute();
const router = useRouter();

const searchQuery = ref('');
const selectedSort = ref<'due_soon' | 'amount_desc' | 'amount_asc'>('due_soon');
const payingContractId = ref<number | null>(null);
const paymentError = ref<string | null>(null);
const paymentSuccess = ref<string | null>(null);
const subscriptionError = ref<string | null>(null);
const subscriptionSuccess = ref<string | null>(null);
const isSubscriptionProcessing = ref(false);
const hasHandledSubscriptionRedirect = ref(false);
const subscriptionRedirectCountdown = ref<number | null>(null);
let subscriptionRedirectTimer: ReturnType<typeof setTimeout> | null = null;
let subscriptionRedirectInterval: ReturnType<typeof setInterval> | null = null;

const storeId = import.meta.env.VITE_PORTONE_STORE_ID as string | undefined;
const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY as string | undefined;

type SubscriptionPlanType = 'PRO' | 'PRIME';

const subscriptionMode = computed(() => route.query.mode === 'subscription');
const requestedSubscriptionPlan = computed<SubscriptionPlanType | null>(() => {
    const plan = typeof route.query.plan === 'string' ? route.query.plan.toUpperCase() : '';
    return plan === 'PRO' || plan === 'PRIME' ? (plan as SubscriptionPlanType) : null;
});

const subscriptionPlanMeta: Record<SubscriptionPlanType, { label: string; price: number; description: string }> = {
    PRO: {
        label: 'PRO PLAN',
        price: 9900,
        description: '추천 기능과 수수료 할인 혜택이 포함된 고용주 구독 플랜',
    },
    PRIME: {
        label: 'PRIME PLAN',
        price: 19900,
        description: '추천 기능, 더 큰 수수료 할인, AI 컨설팅 혜택이 포함된 최상위 플랜',
    },
};

const redirectedPaymentId = computed(() =>
    typeof route.query.paymentId === 'string' ? route.query.paymentId : null
);
const redirectedErrorCode = computed(() =>
    typeof route.query.code === 'string' ? route.query.code : null
);
const redirectedErrorMessage = computed(() =>
    typeof route.query.message === 'string' ? route.query.message : null
);

const myContracts = computed(() => {
    if (!authStore.user) return [];
    return contractStore.contractsWithDetails.filter((contract) => {
        const employerSigned = contract.employerSigned ?? Boolean(contract.employerSignedDate);
        const freelancerSigned = contract.freelancerSigned ?? Boolean(contract.freelancerSignedDate);
        return contract.employerId === Number(authStore.user!.id)
            && contract.status === 'IN_PROGRESS'
            && employerSigned
            && freelancerSigned;
    });
});

const paidContractIds = computed(() => {
    return new Set(
        contractStore.employerSettlements
            .filter((settlement) => settlement.status === 'PAID' || settlement.status === 'DISBURSED')
            .map((settlement) => settlement.contractId)
    );
});

const getBusinessContractId = (contract: ContractWithDetails) => contract.contractId ?? contract.id;

const payableContracts = computed(() => {
    let result = myContracts.value.filter((contract) => !paidContractIds.value.has(getBusinessContractId(contract)));

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase().trim();
        result = result.filter((contract) => {
            return contract.projectName.toLowerCase().includes(query) || contract.freelancerName.toLowerCase().includes(query);
        });
    }

    const sorted = [...result];
    if (selectedSort.value === 'due_soon') {
        sorted.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }
    if (selectedSort.value === 'amount_desc') {
        sorted.sort((a, b) => calculateTotalAmount(b) - calculateTotalAmount(a));
    }
    if (selectedSort.value === 'amount_asc') {
        sorted.sort((a, b) => calculateTotalAmount(a) - calculateTotalAmount(b));
    }

    return sorted;
});

const paymentSummary = computed(() => {
    const payableCount = payableContracts.value.length;
    const totalAmount = payableContracts.value.reduce((sum, contract) => sum + calculateTotalAmount(contract), 0);
    return {
        payableCount,
        totalAmount,
    };
});

const calculateTotalAmount = (contract: ContractWithDetails) => {
    const commissionRate = contract.commissionRate ?? 0.05;
    return Math.round(contract.budget * (1 + commissionRate));
};

const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('ko-KR');
const formatCurrency = (amount: number) => `${amount.toLocaleString()}원`;

const createPaymentId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `payment-${crypto.randomUUID()}`;
    }
    return `payment-${Date.now()}`;
};

const goBackFromSubscriptionPayment = async () => {
    await router.push({
        name: 'employer.mypage',
        query: { tab: 'account' },
    });
};

const clearSubscriptionRedirectParams = async () => {
    if (!subscriptionMode.value || !requestedSubscriptionPlan.value) {
        return;
    }

    await router.replace({
        name: 'employer.payments',
        query: {
            mode: 'subscription',
            plan: requestedSubscriptionPlan.value,
        },
    });
};

const scheduleSubscriptionSuccessRedirect = () => {
    if (subscriptionRedirectTimer) {
        clearTimeout(subscriptionRedirectTimer);
    }
    if (subscriptionRedirectInterval) {
        clearInterval(subscriptionRedirectInterval);
    }

    subscriptionRedirectCountdown.value = 3;
    subscriptionRedirectInterval = setInterval(() => {
        if (subscriptionRedirectCountdown.value == null) {
            return;
        }
        if (subscriptionRedirectCountdown.value <= 1) {
            clearInterval(subscriptionRedirectInterval!);
            subscriptionRedirectInterval = null;
            subscriptionRedirectCountdown.value = null;
            return;
        }
        subscriptionRedirectCountdown.value -= 1;
    }, 1000);

    subscriptionRedirectTimer = setTimeout(async () => {
        await goBackFromSubscriptionPayment();
    }, 3000);
};

const finalizeSubscriptionUpgrade = async (plan: SubscriptionPlanType, paymentId: string) => {
    const result = await updateEmployerSubscription(plan, null, paymentId);
    subscriptionSuccess.value = result.message || `${subscriptionPlanMeta[plan].label} 결제가 완료되었습니다.`;
    await clearSubscriptionRedirectParams();
    scheduleSubscriptionSuccessRedirect();
};

const handleSubscriptionPayment = async () => {
    subscriptionError.value = null;
    subscriptionSuccess.value = null;

    const plan = requestedSubscriptionPlan.value;
    if (!plan) {
        subscriptionError.value = '결제할 구독 플랜 정보가 없습니다.';
        return;
    }

    if (!storeId || !channelKey) {
        subscriptionError.value = '포트원 설정이 누락되었습니다. VITE_PORTONE_STORE_ID와 VITE_PORTONE_CHANNEL_KEY를 확인해주세요.';
        return;
    }

    try {
        isSubscriptionProcessing.value = true;
        const paymentId = createPaymentId();
        const paymentResponse = await requestPayment({
            storeId,
            channelKey,
            paymentId,
            orderName: `${subscriptionPlanMeta[plan].label} 구독 결제`,
            totalAmount: subscriptionPlanMeta[plan].price,
            currency: 'KRW',
            payMethod: PaymentPayMethod.CARD,
            customer: {
                fullName: authStore.user?.name,
                email: authStore.user?.email,
            },
            customData: {
                mode: 'subscription',
                planType: plan,
                employerId: Number(authStore.user?.id || 0),
            },
            redirectUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        });

        if (!paymentResponse) {
            subscriptionError.value = '결제가 취소되었거나 리디렉션 방식으로 처리되었습니다.';
            return;
        }

        if (paymentResponse.code) {
            subscriptionError.value = paymentResponse.message || `결제 실패 (${paymentResponse.code})`;
            return;
        }

        if (typeof paymentResponse.paymentId !== 'string' || !paymentResponse.paymentId.trim()) {
            subscriptionError.value = '구독 결제 번호를 확인할 수 없습니다.';
            console.error('Subscription payment response missing paymentId:', paymentResponse);
            return;
        }

        await finalizeSubscriptionUpgrade(plan, paymentResponse.paymentId);

    } catch (error: any) {
        const apiErrorMessage = error?.response?.data?.error?.message
            || error?.response?.data?.message
            || error?.message;
        subscriptionError.value = apiErrorMessage || '구독 결제 처리 중 오류가 발생했습니다.';
        console.error('Subscription payment failed:', error);
    } finally {
        isSubscriptionProcessing.value = false;
    }
};

const handlePayContract = async (contract: ContractWithDetails) => {
    paymentError.value = null;
    paymentSuccess.value = null;

    if (!storeId || !channelKey) {
        paymentError.value = '포트원 설정이 누락되었습니다. VITE_PORTONE_STORE_ID와 VITE_PORTONE_CHANNEL_KEY를 확인해주세요.';
        return;
    }

    payingContractId.value = contract.id;
    let paymentId: string | null = null;
    let totalAmount = 0;

    try {
        totalAmount = calculateTotalAmount(contract);
        paymentId = createPaymentId();

        const response = await requestPayment({
            storeId,
            channelKey,
            paymentId,
            orderName: `${contract.projectName} 계약 결제`,
            totalAmount,
            currency: 'KRW',
            payMethod: PaymentPayMethod.CARD,
            customer: {
                fullName: authStore.user?.name,
                email: authStore.user?.email,
            },
            customData: {
                contractId: getBusinessContractId(contract),
                employerId: Number(authStore.user?.id || 0),
            },
        });

        if (!response) {
            paymentError.value = '결제가 취소되었거나 리디렉션 방식으로 처리되었습니다.';
            return;
        }

        if (response.code) {
            paymentError.value = response.message || `결제 실패 (${response.code})`;
            return;
        }

        const verifyResult = await contractStore.verifyEmployerSettlementPayment(
            response.paymentId,
            getBusinessContractId(contract)
        );
        paymentSuccess.value = `${contract.projectName} 결제가 완료되었습니다. (${verifyResult.installmentsCreated}건 정산 생성)`;
    } catch (error: any) {
        const apiErrorCode = error?.response?.data?.errorCode
            || error?.response?.data?.code
            || error?.response?.data?.error?.code;
        const apiErrorMessage = error?.response?.data?.message
            || error?.response?.data?.error?.message;
        paymentError.value = apiErrorCode
            ? `${apiErrorCode}: ${apiErrorMessage || '결제 검증에 실패했습니다.'}`
            : apiErrorMessage || error?.message || '결제 처리 중 오류가 발생했습니다.';
        console.error('Payment verify failed:', {
            status: error?.response?.status,
            data: error?.response?.data,
            contractId: getBusinessContractId(contract),
            paymentId,
            requestedAmount: totalAmount,
            budget: contract.budget,
        });
    } finally {
        payingContractId.value = null;
    }
};

onMounted(async () => {
    if (subscriptionMode.value) {
        if (!hasHandledSubscriptionRedirect.value) {
            const plan = requestedSubscriptionPlan.value;
            const paymentId = redirectedPaymentId.value;
            const errorCode = redirectedErrorCode.value;
            const errorMessage = redirectedErrorMessage.value;

            if (!plan) {
                subscriptionError.value = '구독 결제 플랜 정보가 누락되었습니다.';
                hasHandledSubscriptionRedirect.value = true;
                return;
            }

            if (paymentId) {
                try {
                    isSubscriptionProcessing.value = true;
                    hasHandledSubscriptionRedirect.value = true;
                    await finalizeSubscriptionUpgrade(plan, paymentId);
                } catch (error: any) {
                    const apiErrorMessage = error?.response?.data?.error?.message
                        || error?.response?.data?.message
                        || error?.message;
                    subscriptionError.value = apiErrorMessage || '리디렉션 복귀 후 구독 변경 처리에 실패했습니다.';
                } finally {
                    isSubscriptionProcessing.value = false;
                }
                return;
            }

            if (errorCode || errorMessage) {
                subscriptionError.value = errorMessage || `결제 실패 (${errorCode})`;
                hasHandledSubscriptionRedirect.value = true;
            }
        }
        return;
    }

    try {
        await Promise.all([
            contractStore.fetchContracts(),
            contractStore.fetchEmployerSettlements(),
            contractStore.fetchEmployerSettlementSummary().catch(() => undefined),
        ]);
    } catch (error) {
        console.error('Failed to initialize payment page:', error);
    }
});

onBeforeUnmount(() => {
    if (subscriptionRedirectTimer) {
        clearTimeout(subscriptionRedirectTimer);
    }
    if (subscriptionRedirectInterval) {
        clearInterval(subscriptionRedirectInterval);
    }
});
</script>

<template>
    <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 text-slate-900">
        <template v-if="subscriptionMode">
            <div class="max-w-3xl mx-auto">
                <button
                    @click="goBackFromSubscriptionPayment"
                    class="fb-button-secondary mb-6 gap-2"
                >
                    <ArrowLeft class="w-4 h-4" />
                    구독 관리로 돌아가기
                </button>

                <div class="fb-card p-8 md:p-10">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-200">
                            <CreditCard class="w-7 h-7" />
                        </div>
                        <div>
                            <h1 class="text-3xl font-bold text-slate-950">구독 결제</h1>
                            <p class="text-sm mt-1 text-slate-500">플랜 변경과 카드 결제를 한 화면에서 간결하게 진행할 수 있습니다.</p>
                        </div>
                    </div>

                    <div v-if="requestedSubscriptionPlan" class="fb-panel-tint p-6 mb-6">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <div class="text-sm text-slate-500 mb-2">선택한 플랜</div>
                                <div class="text-2xl font-bold text-slate-950">{{ subscriptionPlanMeta[requestedSubscriptionPlan].label }}</div>
                                <p class="text-sm text-slate-500 mt-2">{{ subscriptionPlanMeta[requestedSubscriptionPlan].description }}</p>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-slate-500 mb-2">즉시 결제 금액</div>
                                <div class="text-3xl font-bold text-slate-950">{{ formatCurrency(subscriptionPlanMeta[requestedSubscriptionPlan].price) }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="mb-6 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 p-5 text-sm text-sky-900">
                        <div class="font-semibold mb-2">결제 전 확인</div>
                        <ul class="space-y-2 text-slate-600">
                            <li>카드 정보를 등록하면 선택한 구독 플랜으로 즉시 변경됩니다.</li>
                            <li>결제가 실패하면 플랜 변경도 적용되지 않습니다.</li>
                        </ul>
                    </div>

                    <div
                        v-if="subscriptionError"
                        class="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700"
                    >
                        <AlertCircle class="w-5 h-5 mt-0.5" />
                        <span>{{ subscriptionError }}</span>
                    </div>

                    <div
                        v-if="subscriptionSuccess"
                        class="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700"
                    >
                        <CheckCircle2 class="w-5 h-5 mt-0.5" />
                        <div>
                            <div>{{ subscriptionSuccess }}</div>
                            <div v-if="subscriptionRedirectCountdown !== null" class="mt-1 text-xs text-emerald-600/80">
                                {{ subscriptionRedirectCountdown }}초 후 내 계정 관리로 이동합니다.
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                        <button
                            @click="goBackFromSubscriptionPayment"
                            class="fb-button-secondary"
                        >
                            취소
                        </button>
                        <button
                            v-if="!subscriptionSuccess"
                            @click="handleSubscriptionPayment"
                            :disabled="isSubscriptionProcessing || !requestedSubscriptionPlan"
                            class="fb-button-primary min-w-[180px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Loader2 v-if="isSubscriptionProcessing" class="w-4 h-4 animate-spin" />
                            <CreditCard v-else class="w-4 h-4" />
                            {{ isSubscriptionProcessing ? '결제 처리 중' : '카드 등록 후 결제하기' }}
                        </button>
                        <button
                            v-else
                            @click="goBackFromSubscriptionPayment"
                            class="fb-button-primary min-w-[180px]"
                        >
                            내 계정 관리로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        </template>

        <template v-else>
        <div class="mb-8">
            <div class="flex items-center gap-3 mb-3">
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-200">
                    <CreditCard class="w-7 h-7" />
                </div>
                <h1 class="text-4xl font-bold tracking-tight text-slate-950">결제 관리</h1>
            </div>
            <p class="mt-3 max-w-2xl text-base text-slate-500">진행 중인 계약의 선결제를 진행하고 정산 생성을 시작하세요.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div class="fb-card p-7">
                <div class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Wallet class="w-4 h-4 text-sky-500" />
                    결제 가능 계약
                </div>
                <div class="text-4xl font-bold text-slate-950">{{ paymentSummary.payableCount }}건</div>
            </div>
            <div class="fb-card p-7">
                <div class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                    <CircleDollarSign class="w-4 h-4 text-cyan-500" />
                    총 결제 예정 금액
                </div>
                <div class="text-4xl font-bold text-slate-950">{{ formatCurrency(paymentSummary.totalAmount) }}</div>
            </div>
        </div>

        <div class="fb-card mb-6 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div class="relative w-full md:max-w-sm">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="프로젝트명 또는 프리랜서 검색"
                    class="fb-input w-full pl-10 pr-3 py-2.5"
                />
            </div>
            <div class="flex items-center gap-2 text-sm text-slate-500">
                <Filter class="w-4 h-4 text-sky-500" />
                <select
                    v-model="selectedSort"
                    class="fb-input px-3 py-2"
                >
                    <option value="due_soon">종료일 빠른순</option>
                    <option value="amount_desc">금액 높은순</option>
                    <option value="amount_asc">금액 낮은순</option>
                </select>
            </div>
        </div>

        <div v-if="paymentError" class="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 shadow-sm">
            <AlertCircle class="w-5 h-5 mt-0.5" />
            <span>{{ paymentError }}</span>
        </div>

        <div v-if="paymentSuccess" class="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 shadow-sm">
            <CheckCircle2 class="w-5 h-5 mt-0.5" />
            <span>{{ paymentSuccess }}</span>
        </div>

        <div v-if="payableContracts.length === 0" class="fb-card p-12 text-center text-slate-500">
            결제 가능한 진행 중 계약이 없습니다.
        </div>

        <div v-else class="space-y-4">
            <div
                v-for="contract in payableContracts"
                :key="contract.id"
                class="fb-card-soft flex flex-col justify-between gap-4 p-6 lg:flex-row lg:items-center"
            >
                <div class="flex-1">
                    <div class="mb-2 text-2xl font-bold text-slate-950">{{ contract.projectName }}</div>
                    <div class="mb-1 text-sm text-slate-500">프리랜서: {{ contract.freelancerName }}</div>
                    <div class="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar class="w-4 h-4 text-sky-500" />
                        {{ formatDate(contract.startDate) }} ~ {{ formatDate(contract.endDate) }}
                    </div>
                </div>

                <div class="text-left lg:text-right min-w-[200px]">
                    <div class="text-sm font-medium text-slate-400">예상 총 결제 금액</div>
                    <div class="text-3xl font-bold text-slate-950">{{ formatCurrency(calculateTotalAmount(contract)) }}</div>
                    <div class="mt-1 text-xs text-slate-400">
                        월 {{ formatCurrency(contract.budget) }} · 수수료 {{ ((contract.commissionRate ?? 0.05) * 100).toFixed(1) }}%
                    </div>
                </div>

                <button
                    @click="handlePayContract(contract)"
                    :disabled="payingContractId === contract.id"
                    class="fb-button-primary min-w-[148px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Loader2 v-if="payingContractId === contract.id" class="w-4 h-4 animate-spin" />
                    <CreditCard v-else class="w-4 h-4" />
                    {{ payingContractId === contract.id ? '결제 처리 중' : '결제하기' }}
                </button>
            </div>
        </div>
        </template>
    </div>
</template>
