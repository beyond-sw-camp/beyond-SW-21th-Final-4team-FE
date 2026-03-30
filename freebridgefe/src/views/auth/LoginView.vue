<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-vue-next';
import AnimatedBackground from './components/AnimatedBackground.vue';

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const handleLogin = async (e: Event) => {
  e.preventDefault();
  error.value = '';

  try {
    const data = await authStore.login({
      email: email.value,
      password: password.value
    });

    // Success - redirect based on role
    if (data.user.role === 'EMPLOYER') {
      router.push('/employer/jobs');
    } else {
      router.push('/freelancer/jobs');
    }
  } catch (err: any) {
    console.error('Login error:', err);
    error.value = err.response?.data?.message || '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
};

const navigateToSignup = (role: 'EMPLOYER' | 'FREELANCER') => {
  router.push({ path: '/signup', query: { role } });
};

const goBack = () => {
  router.push('/');
};

const isFindPasswordModalOpen = ref(false);
const resetEmail = ref('');
const step = ref<'EMAIL' | 'VERIFY' | 'PASSWORD'>('EMAIL');
const verificationCode = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isProcessing = ref(false);
const modalError = ref('');

const openFindPasswordModal = () => {
  isFindPasswordModalOpen.value = true;
  resetEmail.value = '';
  step.value = 'EMAIL';
  verificationCode.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  modalError.value = '';
};

const closeFindPasswordModal = () => {
  isFindPasswordModalOpen.value = false;
  modalError.value = '';
};

const handleSendCode = async () => {
  isProcessing.value = true;
  modalError.value = '';
  // TODO: Implement SMTP email sending via backend API
  await new Promise(resolve => setTimeout(resolve, 1500));
  isProcessing.value = false;
  step.value = 'VERIFY';
};

const handleVerifyCode = async () => {
  isProcessing.value = true;
  modalError.value = '';

  // TODO: MOCK implementation - REPLACE with actual backend verification endpoint
  // Example:
  // try {
  //   await api.post('/auth/verify-code', { code: verificationCode.value });
  //   step.value = 'PASSWORD';
  // } catch (err) {
  //   modalError.value = err.response?.data?.message || '인증에 실패했습니다.';
  // }

  try {
    // Simulate server API call
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock server-side validation logic
        if (verificationCode.value === '123456') {
          resolve(true);
        } else {
          // Simulate server error response for invalid code
          reject(new Error('인증번호가 올바르지 않습니다.'));
        }
      }, 1000);
    });

    // Success (Server returned 200 OK)
    step.value = 'PASSWORD';
  } catch (err: any) {
    // Failure (Server returned error)
    console.error('Mobile verification failed:', err);
    modalError.value = err.message || '서버 통신 오류가 발생했습니다.';
  } finally {
    isProcessing.value = false;
  }
};

const handlePasswordChange = async () => {
  // 1. Reset Error
  modalError.value = '';

  // 2. Validate Password Match
  if (newPassword.value !== confirmPassword.value) {
    modalError.value = '비밀번호가 일치하지 않습니다.';
    return;
  }

  // 3. Validate Password Strength
  // Min 8 chars, at least one uppercase, one lowercase, one number, and one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword.value)) {
    modalError.value = '비밀번호는 8자 이상이어야 하며, 대소문자, 숫자, 특수문자를 포함해야 합니다.';
    return;
  }
  
  // 4. API Call (Simulated)
  isProcessing.value = true;
  try {
    // TODO: Replace with actual backend API call to update password
    // await api.post('/auth/reset-password', { 
    //   email: resetEmail.value, 
    //   code: verificationCode.value,
    //   newPassword: newPassword.value 
    // });
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated delay

    // 5. Success Handling
    closeFindPasswordModal();
    email.value = resetEmail.value; // Auto-fill login email
    password.value = newPassword.value; // Auto-fill new password
    alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해 주세요.');

  } catch (err: any) {
    // 6. Error Handling
    console.error('Password reset failed:', err);
    modalError.value = err.message || '비밀번호 변경 중 오류가 발생했습니다.';
  } finally {
    // 7. Cleanup
    isProcessing.value = false;
  }
};

// ... (existing code)

// Template changes for displaying modalError instead of error in the modal
// In Step 2: Verification Code form
  // <div v-if="modalError" class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
  //   {{ modalError }}
  // </div>
// In Step 3: New Password form
  // <div v-if="modalError" class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
  //   {{ modalError }}
  // </div>

// Animation variants for v-motion
</script>

