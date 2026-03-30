<script setup lang="ts">
import { ref } from 'vue';
import ProfileIdentityAvatar from '@/components/profile/ProfileIdentityAvatar.vue';

type EducationItem = {
  schoolType?: string | null;
  schoolName?: string | null;
  major?: string | null;
  status?: string | null;
  entranceDate?: string | null;
  graduationDate?: string | null;
};

type CareerItem = {
  companyName?: string | null;
  department?: string | null;
  position?: string | null;
  jobType?: string | null;
  employmentType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

type CertificationItem = {
  name?: string | null;
  issuer?: string | null;
  acquisitionDate?: string | null;
};

defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
  profile: {
    name: string;
    avatarUrl?: string | null;
    job?: string | null;
    careerYears?: number | null;
    wage?: number | null;
    grade?: string | null;
    introduction?: string | null;
    skills?: string[];
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    educations?: EducationItem[];
    careers?: CareerItem[];
    certifications?: CertificationItem[];
    portfolioUrl?: string | null;
    portfolioFileName?: string | null;
    portfolioLastUpdated?: string | null;
  };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const showResumeDetails = ref(false);

const fallbackText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : '정보 없음';
};

const formatWage = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return '협의 필요';
  }

  return `${value.toLocaleString()}원 / 월`;
};

const formatCareer = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return '경력 정보 없음';
  }

  return `${value}년 경력`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '정보 없음';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('ko-KR');
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  const startLabel = formatDate(start);
  const endLabel = end ? formatDate(end) : '현재';
  return `${startLabel} - ${endLabel}`;
};

const hasResumeContent = (profile: {
  educations?: EducationItem[];
  careers?: CareerItem[];
  certifications?: CertificationItem[];
}) =>
  Boolean(
    (profile.educations?.length ?? 0) > 0 ||
      (profile.careers?.length ?? 0) > 0 ||
      (profile.certifications?.length ?? 0) > 0,
  );

