<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTourStore } from '@/stores/tourStore';
import { X, ChevronRight, Briefcase, FileText, TrendingUp, FileCheck, Wallet, UserCircle } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const tourStore = useTourStore();

const currentStep = computed(() => tourStore.currentStep);

// 아이콘 매핑
const getIcon = (stepId: string) => {
  const iconMap: Record<string, any> = {
    'employer.jobs': Briefcase,
    'employer.applications': FileText,
    'employer.recommended': TrendingUp,
    'employer.contracts': FileCheck,
    'employer.mypage': UserCircle,
    'freelancer.jobs': Briefcase,
    'freelancer.applications': FileText,
    'freelancer.recommended': TrendingUp,
    'freelancer.contracts': FileCheck,
    'freelancer.settlement': Wallet,
    'freelancer.mypage': UserCircle,
  };
  return iconMap[stepId] || Briefcase;
};

// 현재 라우트에 맞는 스텝인지 확인
const isCurrentRouteStep = computed(() => {
  if (!currentStep.value) return false;
  return route.path === currentStep.value.route;
});

// 다음 스텝으로
const handleNext = () => {
  const nextRoute = tourStore.next();
  if (nextRoute && nextRoute !== route.path) {
    router.push(nextRoute);
  }
};

// 건너뛰기
const handleSkip = () => {
  tourStore.skip();
};

// 라우트 변경 시 다음 스텝 자동 진행 (이미 해당 라우트에 있을 경우)
watch(() => route.path, (newPath) => {
  if (!tourStore.isActive || !currentStep.value) return;
  // 현재 스텝의 라우트와 일치하면 표시
}, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="tourStore.isActive && currentStep && isCurrentRouteStep" 
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <!-- 배경 오버레이 -->
        <div 
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="handleSkip"
        />
        
        <!-- 모달 카드 -->
        <div 
          class="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        >
          <!-- 상단 그라데이션 바 -->
          <div class="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          
          <!-- 닫기 버튼 -->
          <button
            @click="handleSkip"
            class="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <X class="w-5 h-5" />
          </button>
          
          <!-- 컨텐츠 -->
          <div class="p-8">
            <!-- 아이콘 -->
            <div class="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6">
              <component :is="getIcon(currentStep.id)" class="w-8 h-8 text-blue-400" />
            </div>
            
            <!-- 진행 상태 -->
            <div class="flex items-center gap-2 mb-4">
              <span class="text-sm font-medium text-blue-400">
                {{ tourStore.currentIndex + 1 }} / {{ tourStore.total }}
              </span>
              <div class="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-blue-500 rounded-full transition-all duration-300"
                  :style="{ width: `${((tourStore.currentIndex + 1) / tourStore.total) * 100}%` }"
                />
              </div>
            </div>
            
            <!-- 제목 -->
            <h2 class="text-2xl font-bold text-white mb-3">
              {{ currentStep.title }}
            </h2>
            
            <!-- 설명 -->
            <p class="text-white/70 leading-relaxed mb-8">
              {{ currentStep.description }}
            </p>
            
            <!-- 버튼 -->
            <div class="flex items-center justify-between">
              <button
                @click="handleSkip"
                class="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                건너뛰기
              </button>
              
              <button
                @click="handleNext"
                class="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all hover:scale-105"
              >
                <span>{{ tourStore.currentIndex === tourStore.total - 1 ? '완료' : '다음' }}</span>
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
