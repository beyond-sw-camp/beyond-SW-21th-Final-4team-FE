<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
// ...
import { useAuthStore } from '@/stores/authStore';
import { Mail, Lock, User as UserIcon, Building2, ArrowLeft, Eye, EyeOff, Check, Phone } from 'lucide-vue-next';
import AnimatedBackground from './components/AnimatedBackground.vue';
import VerificationModal from './components/VerificationModal.vue';
import TermsModal from './components/TermsModal.vue';
import { 
  SERVICE_TERMS, 
  PRIVACY_TERMS_FREELANCER, 
  PRIVACY_TERMS_EMPLOYER, 
  THIRD_PARTY_TERMS, 
  MARKETING_TERMS 
} from '@/constants/terms';
import type { UserRole } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Input Refs for Navigation
const emailInput = ref<HTMLInputElement | null>(null);
const passwordInput = ref<HTMLInputElement | null>(null);
const phoneInput = ref<HTMLInputElement | null>(null);
const confirmPasswordInput = ref<HTMLInputElement | null>(null);

// State
const role = ref<UserRole>('FREELANCER');
const formData = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  company: '',
  phone: '',

  agreeService: false,
  agreePrivacy: false,
  agreeThirdParty: false,
  agreeMarketing: false,
});
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const errors = ref<Record<string, string>>({});
const touchedFields = ref<Record<string, boolean>>({});
const isEmailChecking = ref(false);
const isEmailAvailable = ref(false);

// Terms Modal State
const showTermsModal = ref(false);
const currentTermsTitle = ref('');
const currentTermsContent = ref('');

// Verification Modal State
const showVerificationModal = ref(false);

const openTermsModal = (title: string, content: string) => {
  currentTermsTitle.value = title;
  currentTermsContent.value = content;
  showTermsModal.value = true;
};

// Computed used for simplifying template logic
const isEmployer = computed(() => role.value === 'EMPLOYER');

const allAgreed = computed({
  get: () => {
    const base = formData.value.agreeService && formData.value.agreePrivacy && formData.value.agreeMarketing;
    return isEmployer.value ? base : (base && formData.value.agreeThirdParty);
  },
  set: (val: boolean) => {
    formData.value.agreeService = val;
    formData.value.agreePrivacy = val;
    formData.value.agreeMarketing = val;
    if (!isEmployer.value) {
      formData.value.agreeThirdParty = val;
    }
  }
});

// Initialize role from query param
onMounted(() => {
  if (route.query.role && (route.query.role === 'EMPLOYER' || route.query.role === 'FREELANCER')) {
    role.value = route.query.role as UserRole;
  }
});

const switchRole = (newRole: UserRole) => {
  role.value = newRole;
  // Optional: clear errors or form data when switching
  errors.value = {};
  formData.value.agreeService = false;
  formData.value.agreePrivacy = false;
  formData.value.agreeThirdParty = false;
  formData.value.agreeMarketing = false;
};

