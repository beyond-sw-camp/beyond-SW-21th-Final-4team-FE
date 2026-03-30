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
import { useReviewStore, type EmployerToFreelancerReview } from '@/stores/reviewStore';

const reviewStore = useReviewStore();

const employerEvaluationItems = [
  { key: 'language', label: '프로그래밍 이해도' },
  { key: 'framework', label: '프레임워크/라이브러리 활용력' },
  { key: 'debugging', label: '디버깅 및 문제 해결 능력' },
  { key: 'communication', label: '의사소통' },
  { key: 'schedule', label: '일정 준수' },
  { key: 'dispute', label: '분쟁 여부' },
] as const;

const freelancerEvaluationItems = [
  { key: 'atmosphere', label: '사내 분위기' },
  { key: 'requirementDetail', label: '요구사항 디테일' },
  { key: 'schedule', label: '일정 준수' },
] as const;

type EmployerReviewKey = typeof employerEvaluationItems[number]['key'];
type EmployerEditableReview = EmployerToFreelancerReview & Record<EmployerReviewKey, number>;

const employerToFreelancerReviews = computed(() => reviewStore.employerToFreelancerReviews);
const freelancerToEmployerReviews = computed(() =>
  reviewStore.freelancerToEmployerReviews.map((review) => ({
    ...review,
    reviewerName: review.freelancerName,
  })),
);
const isLoading = computed(() => reviewStore.isFetchingReviews);
const isSubmitting = computed(() => reviewStore.isSubmittingReview);
const fetchError = computed(() => reviewStore.reviewFetchError);

const editingReviewId = ref<string | null>(null);
const editForm = ref<EmployerEditableReview | null>(null);
const actionError = ref('');

const toReviewForm = (review: EmployerToFreelancerReview) =>
  JSON.parse(JSON.stringify(review)) as EmployerEditableReview;

