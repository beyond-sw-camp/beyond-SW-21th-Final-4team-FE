<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertCircle, ArrowLeft, ClipboardPenLine, LoaderCircle } from 'lucide-vue-next';
import { useJobStore } from '@/stores/jobStore';
import { createEmployerRejectionReason } from '@/api/reviewApi';

const route = useRoute();
const router = useRouter();
const jobStore = useJobStore();

const rejectionReasons = [
  { value: 'SKILL_MISMATCH', label: '기술 스택이 요구사항과 맞지 않습니다.' },
  { value: 'LACK_EXPERIENCE', label: '현재 프로젝트에서 요구하는 경력 수준과 차이가 있습니다.' },
  { value: 'SCHEDULE_MISMATCH', label: '프로젝트 일정과 가용 일정이 맞지 않습니다.' },
  { value: 'COMMUNICATION_MISMATCH', label: '협업 방식과 커뮤니케이션 기대치가 다릅니다.' },
  { value: 'OTHER', label: '기타' },
] as const;

const form = reactive({
  selectedReason: '',
  customReason: '',
});

const isSubmitting = ref(false);
const isLoadingContext = ref(false);
const formError = ref('');
const formSuccess = ref('');

const applicationId = computed(() => String(route.params.applicationId ?? ''));
const fallbackJobId = computed(() => String(route.query.jobId ?? ''));
const fallbackTitle = computed(() => String(route.query.title ?? ''));
const fallbackFreelancerId = computed(() => String(route.query.freelancerId ?? ''));
const fallbackFreelancerName = computed(() => String(route.query.freelancerName ?? ''));

const application = computed(() => jobStore.getApplicationById(applicationId.value));
const jobTitle = computed(() => {
  if (application.value?.jobId) {
    return jobStore.getJobById(application.value.jobId)?.title || fallbackTitle.value;
  }
  return fallbackTitle.value;
});
const freelancerName = computed(() => application.value?.freelancerName || fallbackFreelancerName.value);
const freelancerId = computed(() => application.value?.freelancerId || fallbackFreelancerId.value);
const effectiveJobId = computed(() => application.value?.jobId || fallbackJobId.value);
const currentStatus = computed(() => application.value?.status ?? 'PENDING');

const isValid = computed(() => {
  if (!form.selectedReason) {
    return false;
  }

  if (form.selectedReason === 'OTHER') {
    return form.customReason.trim().length > 0;
  }

  return true;
});

const finalReason = computed(() => {
  if (form.selectedReason === 'OTHER') {
    return form.customReason.trim();
  }

  return rejectionReasons.find((reason) => reason.value === form.selectedReason)?.label ?? '';
});

const loadContext = async () => {
  if (application.value && jobStore.getJobById(application.value.jobId)) {
    return;
  }

  isLoadingContext.value = true;
  formError.value = '';

  const [jobsResult, applicationsResult] = await Promise.allSettled([
    jobStore.fetchJobPostings(),
    jobStore.fetchEmployerApplications(),
  ]);

  if (jobsResult.status === 'rejected') {
    console.error('Failed to load employer jobs for rejection page:', jobsResult.reason);
  }

  if (applicationsResult.status === 'rejected') {
    console.error('Failed to load employer applications for rejection page:', applicationsResult.reason);
  }

  isLoadingContext.value = false;

  if (!freelancerId.value || !effectiveJobId.value || !jobTitle.value) {
    formError.value = '거절 대상을 불러오지 못했습니다. 지원 목록에서 다시 시도해 주세요.';
  }
};

const handleSubmit = async () => {
  formError.value = '';
  formSuccess.value = '';

  if (!effectiveJobId.value || !jobTitle.value || !freelancerId.value) {
    formError.value = '거절 대상 정보가 올바르지 않습니다.';
    return;
  }

  if (!isValid.value) {
    formError.value = '거절 사유를 입력해 주세요.';
    return;
  }

  if (!window.confirm('이 지원을 거절하고 사유를 저장하시겠습니까?')) {
    return;
  }

  isSubmitting.value = true;

  try {
    if (currentStatus.value !== 'REJECTED') {
      await jobStore.updateApplicationStatus(applicationId.value, 'REJECTED', finalReason.value);
    }

    await createEmployerRejectionReason({
      projectId: Number(effectiveJobId.value),
      projectTitle: jobTitle.value,
      freelancerId: Number(freelancerId.value),
      reason: finalReason.value,
    });

    formSuccess.value = '거절 사유가 저장되었습니다.';
    await jobStore.fetchEmployerApplications().catch((error) => {
      console.warn('Failed to refresh applications after saving rejection reason:', error);
    });

    window.alert('지원이 거절되었고 사유가 저장되었습니다.');
    await router.push({ name: 'employer.applications' });
  } catch (error: any) {
    console.error('Failed to reject application with reason:', error);
    formError.value =
      error?.response?.data?.message || error?.message || '거절 사유 저장에 실패했습니다.';
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  void loadContext();
});
</script>

