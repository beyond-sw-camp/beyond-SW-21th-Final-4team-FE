<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useMotion } from '@vueuse/motion';
import {
  ArrowLeft,
  Building2,
  Crown,
  Mail,
  Phone,
  MapPin,
  Users,
  Save,
  Globe,
  Briefcase,
  Loader2
} from 'lucide-vue-next';

import { getEmployerProfile, updateEmployerProfile, type EmployerProfileData } from '@/api/MyPage/employer';
import { PLAN_LABELS } from '@/constants/planLabels';
import { useAlertStore } from '@/stores/alertStore';
import { formatPhoneNumber } from '@/utils/phone';

defineEmits<{
  (e: 'back'): void;
}>();

const isLoading = ref(false);
const isSaving = ref(false);
const isEditing = ref(true);
const alertStore = useAlertStore();

const profileData = ref<EmployerProfileData>({
  companyName: '',
  industry: '',
  size: '',
  location: '',
  website: '',
  email: '',
  phone: '',
  description: '',
  plan: 'FREE',
});

const companySizeOptions = [
  { value: '', label: '선택' },
  { value: 'S1_4', label: '1-4명' },
  { value: 'S5_9', label: '5-9명' },
  { value: 'S10_29', label: '10-29명' },
  { value: 'S30_99', label: '30-99명' },
  { value: 'S100_299', label: '100-299명' },
  { value: 'S300_999', label: '300-999명' },
  { value: 'S1000_PLUS', label: '1000명 이상' },
];

const fetchProfile = async () => {
  isLoading.value = true;
  try {
    const data = await getEmployerProfile();
    profileData.value = data;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchProfile();
});

const subscriptionPlanText = computed(() => {
  const normalizedPlan = (profileData.value.plan ?? 'FREE').toUpperCase();
  return PLAN_LABELS[normalizedPlan] ?? normalizedPlan;
});

const formattedProfilePhone = computed(() => formatPhoneNumber(profileData.value.phone));

const handleSave = async () => {
  isSaving.value = true;
  try {
    await updateEmployerProfile(profileData.value);
    alertStore.open({ message: '프로필이 성공적으로 저장되었습니다.', type: 'success' });
  } catch (error) {
    console.error('Failed to save profile:', error);
    alertStore.open({ message: '저장에 실패했습니다.', type: 'error' });
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 md:px-10 py-10 text-slate-800">
    <!-- Header -->
    <div class="flex items-center justify-between mb-10">
      <div class="flex items-center gap-4">
        <button
          @click="$emit('back')"
          class="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft class="w-5 h-5 text-sky-600" />
        </button>
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-slate-950">고용주 프로필 관리</h1>
          <p class="text-sm text-slate-500 mt-1">고용주 정보를 정리하고 최신 상태로 유지하세요.</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="handleSave"
          :disabled="isSaving"
          class="px-5 py-2.5 bg-sky-500 text-white hover:bg-sky-400 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_18px_40px_-24px_rgba(56,189,248,0.35)]"
        >
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
          <Save v-else class="w-4 h-4" />
          {{ isSaving ? '저장 중...' : '저장' }}
        </button>
      </div>
    </div>

    <!-- Profile Content -->
    <div
      class="bg-white rounded-[28px] border border-slate-200 p-8 md:p-10 shadow-[0_25px_70px_-55px_rgba(15,23,42,0.12)]"
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0 }"
    >
      <div class="space-y-8">
        <!-- Company Name -->
        <div>
          <label class="text-xs text-slate-500 mb-2 block flex items-center gap-2 uppercase tracking-[0.2em]">
            <Building2 class="w-4 h-4 text-sky-500" />
            고용주명
          </label>
          <input
            type="text"
            v-model="profileData.companyName"
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-950 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Subscription Plan -->
          <div>
            <label class="text-xs text-slate-500 mb-2 block flex items-center gap-2 uppercase tracking-[0.2em]">
              <Crown class="w-4 h-4 text-amber-500" />
              구독 등급
            </label>
            <div class="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
              {{ subscriptionPlanText }}
            </div>
            <p class="text-[11px] text-slate-400 mt-2">등급 변경은 계정 관리 메뉴에서 가능합니다.</p>
          </div>

          <!-- Industry -->
          <div>
            <label class="text-xs text-slate-500 mb-2 block flex items-center gap-2 uppercase tracking-[0.2em]">
              <Briefcase class="w-4 h-4 text-sky-500" />
              업종
            </label>
            <input
              v-if="isEditing"
              type="text"
              v-model="profileData.industry"
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-950 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition"
            />
            <div v-else class="text-white/80">{{ profileData.industry }}</div>
          </div>

          <!-- Company Size -->
          <div>
            <label class="text-xs text-slate-500 mb-2 block flex items-center gap-2 uppercase tracking-[0.2em]">
              <Users class="w-4 h-4 text-sky-500" />
              고용주 규모
            </label>
            <select
              v-model="profileData.size"
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-950 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition appearance-none"
            >
            <option v-for="option in companySizeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        </div>

        <!-- Location -->
        <div>
          <label class="text-xs text-slate-500 mb-2 block flex items-center gap-2 uppercase tracking-[0.2em]">
            <MapPin class="w-4 h-4 text-sky-500" />
            위치
          </label>
          <input
            type="text"
            v-model="profileData.location"
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-950 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Website -->
          <div>
            <label class="text-xs text-slate-500 mb-2 block flex items-center gap-2 uppercase tracking-[0.2em]">
              <Globe class="w-4 h-4 text-sky-500" />
              웹사이트
            </label>
            <input
              type="url"
              v-model="profileData.website"
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-950 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition"
            />
          </div>

        <!-- Email (read-only) -->
        <div>
          <label class="text-xs text-slate-500 mb-2 block flex items-center gap-2 uppercase tracking-[0.2em]">
            <Mail class="w-4 h-4 text-sky-500" />
            이메일
            <span class="text-[11px] text-slate-400">(계정 관리 페이지에서 수정해주세요)</span>
          </label>
          <input
            type="email"
            v-model="profileData.email"
            class="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-500 outline-none"
            disabled
          />
        </div>
      </div>

      <!-- Phone (read-only) -->
      <div>
        <label class="text-xs text-slate-500 mb-2 block flex items-center gap-2 uppercase tracking-[0.2em]">
          <Phone class="w-4 h-4 text-sky-500" />
          연락처
          <span class="text-[11px] text-slate-400">(계정 관리 페이지에서 수정해주세요)</span>
        </label>
        <input
          type="tel"
          :value="formattedProfilePhone"
          class="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-500 outline-none"
          disabled
        />
      </div>

      <!-- Description -->
      <div>
        <label class="text-xs text-slate-500 mb-2 block uppercase tracking-[0.2em]">고용주 소개</label>
        <textarea
          v-model="profileData.description"
            rows="4"
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-950 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition resize-none"
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>
