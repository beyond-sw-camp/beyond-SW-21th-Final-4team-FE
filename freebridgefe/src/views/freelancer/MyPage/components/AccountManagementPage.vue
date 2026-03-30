<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMotion } from '@vueuse/motion';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Lock,
    Bell,
    Eye,
    EyeOff,
    Key,
    Save,
    ShieldCheck,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import {
    getAccountInfo,
    updateAccountInfo,
    changeFreelancerPassword,
    getFreelancerNotificationSettings,
    updateFreelancerNotificationSettings
} from '@/api/MyPage/accountApi';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const authStore = useAuthStore();
const currentUser = authStore.user;

const verificationPassword = ref('');
const verificationError = ref('');
const isVerifying = ref(false);
const isProfileVerified = ref(false);

const accountInfo = ref({
    id: currentUser?.id || 1,
    name: currentUser?.name || '김프론트',
    email: currentUser?.email || 'frontend@example.com',
    phone: '010-1234-5678',
});

const passwordData = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
});

const showPasswords = ref({
    current: false,
    new: false,
    confirm: false,
});

const notifications = ref({
    requestNotificationEnabled: false,
    contractNotificationEnabled: false,
});

const notificationsHydrated = ref(false);
const isSavingNotifications = ref(false);
let notificationsSaveChain: Promise<void> = Promise.resolve();
let notificationsSaveCount = 0;

const isSavingInfo = ref(false);
const isChangingPassword = ref(false);

onMounted(async () => {
    try {
        const info = await getAccountInfo();
        accountInfo.value = { ...accountInfo.value, ...info };
        const notificationSettings = await getFreelancerNotificationSettings();
        notifications.value = {
            requestNotificationEnabled: !!notificationSettings.requestNotificationEnabled,
            contractNotificationEnabled: !!notificationSettings.contractNotificationEnabled,
        };
    } catch (error) {
        console.error('Failed to fetch account info:', error);
    } finally {
        notificationsHydrated.value = true;
    }
});

const toggleNotification = (key: keyof typeof notifications.value) => {
    if (!notificationsHydrated.value) return;
    const snapshot = { ...notifications.value };
    const nextValue = !notifications.value[key];
    notifications.value = { ...notifications.value, [key]: nextValue };

    notificationsSaveChain = notificationsSaveChain.then(async () => {
        notificationsSaveCount += 1;
        isSavingNotifications.value = true;
        try {
            await updateFreelancerNotificationSettings(
                notifications.value.requestNotificationEnabled,
                notifications.value.contractNotificationEnabled
            );
        } catch (error) {
            console.error('Failed to update notification settings:', error);
            notifications.value = snapshot;
            alert('알림 설정 저장에 실패했습니다.');
        } finally {
            notificationsSaveCount -= 1;
            isSavingNotifications.value = notificationsSaveCount > 0;
        }
    });
};

const handleVerifyIdentity = async () => {
    verificationError.value = '';
    const currentPassword = authStore.user?.password;

    if (!verificationPassword.value.trim()) {
        verificationError.value = '비밀번호를 입력해 주세요.';
        return;
    }

    // For demo purposes, if no password in store (guest), allow any non-empty password or match specific mock
    if (!currentPassword) {
         // Fallback for guest mode or testing without full auth
         isVerifying.value = true;
         await new Promise((resolve) => setTimeout(resolve, 600));
         isProfileVerified.value = true;
         isVerifying.value = false;
         return;
    }

    try {
        isVerifying.value = true;
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (verificationPassword.value !== currentPassword) {
            verificationError.value = '비밀번호가 올바르지 않습니다.';
            isProfileVerified.value = false;
            return;
        }

        isProfileVerified.value = true;
        verificationPassword.value = '';
    } finally {
        isVerifying.value = false;
    }
};

const handleSaveAccountInfo = async () => {
    if (!isProfileVerified.value) {
        alert('비밀번호 확인 후 내 정보를 수정할 수 있습니다.');
        return;
    }
    isSavingInfo.value = true;
    try {
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay
        const success = await updateAccountInfo(accountInfo.value);
        if (success) {
            alert('계정 정보가 저장되었습니다.');
            if (currentUser) {
                currentUser.name = accountInfo.value.name;
            }
        } else {
            alert('저장에 실패했습니다.');
        }
    } catch (e) {
        alert('오류가 발생했습니다.');
    } finally {
        isSavingInfo.value = false;
    }
};

const handleChangePassword = async () => {
    if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
        alert('새 비밀번호가 일치하지 않습니다.');
        return;
    }
    if (passwordData.value.newPassword.length < 8) {
        alert('비밀번호는 최소 8자 이상이어야 합니다.');
        return;
    }
    
    isChangingPassword.value = true;
    try {
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay
        const success = await changeFreelancerPassword({
            current: passwordData.value.currentPassword,
            new: passwordData.value.newPassword,
            confirm: passwordData.value.confirmPassword
        });
        
        if (success) {
            alert('비밀번호가 변경되었습니다.');
            passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
        } else {
            alert('비밀번호 변경에 실패했습니다.');
        }
    } catch (e) {
        alert('오류가 발생했습니다.');
    } finally {
        isChangingPassword.value = false;
    }
};

