<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMotion } from '@vueuse/motion';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Save,
  Crown,
  Check,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import {
  getAccountInfo,
  updateAccountInfo,
  getEmployerSubscription,
  updateEmployerSubscription,
  changeEmployerPassword
} from '@/api/MyPage/accountApi';
import { normalizeEmployerPlan } from '@/utils/employerSubscription';
import { useAlertStore } from '@/stores/alertStore';
import { formatPhoneNumber, normalizePhoneForSubmit } from '@/utils/phone';

defineEmits<{
  (e: 'back'): void;
}>();

type PlanType = 'FREE' | 'PRO' | 'PRIME';
type AccountSection = 'subscription' | 'profile';
const PLAN_RANK: Record<PlanType, number> = {
  FREE: 0,
  PRO: 1,
  PRIME: 2,
};

const activeSection = ref<AccountSection>('subscription');
const isLoading = ref(false);
const isSaving = ref(false);
const authStore = useAuthStore();
const alertStore = useAlertStore();
const router = useRouter();

const accountInfo = ref({
  name: '',
  email: '',
  phone: '',
});

const currentPlan = ref<PlanType>('FREE');

const formattedAccountPhone = computed({
  get: () => formatPhoneNumber(accountInfo.value.phone),
  set: (value: string) => {
    accountInfo.value.phone = formatPhoneNumber(value);
  }
});

interface SubscriptionPlan {
  name: string;
  description: string;
  price: string;
  period: string;
  fee: string;
  icon: string;
  features: string[];
}

const plans = ref<Record<string, SubscriptionPlan>>({});

const verificationPassword = ref('');
const verificationError = ref('');
const isVerifying = ref(false);
const isProfileVerified = ref(false);
const isPasswordSaving = ref(false);

const fetchAccountInfo = async () => {
  isLoading.value = true;
  try {
    accountInfo.value = await getAccountInfo();
  } catch (error) {
    console.error('Failed to fetch account info:', error);
  } finally {
    isLoading.value = false;
  }
};

const fetchSubscriptionPlans = async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 300));
    plans.value = {
      FREE: {
        name: 'BASIC PLAN',
        description: '부담 없이 시작하는 기본 구독',
        price: '무료',
        period: '',
        fee: '12%',
        icon: '🧾',
        features: ['최신순 조회 가능', '기본 지원'],
      },
      PRO: {
        name: 'PRO PLAN',
        description: '채용 효율을 높이는 구독',
        price: '월 9,900',
        period: '월',
        fee: '10%',
        icon: '💼',
        features: ['추천 기능 제공', '수수료 할인 (10%)'],
      },
      PRIME: {
        name: 'PRIME PLAN',
        description: '빠른 매칭을 위한 최상위 구독',
        price: '월 19,900',
        period: '월',
        fee: '7%',
        icon: '👑',
        features: ['다양한 조회 가능', '추천 기능 제공', '최대 수수료 할인 (7%)', '전담 AI 컨설턴트 배정'],
      },
    };
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
  }
};

const fetchCurrentPlan = async () => {
  try {
    const subscription = await getEmployerSubscription();
    currentPlan.value = normalizeEmployerPlan(subscription.currentPlan);
  } catch (error) {
    console.error('Failed to fetch current subscription plan:', error);
  }
};

const handleVerifyIdentity = async () => {
  verificationError.value = '';
  const email = authStore.user?.email || accountInfo.value.email;

  if (!verificationPassword.value.trim()) {
    verificationError.value = '비밀번호를 입력해 주세요.';
    return;
  }

  if (!email) {
    verificationError.value = '로그인한 계정의 이메일 정보를 찾을 수 없습니다. 다시 로그인해 주세요.';
    isProfileVerified.value = false;
    return;
  }

  try {
    isVerifying.value = true;
    await authStore.login({ email, password: verificationPassword.value });
    isProfileVerified.value = true;
    verificationPassword.value = '';
  } catch (error) {
    console.error('Failed to verify password:', error);
    verificationError.value = '비밀번호가 올바르지 않습니다.';
    isProfileVerified.value = false;
  } finally {
    isVerifying.value = false;
  }
};

const resetProfileVerification = () => {
  isProfileVerified.value = false;
  verificationPassword.value = '';
  verificationError.value = '';
};

