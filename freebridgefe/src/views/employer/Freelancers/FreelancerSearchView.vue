<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Search, Filter, Users, Star, DollarSign, SlidersHorizontal, Send, BriefcaseBusiness, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { getEmployerFreelancers, type EmployerFreelancerSearchItem } from '@/api/MyPage/employerFreelancerApi';
import { getFreelancerProfilePreview } from '@/api/profilePreviewApi';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useAlertStore } from '@/stores/alertStore';
import type { User } from '@/types';
import ProposalModal from '@/views/employer/Recommended/components/ProposalModal.vue';
import FreelancerProfilePreviewModal from '@/components/profile/FreelancerProfilePreviewModal.vue';

const favoritesStore = useFavoritesStore();
const alertStore = useAlertStore();
const pageSize = 20;

const searchQueryInput = ref('');
const selectedSkillInput = ref('ALL');
const minExperienceInput = ref(0);
const maxMonthlySalaryInput = ref(10000000);
const favoriteOnlyInput = ref(false);

const searchQuery = ref('');
const selectedSkill = ref('ALL');
const minExperience = ref(0);
const maxMonthlySalary = ref(10000000);
const favoriteOnly = ref(false);
const freelancers = ref<EmployerFreelancerSearchItem[]>([]);
const isLoading = ref(false);
const loadError = ref<string | null>(null);
const currentPage = ref(0);
const totalPages = ref(0);
const totalElements = ref(0);
const selectedFreelancer = ref<User | null>(null);
const isFreelancerProfileOpen = ref(false);
const isFreelancerProfileLoading = ref(false);
const lastFreelancerProfileRequestId = ref(0);
const freelancerProfile = ref({
  name: '',
  avatarUrl: null as string | null,
  job: null as string | null,
  careerYears: null as number | null,
  wage: null as number | null,
  grade: null as string | null,
  introduction: null as string | null,
  skills: [] as string[],
  phone: null as string | null,
  email: null as string | null,
  address: null as string | null,
  educations: [] as Array<{
    schoolType?: string | null;
    schoolName?: string | null;
    major?: string | null;
    status?: string | null;
    entranceDate?: string | null;
    graduationDate?: string | null;
  }>,
  careers: [] as Array<{
    companyName?: string | null;
    department?: string | null;
    position?: string | null;
    jobType?: string | null;
    employmentType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    description?: string | null;
  }>,
  certifications: [] as Array<{
    name?: string | null;
    issuer?: string | null;
    acquisitionDate?: string | null;
  }>,
  portfolioUrl: null as string | null,
  portfolioFileName: null as string | null,
  portfolioLastUpdated: null as string | null,
});

const allSkills = computed(() => {
  const skills = new Set<string>();
  freelancers.value.forEach((freelancer) => {
    freelancer.skills?.forEach((skill) => skills.add(skill));
  });
  return ['ALL', ...Array.from(skills).sort()];
});

const filteredFreelancers = computed<EmployerFreelancerSearchItem[]>(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return freelancers.value.filter((freelancer) => {
    const matchesQuery =
      !query ||
      freelancer.name.toLowerCase().includes(query) ||
      freelancer.job?.toLowerCase().includes(query) ||
      freelancer.introduction?.toLowerCase().includes(query) ||
      freelancer.skills?.some((skill) => skill.toLowerCase().includes(query));

    const matchesSkill =
      selectedSkill.value === 'ALL' ||
      freelancer.skills?.some((skill) => skill === selectedSkill.value);

    const matchesExperience =
      (freelancer.careerYears ?? 0) >= minExperience.value;

    const matchesRate =
      (freelancer.wage ?? 0) <= maxMonthlySalary.value;

    const matchesFavorite = !favoriteOnly.value || isFavorite(freelancer.freelancerId);

    return matchesQuery && matchesSkill && matchesExperience && matchesRate && matchesFavorite;
  });
});

const formatSkills = (skills?: string[]) => skills?.slice(0, 6) || [];

const formatMoney = (amount?: number | null) => (amount ?? 0).toLocaleString();

const getInitial = (name: string) => name?.trim().charAt(0) || '?';

