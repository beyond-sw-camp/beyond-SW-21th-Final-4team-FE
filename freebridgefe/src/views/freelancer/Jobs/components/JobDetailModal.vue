<script setup lang="ts">
import { ref } from 'vue';
import { useMotion } from '@vueuse/motion';
import { X, DollarSign, Clock, Briefcase, Send } from 'lucide-vue-next';
import type { JobPosting } from '@/types';
import ApplicationModal from './ApplicationModal.vue';

const props = defineProps<{
  job: JobPosting;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const showApplicationModal = ref(false);

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('ko-KR');
};
</script>

<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-white">
    <div
      class="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
      v-motion
      :initial="{ opacity: 0, scale: 0.95, y: 20 }"
      :enter="{ opacity: 1, scale: 1, y: 0 }"
      :leave="{ opacity: 0, scale: 0.95, y: 20 }"
    >
      <div class="fb-modal-header sticky top-0 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
        <h2 class="text-2xl font-bold text-white">프로젝트 상세</h2>
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

      <div class="p-6">
        <!-- 헤더 -->
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-white mb-3">{{ job.title }}</h1>
          <div class="flex items-center gap-2 text-white/60">
            <Briefcase class="w-4 h-4" />
            <span>{{ job.employerName }}</span>
            <span>•</span>
            <span>{{ formatDate(job.createdAt) }} 등록</span>
          </div>
        </div>

        <!-- 주요 정보 -->
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
            <div class="flex items-center gap-2 text-white/60 text-sm mb-1">
              <DollarSign class="w-4 h-4" />
              월급
            </div>
            <div class="text-2xl font-bold text-white">{{ job.budget.toLocaleString() }}원</div>
          </div>
          <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
            <div class="flex items-center gap-2 text-white/60 text-sm mb-1">
              <Clock class="w-4 h-4" />
              예상 기간
            </div>
            <div class="text-2xl font-bold text-white">{{ job.duration }}개월</div>
          </div>
        </div>

        <!-- 기술 스택 -->
        <div class="mb-6">
          <h3 class="text-lg font-bold text-white mb-3">요구 기술 스택</h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(tech, index) in job.techStack"
              :key="tech"
              class="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 font-medium"
              v-motion
              :initial="{ opacity: 0, scale: 0.8 }"
              :enter="{ opacity: 1, scale: 1, transition: { delay: index * 0.05 } }"
            >
              {{ tech }}
            </span>
          </div>
        </div>

        <!-- 상세 설명 -->
        <div class="mb-6">
          <h3 class="text-lg font-bold text-white mb-3">프로젝트 설명</h3>
          <div class="text-white/70 whitespace-pre-wrap leading-relaxed">
            {{ job.description }}
          </div>
        </div>

        <!-- 액션 버튼 -->
        <div class="pt-6 border-t border-white/10">
          <button
            @click="showApplicationModal = true"
            class="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:shadow-xl transition-all flex items-center justify-center gap-2 font-semibold"
            v-motion
            :hover="{ scale: 1.02 }"
            :tap="{ scale: 0.98 }"
          >
            <Send class="w-5 h-5" />
            이 프로젝트에 지원하기
          </button>
        </div>
      </div>
    </div>

    <!-- 지원서 작성 모달 -->
    <ApplicationModal
      v-if="showApplicationModal"
      :job="job"
      @close="() => {
        showApplicationModal = false;
        $emit('close');
      }"
    />
  </div>
</template>
