<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { X, Plus } from 'lucide-vue-next';
import { useJobStore } from '@/stores/jobStore';
import type { JobPosting, JobStatus } from '@/types';

const props = defineProps<{
  job: JobPosting;
  onClose: () => void;
  onSuccess: () => void;
}>();

const jobStore = useJobStore();

const statusOptions: { value: JobStatus; label: string }[] = [
  { value: 'OPEN', label: '모집중' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'CONTRACTED', label: '계약완료' },
  { value: 'CLOSED', label: '마감' },
];

const formData = reactive({
  title: props.job.title,
  description: props.job.description,
  techStack: [...props.job.techStack],
  budget: props.job.budget,
  duration: props.job.duration,
  status: props.job.status,
});

const techInput = ref('');

const handleAddTech = () => {
    const trimmed = techInput.value.trim();
  if (trimmed && !formData.techStack.includes(trimmed)) {
    formData.techStack.push(trimmed);
    techInput.value = '';
  }
};

const handleRemoveTech = (tech: string) => {
  formData.techStack = formData.techStack.filter((t) => t !== tech);
};

const setStatus = (status: JobStatus) => {
    formData.status = status;
}

const handleSubmit = async (e: Event) => {
  e.preventDefault();

  const budget = Number(formData.budget);
  const duration = Number(formData.duration);

  const isValidBudget = Number.isFinite(budget) && budget > 0;
  const isValidDuration = Number.isFinite(duration) && duration > 0;

  if (!isValidBudget || !isValidDuration) {
    window.alert('월급과 기간은 0보다 큰 숫자로 입력해주세요.');
    return;
  }

  const confirmed = window.confirm('정말로 수정하시겠습니까?');
  if (!confirmed) return;

  try {
    await jobStore.updateJobPosting(props.job.id, {
      title: formData.title,
      description: formData.description,
      techStack: formData.techStack,
      budget,
      duration,
      status: formData.status,
    });

    window.alert('수정되었습니다!');
    props.onSuccess();
  } catch (error) {
    console.error('Failed to update job posting:', error);
    window.alert('공고 수정에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
};

const isValid = computed(() => {
    const budget = Number(formData.budget);
    const duration = Number(formData.duration);
    return (
      formData.title &&
      formData.description &&
      formData.techStack.length > 0 &&
      Number.isFinite(budget) &&
      budget > 0 &&
      Number.isFinite(duration) &&
      duration > 0
    );
});

const onTechInputKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTech();
    }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
    <div 
        class="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        v-motion
        :initial="{ opacity: 0, scale: 0.95, y: 20 }"
        :enter="{ opacity: 1, scale: 1, y: 0 }"
        :leave="{ opacity: 0, scale: 0.95, y: 20 }"
    >
      <div class="fb-modal-header sticky top-0 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
        <h2 class="text-2xl font-bold text-white">프로젝트 공고 수정</h2>
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

      <form @submit="handleSubmit" class="p-6 space-y-6">
        <!-- 상태 -->
        <div>
          <label class="block text-sm text-white/80 mb-2">
            공고 상태 <span class="text-red-400">*</span>
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              type="button"
              @click="setStatus(option.value)"
              class="px-4 py-3 rounded-2xl border-2 transition-all font-medium"
              :class="formData.status === option.value ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-white/10 bg-white/5 text-white hover:border-blue-500/50'"
            >
               {{ option.label }}
            </button>
          </div>
        </div>

        <!-- 제목 -->
        <div>
          <label class="block text-sm text-white/80 mb-2">
            프로젝트 제목 <span class="text-red-400">*</span>
          </label>
          <input
            type="text"
            v-model="formData.title"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-white"
            required
          />
        </div>

        <!-- 설명 -->
        <div>
          <label class="block text-sm text-white/80 mb-2">
            프로젝트 설명 <span class="text-red-400">*</span>
          </label>
          <textarea
            v-model="formData.description"
            rows="6"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 resize-none text-white"
            required
          />
        </div>

        <!-- 기술 스택 -->
        <div>
          <label class="block text-sm text-white/80 mb-2">
            요구 기술 스택 <span class="text-red-400">*</span>
          </label>
          <div class="flex gap-2 mb-3">
            <input
              type="text"
              v-model="techInput"
              @keydown="onTechInputKeydown"
              placeholder="기술을 입력하고 추가 버튼을 클릭하세요"
              class="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-white placeholder:text-white/30"
            />
            <button
              type="button"
              @click="handleAddTech"
              class="px-4 py-2 bg-blue-500 text-white rounded-2xl hover:shadow-lg transition-all"
            >
              <Plus class="w-5 h-5" />
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="tech in formData.techStack"
              :key="tech"
              class="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30"
            >
              {{ tech }}
              <button
                type="button"
                @click="handleRemoveTech(tech)"
                class="hover:bg-blue-500/30 rounded-full p-0.5"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <!-- 월급 -->
        <div>
          <label class="block text-sm text-white/80 mb-2">
            월급 (원) <span class="text-red-400">*</span>
          </label>
          <input
            type="number"
            v-model.number="formData.budget"
            min="0"
            step="100000"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-white"
            required
          />
        </div>

        <!-- 기간 -->
        <div>
          <label class="block text-sm text-white/80 mb-2">
            예상 기간 (개월) <span class="text-red-400">*</span>
          </label>
          <input
            type="number"
            v-model.number="formData.duration"
            min="1"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-white"
            required
          />
        </div>

        <!-- 버튼 -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="onClose"
            class="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            :disabled="!isValid"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            수정 완료
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
