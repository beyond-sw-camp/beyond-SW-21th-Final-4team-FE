<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useMotion } from "@vueuse/motion";
import {
  Star,
  ArrowLeft,
  Search,
  MessageSquare,
  Calendar,
  Briefcase,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Activity,
} from "lucide-vue-next";
import {
  getEvaluations,
  getRejectionFeedbacks,
  getFreelancerAiReputationReport,
  type FreelancerAiReputationReport,
  type Evaluation,
  type RejectionFeedback,
} from "@/api/MyPage/evaluationApi";
import { useAuthStore } from "@/stores/authStore";
import type { FreelancerProfileDashboard } from "@/api/MyPage/freelancerApi";

const props = defineProps<{
  profile?: FreelancerProfileDashboard; // Optional to allow independent use if needed, but primarily passed from parent
}>();

const emit = defineEmits<{
  (e: "back"): void;
}>();

const authStore = useAuthStore();
const evaluations = ref<Evaluation[]>([]);
const rejectionFeedbacks = ref<RejectionFeedback[]>([]);
const isLoading = ref(true);
const evaluationsUnavailable = ref(false);
const rejectionUnavailable = ref(false);

const activeTab = ref<"evaluation" | "rejection">("evaluation");

// 필터 상태 (Sort removed)
const searchQuery = ref("");

const isUnavailableError = (error: unknown) =>
  error instanceof Error && error.message.includes("API not implemented");

onMounted(async () => {
  try {
    isLoading.value = true;
    evaluationsUnavailable.value = false;
    rejectionUnavailable.value = false;
    const userId =
      authStore.user?.id !== undefined
        ? Number(authStore.user.id)
        : "guest";
    const [evalResult, rejectionResult] = await Promise.allSettled([
      getEvaluations(userId),
      getRejectionFeedbacks(userId),
    ]);

    if (evalResult.status === "fulfilled") {
      evaluations.value = evalResult.value || [];
    } else {
      console.error("Failed to fetch evaluations", evalResult.reason);
      evaluations.value = [];
    }

    if (rejectionResult.status === "fulfilled") {
      rejectionFeedbacks.value = rejectionResult.value || [];
    } else if (isUnavailableError(rejectionResult.reason)) {
      rejectionUnavailable.value = true;
      rejectionFeedbacks.value = [];
    } else {
      console.error("Failed to fetch rejection feedbacks", rejectionResult.reason);
      rejectionFeedbacks.value = [];
    }
  } finally {
    isLoading.value = false;
  }
});

// Computed: 검색 로직 (거절 사유 모아보기
const filteredRejections = computed(() => {
  let result = [...rejectionFeedbacks.value];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (e) =>
        e.companyName.toLowerCase().includes(query) ||
        e.projectName.toLowerCase().includes(query),
    );
  }

  // 항상 최신순
  result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return result;
});

// Computed: 평균 평점 (props 우선, 없으면 목록 기반)
const averageScore = computed(() => {
  const reviewAverage = props.profile?.reviewSummary?.averageRate;
  if (reviewAverage !== undefined && reviewAverage !== null) {
    return Number(reviewAverage).toFixed(1);
  }
  if (props.profile?.averageRating !== undefined) {
    return Number(props.profile.averageRating).toFixed(1);
  }
  if (evaluations.value.length === 0) return "0.0";
  const total = evaluations.value.reduce(
    (sum: number, e: Evaluation) => sum + e.score,
    0,
  );
  return (total / evaluations.value.length).toFixed(1);
});

// Computed: 전문성 평균 점수
const professionalismScore = computed(() => {
  const expertiseRate = props.profile?.reviewSummary?.expertiseRate;
  if (expertiseRate !== undefined && expertiseRate !== null) {
    return Number(expertiseRate).toFixed(1);
  }
  if (!props.profile?.expertise) return "0.0";
  const { programming, framework, problemSolving } = props.profile.expertise;
  return ((programming + framework + problemSolving) / 3).toFixed(1);
});

