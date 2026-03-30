<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useMotion } from '@vueuse/motion';
import { X, Send } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useFreelancerStore } from '@/stores/freelancerStore';
import { useJobStore } from '@/stores/jobStore';
import type { User } from '@/types';

const props = defineProps<{
  freelancer: User;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const authStore = useAuthStore();
const freelancerStore = useFreelancerStore();
const jobStore = useJobStore();

const message = ref('');
const selectedJobId = ref('');
const isSubmitting = ref(false);

onMounted(async () => {
  try {
    await Promise.all([
      jobStore.fetchJobPostings(),
      freelancerStore.fetchEmployerProposals().catch((error) => {
        console.warn('Failed to load existing employer proposals for proposal modal:', error);
      }),
    ]);
  } catch (error) {
    console.error('Failed to load employer jobs for proposal modal:', error);
    window.alert('공고 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
});

const proposedJobIdsForFreelancer = computed(() => {
  const freelancerId = String(props.freelancer.id);
  const employerId = String(authStore.user?.id ?? '');

  return new Set(
    freelancerStore.proposals
      .filter(
        (proposal) =>
          proposal.freelancerId === freelancerId &&
          proposal.employerId === employerId &&
          proposal.jobId,
      )
      .map((proposal) => proposal.jobId as string),
  );
});

const openEmployerJobs = computed(() => jobStore.myJobs.filter((job) => job.status === 'OPEN'));

const employerJobs = computed(() =>
  openEmployerJobs.value.filter((job) => !proposedJobIdsForFreelancer.value.has(job.id))
);

watch(
  employerJobs,
  (jobs) => {
    if (jobs.length === 0) {
      selectedJobId.value = '';
      return;
    }

    const hasSelectedJob = jobs.some((job) => job.id === selectedJobId.value);
    if (!hasSelectedJob) {
      selectedJobId.value = jobs[0].id;
    }
  },
  { immediate: true }
);

const isSubmitDisabled = computed(
  () => employerJobs.value.length === 0 || !selectedJobId.value || !message.value.trim()
);

const handleSubmit = async () => {
  if (!authStore.user) return;
  if (!selectedJobId.value) {
    alert('제안할 프로젝트를 선택해주세요.');
    return;
  }

  const trimmedMessage = message.value.trim();
  if (!trimmedMessage) {
    alert('제안 메시지를 입력해주세요.');
    return;
  }

  isSubmitting.value = true;

  try {
    await freelancerStore.addProposal({
      employerId: String(authStore.user.id),
      employerName: authStore.user.companyName || authStore.user.name,
      freelancerId: String(props.freelancer.id),
      freelancerName: props.freelancer.name,
      jobId: selectedJobId.value,
      message: trimmedMessage,
      status: 'PENDING',
    });

    alert(`${props.freelancer.name}님께 제안을 보냈습니다!`);
    emit('close');
  } catch (error: any) {
    console.error('Failed to send proposal:', error);
    alert(
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      '제안 전송에 실패했습니다.'
    );
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      class="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden"
      v-motion
      :initial="{ opacity: 0, scale: 0.95, y: 20 }"
      :enter="{ opacity: 1, scale: 1, y: 0 }"
      :leave="{ opacity: 0, scale: 0.95, y: 20 }"
    >
      <div class="fb-modal-header border-b border-white/10 p-6 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">프로젝트 제안</h2>
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
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {{ freelancer.name[0] }}
            </div>
            <div>
              <div class="font-medium text-white">{{ freelancer.name }}</div>
              <div class="text-sm text-white/60">
                {{ freelancer.skills?.slice(0, 3).join(', ') }}
              </div>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm text-white/80 mb-2">
            제안할 프로젝트 <span class="text-red-400">*</span>
          </label>
          <select
            v-model="selectedJobId"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 text-white"
            :disabled="employerJobs.length === 0 || isSubmitting"
            required
          >
            <option value="" disabled class="text-black">프로젝트를 선택하세요</option>
            <option
              v-for="job in employerJobs"
              :key="job.id"
              :value="job.id"
              class="text-black"
            >
              {{ job.title }}
            </option>
          </select>
          <p v-if="employerJobs.length === 0" class="mt-2 text-sm text-amber-300">
            {{
              openEmployerJobs.length === 0
                ? '제안 가능한 모집중 프로젝트가 없습니다. 먼저 공고를 등록하거나 상태를 확인해주세요.'
                : '이 프리랜서에게 이미 제안한 공고만 남아 있습니다.'
            }}
          </p>
        </div>

        <div class="mb-6">
          <label class="block text-sm text-white/80 mb-2">
            제안 메시지 <span class="text-red-400">*</span>
          </label>
          <textarea
            v-model="message"
            :placeholder="`${freelancer.name}님께 프로젝트에 대해 설명하고 제안하세요...`"
            rows="8"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 resize-none text-white placeholder:text-white/30"
            required
          ></textarea>
        </div>

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
            :disabled="isSubmitDisabled || isSubmitting"
            class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:shadow-xl transition-all font-semibold flex items-center justify-center gap-2"
            :class="(isSubmitDisabled || isSubmitting) ? 'opacity-50 cursor-not-allowed hover:shadow-none' : ''"
            v-motion
            :hover="{ scale: 1.02 }"
            :tap="{ scale: 0.98 }"
          >
            <Send class="w-5 h-5" />
            {{ isSubmitting ? '전송 중...' : '제안 보내기' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
