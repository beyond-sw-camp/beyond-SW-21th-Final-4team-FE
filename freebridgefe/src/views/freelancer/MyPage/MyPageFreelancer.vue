<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMotion } from '@vueuse/motion';
import {
  User,
  Settings,
  FileText,
  Briefcase,
  MessageSquare,
  ChevronRight,
  CheckCircle,
  Award,
  CreditCard,
  Plus,
  Users,
  Upload,
  Download,
  Eye,
    AlertTriangle,
    X,
    Edit3,
    TrendingUp,
    Trash2,
    ArrowRight,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useAlertStore } from '@/stores/alertStore';
import { useContractStore } from '@/stores/contractStore';
import {
    getFreelancerProfile,
    uploadFreelancerPortfolio,
    getFreelancerPortfolioDownloadUrl,
    deleteFreelancerPortfolio,
    downloadFreelancerPortfolioTemplate,
    type FreelancerProfileDashboard
} from '@/api/MyPage/freelancerApi';
import {
    getFreelancerReviewSummary,
    getFreelancerAiPositivityIndex,
    getFreelancerStrengthWeakness,
} from '@/api/MyPage/evaluationApi';
import ProfileIdentityAvatar from '@/components/profile/ProfileIdentityAvatar.vue';
import { getFreelancerProjectStats } from '@/api/MyPage/projectApi';
import ResumeManagementPage from './components/ResumeManagementPage.vue';
import EvaluationListPage from './components/EvaluationListPage.vue';
import AccountManagementPage from './components/AccountManagementPage.vue';
import GradeCheckPage from './components/GradeCheckPage.vue';
import ProfileEditPage from './components/ProfileEditPage.vue';
import ProjectManagementPage from './components/ProjectManagementPage.vue';

const router = useRouter();
const authStore = useAuthStore();
const alertStore = useAlertStore();
const contractStore = useContractStore();
const currentUser = computed(() => authStore.user);
const currentAccessToken = computed(() => authStore.token ?? localStorage.getItem('access_token'));
const currentUserId = computed(() => authStore.user?.id ?? null);

const activeTab = ref('dashboard');
const isConditionOpen = ref(false);
const isPortfolioOpen = ref(false);

const showOnboardingBanner = ref(false);
const showApplyEncouragementBanner = ref(false);
const dismissedFreelancerCrmKeys = ref<string[]>([]);
const seenFreelancerCrmKeys = ref<string[]>([]);
const pinnedFreelancerCrmBannerKey = ref<string | null>(null);
const hideBurnoutAlert = ref(false);
const hideChurnAlert = ref(false);

const toggleRestMode = () => {
    alertStore.open({
        title: '휴식 권장',
        message: '일정이 몰려 있어요. 다음 프로젝트를 잡기 전에 잠시 쉬어가는 것을 권장합니다.',
        type: 'info',
    });
    hideBurnoutAlert.value = true;
};

const viewRecommendedProjects = async () => {
    hideChurnAlert.value = true;
    await router.push({ name: 'freelancer.jobs' });
};

const moveToProfileEdit = () => {
    showOnboardingBanner.value = false;
    activeTab.value = 'edit';
};

const moveToJobBoard = async () => {
    showApplyEncouragementBanner.value = false;
    await router.push({ name: 'freelancer.jobs' });
};

const getFreelancerCrmStorageKey = () => {
    const userId = currentUserId.value;
    return userId ? `mypage-freelancer-crm:${userId}` : null;
};

const loadSeenFreelancerCrmKeys = () => {
    const storageKey = getFreelancerCrmStorageKey();
    if (!storageKey) {
        seenFreelancerCrmKeys.value = [];
        return;
    }

    try {
        const saved = sessionStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
            seenFreelancerCrmKeys.value = parsed;
        } else {
            console.warn('Invalid freelancer crm session state. Resetting to an empty array.');
            seenFreelancerCrmKeys.value = [];
        }
    } catch (error) {
        console.error('Failed to load freelancer crm session state:', error);
        seenFreelancerCrmKeys.value = [];
    }
};

const markFreelancerCrmSeen = (key: string) => {
    if (seenFreelancerCrmKeys.value.includes(key)) {
        return;
    }

    const nextSeenKeys = [...seenFreelancerCrmKeys.value, key];
    seenFreelancerCrmKeys.value = nextSeenKeys;

    const storageKey = getFreelancerCrmStorageKey();
    if (!storageKey) {
        return;
    }

    try {
        sessionStorage.setItem(storageKey, JSON.stringify(nextSeenKeys));
    } catch (error) {
        console.error('Failed to persist freelancer crm session state:', error);
    }
};

