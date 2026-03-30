<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  Briefcase,
  Clock,
  DollarSign,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-vue-next";
import type { JobPosting } from "@/types";
import { getJobRecommendationsForFreelancer } from "@/api/recommendationApi";
import JobDetailModal from "../Jobs/components/JobDetailModal.vue";

const selectedJob = ref<JobPosting | null>(null);
const favoriteIds = ref<string[]>([]);
const recommendedJobs = ref<(JobPosting & { matchScore?: number })[]>([]);
const isLoading = ref(true);
const fetchError = ref<string | null>(null);
let activeRecommendationController: AbortController | null = null;

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.name === "CanceledError");

onMounted(async () => {
  activeRecommendationController?.abort();
  const controller = new AbortController();
  activeRecommendationController = controller;
  isLoading.value = true;
  fetchError.value = null;

  try {
    const recommendations = await getJobRecommendationsForFreelancer(
      controller.signal,
    );

    recommendedJobs.value = recommendations.map((rec) => ({
      id: rec.id.toString(),
      employerId: "hidden",
      employerName: "기업(AI 추천)",
      title: rec.nameOrTitle,
      description: rec.description?.trim() || "",
      techStack: rec.skills || [],
      budget: rec.budget || 0,
      duration: rec.duration || 0,
      status: "OPEN",
      createdAt: new Date(),
      updatedAt: new Date(),
      matchScore: rec.matchScore,
    })) as (JobPosting & { matchScore?: number })[];
  } catch (error: any) {
    if (isAbortError(error)) {
      return;
    }

    console.error("Failed to load job recommendations:", error);
    fetchError.value =
      error.message || "추천 프로젝트를 불러오지 못했습니다.";
  } finally {
    if (activeRecommendationController === controller) {
      isLoading.value = false;
      activeRecommendationController = null;
    }
  }
});

const isFavorite = (id: string) => favoriteIds.value.includes(id);

const toggleFavorite = (id: string) => {
  if (isFavorite(id)) {
    favoriteIds.value = favoriteIds.value.filter((item) => item !== id);
    return;
  }

  favoriteIds.value = [...favoriteIds.value, id];
};

onBeforeUnmount(() => {
  activeRecommendationController?.abort();
});
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-white">
    <div
      class="mb-12"
      data-tour="freelancer-recommended-header"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <div class="flex items-center gap-2 mb-3">
        <Sparkles class="w-8 h-8 text-yellow-400" />
        <h1 class="text-4xl font-bold tracking-tight text-white">
          AI 추천 프로젝트
        </h1>
      </div>
      <p class="text-white/60">
        회원님의 스킬과 경험을 바탕으로 잘 맞는 프로젝트를 추천해드려요.
      </p>
    </div>

    <div
      v-if="isLoading"
      class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-16 flex flex-col items-center justify-center text-center"
    >
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4 opacity-70"
      ></div>
      <h3 class="text-xl font-semibold mb-2 text-white/80">
        AI가 프로젝트를 고르는 중입니다
      </h3>
      <p class="text-white/50">
        잘못된 정보를 보여주지 않도록 결과가 준비될 때까지 기다리고 있습니다.
      </p>
      <p class="mt-2 text-sm text-white/40">
        정확한 추천이 나올 때까지 계속 기다려 주세요.
      </p>
    </div>

    <div
      v-else-if="fetchError"
      class="bg-red-500/5 backdrop-blur-xl rounded-3xl border border-red-500/10 p-16 text-center"
    >
      <div
        class="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6"
      >
        <Sparkles class="w-10 h-10 text-red-400" />
      </div>
      <h3 class="text-2xl font-semibold mb-3 text-red-200">
        추천 결과를 불러오지 못했습니다
      </h3>
      <p class="text-red-300/60">{{ fetchError }}</p>
    </div>

    <div
      v-else-if="recommendedJobs.length === 0"
      class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-16 text-center"
      v-motion
      :initial="{ opacity: 0, scale: 0.95 }"
      :enter="{ opacity: 1, scale: 1 }"
    >
      <div
        class="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6"
      >
        <TrendingUp class="w-10 h-10 text-white/60" />
      </div>
      <h3 class="text-2xl font-semibold mb-3 text-white">
        추천 프로젝트가 없습니다
      </h3>
      <p class="text-white/60">
        프로필의 스킬과 경력을 조금 더 보완한 뒤 다시 확인해 보세요.
      </p>
    </div>

    <div v-else class="grid gap-6">
      <div
        v-for="(job, index) in recommendedJobs"
        :key="job.id"
        @click="selectedJob = job"
        class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 hover:border-white/20 transition-all cursor-pointer group hover:translate-y-[-4px]"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: index * 100 } }"
      >
        <div class="flex items-start justify-between mb-6">
          <div class="flex-1">
            <div class="flex items-start gap-3 mb-3">
              <h3
                class="text-2xl font-semibold text-white group-hover:text-blue-400 transition-colors flex-1"
              >
                {{ job.title }}
              </h3>
              <div class="flex flex-col gap-2 items-end">
                <div
                  class="px-3 py-1 bg-yellow-400/10 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/20 flex items-center gap-1"
                >
                  <Sparkles class="w-3 h-3" />
                  AI 추천
                </div>
                <div
                  v-if="job.matchScore !== undefined"
                  class="px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1"
                >
                  <TrendingUp class="w-3 h-3" />
                  AI 적합도 {{ ((job.matchScore ?? 0) * 100).toFixed(0) }}%
                </div>
              </div>
            </div>

            <p class="text-white/70 mb-6 leading-relaxed line-clamp-2">
              {{ job.description || "상세 설명은 프로젝트 상세보기에서 확인할 수 있습니다." }}
            </p>

            <div class="flex flex-wrap gap-2 mb-6">
              <span
                v-for="tech in job.techStack"
                :key="tech"
                class="px-4 py-2 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30 font-medium"
              >
                {{ tech }}
              </span>
            </div>

            <div class="flex flex-wrap gap-6 text-white/60">
              <div class="flex items-center gap-2" v-if="job.budget > 0">
                <div
                  class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <DollarSign class="w-4 h-4 text-green-400" />
                </div>
                <span class="font-medium">
                  예산 {{ job.budget.toLocaleString() }}원
                </span>
              </div>
              <div class="flex items-center gap-2" v-if="job.duration > 0">
                <div
                  class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"
                >
                  <Clock class="w-4 h-4 text-blue-400" />
                </div>
                <span class="font-medium">{{ job.duration }}개월</span>
              </div>
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center"
                >
                  <Briefcase class="w-4 h-4 text-purple-400" />
                </div>
                <span class="font-medium">{{ job.employerName }}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="ml-4 h-10 w-10 rounded-full border transition-all"
            :class="
              isFavorite(job.id)
                ? 'bg-yellow-400/20 border-yellow-400/40 text-yellow-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            "
            @click.stop="toggleFavorite(job.id)"
          >
            <Star
              class="mx-auto h-5 w-5"
              :class="
                isFavorite(job.id) ? 'fill-yellow-400 text-yellow-400' : ''
              "
            />
          </button>
        </div>
      </div>
    </div>

    <JobDetailModal
      v-if="selectedJob"
      :job="selectedJob"
      @close="selectedJob = null"
    />
  </div>
</template>
