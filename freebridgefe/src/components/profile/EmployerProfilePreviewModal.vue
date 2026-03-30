<script setup lang="ts">
import ProfileIdentityAvatar from '@/components/profile/ProfileIdentityAvatar.vue';

defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
  profile: {
    companyName: string;
    logoUrl?: string | null;
    industry?: string | null;
    scale?: string | null;
    location?: string | null;
    phone?: string | null;
    website?: string | null;
    description?: string | null;
  };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const fallbackText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : '정보 없음';
};

const formatScale = (value?: string | null) => {
  if (!value) return fallbackText(value);

  const scaleMap: Record<string, string> = {
    S1_9: '1-9명',
    S10_29: '10-29명',
    S30_99: '30-99명',
    S100_299: '100-299명',
    S300_PLUS: '300명 이상',
  };

  return scaleMap[value] ?? value;
};

const normalizeWebsiteUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-lg overflow-hidden rounded-[30px] border border-slate-200 bg-white text-slate-900 shadow-[0_35px_120px_-60px_rgba(15,23,42,0.35)]">
        <div class="relative bg-[radial-gradient(circle_at_top_right,_rgba(0,212,218,0.18),_transparent_42%),linear-gradient(135deg,_rgba(33,175,191,0.96),_rgba(0,212,218,0.92))] px-7 py-8">
          <button
            type="button"
            class="absolute right-5 top-5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs text-white transition hover:bg-white/25"
            @click="emit('close')"
          >
            닫기
          </button>

          <div class="flex items-center gap-4">
            <ProfileIdentityAvatar
              :image-url="profile.logoUrl"
              :label="profile.companyName"
              variant="employer"
              shape="square"
              size-class="h-20 w-20"
              text-class="text-3xl font-bold"
            />
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">Employer Profile</p>
              <h2 class="mt-2 truncate text-2xl font-bold text-white">{{ fallbackText(profile.companyName) }}</h2>
              <p class="mt-2 text-sm text-white/80">{{ fallbackText(profile.description) }}</p>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="px-7 py-10 text-sm text-slate-500">
          프로필 정보를 불러오는 중입니다.
        </div>

        <div v-else class="grid gap-4 px-7 py-7">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">업종</div>
              <div class="mt-2 text-sm font-medium text-slate-900">{{ fallbackText(profile.industry) }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">위치</div>
              <div class="mt-2 text-sm font-medium text-slate-900">{{ fallbackText(profile.location) }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">연락처</div>
              <div class="mt-2 text-sm font-medium text-slate-900">{{ fallbackText(profile.phone) }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">웹사이트</div>
              <div class="mt-2 break-all text-sm font-medium text-slate-900">
                <a
                  v-if="normalizeWebsiteUrl(profile.website)"
                  :href="normalizeWebsiteUrl(profile.website) || undefined"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[#21AFBF] underline-offset-4 hover:text-[#009FA8] hover:underline"
                >
                  {{ profile.website }}
                </a>
                <span v-else>{{ fallbackText(profile.website) }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">기업 규모</div>
            <div class="mt-2 text-sm font-medium text-slate-900">{{ formatScale(profile.scale) }}</div>
          </div>

          <div class="rounded-[26px] border border-sky-200 bg-sky-50 p-5">
            <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">기업 소개</div>
            <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {{ fallbackText(profile.description) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
