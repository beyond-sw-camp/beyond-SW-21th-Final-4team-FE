<script setup lang="ts">
import { ref, watch, onUnmounted, computed, nextTick } from 'vue';
import { X, Mail, Timer, RotateCcw, CheckCircle2 } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';

const props = defineProps<{
  isOpen: boolean;
  email: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'verified'): void;
}>();

const authStore = useAuthStore();
const code = ref('');
const error = ref('');
const timeLeft = ref(180); // 3 minutes
const timerActive = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
let timerInterval: number | null = null;

// Derived state for the 6 digits
const digits = computed(() => {
  const arr = code.value.split('');
  return Array.from({ length: 6 }, (_, i) => arr[i] || '');
});

// Computed for formatting time
const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60);
  const seconds = timeLeft.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const isExpired = computed(() => timeLeft.value === 0);

// Timer Logic
const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval);
  timeLeft.value = 180;
  timerActive.value = true;
  timerInterval = window.setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      stopTimer();
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) clearInterval(timerInterval);
  timerActive.value = false;
  timerInterval = null;
};

// Lifecycle
watch(() => props.isOpen, async (open) => {
  if (open) {
    code.value = '';
    error.value = '';
    startTimer();
    document.body.style.overflow = 'hidden';
    await nextTick();
    inputRef.value?.focus();
  } else {
    stopTimer();
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  stopTimer();
  document.body.style.overflow = '';
});

// Actions
const handleVerify = async () => {
  if (code.value.length !== 6) {
    error.value = '인증 코드 6자리를 모두 입력해주세요.';
    // Shake animation trigger logic could go here
    return;
  }

  try {
    const success = await authStore.verifyEmail(props.email, code.value);
    if (success) {
      emit('verified');
      emit('close');
    } else {
      error.value = '인증 코드가 올바르지 않습니다.';
      code.value = ''; // Clear code on error? Or keep it? keeping it for now
      inputRef.value?.focus();
    }
  } catch (e) {
    console.error(e);
    error.value = '인증 확인 중 오류가 발생했습니다.';
  }
};

const handleResend = async () => {
  try {
    error.value = '';
    await authStore.resendVerificationCode(props.email);
    startTimer();
    code.value = '';
    inputRef.value?.focus();
  } catch (e) {
    console.error(e);
    error.value = '인증 코드 재전송에 실패했습니다.';
  }
};

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const val = target.value.replace(/[^0-9]/g, '');
  code.value = val.slice(0, 6);
  
  if (error.value) error.value = '';
  
  if (code.value.length === 6) {
    // Optional: Auto-submit when filled? 
    // handleVerify();
  }
};

const focusInput = () => {
  inputRef.value?.focus();
};
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        @click="emit('close')"
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1 }"
      ></div>

      <!-- Modal Content -->
      <div
        role="dialog"
        aria-modal="true"
        class="relative w-full max-w-lg bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
        v-motion
        :initial="{ opacity: 0, scale: 0.95, y: 20 }"
        :enter="{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }"
      >
        <!-- Background Gradients -->
        <div class="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div class="absolute -top-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-[80px]"></div>
          <div class="absolute -bottom-20 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px]"></div>
        </div>

        <div class="px-8 py-10">
          <!-- Header -->
          <div class="text-center mb-10">
            <div 
              class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-lg shadow-blue-500/10"
              v-motion
              :initial="{ opacity: 0, y: 10 }"
              :enter="{ opacity: 1, y: 0, transition: { delay: 100 } }"
            >
              <Mail class="w-7 h-7 text-blue-400" />
            </div>
            <h2 
              class="text-2xl font-bold text-white mb-3"
              v-motion
              :initial="{ opacity: 0, y: 10 }"
              :enter="{ opacity: 1, y: 0, transition: { delay: 150 } }"
            >
              이메일 인증
            </h2>
            <p 
              class="text-white/60 text-sm leading-relaxed"
              v-motion
              :initial="{ opacity: 0, y: 10 }"
              :enter="{ opacity: 1, y: 0, transition: { delay: 200 } }"
            >
              <span class="font-medium text-white">{{ email }}</span>으로<br/>
              발송된 인증 코드 6자리를 입력해주세요.
            </p>
          </div>

          <!-- Input Section -->
          <div class="space-y-8">
            <!-- Pin Input Container -->
            <div class="relative group" @click="focusInput">
              <!-- Hidden Input -->
              <input 
                ref="inputRef"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                :value="code"
                @input="handleInput"
                maxlength="6"
                class="absolute inset-0 opacity-0 cursor-text w-full h-full z-20"
                @keyup.enter="handleVerify"
              />
              
              <!-- Visual Boxes -->
              <div class="flex gap-3 justify-center">
                <div 
                  v-for="(digit, index) in 6" 
                  :key="index"
                  class="w-12 h-14 rounded-xl border flex items-center justify-center text-2xl font-bold transition-all duration-200"
                  :class="[
                    digits[index] 
                      ? 'border-blue-500/50 bg-blue-500/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-105' 
                      : (code.length === index ? 'border-blue-500 bg-white/5 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-white/10 bg-white/5 text-white/20'),
                     error ? 'border-red-500/50 bg-red-500/5' : ''
                  ]"
                >
                  <span v-if="digits[index]" 
                    v-motion
                    :initial="{ opacity: 0, scale: 0.5 }"
                    :enter="{ opacity: 1, scale: 1 }"
                  >
                    {{ digits[index] }}
                  </span>
                  <div v-else-if="code.length === index" class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
              </div>
            </div>

            <!-- Error Message & Timer -->
            <div class="flex flex-col items-center gap-2 h-6">
               <p v-if="error" class="text-red-400 text-sm font-medium animate-shake">
                  {{ error }}
               </p>
               <div v-else class="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10"
                    :class="timeLeft < 60 ? 'text-red-400 border-red-500/20' : 'text-blue-400 border-blue-500/20'"
               >
                  <Timer class="w-3.5 h-3.5" />
                  <span>{{ formattedTime }}</span>
               </div>
            </div>

            <!-- Action Button -->
            <button
              @click="handleVerify"
              :disabled="code.length !== 6 || authStore.isLoading || isExpired"
              class="w-full py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 relative overflow-hidden group"
              :class="code.length === 6 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)]' : 'bg-white/10 text-white/40'"
            >
              <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <div v-if="authStore.isLoading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span v-else>인증 확인</span>
              <CheckCircle2 v-if="!authStore.isLoading && code.length === 6" class="w-5 h-5 ml-1" />
            </button>

            <!-- Resend Link -->
            <div class="text-center">
              <button
                @click="handleResend"
                :disabled="!isExpired"
                class="text-sm transition-colors flex items-center gap-1.5 mx-auto px-3 py-2 rounded-lg hover:bg-white/5"
                :class="isExpired ? 'text-white/60 hover:text-white' : 'text-white/20 cursor-not-allowed'"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>인증코드가 오지 않았나요?</span>
                <span v-if="!isExpired" class="text-xs ml-1 font-mono text-white/40">({{ formattedTime }})</span>
                <span v-else class="text-xs ml-1 font-bold text-blue-400 underline">재전송</span>
              </button>
            </div>
          </div>
        </div>
      
        <!-- Close Button -->
        <button
          @click="emit('close')"
          class="absolute top-5 right-5 text-white/20 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 group"
        >
          <X class="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
.animate-shake {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}
</style>