const validateForm = (isSubmitting = false) => {
  const newErrors: Record<string, string> = {};

  // 이름 검증
  if (!formData.value.name.trim()) {
    newErrors.name = isEmployer.value ? '고용주명을 입력해주세요' : '이름을 입력해주세요';
  }

  // 이메일 검증
  if (!formData.value.email.trim()) {
    newErrors.email = '이메일을 입력해주세요';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    newErrors.email = '올바른 이메일 형식이 아닙니다';
  } else if (!isEmailAvailable.value && !isEmailChecking.value) {
    if (formData.value.email.trim()) {
      newErrors.email = '이미 사용 중이거나 확인되지 않은 이메일입니다';
    }
  }
  // 휴대전화번호 검증
  const normalizedPhone = formData.value.phone.replace(/\D/g, '');
  if (!normalizedPhone) {
    newErrors.phone = '휴대전화번호를 입력해주세요';
  } else if (!/^01\d{8,9}$/.test(normalizedPhone)) {
    newErrors.phone = '올바른 휴대전화번호 형식이 아닙니다';
  } else {
    formData.value.phone = normalizedPhone;
  }

  // 비밀번호 검증
  if (!formData.value.password) {
    newErrors.password = '비밀번호를 입력해주세요';
  } else if (formData.value.password.length < 8) {
    newErrors.password = '비밀번호는 8자 이상이어야 합니다';
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(formData.value.password)) {
    newErrors.password = '대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다';
  }

  // 비밀번호 확인 검증
  if (formData.value.password !== formData.value.confirmPassword) {
    newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
  }

  // 약관 동의 검증 (제출 시에만 에러 표시)
  if (isSubmitting) {
    if (!formData.value.agreeService) newErrors.agreeService = '서비스 이용약관에 동의해주세요';
    if (!formData.value.agreePrivacy) newErrors.agreePrivacy = '개인정보 수집 및 이용에 동의해주세요';
    if (!isEmployer.value && !formData.value.agreeThirdParty) newErrors.agreeThirdParty = '개인정보 제3자 제공에 동의해주세요';
  }

  // UI에 표시할 에러 필터링 (touched이거나 제출 중일 때만 표시)
  const filteredErrors: Record<string, string> = {};
  Object.keys(newErrors).forEach(key => {
    if (touchedFields.value[key] || isSubmitting) {
      filteredErrors[key] = newErrors[key];
    }
  });

  errors.value = filteredErrors;
  return Object.keys(newErrors).length === 0;
};

const handleBlur = (field: string) => {
  touchedFields.value[field] = true;
  validateForm();
};

