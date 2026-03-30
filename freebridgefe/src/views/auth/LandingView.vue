<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useWindowScroll } from '@vueuse/core';
import { ArrowRight, Sparkles, Shield, MessageSquare, Star, Github } from 'lucide-vue-next';
import AnimatedBackground from './components/AnimatedBackground.vue';

const router = useRouter();
const { y: scrollY } = useWindowScroll();

const mousePosition = ref({ x: 0, y: 0 });

// Transform scrollY into opacity and scale for hero (simplified standard vue computed)
const heroOpacity = computed(() => {
  const op = 1 - scrollY.value / 400;
  return Math.max(0, Math.min(1, op));
});

const heroScale = computed(() => {
  const sc = 1 - (scrollY.value / 400) * 0.05;
  return Math.max(0.95, Math.min(1, sc));
});

const handleMouseMove = (e: MouseEvent) => {
  mousePosition.value = { x: e.clientX, y: e.clientY };
};

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
});

const navigateToLogin = () => {
  router.push('/login');
};

const navigateToSignup = (role: 'EMPLOYER' | 'FREELANCER') => {
  // In a real app, you might pass role via query param or store
  router.push({ path: '/signup', query: { role } });
};

// Features Data
const features = [
  {
    icon: Sparkles,
    gradient: 'from-blue-500 to-purple-500',
    title: 'AI 정밀 매칭',
    description: '프로젝트 요구사항을 분석하여 최적의 프리랜서를 자동으로 추천합니다.',
  },
  {
    icon: Shield,
    gradient: 'from-cyan-500 to-blue-500',
    title: '안전한 계약 시스템',
    description: '전자서명과 평가 체크리스트로 투명하고 안전한 계약을 보장합니다.',
  },
  {
    icon: MessageSquare,
    gradient: 'from-teal-500 to-cyan-500',
    title: '실시간 협업',
    description: '내장된 채팅으로 빠르게 소통하고 AI 견적 제안을 받아보세요.',
  },
  {
    icon: Star,
    gradient: 'from-green-500 to-teal-500',
    title: '신뢰 기반 평가',
    description: '상호 평가 시스템으로 프리랜서와 고용주의 신뢰도를 확인하세요.',
  },
];

const stats = [
  { value: '10,000+', label: '활동 프리랜서' },
  { value: '5,000+', label: '파트너 고용주' },
  { value: '95%', label: '고객 만족도' },
  { value: '24시간', label: '평균 매칭 시간' },
];
</script>