const handleSaveAccountInfo = async () => {
  if (!isProfileVerified.value) {
    alertStore.open({ message: '비밀번호 확인 후에만 정보를 수정할 수 있습니다.', type: 'warning' });
    return;
  }

  try {
    isSaving.value = true;
    await updateAccountInfo({
      ...accountInfo.value,
      phone: normalizePhoneForSubmit(accountInfo.value.phone)
    });
    alertStore.open({ message: '계정 정보가 수정되었습니다.', type: 'success' });
  } catch (error) {
    console.error('Failed to update account info:', error);
    if (error instanceof Error && error.message.includes('updateAccountInfo not implemented')) {
      alertStore.open({ message: '현재 계정 정보 수정 기능은 준비 중입니다.', type: 'info' });
    } else {
      alertStore.open({ message: '수정에 실패했습니다.', type: 'error' });
    }
  } finally {
    isSaving.value = false;
  }
};

const passwordForm = ref({
  current: '',
  new: '',
  confirm: ''
});

const passwordError = ref('');

const validatePasswordForm = () => {
  passwordError.value = '';
  if (!passwordForm.value.current.trim()) {
    passwordError.value = '현재 비밀번호를 입력해 주세요.';
    return false;
  }
  if (!passwordForm.value.new.trim()) {
    passwordError.value = '새 비밀번호를 입력해 주세요.';
    return false;
  }
  if (passwordForm.value.new.length < 8) {
    passwordError.value = '새 비밀번호는 8자 이상이어야 합니다.';
    return false;
  }
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    passwordError.value = '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.';
    return false;
  }
  return true;
};

const handleChangePassword = async () => {
  if (!isProfileVerified.value) {
    alertStore.open({ message: '비밀번호 확인 후에만 변경할 수 있습니다.', type: 'warning' });
    return;
  }
  if (!validatePasswordForm()) return;

  try {
    isPasswordSaving.value = true;
    await changeEmployerPassword(passwordForm.value);
    resetProfileVerification();
    alertStore.open({ message: '비밀번호가 변경되었습니다.', type: 'success' });
    passwordForm.value = { current: '', new: '', confirm: '' };
    passwordError.value = '';
  } catch (error) {
    console.error('Failed to change password:', error);
    passwordError.value = '비밀번호 변경에 실패했습니다.';
  } finally {
    isPasswordSaving.value = false;
  }
};

const handlePlanChange = async (plan: PlanType) => {
  if (plan === currentPlan.value) return;
  const selectedPlan = plans.value[plan];
  if (!selectedPlan) return;

  const isDowngrade = PLAN_RANK[plan] < PLAN_RANK[currentPlan.value];

  if (isDowngrade) {
    const warningMessage = plan === 'FREE'
      ? [
          'BASIC 플랜으로 다운그레이드하면 즉시 반영됩니다.',
          '이미 결제된 금액은 환불되지 않습니다.',
          '이 변경은 되돌릴 수 없습니다.',
          '계속하시겠습니까?'
        ].join('\n')
      : [
          `${selectedPlan.name}으로 다운그레이드하면 즉시 반영됩니다.`,
          '이미 결제된 금액은 환불되지 않습니다.',
          '이 변경은 되돌릴 수 없습니다.',
          '계속하시겠습니까?'
        ].join('\n');

    alertStore.open({
      title: '다운그레이드 확인',
      message: warningMessage,
      type: 'warning',
      confirmText: '변경하기',
      cancelText: '취소',
      showCancel: true,
      onConfirm: async () => {
        try {
          isLoading.value = true;
          const result = await updateEmployerSubscription(plan);
          if (result.success !== true) {
            alertStore.open({
              title: '플랜 변경 실패',
              message: result.message || '플랜 변경에 실패했습니다.',
              type: 'error'
            });
            return;
          }
          currentPlan.value = normalizeEmployerPlan(result.currentPlanGrade);
          alertStore.open({
            title: '플랜 변경 완료',
            message: result.message || `${selectedPlan.name}로 변경되었습니다.`,
            type: 'success'
          });
        } catch (error) {
          console.error('Failed to change plan:', error);
          alertStore.open({
            title: '플랜 변경 실패',
            message: '플랜 변경에 실패했습니다.',
            type: 'error'
          });
        } finally {
          isLoading.value = false;
        }
      }
    });
    return;
  }

  alertStore.open({
    title: '플랜 업그레이드',
    message: [
      `${selectedPlan.name}으로 변경하시겠습니까?`,
      '결제 페이지로 이동해 업그레이드를 진행합니다.'
    ].join('\n'),
    type: 'info',
    confirmText: '결제 페이지로 이동',
    cancelText: '취소',
    showCancel: true,
    onConfirm: async () => {
      await router.push({
        name: 'employer.payments',
        query: {
          mode: 'subscription',
          plan,
        },
      });
    }
  });
};

