<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { 
  Briefcase, FileText, Users, TrendingUp, 
  FileCheck, Wallet, UserCircle,
  CheckCircle, ArrowRight
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const currentUser = computed(() => authStore.user);
// 탭 기본값은 현재 사용자 역할에 맞춤. 없으면 EMPLOYER
const activeTab = ref(currentUser.value?.role || 'EMPLOYER');

// Watch for user changes to set the correct tab initially
watch(() => currentUser.value, (newUser) => {
  if (newUser?.role) {
    // Only update if we are on the default fallback or want to sync always.
    // Given instructions, we just update it when user becomes available.
    activeTab.value = newUser.role;
  }
});

// 고용주 가이드 데이터
const employerGuides = [
  {
    icon: Briefcase,
    title: '내 공고',
    description: '프로젝트 공고를 생성하고 관리하는 공간입니다.',
    features: [
      '새로운 프로젝트 공고 작성 및 등록',
      '공고 상태 관리 (모집 중, 마감, 임시저장)',
      '공고 조회수 및 지원자 수 실시간 확인',
      '지난 공고 복사하여 재등록하기'
    ]
  },
  {
    icon: FileText,
    title: '지원/제안',
    description: '내 공고에 지원한 프리랜서를 검토하고, 내가 보낸 제안까지 함께 관리합니다.',
    features: [
      '지원자 프로필 및 포트폴리오 상세 검토',
      '지원자와 1:1 채팅 및 인터뷰 요청',
      '지원 합격/불합격 처리',
      '관심 있는 지원자 찜하기'
    ]
  },
  {
    icon: TrendingUp,
    title: '추천 프리랜서',
    description: 'AI가 기업의 성향과 프로젝트를 분석하여 최적의 인재를 추천합니다.',
    features: [
      '기술 스택 매칭 알고리즘 기반 추천',
      '유사 프로젝트 경험자 우선 노출',
      '원하는 조건으로 프리랜서 검색 및 필터링',
      '제안 메시지 직접 발송'
    ]
  },
  {
    icon: FileCheck,
    title: '계약서',
    description: '안전한 프로젝트 진행을 위한 전자계약 시스템입니다.',
    features: [
      '표준 프리랜서 계약서 자동 생성',
      '전자 서명 및 계약 체결',
      '계약 문서 PDF 다운로드 및 보관',
      '계약 상태(서명 대기, 완료, 파기) 관리'
    ]
  },
  {
    icon: UserCircle,
    title: '마이페이지',
    description: '기업 정보와 계정 설정을 관리합니다.',
    features: [
      '기업 로고 및 소개 수정',
      '담당자 연락처 및 알림 설정 변경',
      '사업자 등록증 관리',
      '비밀번호 변경 및 보안 설정'
    ]
  }
];

// 프리랜서 가이드 데이터
const freelancerGuides = [
  {
    icon: Briefcase,
    title: '공고 찾기',
    description: '나에게 맞는 프로젝트를 탐색하고 지원할 수 있는 메인 화면입니다.',
    features: [
      '키워드, 기술 스택, 예산별 검색 및 필터링',
      '최신 등록순, 마감 임박순 정렬',
      '관심 공고 북마크',
      '상세 모집 요강 확인 및 즉시 지원'
    ]
  },
  {
    icon: FileText,
    title: '내 지원/제안',
    description: '내가 지원한 프로젝트와 기업으로부터 받은 제안을 한눈에 모아봅니다.',
    features: [
      '지원 상태(대기, 열람, 합격, 불합격) 실시간 추적',
      '지원 취소 및 지원서 수정',
      '기업으로부터 받은 면접/계약 제안 확인',
      '과거 지원 이력 관리'
    ]
  },
  {
    icon: TrendingUp,
    title: '추천 공고',
    description: '나의 기술 스택과 경력을 분석해 AI가 딱 맞는 공고를 배달합니다.',
    features: [
      '내 프로필 기반 맞춤형 프로젝트 추천',
      '선호하는 카테고리 설정',
      '높은 매칭률을 가진 공고 우선 표시',
      '새로운 추천 공고 알림 수신'
    ]
  },
  {
    icon: FileCheck,
    title: '계약서',
    description: '계약 체결부터 완료까지 모든 문서를 안전하게 관리합니다.',
    features: [
      '도착한 계약서 검토 및 서명',
      '진행 중인 프로젝트 계약 조건 확인',
      '완료된 계약서 영구 보관',
      '계약 관련 분쟁 시 증빙 자료 활용'
    ]
  },
  {
    icon: Wallet,
    title: '정산',
    description: '소중한 수익금을 안전하게 정산받고 관리합니다.',
    features: [
      '프로젝트 대금 정산 요청',
      '정산 예정 금액 및 지급 내역 조회',
      '입금 계좌 관리',
      '세금 계산서 발행 이력 확인'
    ]
  },
  {
    icon: UserCircle,
    title: '마이페이지',
    description: '나를 어필할 수 있는 프로필과 포트폴리오를 관리합니다.',
    features: [
      '프로필 사진 및 자기소개 수정',
      '보유 기술 스택 및 경력 사항 업데이트',
      '포트폴리오 프로젝트 등록',
      '알림 수신 설정 및 계정 보안 관리'
    ]
  }
];

const currentGuides = computed(() => activeTab.value === 'EMPLOYER' ? employerGuides : freelancerGuides);

const handleReturnToService = () => {
  if (currentUser.value) {
    router.push(currentUser.value.role === 'EMPLOYER' ? '/employer/jobs' : '/freelancer/jobs');
  } else {
    router.push('/');
  }
};
</script>

<template>
  <div class="fb-page-shell min-h-screen text-slate-800 font-sans">
    <!-- 헤더 섹션 -->
    <div class="relative py-20 px-4 md:px-8 overflow-hidden">
      <div class="max-w-5xl mx-auto relative z-10 text-center">
        <h1 
          class="text-4xl md:text-5xl font-bold mb-6 text-slate-950 pb-4 leading-relaxed"
          v-motion="{
            initial: { opacity: 0, y: 20 },
            enter: { opacity: 1, y: 0 }
          }"
        >
          FreeBridge 100% 활용하기
        </h1>
        <p 
          class="text-xl text-slate-500 mb-10 max-w-2xl mx-auto"
          v-motion="{
            initial: { opacity: 0, y: 20 },
            enter: { opacity: 1, y: 0, transition: { delay: 100 } }
          }"
        >
          서비스의 주요 기능을 상세히 안내해 드립니다.<br>
          고용주와 프리랜서 모드에 맞춰 확인해보세요.
        </p>

        <!-- 탭 전환 -->
        <div 
          class="inline-flex bg-white/95 p-1 rounded-full backdrop-blur-xl border border-slate-200 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]"
          v-motion="{
            initial: { opacity: 0, scale: 0.9 },
            enter: { opacity: 1, scale: 1, transition: { delay: 200 } }
          }"
        >
          <button
            @click="activeTab = 'EMPLOYER'"
            class="px-8 py-3 rounded-full text-sm font-bold transition-all duration-300"
            :class="activeTab === 'EMPLOYER' ? 'bg-sky-50 text-sky-700 shadow-md border border-sky-100' : 'text-slate-500 hover:text-slate-900'"
          >
            기업 회원 (고용주)
          </button>
          <button
            @click="activeTab = 'FREELANCER'"
            class="px-8 py-3 rounded-full text-sm font-bold transition-all duration-300"
            :class="activeTab === 'FREELANCER' ? 'bg-teal-50 text-teal-700 shadow-md border border-teal-100' : 'text-slate-500 hover:text-slate-900'"
          >
            프리랜서
          </button>
        </div>
      </div>

      <!-- 배경 장식 -->
      <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-sky-200/50 rounded-full blur-[110px]"></div>
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-100/70 rounded-full blur-[110px]"></div>
      </div>
    </div>

    <!-- 가이드 컨텐츠 그리드 -->
    <div class="max-w-7xl mx-auto px-4 md:px-8 pb-32">
      <div 
        :key="activeTab"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        <div
          v-for="(guide, index) in currentGuides"
          :key="guide.title"
          class="group fb-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-28px_rgba(14,165,233,0.18)]"
          v-motion="{
            initial: { opacity: 0, y: 30 },
            enter: { opacity: 1, y: 0, transition: { delay: 300 + (index * 100) } }
          }"
        >
          <!-- 카드 헤더 -->
          <div class="p-8 h-full flex flex-col">
            <div class="mb-6 flex items-center justify-between">
              <div 
                class="w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-[0_18px_32px_-18px_rgba(14,165,233,0.35)]"
                :class="activeTab === 'EMPLOYER' ? 'from-sky-500 to-cyan-500' : 'from-teal-500 to-cyan-500'"
              >
                <component :is="guide.icon" class="w-7 h-7" />
              </div>
              <div class="text-xs font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                0{{ index + 1 }}
              </div>
            </div>

            <h3 class="text-2xl font-bold mb-3 text-slate-950 transition-colors">
              {{ guide.title }}
            </h3>
            
            <p class="text-slate-500 mb-8 leading-relaxed min-h-[3.5rem]">
              {{ guide.description }}
            </p>

            <div class="mt-auto">
              <h4 class="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">주요 기능</h4>
              <ul class="space-y-3">
                <li 
                  v-for="feature in guide.features" 
                  :key="feature" 
                  class="flex items-start gap-3 text-sm text-slate-700"
                >
                  <CheckCircle class="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{{ feature }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- 하단 CTA -->
      <div class="mt-20 text-center">
        <button
          @click="handleReturnToService"
          class="fb-button-primary inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold transition-all"
        >
          <span>서비스로 돌아가기</span>
          <ArrowRight class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
