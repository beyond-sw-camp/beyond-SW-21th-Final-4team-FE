<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFreelancerStore } from "@/stores/freelancerStore";
import {
  User,
  Mail,
  Briefcase,
  Star,
  Clock,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Award,
} from "lucide-vue-next";
import ProposalModal from "@/views/employer/Recommended/components/ProposalModal.vue";

const route = useRoute();
const router = useRouter();
const freelancerStore = useFreelancerStore();

const freelancerId = route.params.id as string;
const freelancer = computed(() =>
  freelancerStore.freelancers.find((f) => f.id === freelancerId),
);

const activeTab = ref<"portfolio" | "reviews">("portfolio");
const showProposalModal = ref(false);

const portfolioItems = computed(() => freelancer.value?.portfolioItems || []);

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const goBack = () => {
  router.back();
};
</script>

<template>
  <div
    v-if="freelancer"
    class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 text-white font-sans"
  >
    <!-- Back Button -->
    <button
      @click="goBack"
      class="group flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors"
    >
      <ArrowLeft
        class="w-5 h-5 group-hover:-translate-x-1 transition-transform"
      />
      <span>돌아가기</span>
    </button>

    <!-- Profile Header -->
    <div
      class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 mb-8"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <div class="flex flex-col md:flex-row gap-8 items-start">
        <div
          class="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-4xl font-bold shadow-2xl shrink-0"
        >
          {{ freelancer.name[0] }}
        </div>

        <div class="flex-1 w-full">
          <div
            class="flex flex-col md:flex-row justify-between items-start gap-4 mb-4"
          >
            <div>
              <h1 class="text-3xl font-bold mb-2 flex items-center gap-3">
                {{ freelancer.name }}
                <div
                  class="px-3 py-1 bg-white/10 rounded-full text-sm font-normal text-white/80 border border-white/10"
                >
                  {{ freelancer.experience }}년차
                </div>
              </h1>
              <p class="text-white/60 text-lg mb-4">{{ freelancer.bio }}</p>

              <div class="flex flex-wrap gap-4 text-sm text-white/70">
                <div class="flex items-center gap-2">
                  <Mail class="w-4 h-4" />
                  {{ freelancer.email }}
                </div>
                <div class="flex items-center gap-2">
                  <Clock class="w-4 h-4" />
                  월급 {{ freelancer.monthlySalary?.toLocaleString() }}원
                </div>
              </div>
            </div>

            <button
              @click="showProposalModal = true"
              class="px-6 py-3 bg-[#2D5BFF] text-white rounded-xl hover:bg-[#2D5BFF]/90 transition-all font-semibold shadow-lg hover:shadow-blue-500/25 active:scale-95"
            >
              제안하기
            </button>
          </div>

          <div class="flex flex-wrap gap-2">
            <span
              v-for="skill in freelancer.skills"
              :key="skill"
              class="px-3 py-1.5 bg-blue-500/10 text-blue-300 rounded-lg text-sm border border-blue-500/20"
            >
              {{ skill }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Tabs -->
    <div class="mb-8 border-b border-white/10">
      <div class="flex gap-8">
        <button
          @click="activeTab = 'portfolio'"
          class="pb-4 text-lg font-medium transition-colors relative"
          :class="
            activeTab === 'portfolio'
              ? 'text-white'
              : 'text-white/40 hover:text-white/70'
          "
        >
          포트폴리오
          <div
            v-if="activeTab === 'portfolio'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
            layoutId="activeTab"
          />
        </button>
        <button
          @click="activeTab = 'reviews'"
          class="pb-4 text-lg font-medium transition-colors relative"
          :class="
            activeTab === 'reviews'
              ? 'text-white'
              : 'text-white/40 hover:text-white/70'
          "
        >
          리뷰 / 평판
          <div
            v-if="activeTab === 'reviews'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
            layoutId="activeTab"
          />
        </button>
      </div>
    </div>

    <!-- Portfolio Grid -->
    <div
      v-if="activeTab === 'portfolio'"
      class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-if="portfolioItems.length === 0"
        class="col-span-full py-20 text-center text-white/40 bg-white/5 rounded-3xl border border-white/5"
      >
        <Briefcase class="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p class="text-lg">등록된 포트폴리오가 없습니다.</p>
      </div>

      <div
        v-else
        v-for="(item, index) in portfolioItems"
        :key="item.id"
        class="group bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all hover:-translate-y-1"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: index * 100 } }"
      >
        <div
          class="aspect-video bg-gradient-to-br from-gray-800 to-gray-700 relative overflow-hidden"
        >
          <div
            v-if="!item.imageUrl"
            class="absolute inset-0 flex items-center justify-center"
          >
            <Award class="w-12 h-12 text-white/20" />
          </div>
          <img
            v-else
            :src="item.imageUrl"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Portfolio Thumbnail"
          />

          <div
            class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm"
          >
            <a
              v-if="item.projectUrl"
              :href="item.projectUrl"
              target="_blank"
              class="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
              title="프로젝트 보기"
            >
              <ExternalLink class="w-5 h-5" />
            </a>
          </div>
        </div>

        <div class="p-6">
          <h3
            class="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors"
          >
            {{ item.title }}
          </h3>
          <p class="text-white/60 text-sm mb-4 line-clamp-2">
            {{ item.description }}
          </p>

          <div class="flex flex-wrap gap-2 mb-4">
            <span
              v-for="tech in item.skills"
              :key="tech"
              class="text-xs px-2 py-1 bg-white/10 rounded text-white/70"
            >
              {{ tech }}
            </span>
          </div>

          <div
            class="flex items-center gap-2 text-xs text-white/40 border-t border-white/10 pt-4"
          >
            <Calendar class="w-3 h-3" />
            {{ formatDate(item.createdAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Reviews Tab -->
    <div v-else class="space-y-6">
      <div
        v-if="freelancer.employerReputationAi"
        class="bg-white/5 rounded-3xl border border-white/10 p-8"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0 }"
      >
        <div class="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <Star class="w-6 h-6 text-yellow-400 fill-yellow-400" />
          <h2 class="text-2xl font-bold">AI 평판 요약</h2>
        </div>

        <p class="text-white/80 text-lg mb-8 leading-relaxed">
          "{{ freelancer.employerReputationAi.aiSummary }}"
        </p>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- Positive Keywords -->
          <div>
            <h3
              class="text-sm font-bold text-green-400 mb-3 flex items-center gap-2"
            >
              <div class="w-2 h-2 rounded-full bg-green-400"></div>
              주요 긍정 키워드
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="keyword in freelancer.employerReputationAi
                  .positiveKeywords"
                :key="keyword"
                class="px-3 py-1.5 bg-green-500/10 text-green-300 rounded-full text-sm border border-green-500/20"
              >
                #{{ keyword }}
              </span>
            </div>
          </div>

          <!-- Negative Keywords -->
          <div>
            <h3
              class="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"
            >
              <div class="w-2 h-2 rounded-full bg-red-400"></div>
              주요 보완 키워드
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="keyword in freelancer.employerReputationAi
                  .negativeKeywords"
                :key="keyword"
                class="px-3 py-1.5 bg-red-500/10 text-red-300 rounded-full text-sm border border-red-500/20"
              >
                #{{ keyword }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="text-center py-20 bg-white/5 rounded-3xl border border-white/5"
      >
        <Star class="w-16 h-16 mx-auto mb-4 text-yellow-500/50" />
        <p class="text-white/60">아직 AI 평판 분석 데이터가 없습니다.</p>
      </div>
    </div>

    <!-- Proposal Modal -->
    <ProposalModal
      v-if="showProposalModal"
      :freelancer="freelancer"
      @close="showProposalModal = false"
    />
  </div>

  <div
    v-else
    class="min-h-[50vh] flex items-center justify-center text-white/60"
  >
    프리랜서 정보를 찾을 수 없습니다.
  </div>
</template>
