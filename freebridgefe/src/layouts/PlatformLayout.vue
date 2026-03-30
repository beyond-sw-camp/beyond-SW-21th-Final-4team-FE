<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import DockedChatContainer from '@/components/chat/docked/DockedChatContainer.vue';
import {
  Briefcase,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  TrendingUp,
  User,
  FileCheck,
  Wallet,
  UserCircle,
  MessageSquareQuote,
  HelpCircle,
  Receipt,
  MessageSquare,
  CreditCard,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const chatStore = useChatStore();
const isMobileMenuOpen = ref(false);

const currentUser = computed(() => authStore.user);
const isEmployer = computed(() => currentUser.value?.role === 'EMPLOYER');

// Navigation Items
const employerNavItems = [
  { id: 'employer.jobs', path: '/employer/jobs', label: '내 공고', icon: Briefcase },
  { id: 'chat', path: '/chat', label: '메시지', icon: MessageSquare },
  { id: 'employer.review', path: '/employer/review', label: '내 리뷰', icon:MessageSquareQuote},
  { id: 'employer.applications', path: '/employer/applications', label: '지원/제안', icon: FileText },
  { id: 'employer.freelancers', path: '/employer/freelancers', label: '프리랜서 찾기', icon: Users },
  { id: 'employer.recommended', path: '/employer/recommended', label: '추천 프리랜서', icon: TrendingUp },
  { id: 'employer.contracts', path: '/employer/contracts', label: '계약서', icon: FileCheck },
  { id: 'employer.payments', path: '/employer/payments', label: '결제', icon: CreditCard },
  { id: 'employer.settlements', path: '/employer/settlements', label: '정산', icon: Receipt },
  { id: 'employer.mypage', path: '/employer/mypage', label: '마이페이지', icon: UserCircle },
];

const freelancerNavItems = [
  { id: 'freelancer.browse', path: '/freelancer/jobs', label: '공고', icon: Briefcase },
  { id: 'chat', path: '/chat', label: '메시지', icon: MessageSquare },
  { id: 'freelancer.applications', path: '/freelancer/applications', label: '내 지원/제안', icon: FileText },
  { id: 'freelancer.contracts', path: '/freelancer/contracts', label: '계약서', icon: FileCheck },
  { id: 'freelancer.settlement', path: '/freelancer/settlement', label: '정산', icon: Wallet },
  { id: 'freelancer.review', path: '/freelancer/review', label: '내 리뷰', icon: MessageSquareQuote },
  { id: 'freelancer.mypage', path: '/freelancer/mypage', label: '마이페이지', icon: UserCircle },
];

const navItems = computed(() => isEmployer.value ? employerNavItems : freelancerNavItems);
const isChatRoute = computed(() => route.path.startsWith('/chat'));
const CHAT_ROOM_POLL_INTERVAL_MS = 10000;

const handleLogout = async () => {
  try {
    await authStore.logout();
  } catch (error) {
    console.error('Failed to complete logout:', error);
  } finally {
    await router.push('/login');
  }
};

const handleOpenGuide = () => {
  router.push('/guide');
  isMobileMenuOpen.value = false;
};

const navigate = (item: any) => {
  router.push(item.path);
  isMobileMenuOpen.value = false;
};

const isActive = (path: string) => route.path.startsWith(path);

const handleAlertClick = (roomId: string, alertId: string) => {
  chatStore.dismissAlert(alertId);
  if (!route.path.startsWith('/chat')) {
    router.push('/chat');
  }
  chatStore.selectRoom(roomId);
};

const dismissAlert = (alertId: string) => {
  chatStore.dismissAlert(alertId);
};

let refreshChatRoomsPromise: Promise<void> | null = null;
let chatRoomPollingTimer: ReturnType<typeof setInterval> | null = null;

const refreshChatRooms = () => {
  if (!authStore.isAuthenticated) {
    return Promise.resolve();
  }

  if (refreshChatRoomsPromise) {
    return refreshChatRoomsPromise;
  }

  refreshChatRoomsPromise = (async () => {
    try {
      await chatStore.fetchRooms();
    } catch (e) {
      console.error('Failed to refresh chat rooms:', e);
    } finally {
      refreshChatRoomsPromise = null;
    }
  })();

  return refreshChatRoomsPromise;
};

const stopChatRoomPolling = () => {
  if (chatRoomPollingTimer !== null) {
    clearInterval(chatRoomPollingTimer);
    chatRoomPollingTimer = null;
  }
};

const startChatRoomPolling = () => {
  if (!authStore.isAuthenticated || !isChatRoute.value || chatRoomPollingTimer !== null) {
    return;
  }

  chatRoomPollingTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    void refreshChatRooms();
  }, CHAT_ROOM_POLL_INTERVAL_MS);
};