const handleSubmit = async () => {
  if (!validateForm(true)) return;

  try {
    const signupPayload: any = {
      name: formData.value.name,
      email: formData.value.email,
      password: formData.value.password,
      role: role.value,
      termsAgreed: formData.value.agreeService,
      privacyAgreed: formData.value.agreePrivacy,
      phone: formData.value.phone
    };

    // Start 2FA Signup Process
    await authStore.startSignup(signupPayload);
    showVerificationModal.value = true;
    
  } catch (error) {
    alert('회원가입 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
};

const handleVerificationSuccess = () => {
    alert(`이메일 인증이 완료되었습니다!\n환영합니다, ${formData.value.name}님 🎉`);
    
    // Redirect to ONBOARDING instead of dashboard
    if (isEmployer.value) {
        router.push('/onboarding/employer');
    } else {
        router.push('/onboarding/freelancer');
    }
};

const goBack = () => {
  router.push('/login');
};

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const toggleConfirmPassword = () => {
  showConfirmPassword.value = !showConfirmPassword.value;
};

// Reset email availability when email changes
watch(() => formData.value.email, () => {
  isEmailAvailable.value = false;
});

const checkEmail = async () => {
  if (!formData.value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) return;
  
  isEmailChecking.value = true;
  // Clear any existing availability error while checking
  validateForm();

  try {
    const isAvailable = await authStore.checkEmailDuplicate(formData.value.email);
    isEmailAvailable.value = isAvailable;
    if (!isAvailable) {
      errors.value.email = '이미 사용 중인 이메일입니다';
    } else {
      delete errors.value.email;
    }
  } catch (e) {
    console.error(e);
  } finally {
    isEmailChecking.value = false;
    // Final validation refresh after check completes
    validateForm();
  }
};

const focusNext = (e: KeyboardEvent, nextRef: HTMLInputElement | null) => {
  e.preventDefault();
  if (nextRef) {
    nextRef.focus();
  }
};
</script>

<template>
  <div class="min-h-screen bg-black text-white flex items-center justify-center p-4 py-12 relative overflow-hidden font-sans">
    <AnimatedBackground />

    <div class="relative z-10 w-full max-w-2xl">
      <!-- Back Button -->
      <button
        @click="goBack"
        v-motion
        :initial="{ opacity: 0, x: -20 }"
        :enter="{ opacity: 1, x: 0 }"
        class="mb-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
      >
        <ArrowLeft class="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>돌아가기</span>
      </button>

      <!-- Signup Card -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 600 } }"
        class="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-10"
      >
        <!-- Header -->
        <div class="text-center mb-8">
          <div
            v-motion
            :initial="{ opacity: 0, scale: 0.9 }"
            :enter="{ opacity: 1, scale: 1, transition: { delay: 200 } }"
            class="inline-block mb-6"
          >
            <div
              class="w-20 h-20 rounded-3xl flex items-center justify-center transition-colors duration-500"
              :class="isEmployer ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'"
            >
              <Building2 v-if="isEmployer" class="w-10 h-10 text-white" />
              <UserIcon v-else class="w-10 h-10 text-white" />
            </div>
          </div>
          <h1
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 300 } }"
            class="text-4xl font-bold mb-3"
          >
            {{ isEmployer ? '고용주' : '프리랜서' }} 회원가입
          </h1>
          <p
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }"
            class="text-white/60"
          >
            {{ isEmployer ? '프로젝트를 등록하고 최고의 프리랜서를 만나보세요' : '프로젝트에 지원하고 커리어를 성장시키세요' }}
          </p>
        </div>

        <!-- Role Switch -->
        <div
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { delay: 500 } }"
          class="flex gap-3 mb-8"
        >
          <button
            @click="switchRole('FREELANCER')"
            class="flex-1 py-3 rounded-2xl border transition-all"
            :class="!isEmployer ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-white/10 text-white/60 hover:border-white/20'"
          >
            프리랜서
          </button>
          <button
            @click="switchRole('EMPLOYER')"
            class="flex-1 py-3 rounded-2xl border transition-all"
            :class="isEmployer ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 text-white/60 hover:border-white/20'"
          >
            고용주
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Name / Company -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 600 } }"
          >
            <label class="block text-sm font-medium mb-2 text-white/80">
              {{ isEmployer ? '고용주명' : '이름' }} <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <Building2 v-if="isEmployer" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <UserIcon v-else class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                ref="nameInput"
                type="text"
                v-model="formData.name"
                @blur="handleBlur('name')"
                @keydown.enter="focusNext($event, emailInput)"
                spellcheck="false"
                :placeholder="isEmployer ? '예: 테크스타트업' : '예: 홍길동'"
                class="w-full pl-12 pr-4 py-4 bg-white/5 border rounded-2xl focus:outline-none transition-colors text-white placeholder:text-white/30"
                :class="errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'"
              />
            </div>
            <p v-if="errors.name" class="text-red-400 text-sm mt-2">{{ errors.name }}</p>
          </div>

          <!-- Email -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 700 } }"
          >
            <label class="block text-sm font-medium mb-2 text-white/80">
              이메일 <span class="text-red-400">*</span>
            </label>
              <div class="relative">
                <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  ref="emailInput"
                  type="email"
                  v-model="formData.email"
                  @blur="() => { handleBlur('email'); checkEmail(); }"
                  @keydown.enter="focusNext($event, phoneInput)"
                  spellcheck="false"
                  autocapitalize="none"
                  autocomplete="email"
                  placeholder="your@email.com"
                  class="w-full pl-12 pr-4 py-4 bg-white/5 border rounded-2xl focus:outline-none transition-colors text-white placeholder:text-white/30"
                  :class="errors.email ? 'border-red-500/50' : (isEmailAvailable ? 'border-green-500/50' : 'border-white/10 focus:border-white/30')"
                />
                <div v-if="isEmailChecking" class="absolute right-4 top-1/2 -translate-y-1/2">
                  <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
                <Check v-else-if="isEmailAvailable && !errors.email" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              </div>
              <p v-if="errors.email" class="text-red-400 text-sm mt-2">{{ errors.email }}</p>
          </div>



          <!-- Phone -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 800 } }"
          >
            <label class="block text-sm font-medium mb-2 text-white/80">
              휴대폰 번호 <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <Phone class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                ref="phoneInput"
                type="tel"
                v-model="formData.phone"
                @blur="handleBlur('phone')"
                @keydown.enter="focusNext($event, passwordInput)"
                autocomplete="tel"
                placeholder="010-1234-5678"
                class="w-full pl-12 pr-4 py-4 bg-white/5 border rounded-2xl focus:outline-none transition-colors text-white placeholder:text-white/30"
                :class="errors.phone ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'"
              />
            </div>
            <p v-if="errors.phone" class="text-red-400 text-sm mt-2">{{ errors.phone }}</p>
          </div>

          <!-- Password -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 900 } }"
          >
            <label class="block text-sm font-medium mb-2 text-white/80">
              비밀번호 <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                ref="passwordInput"
                :type="showPassword ? 'text' : 'password'"
                v-model="formData.password"
                @blur="handleBlur('password')"
                @keydown.enter="focusNext($event, confirmPasswordInput)"
                spellcheck="false"
                autocapitalize="none"
                placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                class="w-full pl-12 pr-12 py-4 bg-white/5 border rounded-2xl focus:outline-none transition-colors text-white placeholder:text-white/30"
                :class="errors.password ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'"
              />
              <button
                type="button"
                @click="togglePassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                <EyeOff v-if="showPassword" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>
            <p v-if="errors.password" class="text-red-400 text-sm mt-2">{{ errors.password }}</p>
          </div>

          <!-- Confirm Password -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 1000 } }"
          >
            <label class="block text-sm font-medium mb-2 text-white/80">
              비밀번호 확인 <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                ref="confirmPasswordInput"
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="formData.confirmPassword"
                @blur="handleBlur('confirmPassword')"
                @keydown.enter="handleSubmit"
                spellcheck="false"
                autocapitalize="none"
                placeholder="비밀번호 재입력"
                class="w-full pl-12 pr-12 py-4 bg-white/5 border rounded-2xl focus:outline-none transition-colors text-white placeholder:text-white/30"
                :class="errors.confirmPassword ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'"
              />
              <button
                type="button"
                @click="toggleConfirmPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                <EyeOff v-if="showConfirmPassword" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>
            <p v-if="errors.confirmPassword" class="text-red-400 text-sm mt-2">{{ errors.confirmPassword }}</p>
          </div>

          <!-- Agreements -->
          <div
            v-motion
            :initial="{ opacity: 0 }"
            :enter="{ opacity: 1, transition: { delay: 1100 } }"
            class="space-y-4 pt-4 border-t border-white/10"
          >
            <!-- Select All -->
            <label class="flex items-center gap-3 cursor-pointer pb-2 hover:bg-white/5 p-2 rounded-xl transition-colors">
              <div
                class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                :class="allAgreed ? 'bg-white border-white' : 'border-white/30'"
              >
                <Check v-if="allAgreed" class="w-4 h-4 text-black" />
              </div>
              <input type="checkbox" v-model="allAgreed" class="sr-only" />
              <span class="font-bold text-white">전체 동의하기</span>
            </label>

            <!-- Service Terms -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div
                    class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 group-hover:border-white/50 transition-colors"
                    :class="formData.agreeService ? 'bg-white border-white' : 'border-white/30'"
                  >
                    <Check v-if="formData.agreeService" class="w-4 h-4 text-black" />
                  </div>
                  <input type="checkbox" v-model="formData.agreeService" class="sr-only" />
                  <span class="text-sm text-white/80"><span class="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 mr-1">필수</span> 서비스 이용약관 동의</span>
                </label>
                <button type="button" @click="openTermsModal('서비스 이용약관', SERVICE_TERMS)" class="text-xs text-white/40 hover:text-white underline p-1">보기</button>
              </div>
              <p v-if="errors.agreeService" class="text-red-400 text-xs ml-8">{{ errors.agreeService }}</p>
            </div>

            <!-- Privacy Terms -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div
                    class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 group-hover:border-white/50 transition-colors"
                    :class="formData.agreePrivacy ? 'bg-white border-white' : 'border-white/30'"
                  >
                    <Check v-if="formData.agreePrivacy" class="w-4 h-4 text-black" />
                  </div>
                  <input type="checkbox" v-model="formData.agreePrivacy" class="sr-only" />
                  <span class="text-sm text-white/80"><span class="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 mr-1">필수</span> 개인정보 수집 및 이용 동의</span>
                </label>
                <button 
                  type="button" 
                  @click="openTermsModal('개인정보 수집 및 이용 동의', isEmployer ? PRIVACY_TERMS_EMPLOYER : PRIVACY_TERMS_FREELANCER)" 
                  class="text-xs text-white/40 hover:text-white underline p-1"
                >보기</button>
              </div>
              <p v-if="errors.agreePrivacy" class="text-red-400 text-xs ml-8">{{ errors.agreePrivacy }}</p>
            </div>

            <!-- Third Party (Freelancer Only) -->
            <div v-if="!isEmployer" class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div
                    class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 group-hover:border-white/50 transition-colors"
                    :class="formData.agreeThirdParty ? 'bg-white border-white' : 'border-white/30'"
                  >
                    <Check v-if="formData.agreeThirdParty" class="w-4 h-4 text-black" />
                  </div>
                  <input type="checkbox" v-model="formData.agreeThirdParty" class="sr-only" />
                  <span class="text-sm text-white/80"><span class="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 mr-1">필수</span> 개인정보 제3자 제공 동의</span>
                </label>
                <button type="button" @click="openTermsModal('개인정보 제3자 제공 동의', THIRD_PARTY_TERMS)" class="text-xs text-white/40 hover:text-white underline p-1">보기</button>
              </div>
              <p v-if="errors.agreeThirdParty" class="text-red-400 text-xs ml-8">{{ errors.agreeThirdParty }}</p>
            </div>

            <!-- Marketing -->
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div
                    class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 group-hover:border-white/50 transition-colors"
                    :class="formData.agreeMarketing ? 'bg-white border-white' : 'border-white/30'"
                  >
                    <Check v-if="formData.agreeMarketing" class="w-4 h-4 text-black" />
                  </div>
                  <input type="checkbox" v-model="formData.agreeMarketing" class="sr-only" />
                  <span class="text-sm text-white/80"><span class="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60 mr-1">선택</span> 마케팅 정보 수신 동의</span>
                </label>
                <button type="button" @click="openTermsModal('마케팅 정보 수신 동의', MARKETING_TERMS)" class="text-xs text-white/40 hover:text-white underline p-1">보기</button>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="authStore.isLoading"
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 1200 } }"
            class="w-full py-4 text-white rounded-2xl font-semibold text-lg hover:shadow-2xl transition-all hover:scale-102 active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :class="isEmployer ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'"
          >
            <div v-if="authStore.isLoading" class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span>{{ authStore.isLoading ? '처리중...' : '가입하기' }}</span>
          </button>
        </form>

        <!-- Login Link -->
        <div
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { delay: 1300 } }"
          class="mt-6 text-center"
        >
          <p class="text-sm text-white/50">
            이미 계정이 있으신가요? 
            <button @click="goBack" class="text-white hover:underline font-medium">
              로그인하기
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
  
  <TermsModal
    :isOpen="showTermsModal"
    :title="currentTermsTitle"
    :content="currentTermsContent"
    @close="showTermsModal = false"
  />

  <VerificationModal
    :isOpen="showVerificationModal"
    :email="formData.email"
    @close="showVerificationModal = false"
    @verified="handleVerificationSuccess"
  />
</template>