const startEdit = (review: EmployerToFreelancerReview) => {
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
    await reviewStore.fetchEmployerReviews();
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
    await reviewStore.updateEmployerToFreelancerReview(editForm.value.id, {
      language: editForm.value.language,
      framework: editForm.value.framework,
      debugging: editForm.value.debugging,
      communication: editForm.value.communication,
      schedule: editForm.value.schedule,
      dispute: editForm.value.dispute,
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
    await reviewStore.deleteEmployerToFreelancerReview(id);
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
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-white">
    <div
      class="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <div>
        <h1 class="mb-3 text-4xl font-bold tracking-tight text-white">
          내 리뷰
        </h1>
        <p class="text-white/60">내가 남긴 후기와 프리랜서가 남긴 피드백을 확인하세요</p>
      </div>
      <div class="flex items-center gap-2 text-white/60">
        <MessageSquareQuote class="w-5 h-5" />
        <span>Review Center</span>
      </div>
    </div>

    <div class="flex justify-end mb-10">
      <RouterLink
        to="/employer/review/write"
        class="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-semibold hover:scale-105 transition-transform"
      >
        <ClipboardEdit class="w-5 h-5" />
        후기 작성
      </RouterLink>
    </div>

    <div v-if="isLoading" class="flex items-center gap-2 text-white/60 mb-10">
      <LoaderCircle class="w-5 h-5 animate-spin" />
      후기 목록을 불러오는 중입니다.
    </div>
    <div v-else-if="fetchError" class="text-red-300 mb-10">{{ fetchError }}</div>
    <div v-if="actionError" class="text-red-300 mb-10">{{ actionError }}</div>

    <div class="grid gap-8">
      <div
        class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0 }"
      >
        <div class="flex items-center gap-2 mb-6">
          <UserCheck class="w-5 h-5 text-green-300" />
          <h2 class="text-2xl font-bold">내가 남긴 후기</h2>
        </div>
        <div class="space-y-4">
          <div v-if="!isLoading && employerToFreelancerReviews.length === 0" class="text-center py-12 text-white/40">
            아직 작성한 후기가 없습니다.
          </div>
          <div
            v-for="(review, index) in employerToFreelancerReviews"
            :key="review.id"
            class="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div class="text-lg font-semibold text-white">{{ review.freelancerName }}</div>
                <div class="text-sm text-white/60">{{ review.projectName }}</div>
              </div>
              <div class="flex items-center gap-3 text-sm text-white/60">
                {{ new Date(review.createdAt).toLocaleDateString('ko-KR') }}
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors disabled:opacity-50"
                  :disabled="isSubmitting"
                  @click="startEdit(review)"
                >
                  <Pencil class="w-4 h-4" />
                  수정
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
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
              <span class="text-white font-medium">{{ review.rating.toFixed(1) }}</span>
              <span class="text-white/40">/ 5.0</span>
            </div>
            <div class="flex flex-wrap gap-6 text-sm text-white/60 mb-4">
              <div v-for="item in employerEvaluationItems" :key="item.key">
                {{ item.label }} <span class="text-white font-medium ml-1">{{ review[item.key] }}</span>
              </div>
            </div>
            <p class="rounded-xl border border-slate-200 bg-slate-50 p-4 leading-relaxed text-slate-700">
              {{ review.comment }}
            </p>

            <div
              v-if="editingReviewId === review.id && editForm"
              class="mt-6 border-t border-white/10 pt-6"
            >
              <div class="flex items-center gap-2 mb-4">
                <ClipboardEdit class="w-5 h-5 text-blue-300" />
                <h3 class="text-lg font-semibold">후기 수정</h3>
              </div>
              <div class="grid md:grid-cols-2 gap-6 mb-6">
                <div
                  v-for="item in employerEvaluationItems"
                  :key="item.key"
                  class="bg-black/20 border border-white/10 rounded-2xl p-4"
                >
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-semibold text-white">{{ item.label }}</span>
                    <span class="text-white/60 text-sm">{{ editForm[item.key] }} / 5</span>
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
                <span class="text-sm text-white/60">후기 내용</span>
                <textarea
                  v-model="editForm.comment"
                  rows="4"
                  :disabled="isSubmitting"
                  class="bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white/90 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
                  placeholder="후기 내용을 수정해 주세요."
                ></textarea>
              </label>

              <div class="flex flex-col md:flex-row md:items-center gap-3">
                <button
                  type="button"
                  :disabled="isSubmitting"
                  @click="saveEdit"
                  class="px-6 py-3 bg-white text-black rounded-full font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
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
                  class="px-6 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
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
        class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 100 } }"
      >
        <div class="flex items-center gap-2 mb-6">
          <MessageSquareQuote class="w-5 h-5 text-purple-300" />
          <h2 class="text-2xl font-bold">프리랜서가 남긴 후기</h2>
        </div>
        <div class="space-y-4">
          <div v-if="!isLoading && freelancerToEmployerReviews.length === 0" class="text-center py-12 text-white/40">
            아직 프리랜서가 남긴 후기가 없습니다.
          </div>
          <div
            v-for="(review, index) in freelancerToEmployerReviews"
            :key="review.id"
            class="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div class="text-lg font-semibold text-white">{{ review.reviewerName }}</div>
                <div class="text-sm text-white/60">{{ review.projectName }}</div>
              </div>
              <div class="text-sm text-white/60">
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
              <span class="text-white font-medium">{{ review.rating.toFixed(1) }}</span>
              <span class="text-white/40">/ 5.0</span>
            </div>
            <div class="flex flex-wrap gap-6 text-sm text-white/60 mb-4">
              <div v-for="item in freelancerEvaluationItems" :key="item.key">
                {{ item.label }} <span class="text-white font-medium ml-1">{{ review[item.key] }}</span>
              </div>
            </div>
            <p class="rounded-xl border border-slate-200 bg-slate-50 p-4 leading-relaxed text-slate-700">
              {{ review.comment }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
