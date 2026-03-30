<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMotion } from '@vueuse/motion';
import {
  User,
  Briefcase,
  Users,
  Settings,
  Building2,
  FileText,
  Crown,
  CheckCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Star,
  Award,
  MessageSquare,
  X,
  MapPin,
  Globe,
  ArrowRight,
  ClipboardList,
  Mail,
  Phone,
  Camera,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useAlertStore } from '@/stores/alertStore';
import { useContractStore } from '@/stores/contractStore';
import { getEmployerProfile, uploadEmployerLogo, type EmployerProfileData } from '@/api/MyPage/employer';
import { PLAN_LABELS } from '@/constants/planLabels';
import { getEmployerReviewSummary } from '@/api/MyPage/evaluationApi';
import { getEmployerProjectStats } from '@/api/MyPage/projectApi';
import { getEmployerSubscription } from '@/api/MyPage/accountApi';
import ProfileIdentityAvatar from '@/components/profile/ProfileIdentityAvatar.vue';
import { formatPhoneNumber } from '@/utils/phone';

import EmployerProfileManagement from './components/EmployerProfileManagement.vue';
import EmployerAccountManagement from './components/EmployerAccountManagement.vue';
import EmployerProjectManagement from './components/EmployerProjectManagement.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const alertStore = useAlertStore();
const contractStore = useContractStore();
const currentUserId = computed(() => authStore.user?.id ?? null);

const activeTab = ref('dashboard');
const hideEmployerNoticeBanner = ref(false);
const dismissedTopCrmKeys = ref<string[]>([]);
const seenTopCrmKeys = ref<string[]>([]);
const pinnedTopCrmBannerKey = ref<string | null>(null);
const persistentTopCrmKeys = ['subscription', 'upsell-pro', 'upsell-prime', 'prime-upsell'];

const getEmployerCrmStorageKey = () => {
  const userId = currentUserId.value;
  return userId ? `mypage-employer-crm:${userId}` : null;
};

const loadSeenTopCrmKeys = () => {
  const storageKey = getEmployerCrmStorageKey();
  if (!storageKey) {
    seenTopCrmKeys.value = [];
    return;
  }

  try {
    const saved = sessionStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    seenTopCrmKeys.value = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch (error) {
    console.error('Failed to load employer crm session state:', error);
    seenTopCrmKeys.value = [];
  }
};

const markTopCrmBannerSeen = (key: string) => {
  if (persistentTopCrmKeys.includes(key)) {
    return;
  }

  if (seenTopCrmKeys.value.includes(key)) {
    return;
  }

  const nextSeenKeys = [...seenTopCrmKeys.value, key];
  seenTopCrmKeys.value = nextSeenKeys;

  const storageKey = getEmployerCrmStorageKey();
  if (!storageKey) {
    return;
  }

  try {
    sessionStorage.setItem(storageKey, JSON.stringify(nextSeenKeys));
  } catch (error) {
    console.error('Failed to persist employer crm session state:', error);
  }
};

const dismissTopCrmBanner = (key: string) => {
  if (!dismissedTopCrmKeys.value.includes(key)) {
    dismissedTopCrmKeys.value = [...dismissedTopCrmKeys.value, key];
  }
  pinnedTopCrmBannerKey.value = null;
};

const updateTabFromQuery = () => {
    const tab = route.query.tab as string;
    const validTabs = ['dashboard', 'profile', 'applicants', 'projects', 'account'];
    if (tab && validTabs.includes(tab)) {
        activeTab.value = tab;
    }
};

watch(() => route.query.tab, () => {
    updateTabFromQuery();
});

const SCALE_LABELS: Record<string, string> = {
  S1_4: '1-4명',
  S5_9: '5-9명',
  S10_29: '10-29명',
  S30_99: '30-99명',
  S100_299: '100-299명',
  S300_999: '300-999명',
  S1000_PLUS: '1000명 이상',
};

const employerProfile = ref<EmployerProfileData>({
  companyName: '',
  industry: '',
  size: '',
  location: '',
  website: '',
  email: '',
  phone: '',
  description: '',
  plan: 'FREE',
  activeProjects: 0,
  totalApplicants: 0,
  contractedFreelancers: 0,
  avgRating: 0.0,
  ratingDetails: {
    atmosphere: 0,
    requirementsDetail: 0,
    scheduleAdherence: 0,
  },
  projectStatusCounts: {
    posted: 0,
    screening: 0,
    inProgress: 0,
    completed: 0
  }
});

const hasReviewData = computed(() => {
  const avgRating = employerProfile.value.avgRating ?? 0;
  const details = employerProfile.value.ratingDetails;
  return (
    avgRating > 0 ||
    (details?.atmosphere ?? 0) > 0 ||
    (details?.requirementsDetail ?? 0) > 0 ||
    (details?.scheduleAdherence ?? 0) > 0
  );
});


const handleLogoUpdate = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
        const file = input.files[0];
        try {
            const logoUrl = await uploadEmployerLogo(file);
            employerProfile.value.logoUrl = logoUrl;
        } catch (error) {
            console.error('Failed to upload logo:', error);
            alertStore.open({ message: '로고 업로드에 실패했습니다.', type: 'error' });
        } finally {
            input.value = '';
        }
    }
};