const isFavorite = (id: number) => favoritesStore.favoriteIds.includes(String(id));

const toggleFavorite = (id: number) => favoritesStore.toggleFavorite(String(id));

const toProposalFreelancer = (freelancer: EmployerFreelancerSearchItem): User => ({
  id: String(freelancer.userId),
  role: 'FREELANCER',
  name: freelancer.name,
  email: 'hidden@example.com',
  avatar: freelancer.avatarUrl ?? undefined,
  skills: freelancer.skills,
  experience: freelancer.careerYears ?? 0,
  monthlySalary: freelancer.wage ?? 0,
  bio: freelancer.introduction ?? freelancer.job ?? '',
});

const seedFreelancerProfile = (freelancer: EmployerFreelancerSearchItem) => ({
  name: freelancer.name,
  avatarUrl: freelancer.avatarUrl ?? null,
  job: freelancer.job ?? null,
  careerYears: freelancer.careerYears ?? null,
  wage: freelancer.wage ?? null,
  grade: freelancer.grade ?? null,
  introduction: freelancer.introduction ?? null,
  skills: freelancer.skills ?? [],
  phone: null,
  email: null,
  address: null,
  educations: [],
  careers: [],
  certifications: [],
  portfolioUrl: null,
  portfolioFileName: null,
  portfolioLastUpdated: null,
});

const openFreelancerProfile = async (freelancer: EmployerFreelancerSearchItem) => {
  const requestId = ++lastFreelancerProfileRequestId.value;
  freelancerProfile.value = seedFreelancerProfile(freelancer);
  isFreelancerProfileOpen.value = true;
  isFreelancerProfileLoading.value = true;

  try {
    const preview = await getFreelancerProfilePreview(freelancer.freelancerId);
    if (requestId !== lastFreelancerProfileRequestId.value) {
      return;
    }
    freelancerProfile.value = {
      name: preview.name ?? freelancer.name,
      avatarUrl: preview.avatarUrl ?? freelancer.avatarUrl ?? null,
      job: preview.job ?? freelancer.job ?? null,
      careerYears: preview.careerYears ?? freelancer.careerYears ?? null,
      wage: preview.wage ?? freelancer.wage ?? null,
      grade: preview.grade ?? freelancer.grade ?? null,
      introduction: preview.introduction ?? freelancer.introduction ?? null,
      skills: preview.skills ?? freelancer.skills ?? [],
      phone: preview.phone,
      email: preview.email,
      address: preview.address,
      educations: preview.educations ?? [],
      careers: preview.careers ?? [],
      certifications: preview.certifications ?? [],
      portfolioUrl: preview.portfolioFileUrl,
      portfolioFileName: preview.portfolioFileName,
      portfolioLastUpdated: preview.portfolioLastUpdated,
    };
  } catch (error) {
    if (requestId !== lastFreelancerProfileRequestId.value) {
      return;
    }
    console.error('Failed to load freelancer profile preview:', error);
    alertStore.open({
      message: '프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      type: 'error'
    });
  } finally {
    if (requestId === lastFreelancerProfileRequestId.value) {
      isFreelancerProfileLoading.value = false;
    }
  }
};

