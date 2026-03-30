<script setup lang="ts">
import { ref } from 'vue';
import { useMotion } from '@vueuse/motion';
import { X, Send, FileText, Link as LinkIcon } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useJobStore } from '@/stores/jobStore';
import type { JobPosting } from '@/types';

const props = defineProps<{
  job: JobPosting;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const authStore = useAuthStore();
const jobStore = useJobStore();

const message = ref('');
const portfolioUrl = ref('');
const resumeUrl = ref('');
const isSubmitting = ref(false);
const submitError = ref('');

const handleSubmit = async () => {
  if (!authStore.user) return;

  isSubmitting.value = true;
  submitError.value = '';

  try {
    await jobStore.addApplication({
      jobId: props.job.id,
      freelancerId: authStore.user.id,
      freelancerName: authStore.user.name,
      message: message.value,
      portfolioUrl: portfolioUrl.value || undefined,
      resumeUrl: resumeUrl.value || undefined,
      status: 'PENDING',
    });

    alert(`${props.job.title} 프로젝트에 지원이 완료되었습니다!`);
    emit('close');
  } catch (error: any) {
    submitError.value = error?.response?.data?.message || error?.message || '지원 등록에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-white">
    <div
      class="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      v-motion
      :initial="{ opacity: 0, scale: 0.95, y: 20 }"
      :enter="{ opacity: 1, scale: 1, y: 0 }"
      :leave="{ opacity: 0, scale: 0.95, y: 20 }"
    >
      <div class="fb-modal-header sticky top-0 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
        <h2 class="text-2xl font-bold text-white">프로젝트 지원</h2>
        <button
          @click="$emit('close')"
          class="p-2 hover:bg-white/10 rounded-xl transition-colors"
           v-motion
          :hover="{ scale: 1.1, rotate: 90 }"
          :tap="{ scale: 0.9 }"
        >
          <X class="w-6 h-6 text-white" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6">
        <div
          v-if="submitError"
          class="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {{ submitError }}
        </div>

        <!-- 프로젝트 정보 -->
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6 shadow-lg">
          <div class="text-sm text-white/60 mb-1">지원 프로젝트</div>
          <div class="font-medium text-lg text-white">{{ job.title }}</div>
          <div class="text-sm text-white/60">{{ job.employerName }}</div>
        </div>

        <!-- 지원 메시지 -->
        <div class="mb-6">
          <label class="block text-sm text-white/80 mb-2">
            지원 메시지 <span class="text-red-400">*</span>
          </label>
          <textarea
            v-model="message"
            placeholder="자기소개와 함께 이 프로젝트에 적합한 이유를 설명해주세요..."
            rows="8"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 resize-none text-white placeholder:text-white/30"
            required
          ></textarea>
          <div class="text-xs text-white/60 mt-1">
            💡 경력, 관련 프로젝트 경험, 강점을 구체적으로 작성하면 합격률이 높아집니다
          </div>
        </div>

        <!-- 포트폴리오 URL -->
        <div class="mb-6">
          <label class="block text-sm text-white/80 mb-2 flex items-center gap-2">
            <LinkIcon class="w-4 h-4" />
            포트폴리오 URL (선택)
          </label>
          <input
            type="url"
            v-model="portfolioUrl"
            placeholder="https://portfolio.example.com"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-white placeholder:text-white/30"
          />
        </div>

        <!-- 이력서 URL -->
        <div class="mb-6">
          <label class="block text-sm text-white/80 mb-2 flex items-center gap-2">
            <FileText class="w-4 h-4" />
            이력서 URL (선택)
          </label>
          <input
            type="url"
            v-model="resumeUrl"
            placeholder="https://drive.google.com/..."
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-white placeholder:text-white/30"
          />
          <div class="text-xs text-white/60 mt-1">
            Google Drive, Dropbox 등의 공유 링크를 입력하세요
          </div>
        </div>

        <!-- 버튼 -->
        <div class="flex gap-3">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors"
            v-motion
            :hover="{ scale: 1.02 }"
            :tap="{ scale: 0.98 }"
          >
            취소
          </button>
          <button
            type="submit"
            :disabled="!message.trim() || isSubmitting"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
            v-motion
            :hover="{ scale: 1.02 }"
            :tap="{ scale: 0.98 }"
          >
            <Send class="w-5 h-5" />
            {{ isSubmitting ? '지원 중...' : '지원하기' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