const handleNoticeClick = async () => {
  try {
    await contractStore.fetchContracts();
    const latestContract = [...contractStore.contractsWithDetails]
      .sort((left, right) => Number(right.contractId ?? right.id) - Number(left.contractId ?? left.id))[0];

    await router.push({
      name: 'employer.contracts',
      query: latestContract
        ? {
            contractId: String(latestContract.contractId ?? latestContract.id),
            contractTab: 'ai-advice',
          }
        : {
            contractTab: 'ai-advice',
          },
    });
  } catch (error) {
    console.error('Failed to open employer legal ai guide:', error);
    alertStore.open({ message: '법률 자문 AI 화면으로 이동하지 못했습니다.', type: 'error' });
  }
};

const handlePrimeUpsellClick = () => {
  activeTab.value = 'account';
  router.push({ query: { ...route.query, tab: 'account' } });
};

type CrmActionTarget = 'jobs' | 'projects' | 'account';
type OperationalCrmCard = {
  key: string;
  title: string;
  description: string;
  cta: string;
  target: CrmActionTarget;
  icon: unknown;
};

type TopCrmBannerItem = {
  key: string;
  label: string;
  title: string;
  description: string;
  cta: string;
  target: CrmActionTarget;
  icon: unknown;
  wrapClass: string;
  glowClass: string;
  iconWrapClass: string;
  ctaClass: string;
  isTextDark: boolean;
};

const handleCrmAction = (target: CrmActionTarget) => {
  if (target === 'jobs') {
    router.push({ name: 'employer.jobs' });
    return;
  }
  activeTab.value = target;
  router.push({ query: { ...route.query, tab: target } });
};

const fetchProfile = async () => {
  try {
    const [profile, reviewSummary, projectStats, subscription] = await Promise.all([
      getEmployerProfile(),
      getEmployerReviewSummary().catch(() => null),
      getEmployerProjectStats().catch(() => null),
      getEmployerSubscription().catch(() => null)
    ]);
    employerProfile.value = {
      ...profile,
      plan: subscription?.currentPlan ?? profile.plan ?? employerProfile.value.plan,
      activeProjects: projectStats?.totalProjects ?? profile.activeProjects ?? 0,
      totalApplicants: projectStats?.activeApplicants ?? profile.totalApplicants ?? 0,
      contractedFreelancers:
        projectStats?.contractedFreelancers ?? profile.contractedFreelancers ?? 0,
      avgRating: reviewSummary?.averageRate ?? profile.avgRating,
      ratingDetails: {
        atmosphere: reviewSummary?.atmosphereRate ?? profile.ratingDetails?.atmosphere ?? 0,
        requirementsDetail: reviewSummary?.requirementsDetailRate ?? profile.ratingDetails?.requirementsDetail ?? 0,
        scheduleAdherence: reviewSummary?.scheduleAdherenceRate ?? profile.ratingDetails?.scheduleAdherence ?? 0
      }
    };
  } catch (error) {
    console.error('Failed to fetch employer profile:', error);
  }
};

const subscriptionPlanText = computed(() => {
  const normalizedPlan = (employerProfile.value.plan ?? 'FREE').toUpperCase();
  return PLAN_LABELS[normalizedPlan] ?? normalizedPlan;
});

const companySizeLabel = computed(() => {
  const size = employerProfile.value.size ?? '';
  return SCALE_LABELS[size] ?? size;
});

const formattedEmployerPhone = computed(() => formatPhoneNumber(employerProfile.value.phone));

const accountUpsellBanner = computed<TopCrmBannerItem | null>(() => {
  const alerts = employerProfile.value.crmAlerts;
  if (alerts?.upsellTarget === 'PRO' || alerts?.isPremiumUpsellEligible) {
    return {
      key: 'upsell-pro',
      label: 'PRO 업그레이드',
      title: '수수료 할인과 추천 프리랜서로 매칭 효율을 높이세요',
      description: 'PRO 플랜으로 업그레이드하고 추천 프리랜서 우선 노출과 수수료 할인 혜택을 받아보세요.',
      cta: '요금제 업그레이드',
      target: 'account',
      icon: TrendingUp,
      wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(59,130,246,0.08),rgba(255,255,255,0.05))]',
      glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_34%)]',
      iconWrapClass: 'bg-white/10',
      ctaClass: 'bg-white text-slate-900 hover:bg-white/90',
      isTextDark: true
    };
  }
  if (alerts?.upsellTarget === 'PRIME' || alerts?.isPrimeUpsellEligible) {
    return {
      key: 'upsell-prime',
      label: 'PRIME 업그레이드',
      title: '전담 AI 컨설팅과 추가 혜택을 받아보세요',
      description: 'PRIME 플랜으로 업그레이드하고 전담 AI 컨설팅과 대폭 수수료 할인을 누리세요.',
      cta: '요금제 업그레이드',
      target: 'account',
      icon: Crown,
      wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(168,85,247,0.10),rgba(255,255,255,0.05))]',
      glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_34%)]',
      iconWrapClass: 'bg-white/10',
      ctaClass: 'bg-white text-slate-900 hover:bg-white/90',
      isTextDark: true
    };
  }
  return null;
});

