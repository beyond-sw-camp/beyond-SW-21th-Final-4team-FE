<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  Star,
  MessageSquareQuote,
  UserCheck,
  ClipboardEdit,
  Pencil,
  Trash2,
  X,
  LoaderCircle,
} from 'lucide-vue-next';
import { useReviewStore, type FreelancerToEmployerReview } from '@/stores/reviewStore';

const reviewStore = useReviewStore();

const freelancerEvaluationItems = [
  { key: 'atmosphere', label: '사내 분위기' },
  { key: 'requirementDetail', label: '요구사항 디테일' },
  { key: 'schedule', label: '일정 준수' },
] as const;

const employerEvaluationItems = [
  { key: 'language', label: '프로그래밍 이해도' },
  { key: 'framework', label: '프레임워크/라이브러리 활용력' },
  { key: 'debugging', label: '디버깅 및 문제 해결 능력' },
  { key: 'communication', label: '의사소통' },
  { key: 'schedule', label: '일정 준수' },
  { key: 'dispute', label: '분쟁 여부' },
] as const;

type FreelancerRatingKey = typeof freelancerEvaluationItems[number]['key'];
type FreelancerEditableReview = FreelancerToEmployerReview & Record<FreelancerRatingKey, number>;

const freelancerToEmployerReviews = computed(() => reviewStore.freelancerToEmployerReviews);
const employerToFreelancerReviews = computed(() =>
  reviewStore.employerToFreelancerReviews.map((review) => ({
    ...review,
    reviewerName: review.employerName,
  })),
);
const isLoading = computed(() => reviewStore.isFetchingReviews);
const isSubmitting = computed(() => reviewStore.isSubmittingReview);
const fetchError = computed(() => reviewStore.reviewFetchError);

const editingReviewId = ref<string | null>(null);
const editForm = ref<FreelancerEditableReview | null>(null);
const actionError = ref('');

const toReviewForm = (review: FreelancerToEmployerReview) =>
  JSON.parse(JSON.stringify(review)) as FreelancerEditableReview;

const startEdit = (review: FreelancerToEmployerReview) => {
  editingReviewId.value = review.id;
  editForm.value = toReviewForm(review);
  actionError.value = '';
};

const cancelEdit = () => {
  editingReviewId.value = null;
  editForm.value = null;
  actionError.value = '';
};

const loadReviews = async () => {
  actionError.value = '';

  try {
    await reviewStore.fetchFreelancerReviews();
  } catch {
    actionError.value = reviewStore.reviewFetchError || '후기 목록을 불러오지 못했습니다.';
  }
};

const saveEdit = async () => {
  if (!editForm.value) {
    return;
  }

  if (!window.confirm('후기를 수정하시겠습니까?')) {
    return;
  }

  actionError.value = '';

  try {
    await reviewStore.updateFreelancerToEmployerReview(editForm.value.id, {
      atmosphere: editForm.value.atmosphere,
      requirementDetail: editForm.value.requirementDetail,
      schedule: editForm.value.schedule,
      comment: editForm.value.comment,
    });

    cancelEdit();
  } catch (error) {
    actionError.value =
      error instanceof Error ? error.message : '후기를 수정하지 못했습니다.';
  }
};

const deleteReview = async (id: string) => {
  if (!window.confirm('후기를 삭제하시겠습니까?')) {
    return;
  }

  actionError.value = '';

  try {
    await reviewStore.deleteFreelancerToEmployerReview(id);
    if (editingReviewId.value === id) {
      cancelEdit();
    }
  } catch (error) {
    actionError.value =
      error instanceof Error ? error.message : '후기를 삭제하지 못했습니다.';
  }
};