const handlePortfolioClick = () => {
  if (typeof window !== 'undefined') {
    window.alert('포트폴리오가 없습니다');
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white text-slate-900 shadow-[0_35px_120px_-60px_rgba(15,23,42,0.35)]">
        <div class="relative bg-[radial-gradient(circle_at_top_right,_rgba(0,212,218,0.18),_transparent_42%),linear-gradient(135deg,_rgba(33,175,191,0.96),_rgba(0,212,218,0.92))] px-7 py-8">
          <button
            type="button"
            class="absolute right-5 top-5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs text-white transition hover:bg-white/25"
            @click="emit('close')"
          >
            닫기
          </button>

          <div class="flex flex-col gap-5 md:flex-row md:items-center">
            <ProfileIdentityAvatar
              :image-url="profile.avatarUrl"
              :label="profile.name"
              variant="freelancer"
              shape="circle"
              size-class="h-24 w-24"
              text-class="text-3xl font-bold"
            />

            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">Freelancer Profile</p>
              <h2 class="mt-2 text-2xl font-bold text-white">{{ fallbackText(profile.name) }}</h2>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-white">
                <span class="rounded-full border border-white/25 bg-white/15 px-3 py-1">{{ fallbackText(profile.job) }}</span>
                <span class="rounded-full border border-white/25 bg-white/15 px-3 py-1">{{ formatCareer(profile.careerYears) }}</span>
                <span v-if="profile.grade" class="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-white">{{ profile.grade }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="px-7 py-10 text-sm text-slate-500">
          프로필 정보를 불러오는 중입니다.
        </div>

        <div v-else class="grid flex-1 gap-4 overflow-y-auto px-7 py-7">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">희망 급여</div>
              <div class="mt-2 text-sm font-medium text-slate-900">{{ formatWage(profile.wage) }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">연락처</div>
              <div class="mt-2 text-sm font-medium text-slate-900">{{ fallbackText(profile.phone) }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">이메일</div>
              <div class="mt-2 break-all text-sm font-medium text-slate-900">{{ fallbackText(profile.email) }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">주소</div>
              <div class="mt-2 text-sm font-medium text-slate-900">{{ fallbackText(profile.address) }}</div>
            </div>
          </div>

          <div class="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
            <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">소개</div>
            <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {{ fallbackText(profile.introduction) }}
            </p>
          </div>

          <div class="rounded-[26px] border border-sky-200 bg-sky-50 p-5">
            <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">기술 스택</div>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="skill in profile.skills ?? []"
                :key="skill"
                class="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                {{ skill }}
              </span>
              <span v-if="!(profile.skills ?? []).length" class="text-sm text-slate-500">정보 없음</span>
            </div>
          </div>

          <div class="rounded-[26px] border border-sky-200 bg-sky-50 p-5">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div class="text-[11px] uppercase tracking-[0.24em] text-slate-400">Resume</div>
                <p class="mt-2 text-sm text-slate-600">학력, 경력, 자격증 정보를 확인할 수 있습니다.</p>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-100"
                @click="showResumeDetails = !showResumeDetails"
              >
                {{ showResumeDetails ? '이력서 닫기' : '이력서 보기' }}
              </button>
            </div>

            <div v-if="showResumeDetails" class="mt-4 space-y-4">
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">학력</div>
                <div v-if="profile.educations?.length" class="space-y-3">
                  <div
                    v-for="(education, index) in profile.educations"
                    :key="`${education.schoolName}-${index}`"
                    class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div class="text-sm font-semibold text-slate-900">{{ fallbackText(education.schoolName) }}</div>
                        <div class="mt-1 text-xs text-slate-500">
                          {{ fallbackText(education.schoolType) }}
                          <span v-if="education.major"> · {{ education.major }}</span>
                          <span v-if="education.status"> · {{ education.status }}</span>
                        </div>
                      </div>
                      <div class="text-xs text-slate-400">
                        {{ formatDateRange(education.entranceDate, education.graduationDate) }}
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="text-sm text-slate-500">등록된 학력 정보가 없습니다.</p>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">경력</div>
                <div v-if="profile.careers?.length" class="space-y-3">
                  <div
                    v-for="(career, index) in profile.careers"
                    :key="`${career.companyName}-${index}`"
                    class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div class="text-sm font-semibold text-slate-900">{{ fallbackText(career.companyName) }}</div>
                        <div class="mt-1 text-xs text-slate-500">
                          {{ fallbackText(career.position) }}
                          <span v-if="career.department"> · {{ career.department }}</span>
                          <span v-if="career.employmentType"> · {{ career.employmentType }}</span>
                          <span v-if="career.jobType"> · {{ career.jobType }}</span>
                        </div>
                      </div>
                      <div class="text-xs text-slate-400">
                        {{ formatDateRange(career.startDate, career.endDate) }}
                      </div>
                    </div>
                    <p v-if="career.description" class="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {{ career.description }}
                    </p>
                  </div>
                </div>
                <p v-else class="text-sm text-slate-500">등록된 경력 정보가 없습니다.</p>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">자격증</div>
                <div v-if="profile.certifications?.length" class="space-y-3">
                  <div
                    v-for="(certification, index) in profile.certifications"
                    :key="`${certification.name}-${index}`"
                    class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div class="text-sm font-semibold text-slate-900">{{ fallbackText(certification.name) }}</div>
                        <div class="mt-1 text-xs text-slate-500">{{ fallbackText(certification.issuer) }}</div>
                      </div>
                      <div class="text-xs text-slate-400">{{ formatDate(certification.acquisitionDate) }}</div>
                    </div>
                  </div>
                </div>
                <p v-else class="text-sm text-slate-500">등록된 자격증 정보가 없습니다.</p>
              </div>
            </div>

            <p v-else-if="!hasResumeContent(profile)" class="mt-4 text-sm text-slate-500">
              등록된 이력서 항목이 없습니다.
            </p>
          </div>

          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <span v-if="profile.portfolioLastUpdated" class="text-xs text-slate-400">
              {{ profile.portfolioLastUpdated }}
            </span>
            <a
              v-if="profile.portfolioUrl"
              :href="profile.portfolioUrl"
              :download="profile.portfolioFileName || 'portfolio.pdf'"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-100"
            >
              포트폴리오 다운로드하기
            </a>
            <button
              v-else
              type="button"
              class="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-100"
              @click="handlePortfolioClick"
            >
              포트폴리오 다운로드하기
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