const operationalCrmCards = computed<TopCrmBannerItem[]>(() => {
  const alerts = employerProfile.value.crmAlerts;
  if (!alerts) return [];

  const cards: TopCrmBannerItem[] = [];

  if (alerts.isFirstJobEncouraged && (employerProfile.value.activeProjects ?? 0) === 0) {
    cards.push({
      key: 'first-job',
      label: '온보딩 CRM',
      title: '첫 공고 등록을 시작해보세요',
      description: '프로필 준비가 끝났다면 첫 공고를 올리고 지원자를 받아보는 단계로 넘어갈 수 있어요.',
      cta: '공고 등록하러 가기',
      target: 'jobs' as CrmActionTarget,
      icon: Briefcase,
      wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(59,130,246,0.08),rgba(255,255,255,0.05))]',
      glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_34%)]',
      iconWrapClass: 'bg-white/10',
      ctaClass: 'bg-white/10 text-white hover:bg-white/15',
      isTextDark: false,
    });
  }

  if (alerts.hasPendingApplicants) {
    cards.push({
      key: 'pending-applicants',
      label: '지원자 관리',
      title: '검토를 기다리는 지원자가 있어요',
      description: '대기 중인 지원자를 빠르게 확인하면 계약 전환까지 이어질 가능성이 높아집니다.',
      cta: '프로젝트 관리 열기',
      target: 'projects' as CrmActionTarget,
      icon: Users,
      wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(16,185,129,0.08),rgba(255,255,255,0.05))]',
      glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_34%)]',
      iconWrapClass: 'bg-white/10',
      ctaClass: 'bg-white/10 text-white hover:bg-white/15',
      isTextDark: false,
    });
  }

  if (alerts.isContractConversionNeeded) {
    cards.push({
      key: 'contract-conversion',
      label: '전환 유도',
      title: '이제 계약 단계로 전환할 시점입니다',
      description: '지원자는 충분하지만 계약이 이어지지 않고 있어요. 적합한 인재와 빠르게 협의를 시작해보세요.',
      cta: '지원자 다시 보기',
      target: 'projects' as CrmActionTarget,
      icon: ClipboardList,
      wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(245,158,11,0.08),rgba(255,255,255,0.05))]',
      glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.18),transparent_34%)]',
      iconWrapClass: 'bg-white/10',
      ctaClass: 'bg-white/10 text-white hover:bg-white/15',
      isTextDark: false,
    });
  }

  if (alerts.isRehiringRecommended) {
    cards.push({
      key: 'rehiring',
      label: '재채용 추천',
      title: '다음 채용을 준비해보세요',
      description: '이전 프로젝트가 마무리된 만큼, 다음 공고를 열어 채용 흐름을 이어갈 수 있습니다.',
      cta: '공고 페이지 이동',
      target: 'jobs' as CrmActionTarget,
      icon: Calendar,
      wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(99,102,241,0.08),rgba(255,255,255,0.05))]',
      glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_34%)]',
      iconWrapClass: 'bg-white/10',
      ctaClass: 'bg-white/10 text-white hover:bg-white/15',
      isTextDark: false,
    });
  }

  if (alerts.isSubscriptionAttentionNeeded) {
    cards.push({
      key: 'subscription',
      label: '구독 알림',
      title: '구독 상태를 확인해주세요',
      description: '예약된 플랜 변경이나 다음 결제 일정이 있어요. 혜택이 끊기지 않도록 미리 점검해보세요.',
      cta: '구독 관리 열기',
      target: 'account' as CrmActionTarget,
      icon: Crown,
      wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(244,114,182,0.08),rgba(255,255,255,0.05))]',
      glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.18),transparent_34%)]',
      iconWrapClass: 'bg-white/10',
      ctaClass: 'bg-white/10 text-white hover:bg-white/15',
      isTextDark: false,
    });
  }

  return cards;
});