const handleWindowFocus = async () => {
  await refreshChatRooms();
};

const handleVisibilityChange = async () => {
  if (document.visibilityState === 'visible') {
    if (isChatRoute.value) {
      startChatRoomPolling();
    }
    await refreshChatRooms();
    return;
  }

  stopChatRoomPolling();
};

onMounted(async () => {
  window.addEventListener('focus', handleWindowFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  if (authStore.isAuthenticated) {
    try {
      await chatStore.connectWebSocket();
      await refreshChatRooms();
      startChatRoomPolling();
    } catch (e) {
      console.error('Failed to initialize chat:', e);
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  stopChatRoomPolling();
  chatStore.disconnectWebSocket();
});

watch(
  () => route.path,
  (newPath, oldPath) => {
    const wasChatRoute = oldPath?.startsWith('/chat');
    const isNowChatRoute = newPath.startsWith('/chat');

    chatStore.setMainChatVisible(isNowChatRoute);

    if (isNowChatRoute && authStore.isAuthenticated) {
      startChatRoomPolling();
      refreshChatRooms();
    }

    if (wasChatRoute && !isNowChatRoute) {
      stopChatRoomPolling();
      chatStore.resetDockedUIState();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="currentUser" class="fb-page-shell font-sans">
    <!-- Desktop Navigation -->
    <nav class="fb-nav-shell hidden lg:block sticky top-0 z-50 h-20">
      <div class="w-full px-4 xl:px-8 h-full flex items-center justify-between gap-4">
        <div 
          @click="router.push(isEmployer ? '/employer/jobs' : '/freelancer/jobs')"
          class="shrink-0 cursor-pointer bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] bg-clip-text text-2xl font-bold text-transparent"
          v-motion="{
            initial: { opacity: 0, x: -20 },
            enter: { opacity: 1, x: 0 }
          }"
        >
          FreeBridge
        </div>

        <div class="flex-1 flex items-center justify-center min-w-0 mx-4 md:mx-6">
          <div class="flex items-center gap-2 py-2 px-1 w-auto justify-center">
            <button
              v-for="(item, index) in navItems"
              :key="item.id"
            @click="navigate(item)"
              class="shrink-0 relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all whitespace-nowrap"
              :class="isActive(item.path) ? 'text-[#1c95a2]' : 'text-slate-500 hover:text-slate-900 hover:bg-[#f5fbfc]'"
              :data-tour="item.id"
              v-motion="{
                initial: { opacity: 0, y: -10 },
                enter: { opacity: 1, y: 0, transition: { delay: index * 100 } },
                hover: { scale: 1.05 },
                tap: { scale: 0.95 }
              }"
            >
              <div
                v-if="isActive(item.path)"
                class="absolute inset-0 rounded-full border border-[#cdeff2] bg-gradient-to-r from-[#e7f9fb] to-white shadow-sm"
                v-motion
                layoutId="activeTab"
              />
              <component :is="item.icon" class="w-5 h-5 relative z-10" />
              <span class="relative z-10 font-medium">{{ item.label }}</span>
            </button>
          </div>
        </div>

        <div class="shrink-0 flex items-center gap-3">
          <div class="hidden rounded-full border border-[#d8eff1] bg-white/90 px-4 py-2.5 shadow-sm xl:block">
            <div class="text-xs text-slate-400">
              {{ isEmployer ? '고용주' : '프리랜서' }}
            </div>
            <div class="font-medium text-slate-900">{{ currentUser.name }}</div>
          </div>
          <button
            @click="handleOpenGuide"
            class="flex items-center gap-2 whitespace-nowrap rounded-full border border-[#d8eff1] bg-white/90 px-4 py-2.5 transition-all hover:bg-[#f5fbfc]"
            v-motion="{
              hover: { scale: 1.05 },
              tap: { scale: 0.95 }
            }"
          >
            <HelpCircle class="h-5 w-5 text-[#21AFBF]" />
            <span class="font-medium text-slate-700 hidden xl:inline">이용 가이드</span>
            <span class="font-medium text-slate-700 xl:hidden">가이드</span>
          </button>
          <button
            @click="handleLogout"
            aria-label="로그아웃"
            class="rounded-full border border-transparent p-2.5 transition-colors hover:border-[#d8eff1] hover:bg-[#f5fbfc]"
            title="로그아웃"
            v-motion="{
              hover: { scale: 1.1 },
              tap: { scale: 0.9 }
            }"
          >
            <LogOut class="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Navigation -->
    <nav class="fb-nav-shell lg:hidden sticky top-0 z-50 h-16">
      <div class="px-4 h-full flex items-center justify-between">
        <div class="text-xl font-bold bg-gradient-to-r from-sky-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
          FreeBridge
        </div>
        <div class="flex items-center gap-2">
          <div class="text-sm px-3 py-1.5 bg-white rounded-full border border-sky-100 text-slate-700">
            {{ currentUser.name }}
          </div>
          <button
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            :aria-label="isMobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'"
            :aria-expanded="isMobileMenuOpen"
            class="rounded-full p-2 transition-colors hover:bg-[#f5fbfc]"
          >
            <X v-if="isMobileMenuOpen" class="w-6 h-6 text-slate-700" />
            <Menu v-else class="w-6 h-6 text-slate-700" />
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <div v-if="isMobileMenuOpen" 
        class="absolute left-0 right-0 top-16 overflow-hidden border-b border-[#d8eff1] bg-white/95 shadow-xl backdrop-blur-2xl"
        v-motion="{
          initial: { opacity: 0, height: 0 },
          enter: { opacity: 1, height: 'auto' }
        }"
      >
        <div class="p-4 space-y-2">
          <button
            v-for="(item, index) in navItems"
            :key="item.id"
            @click="navigate(item)"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
            :class="isActive(item.path) ? 'bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] text-white' : 'text-slate-600 hover:bg-[#f5fbfc] hover:text-slate-900'"
            v-motion="{
              initial: { opacity: 0, x: -20 },
              enter: { opacity: 1, x: 0, transition: { delay: index * 50 } }
            }"
          >
            <component :is="item.icon" class="w-5 h-5" />
            <span class="font-medium">{{ item.label }}</span>
          </button>
          <button
            @click="handleOpenGuide"
            class="w-full flex items-center gap-3 rounded-2xl border border-[#d8eff1] px-4 py-3 text-[#1c95a2] transition-all hover:bg-[#f5fbfc]"
          >
            <HelpCircle class="w-5 h-5" />
            <span class="font-medium">이용 가이드</span>
          </button>
          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-50 text-rose-500 transition-all border border-rose-100"
          >
            <LogOut class="w-5 h-5" />
            <span class="font-medium">로그아웃</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="text-slate-900">
      <router-view v-slot="{ Component }">
        <transition 
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-4"
        >
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </router-view>
    </main>
    <div v-if="chatStore.chatAlerts.length > 0" class="fixed top-24 right-4 z-[70] w-[320px] space-y-2">
      <div
        v-for="alert in chatStore.chatAlerts"
        :key="alert.id"
        class="w-full rounded-xl border border-[#d8eff1] bg-white/95 p-3 shadow-lg transition-all hover:border-[#bfecef]"
      >
        <div class="flex items-start gap-3">
          <button
            class="flex-1 min-w-0 text-left"
            @click="handleAlertClick(alert.roomId, alert.id)"
          >
            <div class="flex items-start gap-3">
              <div class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#e7f9fb]">
                <MessageSquare class="h-4 w-4 text-[#21AFBF]" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-slate-400 mb-1">새 메시지</p>
                <p class="text-sm font-semibold text-slate-900 truncate">{{ alert.senderName }}</p>
                <p class="text-xs text-slate-500 truncate mt-1">{{ alert.content }}</p>
              </div>
            </div>
          </button>
          <button
            class="p-1 text-slate-400 hover:text-slate-900"
            @click="dismissAlert(alert.id)"
            aria-label="알림 닫기"
            title="닫기"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Global Docked Chat -->
    <DockedChatContainer v-if="!isChatRoute" class="hidden lg:flex" />
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>