<template>
  <div class="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
    <AnimatedBackground />

    <div class="relative z-10 w-full max-w-md">
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

      <!-- Login Card -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 600 } }"
        class="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-10"
      >
        <div class="text-center mb-10">
          <h1
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 200 } }"
            class="text-4xl font-bold mb-3"
          >
            로그인
          </h1>
          <p
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 300 } }"
            class="text-white/60"
          >
            FreeBridge에 오신 것을 환영합니다
          </p>
        </div>

        <form @submit="handleLogin" class="space-y-5">
          <!-- Email -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }"
          >
            <label class="block text-sm font-medium mb-2 text-white/80">이메일</label>
            <div class="relative">
              <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="email"
                v-model="email"
                placeholder="your@email.com"
                class="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-white/30 transition-colors text-white placeholder:text-white/30"
                required
              />
            </div>
          </div>

          <!-- Password -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 500 } }"
          >
            <label class="block text-sm font-medium mb-2 text-white/80">비밀번호</label>
            <div class="relative">
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="••••••••"
                class="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-white/30 transition-colors text-white placeholder:text-white/30"
                required
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
          </div>

          <!-- Error Message -->
          <div
            v-if="error"
            v-motion
            :initial="{ opacity: 0, scale: 0.95 }"
            :enter="{ opacity: 1, scale: 1 }"
            class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm"
          >
            {{ error }}
          </div>

          <!-- Remember & Forgot -->
          <div
            v-motion
            :initial="{ opacity: 0 }"
            :enter="{ opacity: 1, transition: { delay: 600 } }"
            class="flex items-center justify-between text-sm"
          >
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" class="rounded bg-white/5 border-white/10" />
              <span class="text-white/60">로그인 상태 유지</span>
            </label>
            <button 
              type="button" 
              @click="openFindPasswordModal"
              class="text-white/80 hover:text-white transition-colors"
            >
              비밀번호 찾기
            </button>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 700 } }"
            class="w-full py-4 bg-white text-black rounded-2xl font-semibold text-lg hover:shadow-2xl transition-transform hover:scale-102 active:scale-98"
          >
            로그인
          </button>
        </form>

        <!-- Signup Links -->
        <div
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { delay: 800 } }"
          class="space-y-3"
        >
          <!-- Divider with Text -->
          <div class="flex items-center gap-4 my-8">
             <div class="h-px bg-white/10 flex-1" />
             <span class="text-white/50 text-sm">아직 계정이 없으신가요?</span>
             <div class="h-px bg-white/10 flex-1" />
          </div>
          <button
            @click="navigateToSignup('FREELANCER')"
            class="w-full py-3 border border-white/20 text-white rounded-2xl hover:bg-white/5 transition-all font-medium hover:scale-102 active:scale-98"
          >
            프리랜서로 가입하기
          </button>
          <button
            @click="navigateToSignup('EMPLOYER')"
            class="w-full py-3 border border-white/20 text-white rounded-2xl hover:bg-white/5 transition-all font-medium hover:scale-102 active:scale-98"
          >
            고용주로 가입하기
          </button>
        </div>

      </div>
    </div>

    <!-- Find Password Modal -->
    <div v-if="isFindPasswordModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        class="absolute inset-0 bg-black/80 backdrop-blur-sm"
        @click="closeFindPasswordModal"
      ></div>
      
      <div 
        v-motion
        :initial="{ opacity: 0, scale: 0.9 }"
        :enter="{ opacity: 1, scale: 1 }"
        class="relative bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <button 
          @click="closeFindPasswordModal"
          class="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 class="text-2xl font-bold mb-2">비밀번호 찾기</h2>
        <p class="text-white/60 mb-6 text-sm">
          <span v-if="step === 'EMAIL'">가입하신 이메일 주소를 입력해 주세요.<br/>인증번호를 보내드립니다.</span>
          <span v-else-if="step === 'VERIFY'">이메일로 전송된 인증번호 6자리를 입력해 주세요.</span>
          <span v-else-if="step === 'PASSWORD'">새로운 비밀번호를 입력해 주세요.</span>
        </p>

        <!-- Step 1: Email Input -->
        <form v-if="step === 'EMAIL'" @submit.prevent="handleSendCode" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2 text-white/80">이메일</label>
            <div class="relative">
              <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="email"
                v-model="resetEmail"
                placeholder="your@email.com"
                class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors text-white placeholder:text-white/30"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            :disabled="isProcessing"
            class="w-full py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="isProcessing" class="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
            <span>{{ isProcessing ? '전송 중...' : '인증번호 받기' }}</span>
          </button>
        </form>

        <!-- Step 2: Verification Code -->
        <form v-if="step === 'VERIFY'" @submit.prevent="handleVerifyCode" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2 text-white/80">인증번호</label>
            <input
              type="text"
              v-model="verificationCode"
              placeholder="123456"
              maxlength="6"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors text-white placeholder:text-white/30 text-center tracking-widest text-lg"
              required
            />
          </div>
           <div v-if="modalError" class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
            {{ modalError }}
          </div>
          <button
            type="submit"
            :disabled="isProcessing"
            class="w-full py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="isProcessing" class="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
            <span>{{ isProcessing ? '확인 중...' : '인증하기' }}</span>
          </button>
          <button 
            type="button" 
            @click="step = 'EMAIL'"
            class="w-full py-2 text-sm text-white/40 hover:text-white transition-colors"
          >
            이메일 다시 입력하기
          </button>
        </form>

        <!-- Step 3: New Password -->
        <form v-if="step === 'PASSWORD'" @submit.prevent="handlePasswordChange" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2 text-white/80">새 비밀번호</label>
            <input
              type="password"
              v-model="newPassword"
              placeholder="••••••••"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors text-white placeholder:text-white/30"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2 text-white/80">비밀번호 확인</label>
            <input
              type="password"
              v-model="confirmPassword"
              placeholder="••••••••"
              class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/30 transition-colors text-white placeholder:text-white/30"
              required
            />
          </div>
           <div v-if="modalError" class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
            {{ modalError }}
          </div>
          <button
            type="submit"
            :disabled="isProcessing"
            class="w-full py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="isProcessing" class="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
            <span>{{ isProcessing ? '변경 중...' : '비밀번호 변경' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