// Computed: 협업 역량 평균 점수
const collaborationScore = computed(() => {
  const communicationRate = props.profile?.reviewSummary?.communicationRate;
  const scheduleRate = props.profile?.reviewSummary?.scheduleRate;
  if (
    communicationRate !== undefined &&
    communicationRate !== null &&
    scheduleRate !== undefined &&
    scheduleRate !== null
  ) {
    return ((Number(communicationRate) + Number(scheduleRate)) / 2).toFixed(1);
  }
  if (!props.profile?.collaboration) return "0.0";
  const { communication, scheduleAdherence, dispute } =
    props.profile.collaboration;
  return ((communication + scheduleAdherence + dispute) / 3).toFixed(1);
});

const positivityScore = computed(() => {
  const rawScore = props.profile?.aiSummary?.positivityScore;
  if (rawScore === undefined || rawScore === null) {
    return null;
  }

  return Math.round(Number(rawScore));
});

const normalizeInsightItems = (items?: string[]) => {
  if (!items?.length) {
    return [];
  }

  return Array.from(
    new Set(
      items
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item)),
    ),
  ).slice(0, 3);
};

const strengthItems = computed(() =>
  normalizeInsightItems(props.profile?.aiSummary?.strengths),
);

const weaknessItems = computed(() =>
  normalizeInsightItems(props.profile?.aiSummary?.weaknesses),
);
// 평점 지표 설명
const metricDefinitions: Record<string, { label: string; desc: string }> = {
  // 전문성
  programming: {
    label: "프로그래밍 구현",
    desc: "코드 완성도 및 구현 속도",
  },
  framework: { label: "프레임워크 활용", desc: "최신 기술 적응 및 활용 능력" },
  problemSolving: { label: "문제 해결 능력", desc: "이슈 원인 분석 및 해결" },
  // 협업
  communication: { label: "의사소통", desc: "명확하고 효율적인 커뮤니케이션" },
  scheduleAdherence: { label: "일정 준수", desc: "마감 기한 및 일정 준수" },
  dispute: { label: "분쟁 관리", desc: "갈등 관리 및 상황 해결 능력" },
};

// AI 분석 상태
const showAiAnalysis = ref(false);
const isAiAnalyzing = ref(false);
const aiReport = ref<FreelancerAiReputationReport | null>(null);