const loadFreelancers = async () => {
  isLoading.value = true;
  loadError.value = null;

  try {
    const response = await getEmployerFreelancers({
      page: currentPage.value,
      size: pageSize,
      keyword: searchQuery.value || undefined,
    });
    freelancers.value = response.items;
    totalPages.value = response.totalPages;
    totalElements.value = response.totalElements;
  } catch (error: any) {
    freelancers.value = [];
    totalPages.value = 0;
    totalElements.value = 0;
    loadError.value = error?.response?.data?.message || error?.message || '프리랜서 목록을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = async () => {
  searchQuery.value = searchQueryInput.value;
  selectedSkill.value = selectedSkillInput.value;
  minExperience.value = minExperienceInput.value;
  maxMonthlySalary.value = maxMonthlySalaryInput.value;
  favoriteOnly.value = favoriteOnlyInput.value;
  currentPage.value = 0;
  await loadFreelancers();
};

const resetFilters = async () => {
  searchQueryInput.value = '';
  selectedSkillInput.value = 'ALL';
  minExperienceInput.value = 0;
  maxMonthlySalaryInput.value = 10000000;
  favoriteOnlyInput.value = false;

  searchQuery.value = '';
  selectedSkill.value = 'ALL';
  minExperience.value = 0;
  maxMonthlySalary.value = 10000000;
  favoriteOnly.value = false;
  currentPage.value = 0;
  await loadFreelancers();
};

const canGoPrev = computed(() => currentPage.value > 0);
const canGoNext = computed(() => currentPage.value + 1 < totalPages.value);

const movePage = async (nextPage: number) => {
  if (nextPage < 0 || nextPage >= totalPages.value || nextPage === currentPage.value) {
    return;
  }

  currentPage.value = nextPage;
  await loadFreelancers();
};

onMounted(() => {
  void loadFreelancers();
});
</script>

<template>
  <div class="mx-auto max-w-[1400px] px-4 py-12 text-slate-900 md:px-8">
    <div class="flex flex-col gap-6 mb-10">
      <div class="flex items-center gap-2">
        <Users class="h-7 w-7 text-[#21AFBF]" />
        <h1 class="text-3xl md:text-4xl font-bold">프리랜서 찾기</h1>
      </div>
      <p class="text-slate-600">전체 프리랜서를 조건별로 검색해보세요</p>
      <p class="text-sm text-slate-500">
        이름/직무/소개는 서버에서 조회하고, 스킬·경력·희망금액·즐겨찾기는 현재 조회 결과에서 추가 필터링합니다.
      </p>

      <div class="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] items-stretch">
        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search class="h-5 w-5 text-slate-400" />
          <input
            v-model="searchQueryInput"
            @keyup.enter="applyFilters"
            type="text"
            placeholder="이름, 스킬, 소개로 검색"
            class="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Filter class="h-5 w-5 text-slate-400" />
          <select
            v-model="selectedSkillInput"
            class="w-full bg-transparent text-slate-900 focus:outline-none [&>option]:bg-white [&>option]:text-slate-900"
          >
            <option v-for="skill in allSkills" :key="skill" :value="skill">
              {{ skill === 'ALL' ? '전체 스킬' : skill }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <SlidersHorizontal class="h-5 w-5 text-slate-400" />
          <input
            v-model.number="minExperienceInput"
            @keyup.enter="applyFilters"
            type="number"
            min="0"
            step="1"
            class="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
            placeholder="최소 경력"
          />
          <span class="text-sm text-slate-500">년+</span>
        </div>

        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <DollarSign class="h-5 w-5 text-slate-400" />
          <input
            v-model.number="maxMonthlySalaryInput"
            @keyup.enter="applyFilters"
            type="number"
            min="0"
            step="100000"
            class="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
            placeholder="최대 월급"
          />
          <span class="text-sm text-slate-500">원</span>
        </div>

        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label class="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
            <input
              v-model="favoriteOnlyInput"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 bg-white"
            />
            즐겨찾기만
          </label>
          <button
            type="button"
            @click="applyFilters"
            class="ml-auto rounded-lg bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-4 py-2 font-semibold text-[#0f2b2e] transition-all hover:brightness-105"
          >
            검색
          </button>
          <button
            type="button"
            @click="resetFilters"
            class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            초기화
          </button>
        </div>
      </div>
    </div>

    <div class="mb-6 flex items-center justify-between gap-4 text-sm text-slate-500">
      <span>검색 결과 {{ totalElements.toLocaleString() }}명</span>
      <span v-if="totalPages > 0">페이지 {{ currentPage + 1 }} / {{ totalPages }}</span>
    </div>

    <div v-if="isLoading" class="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
      프리랜서 목록을 불러오는 중입니다.
    </div>

    <div v-else-if="loadError" class="bg-red-500/10 border border-red-400/20 rounded-3xl p-12 text-center text-red-700">
      {{ loadError }}
    </div>

    <div v-else-if="filteredFreelancers.length === 0" class="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
      조건에 맞는 프리랜서가 없습니다.
    </div>

    <div v-else class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="freelancer in filteredFreelancers"
        :key="freelancer.freelancerId"
        class="cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#21AFBF]/30 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
        role="button"
        tabindex="0"
        @click="openFreelancerProfile(freelancer)"
        @keyup.enter.self="openFreelancerProfile(freelancer)"
        @keyup.space.self.prevent="openFreelancerProfile(freelancer)"
      >
        <div class="flex items-start gap-4 mb-4">
          <div class="w-14 h-14 rounded-full bg-gradient-to-br from-[#21AFBF] to-[#00D4DA] overflow-hidden flex items-center justify-center text-white text-2xl font-bold">
            <img
              v-if="freelancer.avatarUrl"
              :src="freelancer.avatarUrl"
              :alt="`${freelancer.name} 프로필 이미지`"
              class="h-full w-full object-cover"
            />
            <span v-else>{{ getInitial(freelancer.name) }}</span>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="text-xl font-semibold">{{ freelancer.name }}</div>
              <span
                v-if="freelancer.grade"
                class="px-2 py-0.5 rounded-full border border-[#21AFBF]/20 bg-[#21AFBF]/10 text-xs text-[#21AFBF]"
              >
                {{ freelancer.grade }}
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <BriefcaseBusiness class="w-4 h-4" />
              <span>{{ freelancer.job || '직무 정보 없음' }}</span>
            </div>
            <div class="text-sm text-slate-500">{{ freelancer.careerYears ?? 0 }}년 경력</div>
          </div>
        </div>

        <p class="mb-4 min-h-[40px] line-clamp-2 text-sm text-slate-600">
          {{ freelancer.introduction || '소개가 아직 등록되지 않았습니다.' }}
        </p>

        <div class="flex flex-wrap gap-2 mb-5">
          <span
            v-for="skill in formatSkills(freelancer.skills)"
            :key="skill"
            class="px-3 py-1 bg-[#21AFBF]/10 text-[#21AFBF] text-xs rounded-full border border-[#21AFBF]/20"
          >
            {{ skill }}
          </span>
        </div>

        <div class="flex items-center justify-between border-t border-slate-200 pt-4">
          <div class="text-sm text-slate-500">
            희망 금액 <span class="font-semibold text-slate-900">{{ formatMoney(freelancer.wage) }}원</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click.stop="toggleFavorite(freelancer.freelancerId)"
              class="px-3 py-2 rounded-lg border transition-all"
              :class="isFavorite(freelancer.freelancerId)
                ? 'bg-[#21AFBF]/12 border-[#21AFBF]/35 text-[#21AFBF]'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#21AFBF]'"
            >
              <Star
                class="w-4 h-4"
                :class="isFavorite(freelancer.freelancerId) ? 'fill-[#21AFBF] text-[#21AFBF]' : ''"
              />
            </button>
            <button
              type="button"
              @click.stop="selectedFreelancer = toProposalFreelancer(freelancer)"
              class="px-4 py-2 bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] text-[#0f2b2e] rounded-lg font-semibold hover:brightness-105 transition-all flex items-center gap-2"
            >
              <Send class="w-4 h-4" />
              제안하기
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isLoading && totalPages > 1" class="mt-8 flex items-center justify-center gap-3">
      <button
        type="button"
        @click="movePage(currentPage - 1)"
        :disabled="!canGoPrev"
        class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft class="h-4 w-4" />
        이전
      </button>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
        {{ currentPage + 1 }} / {{ totalPages }}
      </div>
      <button
        type="button"
        @click="movePage(currentPage + 1)"
        :disabled="!canGoNext"
        class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>

    <ProposalModal
      v-if="selectedFreelancer"
      :freelancer="selectedFreelancer"
      @close="selectedFreelancer = null"
    />
    <FreelancerProfilePreviewModal
      :is-open="isFreelancerProfileOpen"
      :is-loading="isFreelancerProfileLoading"
      :profile="freelancerProfile"
      @close="isFreelancerProfileOpen = false"
    />
  </div>
</template>