onMounted(() => {
  void loadReviews();
});
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-slate-900">
    <div
      class="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <div>
        <h1 class="mb-3 text-4xl font-bold tracking-tight text-slate-950">
          내 리뷰
        </h1>
        <p class="text-slate-500">내가 남긴 후기와 기업이 남긴 피드백을 확인하세요</p>
      </div>
      <div class="flex items-center gap-2 text-slate-500">
        <MessageSquareQuote class="h-5 w-5" />
        <span>Review Center</span>
      </div>
    </div>

    <div class="flex justify-end mb-10">
      <RouterLink
        to="/freelancer/review/write"
        class="fb-button-primary gap-2 rounded-full px-6 py-3"
      >
        <ClipboardEdit class="w-5 h-5" />
        후기 작성
      </RouterLink>
    </div>

    <div v-if="isLoading" class="mb-10 flex items-center gap-2 text-slate-500">
      <LoaderCircle class="h-5 w-5 animate-spin" />
      후기 목록을 불러오는 중입니다.
    </div>
    <div v-else-if="fetchError" class="mb-10 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">{{ fetchError }}</div>
    <div v-if="actionError" class="mb-10 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">{{ actionError }}</div>

    <div class="grid gap-8">
      <div
        class="fb-card p-8"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0 }"
      >
        <div class="flex items-center gap-2 mb-6">
          <UserCheck class="h-5 w-5 text-emerald-500" />
          <h2 class="text-2xl font-bold text-slate-950">내가 남긴 후기</h2>
        </div>
        <div class="space-y-4">
          <div v-if="!isLoading && freelancerToEmployerReviews.length === 0" class="py-12 text-center text-slate-400">
            아직 작성한 후기가 없습니다.
          </div>
          <div
            v-for="(review, index) in freelancerToEmployerReviews"
            :key="review.id"
            class="fb-card-soft p-6"
          >
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div class="text-lg font-semibold text-slate-950">{{ review.companyName }}</div>
                <div class="text-sm text-slate-500">{{ review.projectName }}</div>
              </div>
              <div class="flex items-center gap-3 text-sm text-slate-500">
                {{ new Date(review.createdAt).toLocaleDateString('ko-KR') }}
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50"
                  :disabled="isSubmitting"
                  @click="startEdit(review)"
                >
                  <Pencil class="w-4 h-4" />
                  수정
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                  :disabled="isSubmitting"
                  @click="deleteReview(review.id)"
                >
                  <Trash2 class="w-4 h-4" />
                  삭제
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2 mb-4">
              <div class="flex items-center gap-1">
                <Star
                  v-for="star in 5"
                  :key="star"
                  class="w-4 h-4"
                  :class="star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'"
                />
              </div>
              <span class="font-medium text-slate-900">{{ review.rating.toFixed(1) }}</span>
              <span class="text-slate-400">/ 5.0</span>
            </div>
            <div class="mb-4 flex flex-wrap gap-6 text-sm text-slate-500">
              <div v-for="item in freelancerEvaluationItems" :key="item.key">
                {{ item.label }} <span class="ml-1 font-medium text-slate-900">{{ review[item.key] }}</span>
              </div>
            </div>
            <p class="rounded-xl bg-slate-50 p-4 leading-relaxed text-slate-700">
              {{ review.comment }}
            </p>

            <div
              v-if="editingReviewId === review.id && editForm"
              class="mt-6 border-t border-slate-100 pt-6"
            >
              <div class="flex items-center gap-2 mb-4">
                <ClipboardEdit class="h-5 w-5 text-sky-600" />
                <h3 class="text-lg font-semibold text-slate-950">후기 수정</h3>
              </div>
              <div class="grid md:grid-cols-2 gap-6 mb-6">
                <div
                  v-for="item in freelancerEvaluationItems"
                  :key="item.key"
                  class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-semibold text-slate-900">{{ item.label }}</span>
                    <span class="text-sm text-slate-500">{{ editForm[item.key] }} / 5</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      v-for="star in 5"
                      :key="star"
                      type="button"
                      class="transition-transform hover:scale-110 disabled:cursor-not-allowed"
                      :disabled="isSubmitting"
                      @click="editForm && (editForm[item.key] = star)"
                    >
                      <Star
                        class="w-5 h-5"
                        :class="star <= editForm[item.key] ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <label class="flex flex-col gap-2 mb-6">
                <span class="text-sm text-slate-500">후기 내용</span>
                <textarea
                  v-model="editForm.comment"
                  rows="4"
                  :disabled="isSubmitting"
                  class="fb-input min-h-[120px] px-4 py-3 text-slate-700 disabled:opacity-50"
                  placeholder="후기 내용을 수정해 주세요."
                ></textarea>
              </label>

              <div class="flex flex-col md:flex-row md:items-center gap-3">
                <button
                  type="button"
                  :disabled="isSubmitting"
                  @click="saveEdit"
                  class="fb-button-primary px-6 py-3 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <span v-if="!isSubmitting">수정 저장</span>
                  <span v-else class="inline-flex items-center gap-2">
                    <LoaderCircle class="w-4 h-4 animate-spin" />
                    저장 중
                  </span>
                </button>
                <button
                  type="button"
                  :disabled="isSubmitting"
                  @click="cancelEdit"
                  class="fb-button-secondary inline-flex items-center gap-2 px-6 py-3 disabled:opacity-50"
                >
                  <X class="w-4 h-4" />
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="fb-card p-8"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 100 } }"
      >
        <div class="flex items-center gap-2 mb-6">
          <MessageSquareQuote class="h-5 w-5 text-violet-500" />
          <h2 class="text-2xl font-bold text-slate-950">기업이 남긴 후기</h2>
        </div>
        <div class="space-y-4">
          <div v-if="!isLoading && employerToFreelancerReviews.length === 0" class="py-12 text-center text-slate-400">
            아직 기업이 남긴 후기가 없습니다.
          </div>
          <div
            v-for="(review, index) in employerToFreelancerReviews"
            :key="review.id"
            class="fb-card-soft p-6"
          >
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div class="text-lg font-semibold text-slate-950">{{ review.reviewerName }}</div>
                <div class="text-sm text-slate-500">{{ review.projectName }}</div>
              </div>
              <div class="text-sm text-slate-500">
                {{ new Date(review.createdAt).toLocaleDateString('ko-KR') }}
              </div>
            </div>
            <div class="flex items-center gap-2 mb-4">
              <div class="flex items-center gap-1">
                <Star
                  v-for="star in 5"
                  :key="star"
                  class="w-4 h-4"
                  :class="star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'"
                />
              </div>
              <span class="font-medium text-slate-900">{{ review.rating.toFixed(1) }}</span>
              <span class="text-slate-400">/ 5.0</span>
            </div>
            <div class="mb-4 flex flex-wrap gap-6 text-sm text-slate-500">
              <div v-for="item in employerEvaluationItems" :key="item.key">
                {{ item.label }} <span class="ml-1 font-medium text-slate-900">{{ review[item.key] }}</span>
              </div>
            </div>
            <p class="rounded-xl bg-slate-50 p-4 leading-relaxed text-slate-700">
              {{ review.comment }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