const resetProfileVerification = () => {
    isProfileVerified.value = false;
    verificationPassword.value = '';
    verificationError.value = '';
};
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 md:px-8 py-10 font-sans text-white">
    <!-- Header -->
    <div class="mb-10 flex items-center gap-4">
        <button
            @click="$emit('back')"
            aria-label="뒤로가기"
            title="뒤로가기"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 backdrop-blur-xl transition-all hover:bg-white/10"
        >
            <ArrowLeft class="w-6 h-6 text-white/80" />
        </button>
        <div>
            <h1 class="text-3xl font-bold text-white tracking-tight">내 계정 관리</h1>
            <p class="text-base text-slate-400 mt-1">계정 정보 및 보안 설정을 안전하게 관리하세요.</p>
        </div>
    </div>

    <!-- Identity Verification (Shown when not verified) -->
    <div v-if="!isProfileVerified" class="max-w-md mx-auto mt-20" v-motion :initial="{ opacity: 0, scale: 0.95 }" :enter="{ opacity: 1, scale: 1 }">
        <div class="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-8 text-center backdrop-blur-2xl">
            <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-blue-300/15 bg-blue-300/10 shadow-[0_12px_36px_-24px_rgba(96,165,250,0.9)]">
                <ShieldCheck class="w-10 h-10 text-blue-400" />
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">본인 확인</h2>
            <p class="text-slate-400 mb-8 text-sm leading-relaxed">
                개인정보 보호를 위해 비밀번호를 입력해 주세요.<br>
                인증 후 정보를 수정할 수 있습니다.
            </p>

            <div class="space-y-4 text-left">
                <div class="space-y-2">
                    <label class="text-xs text-slate-500 font-bold ml-1">비밀번호</label>
                    <div class="relative">
                        <Key class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                        <input
                            type="password"
                            v-model="verificationPassword"
                            class="w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-sm text-white outline-none transition-all backdrop-blur-xl focus:border-blue-300/40 focus:bg-white/10"
                            placeholder="비밀번호 입력"
                            @keyup.enter="handleVerifyIdentity"
                        />
                    </div>
                </div>
                
                <p v-if="verificationError" class="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle class="w-3.5 h-3.5" />
                    {{ verificationError }}
                </p>

                <button
                    @click="handleVerifyIdentity"
                    :disabled="isVerifying"
                    class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-300/90 py-3.5 font-bold text-slate-950 shadow-[0_16px_40px_-20px_rgba(125,211,252,0.75)] transition-all hover:bg-sky-200 disabled:opacity-60"
                >
                    <Loader2 v-if="isVerifying" class="w-4 h-4 animate-spin" />
                    <span>{{ isVerifying ? '확인 중...' : '인증하기' }}</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Account Management Content (Shown when verified) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
        
        <!-- Left Column: Basic Info -->
        <div class="lg:col-span-7 space-y-8">
            <!-- Basic Info Card -->
            <section class="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(15,23,42,0.16))] p-8 backdrop-blur-2xl">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <div class="p-2 bg-blue-500/10 rounded-lg">
                            <User class="w-5 h-5 text-blue-400" />
                        </div>
                        기본 정보
                    </h2>
                     <button
                        @click="handleSaveAccountInfo"
                        :disabled="isSavingInfo"
                        class="inline-flex items-center gap-2 rounded-2xl bg-sky-300/90 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_16px_40px_-20px_rgba(125,211,252,0.75)] transition-all hover:bg-sky-200"
                    >
                        <Loader2 v-if="isSavingInfo" class="w-3.5 h-3.5 animate-spin" />
                        <Save v-else class="w-3.5 h-3.5" />
                        저장
                    </button>
                </div>

                <div class="space-y-5">
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">이름</label>
                        <div class="relative">
                            <User class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                type="text"
                                v-model="accountInfo.name"
                                class="w-full rounded-2xl border border-white/10 bg-slate-950/30 pl-11 pr-4 py-3 text-sm text-white outline-none transition-all backdrop-blur-xl focus:border-blue-300/40 focus:bg-white/10"
                            />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">이메일</label>
                        <div class="relative">
                            <Mail class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                type="email"
                                v-model="accountInfo.email"
                                class="w-full rounded-2xl border border-white/10 bg-slate-950/30 pl-11 pr-4 py-3 text-sm text-white outline-none transition-all backdrop-blur-xl focus:border-blue-300/40 focus:bg-white/10"
                            />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">휴대폰 번호</label>
                        <div class="relative">
                             <Phone class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                type="tel"
                                v-model="accountInfo.phone"
                                class="w-full rounded-2xl border border-white/10 bg-slate-950/30 pl-11 pr-4 py-3 text-sm text-white outline-none transition-all backdrop-blur-xl focus:border-blue-300/40 focus:bg-white/10"
                            />
                        </div>
                    </div>
                </div>
            </section>

             <!-- Notification Settings -->
            <section class="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(15,23,42,0.16))] p-8 backdrop-blur-2xl">
                <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <div class="p-2 bg-yellow-500/10 rounded-lg">
                        <Bell class="w-5 h-5 text-yellow-400" />
                    </div>
                    알림 설정
                </h2>

                <div class="space-y-4">
                     <div
                        v-for="(item, key) in {
                            requestNotificationEnabled: { label: '프로젝트 제안 알림', desc: '새로운 프로젝트 제안이 도착하면 알려드립니다.' },
                            contractNotificationEnabled: { label: '계약 상태 알림', desc: '계약 상태가 변경되면 알림을 받을 수 있습니다.' }
                        }"
                        :key="key"
                        class="flex items-center justify-between rounded-[24px] bg-slate-950/25 p-4 backdrop-blur-xl transition-all hover:bg-slate-900/35"
                    >
                        <div class="flex-1 pr-4">
                            <h3 class="font-bold text-white text-sm mb-1">{{ item.label }}</h3>
                            <p class="text-xs text-slate-400">{{ item.desc }}</p>
                        </div>
                        <button
                            @click="toggleNotification(key as keyof typeof notifications)"
                            :disabled="!notificationsHydrated || isSavingNotifications"
                            class="relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                            :class="notifications[key as keyof typeof notifications] ? 'bg-sky-300/90 shadow-[0_8px_24px_-14px_rgba(125,211,252,1)]' : 'bg-slate-600/80'"
                        >
                            <div
                                class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md"
                                :class="notifications[key as keyof typeof notifications] ? 'translate-x-5' : ''"
                            />
                        </button>
                    </div>
                </div>
            </section>
        </div>

        <!-- Right Column: Password & Security -->
        <div class="lg:col-span-5 space-y-8">
            <!-- Password Change -->
            <section class="flex h-full flex-col rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(15,23,42,0.16))] p-8 backdrop-blur-2xl">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <div class="p-2 bg-purple-500/10 rounded-lg">
                            <Lock class="w-5 h-5 text-purple-400" />
                        </div>
                        비밀번호 변경
                    </h2>
                </div>

                <div class="space-y-5 flex-1">
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">현재 비밀번호</label>
                        <div class="relative">
                            <Key class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                :type="showPasswords.current ? 'text' : 'password'"
                                v-model="passwordData.currentPassword"
                                class="w-full rounded-2xl border border-white/10 bg-slate-950/30 pl-11 pr-10 py-3 text-sm text-white outline-none transition-all backdrop-blur-xl focus:border-purple-300/40 focus:bg-white/10"
                                placeholder="현재 비밀번호 입력"
                            />
                            <button
                                @click="showPasswords.current = !showPasswords.current"
                                class="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                            >
                                <component :is="showPasswords.current ? EyeOff : Eye" class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div class="w-full h-px bg-white/5 my-2"></div>

                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">새 비밀번호</label>
                        <div class="relative">
                            <Lock class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                :type="showPasswords.new ? 'text' : 'password'"
                                v-model="passwordData.newPassword"
                                class="w-full rounded-2xl border border-white/10 bg-slate-950/30 pl-11 pr-10 py-3 text-sm text-white outline-none transition-all backdrop-blur-xl focus:border-purple-300/40 focus:bg-white/10"
                                placeholder="새 비밀번호 (8자 이상)"
                            />
                            <button
                                @click="showPasswords.new = !showPasswords.new"
                                class="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                            >
                                <component :is="showPasswords.new ? EyeOff : Eye" class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">새 비밀번호 확인</label>
                        <div class="relative">
                            <CheckCircle2 class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                :type="showPasswords.confirm ? 'text' : 'password'"
                                v-model="passwordData.confirmPassword"
                                class="w-full rounded-2xl border border-white/10 bg-slate-950/30 pl-11 pr-10 py-3 text-sm text-white outline-none transition-all backdrop-blur-xl focus:border-purple-300/40 focus:bg-white/10"
                                placeholder="새 비밀번호 다시 입력"
                            />
                            <button
                                @click="showPasswords.confirm = !showPasswords.confirm"
                                class="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                            >
                                <component :is="showPasswords.confirm ? EyeOff : Eye" class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div class="pt-6 mt-auto">
                        <button
                            @click="handleChangePassword"
                            :disabled="isChangingPassword"
                            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-300/90 py-4 font-bold text-slate-950 shadow-[0_16px_40px_-20px_rgba(216,180,254,0.75)] transition-all hover:bg-violet-200"
                        >
                            <Loader2 v-if="isChangingPassword" class="w-4 h-4 animate-spin" />
                            {{ isChangingPassword ? '변경 중...' : '비밀번호 변경하기' }}
                        </button>
                    </div>
                </div>
            </section>

             <button
                @click="resetProfileVerification"
                class="w-full rounded-2xl bg-white/5 py-3 text-sm font-bold text-slate-300 transition-all backdrop-blur-xl hover:bg-white/10 hover:text-white"
            >
                인증 상태 초기화 (로그아웃 효과)
            </button>
        </div>
    </div>
  </div>
</template>