<template>
  <div class="max-w-[1100px] mx-auto px-4 md:px-8 py-12 font-sans text-white">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
      <div>
        <h1 class="mb-3 text-4xl font-bold tracking-tight text-white">
          거절 사유 작성
        </h1>
        <p class="text-white/60">지원을 거절하기 전에 사유를 남겨 추후 관리와 조회에 활용하세요</p>
      </div>
      <RouterLink
        :to="{ name: 'employer.applications' }"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        지원 목록으로
      </RouterLink>
    </div>

    <div
      class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <div class="flex items-center gap-2 mb-6">
        <ClipboardPenLine class="w-5 h-5 text-red-300" />
        <h2 class="text-2xl font-bold">프리랜서 지원 거절</h2>
      </div>

      <div
        class="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100"
      >
        거절 사유는 고용주 측 기록으로 저장됩니다. 선택형 문구를 그대로 쓰거나, 기타 항목에서 더 구체적으로 남길 수 있습니다.
      </div>

      <div
        v-if="formError"
        class="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200"
      >
        {{ formError }}
      </div>

      <div
        v-if="formSuccess"
        class="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200"
      >
        {{ formSuccess }}
      </div>

      <div v-if="isLoadingContext" class="flex items-center gap-2 text-sm text-white/60 mb-6">
        <LoaderCircle class="w-4 h-4 animate-spin" />
        지원 정보를 불러오는 중입니다.
      </div>

      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div class="bg-black/20 border border-white/10 rounded-2xl p-5">
          <div class="text-sm text-white/60 mb-2">프로젝트</div>
          <div class="text-xl font-semibold text-white">{{ jobTitle || '프로젝트 정보 없음' }}</div>
          <div class="text-sm text-white/40 mt-2">공고 ID: {{ effectiveJobId || '-' }}</div>
        </div>

        <div class="bg-black/20 border border-white/10 rounded-2xl p-5">
          <div class="text-sm text-white/60 mb-2">지원 프리랜서</div>
          <div class="text-xl font-semibold text-white">{{ freelancerName || '프리랜서 정보 없음' }}</div>
          <div class="text-sm mt-2" :class="currentStatus === 'REJECTED' ? 'text-red-300' : 'text-white/40'">
            현재 상태: {{ currentStatus === 'REJECTED' ? '이미 거절됨' : '검토중' }}
          </div>
        </div>
      </div>

      <div class="mb-8">
        <label class="block text-sm text-white/60 mb-3">
          거절 사유 선택
        </label>
        <div class="space-y-3">
          <label
            v-for="reason in rejectionReasons"
            :key="reason.value"
            class="flex items-start gap-3 p-4 border rounded-2xl cursor-pointer transition-colors"
            :class="form.selectedReason === reason.value ? 'border-red-400/60 bg-red-500/10' : 'border-white/10 bg-black/20 hover:border-white/30'"
          >
            <input
              v-model="form.selectedReason"
              type="radio"
              name="rejectionReason"
              :value="reason.value"
              class="mt-1 accent-red-500"
            />
            <span class="text-white/90">{{ reason.label }}</span>
          </label>
        </div>
      </div>

      <label v-if="form.selectedReason === 'OTHER'" class="flex flex-col gap-2 mb-8">
        <span class="text-sm text-white/60">상세 사유</span>
        <textarea
          v-model="form.customReason"
          rows="5"
          :disabled="isSubmitting"
          class="bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white/90 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
          placeholder="거절 사유를 구체적으로 입력해 주세요."
        ></textarea>
      </label>

      <div class="bg-black/20 border border-white/10 rounded-2xl p-5 mb-8">
        <div class="flex items-center gap-2 text-sm text-white/60 mb-2">
          <AlertCircle class="w-4 h-4" />
          저장될 사유
        </div>
        <div class="text-white/90 min-h-[24px]">
          {{ finalReason || '사유를 선택하면 여기에 표시됩니다.' }}
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-3">
        <button
          type="button"
          :disabled="isSubmitting"
          @click="router.push({ name: 'employer.applications' })"
          class="px-6 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          :disabled="!isValid || isSubmitting || !effectiveJobId || !freelancerId || !jobTitle"
          @click="handleSubmit"
          class="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <span v-if="!isSubmitting">거절 및 사유 저장</span>
          <span v-else class="inline-flex items-center gap-2">
            <LoaderCircle class="w-4 h-4 animate-spin" />
            저장 중
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