const handleLegalNoticeClick = async () => {
    try {
        await contractStore.fetchContracts();
        const latestContract = [...contractStore.contractsWithDetails]
            .sort((left, right) => Number(right.contractId ?? right.id) - Number(left.contractId ?? left.id))[0];

        await router.push({
            name: 'freelancer.contracts',
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
        console.error('Failed to open freelancer legal ai guide:', error);
        alertStore.open({
            title: 'NOTICE',
            message: '법률 자문 AI 화면으로 이동하지 못했습니다.',
            type: 'error',
        });
    }
};

// 초기값 로딩 상태를 고려한 기본값 설정
const profile = ref<FreelancerProfileDashboard>({
    name: '',
    grade: '',
    avatar: null,
    job: '',
    introduction: '',
    careerYears: 0,
    salary: 0,
    workConditions: {
        type: '',
        startDate: '',
        workStyle: '',
        location: ''
    },
    skills: [],
    expertise: {
        programming: 0,
        framework: 0,
        problemSolving: 0
    },
    collaboration: {
        communication: 0,
        scheduleAdherence: 0,
        dispute: 0
    },
    averageRating: 0,
    statPending: 0,
    statContact: 0,
    statChat: 0,
    statContract: 0,
    statInteresting: 0,
    statCompleted: 0,
    portfolio: {
        fileUrl: null,
        fileName: '',
        lastUpdated: ''
    }
});

const handleProfileUpdate = (updatedData: FreelancerProfileDashboard) => {
    profile.value = updatedData;
    activeTab.value = 'dashboard';
};

onMounted(async () => {
    loadSeenFreelancerCrmKeys();
    if (currentUser.value?.id) {
        try {
            const data = await getFreelancerProfile(currentUser.value.id);
            profile.value = data;
            showOnboardingBanner.value = data.crmAlerts?.isOnboardingNeeded ?? false;
            showApplyEncouragementBanner.value = data.crmAlerts?.isApplyEncouraged ?? false;

            // authStore 이름/스킬 우선 반영
            if (currentUser.value.name) profile.value.name = currentUser.value.name;
            if (currentUser.value.skills && currentUser.value.skills.length > 0) {
                profile.value.skills = currentUser.value.skills;
            }

            try {
                const stats = await getFreelancerProjectStats();
                profile.value.statPending = stats.appliedProjects ?? 0;
                profile.value.statInteresting = stats.inProgressProjects ?? 0;
                profile.value.statCompleted = stats.completedProjects ?? 0;
            } catch (statsError) {
                console.error('Failed to load project stats:', statsError);
            }

            try {
                const [summaryResult, positivityResult, strengthWeaknessResult] = await Promise.allSettled([
                    getFreelancerReviewSummary(),
                    getFreelancerAiPositivityIndex(),
                    getFreelancerStrengthWeakness(),
                ]);

                if (summaryResult.status === 'fulfilled') {
                    const summary = summaryResult.value;
                    profile.value.reviewSummary = summary;
                    profile.value.topPercentile = summary.topPercentile ?? 0;
                }

                if (
                    positivityResult.status === 'fulfilled' ||
                    strengthWeaknessResult.status === 'fulfilled'
                ) {
                    profile.value.aiSummary = {
                        positivityScore:
                            positivityResult.status === 'fulfilled'
                                ? positivityResult.value.positivityScore ?? 0
                                : 0,
                        grade:
                            positivityResult.status === 'fulfilled'
                                ? positivityResult.value.grade ?? ''
                                : '',
                        strengths:
                            strengthWeaknessResult.status === 'fulfilled'
                                ? strengthWeaknessResult.value.strengths ?? []
                                : [],
                        weaknesses:
                            strengthWeaknessResult.status === 'fulfilled'
                                ? strengthWeaknessResult.value.weaknesses ?? []
                                : [],
                    };
                }
            } catch (reviewError) {
                console.error('Failed to load review summary/ai data:', reviewError);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    } else {
        // 로그인 정보가 없을 때의 폴백 처리
        const data = await getFreelancerProfile('guest');
        profile.value = data;
        showOnboardingBanner.value = false;
        showApplyEncouragementBanner.value = false;
    }
});

type FreelancerCrmBanner = {
    key: string;
    label: string;
    title: string;
    description: string;
    cta: string;
    icon: unknown;
    wrapClass: string;
    glowClass: string;
    action: () => void | Promise<void>;
};

const dismissFreelancerCrmBanner = (key: string) => {
    markFreelancerCrmSeen(key);
    if (!dismissedFreelancerCrmKeys.value.includes(key)) {
        dismissedFreelancerCrmKeys.value = [...dismissedFreelancerCrmKeys.value, key];
    }
    pinnedFreelancerCrmBannerKey.value = null;
    if (key === 'onboarding') showOnboardingBanner.value = false;
    if (key === 'apply') showApplyEncouragementBanner.value = false;
};

const handleFreelancerCrmAction = async (banner: FreelancerCrmBanner) => {
    markFreelancerCrmSeen(banner.key);
    await banner.action();
};

const hasActiveProjectSignal = computed(() => (profile.value.statInteresting ?? 0) > 0);
const shouldShowBurnoutBanner = computed(() => {
    return Boolean(profile.value.crmAlerts?.isBurnoutWarning) || (profile.value.statInteresting ?? 0) >= 3;
});

const menuItems = [
    { id: 'dashboard', label: '프로필 관리', icon: User, action: () => activeTab.value = 'dashboard' },
    { id: 'projects', label: '프로젝트', icon: Briefcase, action: () => activeTab.value = 'projects' },
    // { id: 'contracts', label: '정산 프로젝트', icon: CreditCard, action: () => router.push({ name: 'freelancer.contracts' }) }, // Removed as per request to consolidate
    { id: 'resume', label: '이력서 관리', icon: FileText, action: () => activeTab.value = 'resume' },
    { id: 'evaluation', label: '고용주 평가', icon: Award, action: () => activeTab.value = 'evaluation' },
    { id: 'gradecheck', label: '회원 등급 조회', icon: CheckCircle, action: () => activeTab.value = 'gradecheck' },
    { id: 'account', label: '내 계정 관리', icon: Settings, action: () => activeTab.value = 'account' },
];

const getGradeColor = (grade: string) => {
    const normalized = (grade ?? '').trim().toUpperCase();
    switch (normalized) {
        case 'BEGINNER':
        case 'JUNIOR':
        case '주니어':
            return 'text-emerald-700 border-emerald-200 bg-emerald-50';
        case 'INTERMEDIATE':
        case 'MIDDLE':
        case '미들':
            return 'text-sky-700 border-sky-200 bg-sky-50';
        case 'ADVANCED':
        case 'SENIOR':
        case '시니어':
            return 'text-violet-700 border-violet-200 bg-violet-50';
        case 'EXPERT':
        case 'MASTER':
        case '마스터':
            return 'text-amber-700 border-amber-200 bg-amber-50';
        default:
            return 'text-slate-700 border-slate-200 bg-slate-50';
    }
};

const fileInput = ref<HTMLInputElement | null>(null);
const isPortfolioUploading = ref(false);

const handlePortfolioUpload = () => {
    fileInput.value?.click();
};

const onFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
        try {
            isPortfolioUploading.value = true;
            const uploaded = await uploadFreelancerPortfolio(file);
            profile.value.portfolio = {
                fileUrl: uploaded.fileUrl,
                fileName: uploaded.fileName || file.name,
                lastUpdated: uploaded.lastUpdated || new Date().toLocaleDateString(),
            };
            alert('포트폴리오가 업로드되었습니다.');
        } catch (error) {
            console.error('Failed to upload portfolio:', error);
            alert('포트폴리오 업로드에 실패했습니다.');
        } finally {
            isPortfolioUploading.value = false;
            target.value = '';
        }
    }
};

const resolvePortfolioAvailability = () => {
    const fileUrl = profile.value.portfolio.fileUrl;
    return fileUrl && typeof fileUrl === 'string' && fileUrl.trim() !== '' && fileUrl !== '#';
};

const viewPortfolio = async () => {
    if (!resolvePortfolioAvailability()) {
        alert('확인할 포트폴리오가 없습니다.');
        return;
    }

    const newWindow = window.open('', '_blank', 'noopener');
    try {
        const downloadUrl = await getFreelancerPortfolioDownloadUrl();
        if (!newWindow) {
            throw new Error('Failed to open portfolio window');
        }
        newWindow.location.href = downloadUrl;
    } catch (error) {
        if (newWindow) {
            newWindow.close();
        }
        console.error('Failed to open portfolio:', error);
        alert('포트폴리오를 열지 못했습니다.');
    }
};

const downloadPortfolio = async () => {
    if (!resolvePortfolioAvailability()) {
        alert('다운로드할 포트폴리오가 없습니다.');
        return;
    }

    try {
        const downloadUrl = await getFreelancerPortfolioDownloadUrl();
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Portfolio download failed: ${response.status}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = profile.value.portfolio.fileName || 'portfolio.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error('Failed to download portfolio:', error);
        alert('포트폴리오 다운로드에 실패했습니다.');
    }
};

const deletePortfolio = async () => {
    if (!resolvePortfolioAvailability()) {
        alertStore.open({
            title: '포트폴리오',
            message: '삭제할 포트폴리오가 없습니다.',
            type: 'warning',
        });
        return;
    }

    alertStore.open({
        title: '포트폴리오 삭제',
        message: '업로드한 포트폴리오를 삭제하시겠습니까?',
        type: 'warning',
        confirmText: '삭제',
        cancelText: '취소',
        showCancel: true,
        onConfirm: async () => {
            try {
                await deleteFreelancerPortfolio();
                profile.value.portfolio = {
                    fileUrl: null,
                    fileName: '',
                    lastUpdated: '',
                };
                alertStore.open({
                    title: '포트폴리오',
                    message: '포트폴리오를 삭제했습니다.',
                    type: 'success',
                });
            } catch (error) {
                console.error('Failed to delete portfolio:', error);
                alertStore.open({
                    title: '포트폴리오',
                    message: '포트폴리오 삭제에 실패했습니다.',
                    type: 'error',
                });
            }
        },
    });
};

const downloadPortfolioTemplate = async () => {
    try {
        const { blob, fileName } = await downloadFreelancerPortfolioTemplate();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to download portfolio template:', error);
        alert('포트폴리오 양식 다운로드에 실패했습니다.');
    }
};
const allFreelancerCrmBanners = computed<FreelancerCrmBanner[]>(() => {
    const alerts = profile.value.crmAlerts;
    if (!alerts) return [];

    const banners: FreelancerCrmBanner[] = [];

    if (shouldShowBurnoutBanner.value && !hideBurnoutAlert.value) {
        banners.push({
            key: 'burnout',
            label: 'Pace Check',
            title: '조금 쉬어가도 괜찮아요',
            description: '현재 진행 중인 계약이 많은 편입니다. 다음 일을 잡기 전에 페이스를 한 번 조절해보세요.',
            cta: '쉬어가기',
            icon: AlertTriangle,
            wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(251,146,60,0.08),rgba(255,255,255,0.05))]',
            glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.18),transparent_34%)]',
            action: toggleRestMode,
        });
    }

    if (showOnboardingBanner.value) {
        banners.push({
            key: 'onboarding',
            label: 'Onboarding',
            title: '프로필을 조금만 더 채워보세요',
            description: '기본 정보와 소개, 포트폴리오가 채워지면 고용주에게 더 잘 노출될 수 있어요.',
            cta: '프로필 채우기',
            icon: Edit3,
            wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(16,185,129,0.10),rgba(255,255,255,0.05))]',
            glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_35%)]',
            action: moveToProfileEdit,
        });
    }

    if (showApplyEncouragementBanner.value && !hasActiveProjectSignal.value) {
        banners.push({
            key: 'apply',
            label: 'Next Match',
            title: '다음 프로젝트를 시작해볼까요?',
            description: '프로필 준비는 충분합니다. 지금 열려 있는 공고를 확인하고 새로운 계약 기회를 잡아보세요.',
            cta: '공고 보러 가기',
            icon: Briefcase,
            wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(96,165,250,0.10),rgba(255,255,255,0.05))]',
            glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.18),transparent_35%)]',
            action: moveToJobBoard,
        });
    }

    if (alerts.isPortfolioImproveNeeded) {
        banners.push({
            key: 'portfolio-improve',
            label: 'Portfolio Guide',
            title: '포트폴리오 보강이 필요해요',
            description: '지원은 꾸준하지만 계약 전환이 낮아요. 포트폴리오와 자기소개를 조금 더 구체적으로 보완해보세요.',
            cta: '프로필 보완하기',
            icon: Edit3,
            wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.13),rgba(167,139,250,0.08),rgba(255,255,255,0.05))]',
            glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(167,139,250,0.18),transparent_35%)]',
            action: () => { activeTab.value = 'edit'; },
        });
    }

    if (alerts.isRateBumpEligible) {
        banners.push({
            key: 'rate-bump',
            label: 'Rate Upgrade',
            title: '단가를 조정해볼 시점이에요',
            description: '완료한 계약과 리뷰 평점이 충분히 쌓였습니다. 현재 성과에 맞게 희망 단가를 한 단계 높여보세요.',
            cta: '단가 수정하기',
            icon: TrendingUp,
            wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(16,185,129,0.08),rgba(255,255,255,0.05))]',
            glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.16),transparent_34%)]',
            action: () => { activeTab.value = 'edit'; },
        });
    }

    if (alerts.isChurnWarning && !hasActiveProjectSignal.value && !hideChurnAlert.value) {
        banners.push({
            key: 'churn',
            label: 'Come Back',
            title: '다시 매칭을 시작할 시점이에요',
            description: '이전에 계약 경험은 있었지만 지금은 새 활동이 멈춰 있어요. 공고 페이지에서 다음 프로젝트를 확인해보세요.',
            cta: '공고 보러 가기',
            icon: Briefcase,
            wrapClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(96,165,250,0.08),rgba(255,255,255,0.05))]',
            glowClass: 'bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.16),transparent_34%)]',
            action: viewRecommendedProjects,
        });
    }

    return banners;
});