<template>
  <div class="min-h-screen bg-black text-white overflow-x-hidden font-sans">
    <!-- Hero Section -->
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden">
      <!-- Animated Background -->
      <AnimatedBackground />

      <!-- Glassmorphism Overlay -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

      <!-- Content -->
      <div
        class="relative z-10 max-w-5xl mx-auto px-6 text-center"
        :style="{ opacity: heroOpacity, transform: `scale(${heroScale})` }"
      >
        <!-- Main Heading -->
        <h1
          v-motion
          :initial="{ opacity: 0, y: 30 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 400 } }"
          class="text-6xl md:text-8xl font-bold mb-8 leading-tight tracking-tight pb-4"
          style="background: linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
        >
          최고의 프리랜서와
          <br />
          고용주를 연결합니다
        </h1>

        <!-- Subtitle -->
        <p
          v-motion
          :initial="{ opacity: 0, y: 30 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 600 } }"
          class="text-xl md:text-2xl text-white/70 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          AI 매칭, 안전한 계약, 실시간 협업까지.
          <br />
          FreeBridge에서 완벽한 파트너를 만나보세요.
        </p>

        <!-- CTA Buttons -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 30 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 800, delay: 800 } }"
          class="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            @click="navigateToSignup('FREELANCER')"
            class="group relative px-8 py-4 bg-white text-black rounded-full font-medium text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95"
          >
            <span class="relative z-10 flex items-center gap-2">
              무료로 시작하기
              <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div
              class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-transform duration-300 transform translate-x-full group-hover:translate-x-0"
            />
          </button>

          <button
            @click="navigateToLogin"
            class="px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full font-medium text-lg transition-all hover:scale-105 hover:bg-white/15 active:scale-95"
          >
            로그인
          </button>
        </div>

      </div>
    </section>

    <!-- Stats Section -->
    <section class="relative py-24 border-t border-white/10">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div
            v-for="(stat, index) in stats"
            :key="index"
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :visible="{ opacity: 1, y: 0, transition: { duration: 600, delay: index * 100 } }"
            class="text-center"
          >
            <div class="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
              {{ stat.value }}
            </div>
            <div class="text-white/60">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="relative py-32">
      <div class="max-w-7xl mx-auto px-6">
        <!-- Section Header -->
        <div
          v-motion
          :initial="{ opacity: 0, y: 30 }"
          :visible="{ opacity: 1, y: 0, transition: { duration: 800 } }"
          class="text-center mb-20"
        >
          <h2 class="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent pb-4 leading-normal">
            왜 FreeBridge인가요?
          </h2>
          <p class="text-xl text-white/60 max-w-2xl mx-auto">
            프로젝트 성공을 위한 모든 기능을 제공합니다
          </p>
        </div>

        <!-- Feature Cards -->
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="(feature, index) in features"
            :key="index"
            v-motion
            :initial="{ opacity: 0, y: 30 }"
            :visible="{ opacity: 1, y: 0, transition: { duration: 600, delay: index * 100 } }"
            class="group relative hover:-translate-y-2 transition-transform duration-300"
          >
            <div class="relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all h-full">
              <!-- Icon -->
              <div
                class="w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6"
                :class="feature.gradient"
              >
                <component :is="feature.icon" class="w-8 h-8 text-white" />
              </div>

              <!-- Content -->
              <h3 class="text-2xl font-semibold mb-4">{{ feature.title }}</h3>
              <p class="text-white/60 leading-relaxed">{{ feature.description }}</p>

              <!-- Hover Gradient -->
              <div
                class="absolute inset-0 rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity"
                :class="feature.gradient"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="relative py-32">
      <div class="max-w-4xl mx-auto px-6 text-center">
        <div
          v-motion
          :initial="{ opacity: 0, y: 30 }"
          :visible="{ opacity: 1, y: 0, transition: { duration: 800 } }"
        >
          <h2 class="text-5xl md:text-6xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p class="text-xl text-white/70 mb-12">
            프리랜서 또는 고용주로 가입하고 완벽한 파트너를 만나보세요
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              @click="navigateToSignup('FREELANCER')"
              class="px-10 py-5 bg-white text-black rounded-full font-semibold text-lg transition-transform hover:scale-105 active:scale-95"
            >
              프리랜서로 시작하기
            </button>
            <button
              @click="navigateToSignup('EMPLOYER')"
              class="px-10 py-5 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full font-semibold text-lg transition-all hover:scale-105 hover:bg-white/15 active:scale-95"
            >
              고용주로 시작하기
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="relative border-t border-white/10 py-12">
      <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <!-- Brand Info -->
        <div class="text-center md:text-left">
          <h3 class="mb-2 text-2xl font-bold text-white">
            FreeBridge
          </h3>
          <p class="text-white/50 text-sm">
            Beyond SW Camp 21th - Team FallGuys Final Project
          </p>
        </div>

        <!-- Links & Copyright -->
        <div class="flex flex-col md:flex-row items-center gap-6">
          <a
            href="https://github.com/20250918-beyond-SW-Camp-21th/beyond-SW-21th-Final-4team-FE"
            target="_blank"
            rel="noopener noreferrer"
            class="text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm group"
          >
            <Github class="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>GitHub Repository</span>
          </a>
          
          <div class="hidden md:block w-px h-4 bg-white/10"></div>
          
          <p class="text-white/40 text-sm">
            © 2026 FreeBridge. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
