<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { X, AlertCircle } from 'lucide-vue-next';
import { useJobStore } from '@/stores/jobStore';
import type { Application } from '@/types';

const props = defineProps<{
  application: Application;
  onClose: () => void;
}>();

const jobStore = useJobStore();
const selectedReason = ref('');
const customReason = ref('');
const isSubmitting = ref(false);
const submitError = ref('');

const rejectionReasons = [
  { value: 'SKILL_MISMATCH', label: '기술 스택 불일치' },
  { value: 'LACK_EXPERIENCE', label: '경력 부족' },
  { value: 'SCHEDULE_MISMATCH', label: '일정 불일치' },
  { value: 'OTHER', label: '기타' },
];

const isValid = computed(() => {
  return selectedReason.value && (selectedReason.value !== 'OTHER' || customReason.value.trim());
});

const handleSubmit = async (e: Event) => {
  e.preventDefault();

  const reasonLabel = rejectionReasons.find((r) => r.value === selectedReason.value)?.label || '';
  const finalReason = selectedReason.value === 'OTHER' ? customReason.value : reasonLabel;

  isSubmitting.value = true;
  submitError.value = '';

  try {
    await jobStore.updateApplicationStatus(props.application.id, 'REJECTED', finalReason);
    alert('지원이 거절되었습니다.');
    props.onClose();
  } catch (error: any) {
    submitError.value = error?.response?.data?.message || error?.message || '지원 거절에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
    <div 
        class="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl"
        v-motion
        :initial="{ opacity: 0, scale: 0.95, y: 20 }"
        :enter="{ opacity: 1, scale: 1, y: 0 }"
        :leave="{ opacity: 0, scale: 0.95, y: 20 }"
    >
      <div class="fb-modal-header border-b border-white/10 p-6 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">지원 거절</h2>
        <button
          @click="onClose"
          class="p-2 hover:bg-white/10 rounded-xl transition-colors"
          v-motion
          :hover="{ scale: 1.1, rotate: 90 }"
          :tap="{ scale: 0.9 }"
        >
          <X class="w-6 h-6 text-white" />
        </button>
      </div>

      <form @submit="handleSubmit" class="p-6">
        <div
          v-if="submitError"
          class="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {{ submitError }}
        </div>

        <!-- 경고 메시지 -->
        <div class="bg-orange-500/20 border border-orange-400/30 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertCircle class="w-5 h-5 text-orange-300 flex-shrink-0 mt-0.5" />
          <div class="text-sm text-orange-200">
            <div class="font-medium mb-1">거절 시 주의사항</div>
            <div>
              거절 사유는 지원자에게 전달되어 개선의 기회를 제공합니다.
              구체적이고 건설적인 피드백을 작성해주세요.
            </div>
          </div>
        </div>

        <!-- 지원자 정보 -->
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6">
          <div class="text-sm text-white/60 mb-1">거절할 지원자</div>
          <div class="font-medium text-white">{{ application.freelancerName }}</div>
        </div>

        <!-- 거절 사유 선택 -->
        <div class="mb-6">
          <label class="block text-sm text-white/80 mb-3">
            거절 사유 선택 <span class="text-red-400">*</span>
          </label>
          <div class="space-y-2">
            <label
              v-for="reason in rejectionReasons"
              :key="reason.value"
              class="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all"
              :class="selectedReason === reason.value ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-blue-500/50'"
              v-motion
              :hover="{ x: 4 }"
            >
              <input
                type="radio"
                name="reason"
                :value="reason.value"
                v-model="selectedReason"
                class="w-4 h-4 text-blue-500 accent-blue-500"
              />
              <span class="text-white">{{ reason.label }}</span>
            </label>
          </div>
        </div>

        <!-- 기타 사유 입력 -->
        <div v-if="selectedReason === 'OTHER'" class="mb-6"
            v-motion
            :initial="{ opacity: 0, height: 0 }"
            :enter="{ opacity: 1, height: 'auto' }"
        >
          <label class="block text-sm text-white/80 mb-2">
            상세 사유 <span class="text-red-400">*</span>
          </label>
          <textarea
            v-model="customReason"
            placeholder="구체적인 거절 사유를 작성해주세요..."
            rows="4"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 resize-none text-white placeholder:text-white/30"
            required
          />
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            @click="onClose"
            class="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            :disabled="!isValid || isSubmitting"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {{ isSubmitting ? '거절 중...' : '거절하기' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