const proPrimeBanner = computed<TopCrmBannerItem | null>(() => {
  const plan = (employerProfile.value.plan ?? '').toUpperCase();
  const totalProjects = employerProfile.value.activeProjects ?? 0;
  if (plan === 'PRO' && totalProjects >= 2) {
    return {
      key: 'prime-upsell',
      label: 'PRIME 제안',
      title: 'PRIME로 전환하고 계약 리스크를 줄이세요',
      description: '전담 AI 자문, 계약서 검토, 우선 매칭까지 PRIME 전용 혜택을 제공합니다.',
      cta: 'PRIME 혜택 보기',
      target: 'account',
      icon: Crown,
      wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(99,102,241,0.08),rgba(255,255,255,0.05))]',
      glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_36%)]',
      iconWrapClass: 'bg-white/10',
      ctaClass: 'bg-white text-slate-900 hover:bg-white/90',
      isTextDark: true
    };
  }
  return null;
});

const allTopCrmBanners = computed(() => {
  return [proPrimeBanner.value, accountUpsellBanner.value, ...operationalCrmCards.value]
    .filter((banner): banner is TopCrmBannerItem => Boolean(banner));
});

const topCrmBanners = computed(() => {
  return allTopCrmBanners.value
    .filter((banner) => persistentTopCrmKeys.includes(banner.key) || !seenTopCrmKeys.value.includes(banner.key))
    .filter((banner) => !dismissedTopCrmKeys.value.includes(banner.key));
});

const activeTopCrmBanner = computed(() => {
  if (pinnedTopCrmBannerKey.value) {
    return allTopCrmBanners.value.find((banner) => banner.key === pinnedTopCrmBannerKey.value) ?? null;
  }

  return topCrmBanners.value[0] ?? null;
});

const normalizedPlanKey = computed<'FREE' | 'PRO' | 'PRIME'>(() => {
  const normalizedPlan = (employerProfile.value.plan ?? 'FREE').toUpperCase();
  if (normalizedPlan === 'PARTNER') return 'PRO';
  if (normalizedPlan === 'ENTERPRISE') return 'PRIME';
  if (normalizedPlan === 'PRO' || normalizedPlan === 'PRIME') return normalizedPlan;
  return 'FREE';
});

const subscriptionPlanTone = computed(() => {
  if (normalizedPlanKey.value === 'PRO') {
    return {
      wrap: 'border-amber-200 bg-amber-50',
      icon: 'text-amber-600',
      label: 'text-amber-600',
      value: 'text-amber-700',
    };
  }

  if (normalizedPlanKey.value === 'PRIME') {
    return {
      wrap: 'border-rose-200 bg-rose-50',
      icon: 'text-rose-600',
      label: 'text-rose-600',
      value: 'text-rose-700',
    };
  }

  return {
    wrap: 'border-sky-200 bg-sky-50',
    icon: 'text-sky-600',
    label: 'text-sky-600',
    value: 'text-sky-700',
  };
});

onMounted(() => {
  loadSeenTopCrmKeys();
  fetchProfile();
  updateTabFromQuery();
});

watch(currentUserId, () => {
  dismissedTopCrmKeys.value = [];
  pinnedTopCrmBannerKey.value = null;
  loadSeenTopCrmKeys();
});

watch(topCrmBanners, (banners) => {
  if (pinnedTopCrmBannerKey.value && banners.some((banner) => banner.key === pinnedTopCrmBannerKey.value)) {
    return;
  }

  const nextBanner = banners[0] ?? null;
  pinnedTopCrmBannerKey.value = nextBanner?.key ?? null;
  if (nextBanner) {
    setTimeout(() => {
      if (pinnedTopCrmBannerKey.value === nextBanner.key) {
        markTopCrmBannerSeen(nextBanner.key);
      }
    }, 0);
  }
}, { immediate: true });

watch(activeTab, (newTab) => {
  if (newTab === 'dashboard') {
    fetchProfile();
  }
});

const menuItems = [
  { id: 'dashboard', label: '프로필 관리', icon: Building2, action: () => (activeTab.value = 'dashboard') },
  {
    id: 'projects',
    label: '프로젝트 관리',
    icon: Briefcase,
    action: () => (activeTab.value = 'projects'),
  },
  {
    id: 'account',
    label: '고용주 계정 관리',
    icon: Settings,
    action: () => (activeTab.value = 'account'),
  },
];

const handleNavigate = (path: string) => {
    if (path === 'dashboard') {
        activeTab.value = 'dashboard';
    } else if (path === 'applications') {
        activeTab.value = 'applicants';
    }
}

const safeWebsiteUrl = computed(() => {
  const url = employerProfile.value.website ?? '';
  return /^https?:\/\//i.test(url) ? url : '#';
});
</script>