onMounted(() => {
  fetchAccountInfo();
  fetchSubscriptionPlans();
  fetchCurrentPlan();
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 md:px-10 py-10 text-slate-800">
    <div class="flex items-center gap-4 mb-10">
      <button @click="$emit('back')" class="p-2 hover:bg-slate-100 rounded-full transition-colors" aria-label="뒤로가기" title="뒤로가기">
        <ArrowLeft class="w-5 h-5 text-sky-600" />
      </button>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-950">고용주 계정 관리</h1>
        <p class="text-sm text-slate-500 mt-1">구독과 계정 정보를 관리해보세요</p>
      </div>
    </div>

    <div class="mb-6 inline-flex bg-white border border-slate-200 rounded-full p-1">
      <button
        @click="activeSection = 'subscription'"
        class="px-4 py-2 text-sm font-semibold rounded-full transition-colors"
        :class="activeSection === 'subscription' ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-950'"
      >
        구독
      </button>
      <button
        @click="activeSection = 'profile'; resetProfileVerification()"
        class="px-4 py-2 text-sm font-semibold rounded-full transition-colors"
        :class="activeSection === 'profile' ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-950'"
      >
        회원정보
      </button>
    </div>

    <div
      v-if="activeSection === 'subscription'"
      class="bg-white rounded-[28px] border border-slate-200 p-8 md:p-10 shadow-[0_25px_70px_-55px_rgba(15,23,42,0.12)]"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <h2 class="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-950">
        <Crown class="w-5 h-5 text-amber-500" />
        구독 플랜
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="(plan, planKey) in plans"
          :key="planKey"
          class="relative rounded-[24px] p-6 border transition-all flex flex-col h-full"
          :class="currentPlan === planKey ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'"
          v-motion
          :initial="{ opacity: 0, scale: 0.9 }"
          :enter="{ opacity: 1, scale: 1 }"
        >
          <div v-if="currentPlan === planKey" class="absolute top-4 right-4">
            <div class="bg-sky-100 text-sky-700 text-xs px-2 py-1 rounded-full font-semibold border border-sky-200">현재 플랜</div>
          </div>

          <div class="text-4xl mb-4">{{ plan.icon }}</div>
          <h3 class="text-xl font-semibold mb-1 text-slate-950">{{ plan.name }}</h3>
          <p class="text-sm text-slate-500 mb-4">{{ plan.description }}</p>

          <div class="mb-4">
            <div>
              <span class="text-3xl font-semibold text-slate-950">{{ plan.price }}</span>
              <span v-if="plan.period" class="text-sm text-slate-500">/{{ plan.period }}</span>
            </div>
            <div class="mt-1">
              <span class="text-sm font-semibold text-sky-700">{{ plan.fee }}</span>
              <span class="text-xs text-slate-400 ml-1">수수료</span>
            </div>
          </div>

          <ul class="space-y-3 mb-8 flex-1">
            <li v-for="(feature, idx) in plan.features" :key="idx" class="flex items-start gap-2 text-sm text-slate-700">
              <Check class="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
              <span>{{ feature }}</span>
            </li>
          </ul>

          <button
            @click="handlePlanChange(planKey as PlanType)"
            :disabled="currentPlan === planKey || isLoading"
            class="w-full py-3 rounded-full font-semibold transition-all mt-auto disabled:opacity-60 disabled:cursor-not-allowed"
            :class="currentPlan === planKey ? 'bg-slate-100 text-slate-700 cursor-default border border-slate-200' : 'bg-sky-700 text-white hover:bg-sky-600 shadow-[0_18px_40px_-24px_rgba(3,105,161,0.35)]'"
          >
            {{ currentPlan === planKey ? '사용 중' : '변경하기' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-else
      class="bg-white rounded-[28px] border border-slate-200 p-8 md:p-10 shadow-[0_25px_70px_-55px_rgba(15,23,42,0.12)]"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <h2 class="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-950">
        <User class="w-5 h-5 text-sky-500" />
        회원정보
      </h2>

      <div v-if="!isProfileVerified" class="max-w-lg">
        <p class="text-sm text-slate-600 mb-4">
          보안을 위해 비밀번호를 먼저 확인합니다.
        </p>
        <label class="text-xs text-slate-500 mb-2 block uppercase tracking-[0.2em]">비밀번호 확인</label>
        <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <Lock class="w-4 h-4 text-slate-400" />
          <input
            type="password"
            v-model="verificationPassword"
            class="w-full rounded-md border-none bg-transparent text-sm text-slate-950 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            placeholder="비밀번호를 입력해 주세요"
            @keyup.enter="handleVerifyIdentity"
          />
        </div>
        <p v-if="verificationError" class="text-sm text-red-400 mt-2">{{ verificationError }}</p>
        <button
          @click="handleVerifyIdentity"
          :disabled="isVerifying"
          class="mt-4 px-5 py-2.5 bg-sky-700 text-white hover:bg-sky-600 rounded-full text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ isVerifying ? '확인 중...' : '확인' }}
        </button>
      </div>

      <div v-else>
        <div class="flex items-center justify-between mb-6">
          <p class="text-sm text-slate-600">비밀번호 확인이 완료되었습니다. 회원정보를 수정할 수 있습니다.</p>
          <button @click="resetProfileVerification" class="text-xs text-slate-500 hover:text-slate-950 transition-colors">
            다시 인증하기
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-slate-500 mb-2 block uppercase tracking-[0.2em]">이름</label>
            <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <User class="w-4 h-4 text-slate-400" />
              <input type="text" v-model="accountInfo.name" class="w-full rounded-md border-none bg-transparent text-sm text-slate-950 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50" />
            </div>
          </div>

          <div>
            <label class="text-xs text-slate-500 mb-2 block uppercase tracking-[0.2em]">이메일</label>
            <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <Mail class="w-4 h-4 text-slate-400" />
              <input type="email" v-model="accountInfo.email" class="w-full rounded-md border-none bg-transparent text-sm text-slate-950 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50" />
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="text-xs text-slate-500 mb-2 block uppercase tracking-[0.2em]">휴대폰 번호</label>
            <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <Phone class="w-4 h-4 text-slate-400" />
              <input type="tel" v-model="formattedAccountPhone" class="w-full rounded-md border-none bg-transparent text-sm text-slate-950 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50" />
            </div>
          </div>
        </div>

        <button
          @click="handleSaveAccountInfo"
          :disabled="isSaving || isLoading"
          class="mt-6 px-5 py-2.5 bg-sky-700 text-white hover:bg-sky-600 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_18px_40px_-24px_rgba(3,105,161,0.35)]"
        >
          <Save class="w-4 h-4" />
          {{ isSaving ? '저장 중...' : '정보 저장' }}
        </button>

        <div class="mt-10 pt-8 border-t border-slate-200">
          <h3 class="text-base font-semibold mb-4 text-slate-950">비밀번호 변경</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-slate-500 mb-2 block uppercase tracking-[0.2em]">현재 비밀번호</label>
              <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <Lock class="w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  v-model="passwordForm.current"
                  class="w-full rounded-md border-none bg-transparent text-sm text-slate-950 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                  placeholder="현재 비밀번호"
                />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-500 mb-2 block uppercase tracking-[0.2em]">새 비밀번호</label>
              <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <Lock class="w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  v-model="passwordForm.new"
                  class="w-full rounded-md border-none bg-transparent text-sm text-slate-950 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                  placeholder="8자 이상"
                />
              </div>
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-slate-500 mb-2 block uppercase tracking-[0.2em]">새 비밀번호 확인</label>
              <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <Lock class="w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  v-model="passwordForm.confirm"
                  class="w-full rounded-md border-none bg-transparent text-sm text-slate-950 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                  placeholder="새 비밀번호 확인"
                />
              </div>
            </div>
          </div>

          <p v-if="passwordError" class="text-sm text-red-400 mt-3">{{ passwordError }}</p>

          <button
            @click="handleChangePassword"
            :disabled="isPasswordSaving"
            class="mt-4 px-5 py-2.5 bg-violet-700 hover:bg-violet-600 text-white rounded-full text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_18px_40px_-24px_rgba(109,40,217,0.3)]"
          >
            {{ isPasswordSaving ? '변경 중...' : '비밀번호 변경' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