const freelancerCrmBanners = computed(() => {
    return allFreelancerCrmBanners.value
        .filter((banner) => !seenFreelancerCrmKeys.value.includes(banner.key))
        .filter((banner) => !dismissedFreelancerCrmKeys.value.includes(banner.key));
});

const activeFreelancerCrmBanner = computed(() => {
    if (pinnedFreelancerCrmBannerKey.value) {
        return allFreelancerCrmBanners.value.find((banner) => banner.key === pinnedFreelancerCrmBannerKey.value) ?? null;
    }

    return freelancerCrmBanners.value[0] ?? null;
});

watch(currentUserId, () => {
    dismissedFreelancerCrmKeys.value = [];
    pinnedFreelancerCrmBannerKey.value = null;
    hideBurnoutAlert.value = false;
    hideChurnAlert.value = false;
    loadSeenFreelancerCrmKeys();
});

watch(freelancerCrmBanners, (banners) => {
    if (pinnedFreelancerCrmBannerKey.value && banners.some((banner) => banner.key === pinnedFreelancerCrmBannerKey.value)) {
        return;
    }

    const nextBanner = banners[0] ?? null;
    pinnedFreelancerCrmBannerKey.value = nextBanner?.key ?? null;
}, { immediate: true });
</script>

<template>
  <div class="fb-page-shell min-h-[calc(100vh-80px)] text-slate-800 font-sans">
    <div class="flex flex-col lg:flex-row h-full overflow-hidden lg:relative">
    <!-- Sidebar -->
    <aside class="hidden lg:flex fixed top-20 left-0 z-30 h-[calc(100vh-80px)] w-[17.5rem] flex-col bg-white/90 backdrop-blur-2xl border-r border-slate-200 shadow-[inset_-1px_0_0_rgba(15,23,42,0.04)]">
        <div class="px-6 pt-8 pb-6 border-b border-white/5">
            <h1 class="text-xl font-semibold tracking-tight text-slate-950 cursor-pointer" @click="activeTab = 'dashboard'">마이페이지</h1>
            <p class="mt-2 text-xs text-slate-500 leading-relaxed">프로필과 프로젝트, 계정 정보를 한 곳에서 관리합니다.</p>
        </div>

        <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <button
                v-for="item in menuItems"
                :key="item.id"
                @click="item.action ? item.action() : null"
                class="w-full flex items-center justify-between px-4 py-3 text-sm transition-all duration-200 rounded-2xl border"
                :class="activeTab === item.id ? 'text-slate-950 font-semibold bg-sky-50 border-sky-200 shadow-[0_12px_30px_-22px_rgba(14,165,233,0.18)]' : 'text-slate-500 border-transparent hover:text-slate-950 hover:bg-slate-50 hover:border-slate-200'"
            >
                <div class="flex items-center gap-3">
                    <component :is="item.icon" class="w-4 h-4" />
                    <span>{{ item.label }}</span>
                </div>
                <div v-if="activeTab === item.id" class="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.35)]" />
            </button>
        </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto lg:pl-[17.5rem]">
        <div v-if="activeTab === 'dashboard'" class="p-8 max-w-7xl mx-auto space-y-8" v-motion :initial="{ opacity: 0 }" :enter="{ opacity: 1 }">
            <div v-if="activeFreelancerCrmBanner" class="mb-2">
                <div class="relative w-full overflow-hidden rounded-[32px] border border-sky-100 bg-[linear-gradient(135deg,#ffffff,#eef8ff,#f5fffd)] px-7 py-6 shadow-[0_24px_60px_-42px_rgba(14,165,233,0.22)]">
                    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(94,234,212,0.12),transparent_32%)]"></div>
                    <div class="absolute right-4 top-4 z-20">
                        <button type="button" aria-label="닫기" @click="dismissFreelancerCrmBanner(activeFreelancerCrmBanner.key)" class="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700">
                            <X class="h-4 w-4" />
                        </button>
                    </div>
                    <div class="relative z-10 flex flex-col gap-5 pr-12 md:flex-row md:items-center md:justify-between md:pr-0">
                        <div class="flex items-start gap-4">
                            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-white shadow-[0_16px_40px_-28px_rgba(56,189,248,0.22)]">
                                <component :is="activeFreelancerCrmBanner.icon" class="h-5 w-5 text-sky-600" />
                            </div>
                            <div>
                                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-500">{{ activeFreelancerCrmBanner.label }}</p>
                                <h4 class="mt-2 text-lg font-semibold text-slate-950">{{ activeFreelancerCrmBanner.title }}</h4>
                                <p class="mt-2 text-sm leading-relaxed text-slate-600">{{ activeFreelancerCrmBanner.description }}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0 md:pt-0 pt-1">
                            <button @click="handleFreelancerCrmAction(activeFreelancerCrmBanner)" class="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400">{{ activeFreelancerCrmBanner.cta }}</button>
                        </div>
                    </div>
                </div>
            </div>

             <!-- Greeting Header -->
             <div class="pointer-events-none relative mb-2 flex select-none items-center justify-between overflow-hidden rounded-[32px] border border-sky-100 bg-[linear-gradient(135deg,#ffffff,#eef8ff,#f5fffd)] px-7 py-6 shadow-[0_24px_60px_-42px_rgba(14,165,233,0.22)] transition-none">
                <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(94,234,212,0.12),transparent_32%)]"></div>
                <div class="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent"></div>
                <div>
                    <p class="text-xs text-sky-500 mb-1 tracking-widest uppercase">Welcome</p>
                    <h2 class="text-2xl font-bold text-slate-950">
                        {{ profile.name }}님, 오늘도 프리브릿지가 응원합니다.
                    </h2>
                    <p class="text-sm text-slate-500 mt-1">프로필을 최신 상태로 유지하면 추천 정확도가 올라갑니다.</p>
                </div>
            </div>

            <!-- Profile Summary Card -->
            <div class="relative mt-8">
                <div class="rounded-3xl border border-slate-200 bg-white/95 overflow-visible relative shadow-[0_26px_70px_-52px_rgba(15,23,42,0.16)]">
                    <div class="flex flex-col md:flex-row gap-8 p-8">
                        <div class="w-full md:w-[34%] flex flex-col items-center text-center">
                            <ProfileIdentityAvatar
                                :image-url="profile.avatar"
                                :label="profile.name"
                                variant="freelancer"
                                shape="circle"
                                size-class="w-28 h-28"
                                text-class="text-4xl font-bold"
                                ring-class="border-2 border-sky-100"
                            />

                            <h2 class="text-xl md:text-2xl font-semibold tracking-tight mt-5 mb-2 text-slate-950">{{ profile.name }}</h2>
                            <div
                                class="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                                :class="getGradeColor(profile.grade)"
                            >
                                <Award class="w-3.5 h-3.5" />
                                <span class="text-[10px] tracking-[0.14em] uppercase">Grade</span>
                                <span class="text-xs font-semibold">{{ profile.grade }}</span>
                            </div>

                            <div class="w-full flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500">
                                <span class="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
                                    <span class="text-slate-300">•</span>
                                    직무 <strong class="text-slate-950">{{ profile.job }}</strong>
                                </span>
                                <span class="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
                                    <span class="text-slate-300">•</span>
                                    선호 작업 <strong class="text-slate-950">{{ profile.workConditions.type }}</strong>
                                </span>
                                <span class="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
                                    <span class="text-slate-300">•</span>
                                    총 경력 <strong class="text-slate-950">{{ profile.careerYears }}년</strong>
                                </span>
                            </div>
                        </div>

                        <div class="w-full md:w-[66%] space-y-6">
                            <div class="flex items-start justify-between mb-4">
                                <h3 class="text-base md:text-lg font-semibold flex items-center gap-2 text-slate-950">
                                    <User class="w-5 h-5 text-sky-500" />
                                    기본 정보
                                </h3>
                                <div class="flex items-center gap-2">
                                    <button 
                                        @click="activeTab = 'edit'"
                                        class="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                                    >
                                        <Edit3 class="w-3.5 h-3.5" />
                                        프로필 수정하기
                                    </button>
                                    <button
                                        @click="activeTab = 'account'"
                                        class="text-xs text-slate-600 hover:text-slate-950 flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200"
                                    >
                                        <Settings class="w-3 h-3" />
                                        내 계정 관리
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-4">
                                    <div class="group">
                                        <label class="text-[11px] text-slate-500 mb-1 block">프리랜서 유형</label>
                                        <div class="flex items-center gap-2 text-sm text-slate-950">
                                            <Briefcase class="w-4 h-4 text-sky-500" />
                                            {{ profile.workConditions.type }}
                                        </div>
                                    </div>
                                    <div class="group">
                                        <label class="text-[11px] text-slate-500 mb-1 block">업무 시작 가능일</label>
                                        <div class="flex items-center gap-2 text-sm text-slate-950">
                                            <CheckCircle class="w-4 h-4 text-sky-500" />
                                            {{ profile.workConditions.startDate }}
                                        </div>
                                    </div>
                                    <div class="group">
                                        <label class="text-[11px] text-slate-500 mb-1 block">근무 형태</label>
                                        <div class="flex items-center gap-2 text-sm text-slate-950">
                                            <CreditCard class="w-4 h-4 text-sky-500" />
                                            {{ profile.workConditions.workStyle }}
                                        </div>
                                    </div>
                                    <div class="group">
                                        <label class="text-[11px] text-slate-500 mb-1 block">근무 지역</label>
                                        <div class="flex items-center gap-2 text-sm text-slate-950">
                                            <Settings class="w-4 h-4 text-sky-500" />
                                            {{ profile.workConditions.location }}
                                        </div>
                                    </div>
                                </div>
                                <div class="space-y-4">
                                    <div class="group">
                                        <label class="text-[11px] text-slate-500 mb-1 block">희망 월급</label>
                                        <div class="flex items-center gap-2 text-sm text-white">
                                            <Award class="w-4 h-4 text-slate-400" />
                                            {{ profile.salary.toLocaleString() }}원/월
                                        </div>
                                    </div>
                                    <div class="group">
                                        <label class="text-[11px] text-slate-500 mb-1 block">자기 소개</label>
                                        <p class="text-xs text-slate-300 bg-white/5 p-3 rounded-2xl border border-white/10 leading-relaxed">
                                            {{ profile.introduction }}
                                        </p>
                                    </div>
                                    <div class="group">
                                        <label class="text-[11px] text-slate-500 mb-2 block">기술 스택</label>
                                        <div class="flex flex-wrap gap-2">
                                            <span v-for="skill in profile.skills.slice(0, 10)" :key="skill" class="text-xs px-2.5 py-1 bg-white/5 text-slate-200 rounded-full border border-white/10">
                                                {{ skill }}
                                            </span>
                                            <span v-if="profile.skills.length > 10" class="text-xs px-2.5 py-1 bg-white/5 text-slate-400 rounded-full border border-white/10">
                                                +{{ profile.skills.length - 10 }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- My Project Status Section -->
            <div class="mb-8 grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-6 items-stretch">
                <div>
                    <div class="flex items-center gap-3 mb-6">
                        <h3 class="text-base md:text-lg font-semibold text-slate-950 flex items-center gap-2">
                            <Briefcase class="w-5 h-5 text-sky-500" />
                            나의 프로젝트 현황
                        </h3>
                        <button
                            @click="router.push({ name: 'freelancer.applications' })"
                            class="text-xs text-slate-600 hover:text-slate-950 flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-slate-200"
                        >
                            전체보기 <ChevronRight class="w-4 h-4" />
                        </button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <!-- Applied / Proposed Projects -->
                        <div
                            @click="activeTab = 'projects'"
                            @keydown.enter="activeTab = 'projects'"
                            @keydown.space.prevent="activeTab = 'projects'"
                            role="button"
                            tabindex="0"
                            class="bg-sky-50 rounded-3xl p-4 h-[206px] border border-sky-100 shadow-[0_20px_60px_-40px_rgba(14,165,233,0.24)] relative overflow-hidden group cursor-pointer hover:bg-sky-100 transition-all flex flex-col justify-between"
                        >
                            <div class="relative z-10">
                                <div class="flex items-start justify-between mb-5">
                                    <h4 class="text-sm font-semibold text-sky-700 flex items-center gap-2">
                                        <Briefcase class="w-4 h-4" />
                                        지원/제안 프로젝트
                                    </h4>
                                    <ChevronRight class="text-sky-500 w-5 h-5" />
                                </div>
                                <div class="mt-auto">
                                    <div class="text-5xl leading-none font-bold text-slate-950">{{ profile.statPending }}<span class="ml-0.5 text-xl font-semibold text-sky-700">건</span></div>
                                </div>
                            </div>
                        </div>

                        <!-- Active Projects -->
                        <div
                            @click="activeTab = 'projects'"
                            @keydown.enter="activeTab = 'projects'"
                            @keydown.space.prevent="activeTab = 'projects'"
                            role="button"
                            tabindex="0"
                            class="bg-rose-50 rounded-3xl p-4 h-[206px] border border-rose-100 shadow-[0_20px_60px_-40px_rgba(244,63,94,0.2)] relative overflow-hidden group hover:bg-rose-100 transition-all cursor-pointer flex flex-col justify-between"
                        >
                            <div class="relative z-10">
                                <div class="flex items-start justify-between mb-5">
                                    <span class="text-rose-700 font-semibold text-sm">진행중인 프로젝트</span>
                                    <ChevronRight class="text-rose-500 w-5 h-5" />
                                </div>
                                <div class="mt-auto text-5xl leading-none font-bold text-slate-950">{{ profile.statInteresting }}<span class="ml-0.5 text-xl font-semibold text-rose-700">건</span></div>
                            </div>
                        </div>

                        <!-- Completed Projects -->
                        <div
                            @click="activeTab = 'projects'"
                            @keydown.enter="activeTab = 'projects'"
                            @keydown.space.prevent="activeTab = 'projects'"
                            role="button"
                            tabindex="0"
                            class="bg-emerald-50 rounded-3xl p-4 h-[206px] border border-emerald-100 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.2)] relative overflow-hidden group hover:bg-emerald-100 transition-all cursor-pointer flex flex-col justify-between"
                        >
                            <div class="relative z-10">
                                <div class="flex items-start justify-between mb-5">
                                    <span class="text-emerald-700 font-semibold text-sm flex items-center gap-2">
                                        <CheckCircle class="w-4 h-4" />
                                        프로젝트 종료
                                    </span>
                                    <ChevronRight class="text-emerald-500 w-5 h-5" />
                                </div>
                                <div class="mt-auto text-5xl leading-none font-bold text-slate-950">{{ profile.statCompleted }}<span class="ml-0.5 text-xl font-semibold text-emerald-700">건</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-gradient-to-br from-sky-50 via-cyan-50 to-white border border-sky-100 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-center h-[206px] shadow-[0_16px_40px_rgba(14,165,233,0.12)] xl:mt-[3.25rem]">
                    <div class="relative z-10 w-full h-full flex flex-col justify-between">
                        <div class="inline-flex items-center gap-2 mb-2">
                            <span class="text-[10px] tracking-[0.2em] font-semibold text-sky-600 inline-block">NOTICE</span>
                            <span class="px-2 py-1 rounded-full bg-white border border-sky-100 text-[10px] font-semibold text-sky-700">LEGAL AI AGENT</span>
                        </div>
                        <div>
                            <h4 class="font-semibold text-slate-950 text-base leading-snug mb-2">계약 전 확인이 필요할 때<br/>법률 자문 AI Agent 제공</h4>
                        </div>
                        <p class="text-[11px] leading-relaxed text-slate-600">계약 조항 점검과 리스크 확인을<br/>AI Agent로 빠르게 도와드립니다.</p>
                        <button
                            type="button"
                            @click="handleLegalNoticeClick"
                            class="inline-flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-white px-3.5 py-2 text-[11px] font-semibold text-sky-700 transition-colors hover:bg-sky-50"
                        >
                            자세히 보기 <ArrowRight class="w-3 h-3" />
                        </button>
                    </div>
                    <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-sky-100 rounded-full blur-xl pointer-events-none"></div>
                    <div class="absolute top-0 right-0 w-40 h-40 bg-cyan-100 rounded-full blur-2xl pointer-events-none"></div>
                </div>
            </div>

            <!-- Grids -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Evaluation -->
                <div class="bg-[#1e293b]/50 rounded-2xl p-6 border border-white/5 backdrop-blur-sm h-full flex flex-col">
                    <div class="flex justify-between items-center mb-6">
                        <h4 class="font-bold text-base text-white">고용주 평가</h4>
                        <button @click="activeTab = 'evaluation'" class="text-slate-500 hover:text-white transition-colors"><Plus class="w-4 h-4" /></button>
                    </div>
                    <div class="flex gap-4 mb-4 flex-1">
                        <div class="w-24 h-24 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5 flex-col gap-1">
                            <div class="text-xs text-slate-500">평균 평점</div>
                            <div class="text-2xl font-bold text-white">{{ profile.averageRating.toFixed(1) }}</div>
                            <!-- Dynamic Star Rating -->
                            <div class="relative w-16 h-3 bg-slate-700 rounded-sm overflow-hidden">
                                <div class="absolute top-0 left-0 h-full bg-yellow-400" :style="{ width: `${(profile.averageRating / 5) * 100}%` }"></div>
                                <div class="absolute top-0 left-0 w-full h-full flex justify-between px-[1px]">
                                    <div class="w-[1px] h-full bg-slate-900/30"></div>
                                    <div class="w-[1px] h-full bg-slate-900/30"></div>
                                    <div class="w-[1px] h-full bg-slate-900/30"></div>
                                    <div class="w-[1px] h-full bg-slate-900/30"></div>
                                </div>
                            </div>
                        </div>
                        <div class="flex-1 space-y-3 text-xs justify-center flex flex-col pl-2">
                            <!-- Expertize -->
                            <div class="space-y-1.5">
                                <div class="text-[10px] text-slate-500 font-bold">전문성</div>
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-400 w-20">프로그래밍</span>
                                    <div class="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                                        <div class="bg-purple-500 h-full" :style="{ width: `${(profile.expertise.programming / 5) * 100}%` }"></div>
                                    </div>
                                    <span class="text-white font-bold w-6 text-right">{{ profile.expertise.programming.toFixed(1) }}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-400 w-20">프레임워크</span>
                                    <div class="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                                        <div class="bg-purple-500 h-full" :style="{ width: `${(profile.expertise.framework / 5) * 100}%` }"></div>
                                    </div>
                                    <span class="text-white font-bold w-6 text-right">{{ profile.expertise.framework.toFixed(1) }}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-400 w-20">문제해결</span>
                                    <div class="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                                        <div class="bg-purple-500 h-full" :style="{ width: `${(profile.expertise.problemSolving / 5) * 100}%` }"></div>
                                    </div>
                                    <span class="text-white font-bold w-6 text-right">{{ profile.expertise.problemSolving.toFixed(1) }}</span>
                                </div>
                            </div>

                            <!-- Collaboration -->
                            <div class="space-y-1.5">
                                <div class="text-[10px] text-slate-500 font-bold mt-1">협업 역량</div>
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-400 w-20">의사소통</span>
                                    <div class="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                                        <div class="bg-blue-500 h-full" :style="{ width: `${(profile.collaboration.communication / 5) * 100}%` }"></div>
                                    </div>
                                    <span class="text-white font-bold w-6 text-right">{{ profile.collaboration.communication.toFixed(1) }}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-400 w-20">일정준수</span>
                                    <div class="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                                        <div class="bg-blue-500 h-full" :style="{ width: `${(profile.collaboration.scheduleAdherence / 5) * 100}%` }"></div>
                                    </div>
                                    <span class="text-white font-bold w-6 text-right">{{ profile.collaboration.scheduleAdherence.toFixed(1) }}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-400 w-20">분쟁관리</span>
                                    <div class="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                                        <div class="bg-blue-500 h-full" :style="{ width: `${(profile.collaboration.dispute / 5) * 100}%` }"></div>
                                    </div>
                                    <span class="text-white font-bold w-6 text-right">{{ profile.collaboration.dispute.toFixed(1) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Resume/Portfolio -->
                <div class="bg-[#1e293b]/50 rounded-2xl p-6 border border-white/5 backdrop-blur-sm h-full flex flex-col">
                    <div class="flex justify-between items-center mb-6">
                        <h4 class="font-bold text-base text-white">포트폴리오</h4>
                        <input 
                            type="file" 
                            ref="fileInput" 
                            class="hidden" 
                            accept=".pdf"
                            @change="onFileChange"
                        />
                        <div class="flex items-center gap-2">
                            <button
                                @click="downloadPortfolioTemplate"
                                class="text-slate-500 hover:text-white transition-colors"
                                title="양식 다운로드"
                            >
                                <FileText class="w-4 h-4" />
                            </button>
                            <button
                                @click="viewPortfolio"
                                class="text-slate-500 hover:text-white transition-colors"
                                title="보기"
                            >
                                <Eye class="w-4 h-4" />
                            </button>
                            <button
                                @click="downloadPortfolio"
                                class="text-slate-500 hover:text-white transition-colors"
                                title="다운로드"
                            >
                                <Download class="w-4 h-4" />
                            </button>
                            <button
                                @click="handlePortfolioUpload"
                                class="text-slate-500 hover:text-white transition-colors"
                                :disabled="isPortfolioUploading"
                                title="업로드"
                            >
                                <Upload class="w-4 h-4" />
                            </button>
                            <button
                                @click="deletePortfolio"
                                class="text-slate-500 hover:text-white transition-colors"
                                title="삭제"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div class="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-4">
                        <div class="w-full bg-white/5 border border-dashed border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer">
                            <div class="flex items-center gap-3" @click="viewPortfolio">
                                <div class="w-10 h-10 bg-red-400/20 rounded-lg flex items-center justify-center text-red-400">
                                    <FileText class="w-5 h-5" />
                                </div>
                                <div class="text-left">
                                    <div class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{{ profile.portfolio?.fileName || '포트폴리오 없음' }}</div>
                                    <div class="text-xs text-slate-500">{{ profile.portfolio?.lastUpdated }} 업데이트</div>
                                </div>
                            </div>
                            <button @click.stop="downloadPortfolio" class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:bg-blue-500 hover:text-white transition-all">
                                <Download class="w-4 h-4" />
                            </button>
                        </div>
                        
                        <p class="text-xs text-slate-500">
                            최신 업데이트된 포트폴리오를 다운로드해 확인하세요.
                        </p>
                        <button
                            @click="downloadPortfolioTemplate"
                            class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                        >
                            <Download class="w-3.5 h-3.5" />
                            <span>포트폴리오 양식 다운로드</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <ProfileEditPage
            v-else-if="activeTab === 'edit'"
            :profile="profile"
            @back="activeTab = 'dashboard'"
            @update="handleProfileUpdate"
        />

        <ProjectManagementPage
            v-else-if="activeTab === 'projects'"
            @back="activeTab = 'dashboard'"
        />

        <ResumeManagementPage
            v-else-if="activeTab === 'resume'"
            @back="activeTab = 'dashboard'"
        />

        <EvaluationListPage
            v-else-if="activeTab === 'evaluation'"
            :profile="profile"
            @back="activeTab = 'dashboard'"
        />

        <GradeCheckPage
            v-else-if="activeTab === 'gradecheck'"
            :existingGrade="profile.grade"
            @back="activeTab = 'dashboard'"
        />

        <AccountManagementPage
            v-else-if="activeTab === 'account'"
            @back="activeTab = 'dashboard'"
        />

    </main>
    </div>
  </div>
</template>