<template>
  <div class="fb-page-shell min-h-[calc(100vh-80px)] text-slate-800 font-sans">
    <div class="flex flex-col lg:flex-row h-full overflow-hidden lg:relative">
      <!-- Sidebar -->
      <div
        class="w-full lg:w-72 bg-white/90 backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-slate-200 shadow-[inset_-1px_0_0_rgba(15,23,42,0.04)] flex flex-col lg:fixed lg:top-0 lg:left-0 lg:h-screen"
        v-motion
        :initial="{ x: -300 }"
        :enter="{ x: 0 }"
      >
        <div class="p-6 border-b border-slate-200">
          <h1 class="text-lg font-semibold tracking-[0.12em] text-slate-950">마이페이지</h1>
          <p class="mt-2 text-xs text-slate-500">Employer Console</p>
        </div>

        <nav class="flex-1 p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 lg:flex lg:flex-col lg:space-y-2 overflow-y-auto">
          <button
            v-for="item in menuItems"
            :key="item.id"
            @click="
              () => {
                if (['dashboard', 'profile', 'applicants', 'projects', 'account'].includes(item.id)) {
                  activeTab = item.id;
                } else {
                  item.action();
                }
              }
            "
            class="w-full flex items-center justify-between px-4 py-3 text-sm rounded-2xl transition-all duration-200"
            :class="
              activeTab === item.id
                ? 'text-slate-950 font-semibold bg-sky-50 border border-sky-200 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.12)]'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            "
          >
            <div class="flex items-center gap-3">
              <component :is="item.icon" class="w-4 h-4" />
              <span>{{ item.label }}</span>
            </div>
          </button>
        </nav>

        <div class="p-4 border-t border-slate-200">
          <button
            @click="router.push({ name: 'employer.jobs' })"
            class="w-full py-2 text-sm text-slate-500 hover:text-slate-950 transition-colors"
          >
            내 공고로 돌아가기
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto lg:pl-72">
        <div class="p-6 md:p-8 w-full max-w-6xl mx-auto">
            <!-- Dynamic Content Rendering -->
            <EmployerProfileManagement v-if="activeTab === 'profile'" @back="activeTab = 'dashboard'" />
            <EmployerProjectManagement v-else-if="activeTab === 'projects'" @back="activeTab = 'dashboard'" />
            <EmployerAccountManagement v-else-if="activeTab === 'account'" @back="activeTab = 'dashboard'" />
            
            <!-- Dashboard View -->
            <div v-else-if="activeTab === 'dashboard'" class="space-y-8">
              <div
                  v-if="activeTopCrmBanner"
                  class="relative overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-r from-white via-sky-50 to-cyan-50 p-6 shadow-[0_20px_60px_-35px_rgba(56,189,248,0.16)]"
                  v-motion :initial="{ opacity: 0, y: -18 }" :enter="{ opacity: 1, y: 0 }"
              >
                  <div class="absolute top-0 right-0 z-20 p-4">
                      <button type="button" aria-label="닫기" @click="dismissTopCrmBanner(activeTopCrmBanner.key)" class="text-slate-400 transition-colors hover:text-slate-700">
                          <X class="w-5 h-5" />
                      </button>
                  </div>
                  <div class="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-sky-100 blur-3xl"></div>
                  <div class="absolute -bottom-16 right-12 h-40 w-40 rounded-full bg-cyan-100 blur-3xl"></div>
                  <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div class="flex items-start gap-4">
                          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-white shadow-[0_16px_40px_-28px_rgba(56,189,248,0.22)]">
                              <component :is="activeTopCrmBanner.icon" class="w-5 h-5 text-sky-600" />
                          </div>
                          <div>
                              <div class="flex items-center gap-2 mb-1">
                                  <h3 class="text-lg font-semibold text-slate-950">{{ activeTopCrmBanner.title }}</h3>
                                  <span class="rounded-full border border-sky-100 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                                      {{ activeTopCrmBanner.label }}
                                  </span>
                              </div>
                              <p class="text-sm leading-relaxed text-slate-600">
                                  {{ activeTopCrmBanner.description }}
                              </p>
                          </div>
                      </div>
                      <button
                          type="button"
                          @click="handleCrmAction(activeTopCrmBanner.target)"
                          class="flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-sky-500 px-6 py-3 font-semibold text-white transition-colors shadow-[0_18px_40px_-28px_rgba(56,189,248,0.4)] hover:bg-sky-400 md:w-auto"
                      >
                          <component :is="activeTopCrmBanner.icon" class="w-5 h-5 text-white" />
                          {{ activeTopCrmBanner.cta }}
                      </button>
                  </div>
              </div>

              <!-- 1. Profile Section (Detailed) -->
              <div 
                class="bg-white border border-slate-200 rounded-[28px] p-8 md:p-10 shadow-[0_25px_70px_-55px_rgba(15,23,42,0.12)]"
                v-motion
                :initial="{ opacity: 0, y: -20 }"
                :enter="{ opacity: 1, y: 0 }"
              >
                  <div class="flex flex-col md:flex-row gap-8">
                      <!-- Left: Logo & Core Info -->
                      <div class="w-full md:w-1/3 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-white/10 pb-8 md:pb-0 md:pr-8">
                          <!-- Logo Upload -->
                          <div class="relative group cursor-pointer mb-4">
                              <ProfileIdentityAvatar
                                  :image-url="employerProfile.logoUrl"
                                  :label="employerProfile.companyName"
                                  variant="employer"
                                  shape="square"
                                  size-class="w-32 h-32"
                                  text-class="text-4xl font-bold"
                                  ring-class="border border-sky-100 bg-white"
                              />
                              
                              <!-- Hover Overlay -->
                              <div class="absolute inset-0 bg-sky-900/10 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div class="flex flex-col items-center text-sky-700 text-xs">
                                      <Camera class="w-6 h-6 mb-1" />
                                      <span>변경</span>
                                  </div>
                              </div>
                              <input type="file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" @change="handleLogoUpdate" />
                          </div>

                          <h2 class="text-xl md:text-2xl font-semibold tracking-tight mb-2 text-slate-950">{{ employerProfile.companyName }}</h2>
                          <div
                              class="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                              :class="subscriptionPlanTone.wrap"
                          >
                              <Crown class="w-3.5 h-3.5" :class="subscriptionPlanTone.icon" />
                              <span class="text-[10px] tracking-[0.14em] uppercase" :class="subscriptionPlanTone.label">Plan</span>
                              <span class="text-xs font-semibold" :class="subscriptionPlanTone.value">{{ subscriptionPlanText }}</span>
                          </div>

                           <!-- Core Stats -->
                          <div class="w-full flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500">
                              <span class="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
                                  <span class="text-slate-300">•</span>
                                  진행 프로젝트 <strong class="text-slate-950">{{ employerProfile.activeProjects }}</strong>
                              </span>
                              <span class="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
                                  <span class="text-slate-300">•</span>
                                  총 지원자 <strong class="text-slate-950">{{ employerProfile.totalApplicants }}</strong>
                              </span>
                              <span class="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
                                  <span class="text-slate-300">•</span>
                                  연락된 지원자 <strong class="text-slate-950">{{ employerProfile.contractedFreelancers }}</strong>
                              </span>
                              <span class="px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-xs">
                                  <span class="text-amber-300">•</span>
                                  평균 평점 <strong class="text-amber-700">{{ employerProfile.avgRating }}</strong>
                              </span>
                          </div>
                      </div>

                      <!-- Right: Detailed Info -->
                      <div class="w-full md:w-2/3 space-y-6">
                          <div class="flex items-center justify-between mb-4">
                              <h3 class="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-950">
                                  <Building2 class="w-5 h-5 text-sky-500" />
                                  기업 정보
                              </h3>
                              <button 
                                   @click="activeTab = 'profile'"
                                   class="text-xs text-slate-600 hover:text-slate-950 flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200"
                              >
                                  <Settings class="w-3 h-3" />
                                  정보 수정
                              </button>
                          </div>

                          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div class="space-y-4">
                                  <div class="group">
                                      <label class="text-[11px] text-slate-500 mb-1 block group-hover:text-white/70 transition-colors">업종</label>
                                      <div class="flex items-center gap-2 text-sm text-slate-950">
                                          <Briefcase class="w-4 h-4 text-sky-500" />
                                          {{ employerProfile.industry }}
                                      </div>
                                  </div>
                                  <div class="group">
                                      <label class="text-[11px] text-slate-500 mb-1 block group-hover:text-white/70 transition-colors">규모</label>
                                      <div class="flex items-center gap-2 text-sm text-slate-950">
                                          <Users class="w-4 h-4 text-sky-500" />
                                          {{ companySizeLabel }}
                                      </div>
                                  </div>
                                  <div class="group">
                                      <label class="text-[11px] text-slate-500 mb-1 block group-hover:text-white/70 transition-colors">위치</label>
                                      <div class="flex items-center gap-2 text-sm text-slate-950">
                                          <MapPin class="w-4 h-4 text-sky-500" />
                                          {{ employerProfile.location }}
                                      </div>
                                  </div>
                                  <div class="group">
                                      <label class="text-[11px] text-slate-500 mb-1 block group-hover:text-white/70 transition-colors">웹사이트</label>
                                      <div class="flex items-center gap-2 text-sm truncate">
                                          <Globe class="w-4 h-4 text-sky-500" />
                                        <a v-if="safeWebsiteUrl !== '#'" :href="safeWebsiteUrl" target="_blank" rel="noopener noreferrer" class="hover:underline hover:text-blue-400 truncate">{{ employerProfile.website }}</a>
                                        <span v-else class="text-slate-500">미등록</span>
                                      </div>
                                  </div>
                              </div>
                              <div class="space-y-4">
                                  <div class="group">
                                      <label class="text-[11px] text-slate-500 mb-1 block group-hover:text-white/70 transition-colors">이메일</label>
                                      <div class="flex items-center gap-2 text-sm text-slate-950">
                                          <Mail class="w-4 h-4 text-sky-500" />
                                          {{ employerProfile.email }}
                                      </div>
                                  </div>
                                  <div class="group">
                                      <label class="text-[11px] text-slate-500 mb-1 block group-hover:text-white/70 transition-colors">연락처</label>
                                      <div class="flex items-center gap-2 text-sm text-slate-950">
                                          <Phone class="w-4 h-4 text-sky-500" />
                                          {{ formattedEmployerPhone || employerProfile.phone }}
                                      </div>
                                  </div>
                                  <div class="group">
                                      <label class="text-[11px] text-slate-500 mb-1 block group-hover:text-white/70 transition-colors">기업 소개</label>
                                      <p class="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200 leading-relaxed">
                                        {{ employerProfile.description }}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- 2. Detailed Ratings & Notice Grid -->
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Detailed Ratings -->
                 <div 
                   class="lg:col-span-2 bg-white rounded-[28px] border border-slate-200 p-6 md:p-8 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.12)] flex flex-col justify-center h-full relative"
                   v-motion
                   :initial="{ opacity: 0, y: 20 }"
                   :enter="{ opacity: 1, y: 0, transition: { delay: 0.2 } }"
                 >
                    <div class="flex items-center justify-between mb-6">
                       <h3 class="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-950">
                           <Star class="w-5 h-5 text-amber-500" />
                           프리랜서 평점
                       </h3>
                       <div class="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                           <div class="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                               <span class="text-xs text-slate-500 font-semibold whitespace-nowrap tracking-[0.12em] uppercase">Total</span>
                               <Star class="w-4 h-4 text-amber-500 fill-amber-500" />
                               <span class="text-lg font-semibold text-slate-950">{{ employerProfile.avgRating }}</span>
                               <span class="text-xs text-slate-400">/ 5.0</span>
                           </div>
                       </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-auto">
                       <!-- Rating Items -->
                       <div class="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                           <div class="flex justify-between items-center mb-2">
                               <span class="text-sm text-slate-500">사내 분위기</span>
                               <span class="font-semibold text-slate-950">{{ employerProfile.ratingDetails?.atmosphere }}</span>
                           </div>
                           <div class="h-1.5 bg-sky-100 rounded-full overflow-hidden">
                                <div class="h-full bg-sky-400 rounded-full" :style="{ width: `${(employerProfile.ratingDetails?.atmosphere || 0) * 20}%` }"></div>
                           </div>
                       </div>
                       <div class="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                           <div class="flex justify-between items-center mb-2">
                               <span class="text-sm text-slate-500">급여 만족도</span>
                               <span class="font-semibold text-slate-950">{{ employerProfile.ratingDetails?.requirementsDetail }}</span>
                           </div>
                           <div class="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                                <div class="h-full bg-amber-400 rounded-full" :style="{ width: `${(employerProfile.ratingDetails?.requirementsDetail || 0) * 20}%` }"></div>
                           </div>
                       </div>
                       <div class="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                           <div class="flex justify-between items-center mb-2">
                               <span class="text-sm text-slate-500">일정 준수</span>
                               <span class="font-semibold text-slate-950">{{ employerProfile.ratingDetails?.scheduleAdherence }}</span>
                           </div>
                           <div class="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                                <div class="h-full bg-emerald-400 rounded-full" :style="{ width: `${(employerProfile.ratingDetails?.scheduleAdherence || 0) * 20}%` }"></div>
                           </div>
                       </div>
                    </div>
                    <div
                      v-if="!hasReviewData"
                      class="absolute inset-0 flex items-center justify-center rounded-[28px] bg-white/55 backdrop-blur-[2px] text-center px-6"
                    >
                      <p class="text-sm font-medium text-slate-800">
                        프로젝트를 진행하시면 평점을 받아 확인할 수 있습니다
                      </p>
                    </div>
                </div>

                <!-- Notice / Banners -->
                <div
                    v-if="!hideEmployerNoticeBanner"
                    class="relative flex h-full flex-col justify-center overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-cyan-50 to-white p-6 shadow-[0_16px_40px_rgba(56,189,248,0.12)]"
                >
                    <div class="absolute right-4 top-4 z-20">
                        <button type="button" aria-label="닫기" @click="hideEmployerNoticeBanner = true" class="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700">
                            <X class="h-4 w-4" />
                        </button>
                    </div>
                    <div class="relative z-10 w-full h-full flex flex-col justify-center">
                        <div>
                            <span class="text-[10px] tracking-[0.2em] font-semibold text-sky-600 mb-3 inline-block">NOTICE</span>
                            <h4 class="font-semibold text-slate-950 text-lg mb-2">프리랜서 계약 시 <br/>법률 자문 AI Agent 제공</h4>
                        </div>
                        <p class="text-xs text-slate-600 mb-6">표준계약서 작성부터 리스크 점검까지<br/>법률 자문 AI Agent 가이드를 확인하세요.</p>
                        <button type="button" @click="handleNoticeClick" class="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 mt-auto pointer-events-auto">
                            자세히 보기 <ArrowRight class="w-3 h-3" />
                        </button>
                    </div>
                    <!-- Decorative circles -->
                    <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-sky-100 rounded-full blur-xl pointer-events-none"></div>
                    <div class="absolute top-0 right-0 w-40 h-40 bg-cyan-100 rounded-full blur-2xl pointer-events-none"></div>
                </div>
              </div>

              <!-- 3. Bottom Grid (Project Status) -->
              <div class="grid grid-cols-1 mt-8">
                <!-- Project Status Board (Moved down) -->
                <div>
                    <div 
                      class="bg-white/5 border border-white/10 rounded-[28px] p-8 backdrop-blur-2xl shadow-[0_24px_70px_-55px_rgba(255,255,255,0.25)] relative overflow-hidden h-full"
                      v-motion
                      :initial="{ opacity: 0, scale: 0.95 }"
                      :enter="{ opacity: 1, scale: 1, transition: { delay: 0.1 } }"
                    >
                        <div class="flex items-center justify-between mb-8">
                            <h3 class="text-base md:text-lg font-semibold flex items-center gap-2">
                                <Briefcase class="w-5 h-5 text-white/70" />
                                프로젝트 진행 현황
                            </h3>
                            <button @click="activeTab = 'projects'" class="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                                전체보기 <ArrowRight class="w-3 h-3" />
                            </button>
                        </div>

                        <!-- Status Steps -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                            <!-- Step 1: 접수중 (Posted) -->
                            <div class="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group md:w-[70%] md:mx-auto">
                                <div class="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-all border border-blue-500/20">
                                    <ClipboardList class="w-5 h-5 text-blue-400" />
                                </div>
                                <span class="text-sm text-blue-300 mb-1 font-medium">접수중</span>
                                <span class="text-2xl font-semibold text-white">{{ employerProfile.projectStatusCounts?.posted || 0 }}</span>
                            </div>
                            
                            <!-- Arrow -->
                            <div class="hidden md:flex items-center justify-center absolute left-[25%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 opacity-20">
                                <ArrowRight class="w-full h-full text-white" />
                            </div>

                            <!-- Step 2: 심사중 (Screening) -->
                            <div class="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group md:w-[70%] md:mx-auto">
                                <div class="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-all border border-purple-500/20">
                                    <Users class="w-5 h-5 text-purple-400" />
                                </div>
                                <span class="text-sm text-purple-300 mb-1 font-medium">심사중</span>
                                <span class="text-2xl font-semibold text-white">{{ employerProfile.projectStatusCounts?.screening || 0 }}</span>
                            </div>

                            <!-- Arrow -->
                            <div class="hidden md:flex items-center justify-center absolute left-[50%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 opacity-20">
                                <ArrowRight class="w-full h-full text-white" />
                            </div>

                            <!-- Step 3: 진행중 (In Progress) -->
                            <div class="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group relative md:w-[70%] md:mx-auto">
                                <div class="absolute inset-0 bg-green-500/5 rounded-2xl blur-xl"></div>
                                <div class="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-all border border-green-500/20 relative z-10">
                                    <Briefcase class="w-5 h-5 text-green-400" />
                                </div>
                                <span class="text-sm text-green-300 mb-1 font-medium relative z-10">진행중</span>
                                <span class="text-2xl font-semibold text-white relative z-10">{{ employerProfile.projectStatusCounts?.inProgress || 0 }}</span>
                            </div>

                            <!-- Arrow -->
                            <div class="hidden md:flex items-center justify-center absolute left-[75%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 opacity-20">
                                <ArrowRight class="w-full h-full text-white" />
                            </div>

                            <!-- Step 4: 완료/종결 (Completed) -->
                            <div class="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group md:w-[70%] md:mx-auto">
                                <div class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 group-hover:scale-105 transition-all border border-white/10">
                                    <CheckCircle class="w-5 h-5 text-slate-400 group-hover:text-white" />
                                </div>
                                <span class="text-sm text-slate-400 mb-1">완료/종결</span>
                                <span class="text-2xl font-semibold text-white">{{ employerProfile.projectStatusCounts?.completed || 0 }}</span>
                            </div>
                        </div>
                    </div>

                </div>
              </div>
            </div>
        </div>
      </div>
    </div>

  </div>
</template>