const handleAiAnalysis = async () => {
  isAiAnalyzing.value = true;
  try {
    aiReport.value = await getFreelancerAiReputationReport();
    showAiAnalysis.value = true;
  } catch (e) {
    console.error("Failed to fetch AI report", e);
    showAiAnalysis.value = true;
  } finally {
    isAiAnalyzing.value = false;
  }
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-10 font-sans text-slate-800">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-10">
      <button
        @click="$emit('back')"
        class="p-2 hover:bg-slate-100 rounded-full transition-colors"
      >
        <ArrowLeft class="w-6 h-6 text-sky-600" />
      </button>
      <div>
        <h1 class="text-3xl font-bold text-slate-950 tracking-tight">
          받은 평가 관리
        </h1>
        <p class="text-base text-slate-500 mt-1">
          프로젝트 종료 후 받은 고용주 평가를 확인하세요.
        </p>
      </div>



    </div>

    <!-- Tabs -->
    <div
      class="flex p-1 bg-white rounded-xl mb-8 w-fit border border-slate-200"
    >
      <button
        @click="activeTab = 'evaluation'"
        class="px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-300"
        :class="
          activeTab === 'evaluation'
            ? 'bg-sky-50 text-sky-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-950'
        "
      >
        평가 분석
      </button>
      <button
        @click="activeTab = 'rejection'"
        class="px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-300"
        :class="
          activeTab === 'rejection'
            ? 'bg-rose-50 text-rose-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-950'
        "
      >
        거절 사유 모아보기
      </button>
    </div>

    <div v-if="activeTab === 'evaluation'" class="space-y-8 animate-fade-in-up">
      <div v-if="isLoading" class="flex justify-center py-20">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
        ></div>
      </div>

      <div
        v-else-if="evaluationsUnavailable"
        class="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed text-slate-400 animate-fade-in"
      >
        <MessageSquare class="w-12 h-12 mb-4 opacity-50" />
        <p>평가 기능이 준비 중입니다.</p>
      </div>

      <div v-else-if="props.profile">
        <div class="min-h-[180px]">
          <div
            v-if="showAiAnalysis"
            class="bg-gradient-to-r from-white to-sky-50 border border-slate-200 rounded-3xl p-8 relative overflow-hidden animate-fade-in shadow-[0_24px_64px_-50px_rgba(14,165,233,0.14)]"
          >
            <div
              class="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between mb-8"
            >
              <div class="flex-1 flex flex-col gap-4">
                <div class="flex items-center gap-2 text-sky-600">
                  <Sparkles class="w-5 h-5" />
                  <span class="text-sm font-bold uppercase tracking-wider"
                    >AI Insight</span
                  >
                </div>
                <div class="space-y-2">
                  <h2 class="text-2xl font-bold text-slate-950 leading-tight">
                    AI 평판 분석 결과
                  </h2>
                  <p class="text-slate-600 leading-relaxed max-w-3xl">
                    AI가 고용주들의 평가 데이터를 바탕으로 현재 당신의 평판 등급과
                    강점/보완점을 요약했습니다. 현재 등급은
                    <strong class="text-sky-700">{{
                      props.profile.aiSummary?.grade || "미정"
                    }}</strong>
                    입니다.
                  </p>
                <p v-if="aiReport?.summary" class="text-slate-600 text-sm mt-3">
                  AI 요약: {{ aiReport.summary }}
                </p>
                </div>
              </div>

              <div
                v-if="positivityScore !== null"
                class="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center gap-6"
              >
                <div
                  class="w-20 h-20 rounded-full bg-gradient-to-br from-sky-200 to-cyan-200 flex items-center justify-center p-1"
                >
                  <div
                    class="w-full h-full bg-white rounded-full flex items-center justify-center border border-sky-100"
                  >
                    <span
                      class="text-3xl font-black text-sky-700"
                      >{{ positivityScore }}</span
                    >
                  </div>
                </div>
                <div>
                  <span
                    class="text-sky-700 text-sm font-bold flex items-center gap-2 mb-1"
                  >
                    <Activity class="w-4 h-4" />
                    평판 긍정 지수
                  </span>
                  <span class="text-slate-500 text-xs">100점 만점 기준</span>
                </div>
              </div>
            </div>

            <div
              class="mt-8 pt-4 flex items-center gap-2 text-xs text-slate-400 w-full justify-end"
            >
              <span>검증된 리뷰 {{ evaluations.length }}건 기준</span>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 md:grid-cols-2">
              <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div class="mb-3 flex items-center gap-2 text-emerald-700">
                  <TrendingUp class="h-4 w-4" />
                  <span class="text-sm font-bold">AI 강점 분석</span>
                </div>
                <div v-if="strengthItems.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="(strength, idx) in strengthItems"
                    :key="`${strength}-${idx}`"
                    class="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                  >
                    {{ strength }}
                  </span>
                </div>
                <p v-else class="text-sm text-slate-500">
                  아직 강조할 강점 키워드가 충분히 쌓이지 않았습니다.
                </p>
              </div>

              <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <div class="mb-3 flex items-center gap-2 text-rose-700">
                  <TrendingDown class="h-4 w-4" />
                  <span class="text-sm font-bold">AI 보완점 분석</span>
                </div>
                <div v-if="weaknessItems.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="(weakness, idx) in weaknessItems"
                    :key="`${weakness}-${idx}`"
                    class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                  >
                    {{ weakness }}
                  </span>
                </div>
                <p v-else class="text-sm text-slate-500">
                  현재는 뚜렷한 보완점 키워드가 감지되지 않았습니다.
                </p>
              </div>
            </div>
          </div>

          <!-- State 2: Call to Action Button -->
          <div
            v-else
            class="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group"
          >
            <div
              class="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            ></div>

            <div class="relative z-10">
              <h2
                class="text-xl font-bold text-white mb-2 flex items-center gap-2"
              >
                <Sparkles class="w-5 h-5 text-indigo-400" />
                AI 평가 상세 분석
              </h2>
              <p class="text-slate-400 text-sm max-w-md">
                프리브릿지 AI가 고용주 평가 데이터를 분석하여<br />
                강점과 보완점을 요약해드립니다.
              </p>
            </div>




            <div class="relative z-10">
              <button
                @click="handleAiAnalysis"
                :disabled="isAiAnalyzing"
                class="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <div
                  v-if="isAiAnalyzing"
                  class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></div>
                <Sparkles v-else class="w-5 h-5 fill-white/20" />
                <span v-if="isAiAnalyzing">분석중...</span>
                <span v-else>AI 분석 받아보기</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Metric Cards Grid (3 Columns) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 1. Professionalism Card -->
          <div
            class="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-blue-500/30 transition-colors duration-300 flex flex-col"
          >
            <div class="flex justify-between items-start mb-6">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <div class="p-2 bg-blue-500/10 rounded-lg">
                    <Briefcase class="w-5 h-5 text-blue-400" />
                  </div>
                  <span class="text-sm font-bold text-blue-400">전문성</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-bold text-white tracking-tight">
                  {{ professionalismScore }}
                </div>
                <div class="text-xs text-slate-500">/ 5.0</div>
              </div>
            </div>

            <div class="space-y-6 flex-1">
              <div
                v-for="(score, key) in props.profile?.expertise"
                :key="key"
                class="space-y-2"
              >
                <div class="flex justify-between items-end mb-1">
                  <div>
                    <span class="text-slate-200 text-sm font-bold block">{{
                      metricDefinitions[key]?.label || key
                    }}</span>
                    <span class="text-slate-500 text-xs">{{
                      metricDefinitions[key]?.desc || ""
                    }}</span>
                  </div>
                  <span class="text-white font-bold text-sm">{{
                    score.toFixed(1)
                  }}</span>
                </div>
                <div class="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full"
                    :style="{ width: `${(score / 5) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Collaboration Card -->
          <div
            class="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-purple-500/30 transition-colors duration-300 flex flex-col"
          >
            <div class="flex justify-between items-start mb-6">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <div class="p-2 bg-purple-500/10 rounded-lg">
                    <MessageSquare class="w-5 h-5 text-purple-400" />
                  </div>
                  <span class="text-sm font-bold text-purple-400">협업 역량</span>


                </div>
              </div>
              <div class="text-right">
                <div class="text-3xl font-bold text-white tracking-tight">
                  {{ collaborationScore }}
                </div>
                <div class="text-xs text-slate-500">/ 5.0</div>
              </div>
            </div>

            <div class="space-y-6 flex-1">
              <div
                v-for="(score, key) in props.profile?.collaboration"
                :key="key"
                class="space-y-2"
              >
                <div class="flex justify-between items-end mb-1">
                  <div>
                    <span class="text-slate-200 text-sm font-bold block">{{
                      metricDefinitions[key]?.label || key
                    }}</span>
                    <span class="text-slate-500 text-xs">{{
                      metricDefinitions[key]?.desc || ""
                    }}</span>
                  </div>
                  <span class="text-white font-bold text-sm">{{
                    score.toFixed(1)
                  }}</span>
                </div>
                <div class="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-purple-500 rounded-full"
                    :style="{ width: `${(score / 5) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Total Average Card -->
          <div
            class="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-yellow-500/30 transition-colors duration-300 flex flex-col justify-center items-center text-center relative overflow-hidden group"
          >
            <div
              class="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors duration-500"
            ></div>

            <div class="relative z-10">
              <div class="mb-4 inline-flex p-4 bg-yellow-500/10 rounded-full">
                <Star class="w-10 h-10 text-yellow-400 fill-yellow-400" />
              </div>
              <div class="space-y-2">
                <span
                  class="block text-sm font-bold text-yellow-500 uppercase tracking-wider"
                  >Total Score</span
                >
                <div class="flex items-center justify-center gap-3">
                  <span class="text-6xl font-bold text-white tracking-tight">{{
                    averageScore
                  }}</span>
                </div>
                <span class="block text-sm text-slate-400 font-medium">/ 5.0 만점</span>
              </div>
              <div class="mt-8 pt-6 border-t border-white/10 w-full">
                <div class="text-sm text-slate-300">
                  상위
                  <span class="font-bold text-yellow-400">
                    {{ props.profile?.topPercentile || 0 }}%
                  </span>
                  이내의 프리랜서 평가를 받고 있습니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed text-slate-400 animate-fade-in"
      >
        <MessageSquare class="w-12 h-12 mb-4 opacity-50" />
        <p>프로필 정보 또는 평가 데이터가 없습니다.</p>
      </div>



    </div>

    <template v-else-if="activeTab === 'rejection'">
      <!-- Section Title -->
      <div class="mb-6 border-b border-white/10 pb-4">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          거절 사유 모아보기
          <span
            class="text-xs font-normal text-slate-400 px-2 py-0.5 bg-white/5 rounded-full"
            >{{ filteredRejections.length }}</span
          >
        </h3>
      </div>

      <!-- Search & Filter Controls -->
      <div class="flex flex-col md:flex-row gap-4 mb-6">
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="프로젝트명 또는 회사명 검색"
            class="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-20">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
        ></div>
      </div>

      <!-- Rejection List -->
      <template v-else>
        <div
          v-if="rejectionUnavailable"
          class="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed text-slate-500"
        >
          <MessageSquare class="w-12 h-12 mb-4 opacity-50" />
          <p>거절 사유 기능이 준비 중입니다.</p>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="filteredRejections.length === 0"
          class="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed text-slate-500"
        >
          <MessageSquare class="w-12 h-12 mb-4 opacity-50" />
          <p>거절 사유 데이터가 없습니다.</p>
        </div>




        <!-- List -->
        <div v-else class="grid grid-cols-1 gap-4">
          <div
            v-for="feedback in filteredRejections"
            :key="feedback.id"
            class="bg-white/5 rounded-xl border border-white/10 p-6 hover:border-red-500/30 transition-all group"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0 }"
          >
            <div
              class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4"
            >
              <div class="flex items-start gap-4">
                <div
                  class="w-10 h-10 rounded-lg bg-red-400/10 flex items-center justify-center border border-red-400/20 shrink-0"
                >
                  <Briefcase class="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3
                    class="font-bold text-white text-lg leading-tight group-hover:text-red-400 transition-colors"
                  >
                    {{ feedback.projectName }}
                  </h3>
                  <p
                    class="text-sm text-slate-400 mt-1 flex items-center gap-2"
                  >
                    {{ feedback.companyName }}
                  </p>
                </div>



              </div>
              <div class="text-xs text-slate-500 flex items-center gap-1">
                <Calendar class="w-3 h-3" />
                {{ feedback.createdAt }}
              </div>
            </div>

            <div
              class="bg-black/20 rounded-lg p-4 text-slate-300 text-sm leading-relaxed border border-white/5 mb-4"
            >
              "{{ feedback.reason }}"
            </div>

            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in feedback.tags"
                :key="tag"
                class="text-xs px-2.5 py-1 rounded-full bg-red-400/10 text-red-300 border border-red-400/20"
              >
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>














