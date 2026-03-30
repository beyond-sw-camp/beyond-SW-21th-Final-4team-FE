<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMotion } from '@vueuse/motion';
import {
  ArrowLeft,
  Search,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle,
  Zap,
} from 'lucide-vue-next';

import ProjectDetailModal from './ProjectDetailModal.vue';
import { getEmployerProjects, type EmployerProjectListItem } from '@/api/MyPage/projectApi';

defineEmits<{
  (e: 'back'): void;
}>();

const isModalOpen = ref(false);
const selectedProject = ref<Project | null>(null);

// --- Types ---
type ProjectStatus = 'BEFORE_START' | 'IN_PROGRESS' | 'COMPLETED';
interface FreelancerProfile {
  id: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  contractPeriod: string;
  paymentAmount: string;
}
interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  progress: number;
  description: string;
  budget: string;
  freelancers: FreelancerProfile[];
  contractType?: string;
  contractDate?: string;
}

const projects = ref<Project[]>([]);
const searchTerm = ref('');
const statusFilter = ref<ProjectStatus | 'ALL'>('ALL');
const isLoading = ref(false);

// --- Helpers ---
const getStatusConfig = (status: ProjectStatus) => {
  switch (status) {
    case 'BEFORE_START':
      return { label: '시작 전', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', icon: Clock };
    case 'IN_PROGRESS':
      return { label: '진행 중', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Briefcase };
    case 'COMPLETED':
      return { label: '종료', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', icon: CheckCircle };
  }
};

const filteredProjects = computed(() => {
  return projects.value.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.value.toLowerCase());
    const matchesStatus = statusFilter.value === 'ALL' || project.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const getProgressColor = (progress: number) => {
    if (progress <= 30) {
        return {
            bar: 'from-blue-500 to-indigo-500',
            text: 'text-blue-400',
            iconFill: 'fill-blue-400',
            shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]'
        };
    } else if (progress <= 69) {
        return {
             bar: 'from-yellow-400 to-orange-500',
             text: 'text-yellow-400',
             iconFill: 'fill-yellow-400',
             shadow: 'shadow-[0_0_10px_rgba(250,204,21,0.5)]'
        };
    } else {
         return {
             bar: 'from-red-500 to-pink-600',
             text: 'text-red-400',
             iconFill: 'fill-red-400',
             shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]'
        };
    }
};

const openModal = (project: Project) => {
  selectedProject.value = project;
  isModalOpen.value = true;
};

const handleProjectCardKeydown = (event: KeyboardEvent, project: Project) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openModal(project);
  }
};

const resetFilters = () => {
  searchTerm.value = '';
  statusFilter.value = 'ALL';
};

const normalizeStatus = (status?: string): ProjectStatus => {
  const raw = (status ?? '').toUpperCase();
  if (!raw) return 'BEFORE_START';
  if (raw.includes('IN_PROGRESS') || raw.includes('PROGRESS') || raw.includes('ONGOING') || raw.includes('진행')) {
    return 'IN_PROGRESS';
  }
  if (raw.includes('COMPLETED') || raw.includes('COMPLETE') || raw.includes('DONE') || raw.includes('종료') || raw.includes('완료')) {
    return 'COMPLETED';
  }
  if (raw.includes('BEFORE') || raw.includes('READY') || raw.includes('WAIT') || raw.includes('RECRUIT') || raw.includes('대기') || raw.includes('모집')) {
    return 'BEFORE_START';
  }
  return 'BEFORE_START';
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  if (value.length >= 10) return value.slice(0, 10);
  return value;
};

const calculateProgress = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  if (endDate <= startDate) return 0;
  const now = new Date();
  if (now <= startDate) return 0;
  if (now >= endDate) return 100;
  const total = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  const percent = Math.floor((elapsed / total) * 100);
  return Math.min(100, Math.max(0, percent));
};

const mapProject = (item: EmployerProjectListItem): Project => ({
  id: String(item.projectId ?? ''),
  title: item.title ?? '',
  status: normalizeStatus(item.status),
  startDate: formatDate(item.createdAt),
  endDate: formatDate(item.deadline),
  progress: calculateProgress(item.createdAt, item.deadline),
  description: item.description ?? '프로젝트 설명이 없습니다.',
  budget: item.monthlySalary != null ? item.monthlySalary.toString() : '-',
  freelancers: []
});

const fetchProjects = async () => {
  isLoading.value = true;
  try {
    const list = await getEmployerProjects();
    projects.value = list.map(mapProject);
  } catch (error) {
    console.error('Failed to fetch employer projects:', error);
    projects.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchProjects();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-8 text-slate-800">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <button
          @click="$emit('back')"
          aria-label="이전으로"
          class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft class="w-5 h-5 text-sky-600" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-slate-950">프로젝트 관리</h1>
          <p class="text-sm text-slate-500 mt-1">등록된 프로젝트 진행 현황을 확인하세요.</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
         <!-- Status Tabs -->
        <div class="bg-white p-1 rounded-xl flex gap-1 border border-slate-200">
            <button
                v-for="status in ['ALL', 'BEFORE_START', 'IN_PROGRESS', 'COMPLETED']"
                :key="status"
                @click="statusFilter = status as any"
                class="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                :class="statusFilter === status ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'"
            >
                {{ status === 'ALL' ? '전체' : status === 'BEFORE_START' ? '착수 예정' : status === 'IN_PROGRESS' ? '진행 중' : '종료' }}
            </button>
        </div>

        <!-- Search -->
        <div class="relative w-full md:w-64">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="프로젝트명 검색..."
              v-model="searchTerm"
              class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-950 placeholder-slate-400 outline-none focus:border-sky-400 transition-colors text-xs"
            />
        </div>
        <button
          type="button"
          @click="resetFilters"
          class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
        >
          초기화
        </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="py-16 text-center text-slate-500">로딩 중...</div>

    <!-- Empty State -->
    <div v-else-if="filteredProjects.length === 0" class="py-16 text-center text-slate-500">
      프로젝트가 없습니다.
    </div>

    <!-- Projects Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div
            v-for="(project, index) in filteredProjects"
            :key="project.id"
            @click="openModal(project)"
            @keydown="handleProjectCardKeydown($event, project)"
            tabindex="0"
            role="button"
            :aria-label="project.title ? `${project.title} 상세 열기` : '프로젝트 상세 열기'"
            class="group relative flex aspect-[4/4] cursor-pointer flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.12)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            :class="project.status === 'IN_PROGRESS'
              ? 'hover:bg-emerald-50 border-emerald-100'
              : project.status === 'COMPLETED'
                ? 'hover:bg-slate-50 border-slate-200'
                : 'hover:bg-sky-50 border-sky-100'
            "
            v-motion
            :initial="{ opacity: 0, scale: 0.95 }"
            :enter="{ opacity: 1, scale: 1, transition: { delay: index * 0.05 } }"
        >
             <!-- Header: Status & Title -->
             <div class="mb-5">
                 <div class="flex justify-between items-start mb-2">
                     <span class="px-3 py-1.5 rounded-full text-[11px] font-semibold border flex items-center gap-1.5"
                        :class="`${getStatusConfig(project.status).bg} ${getStatusConfig(project.status).border} ${getStatusConfig(project.status).color}`"
                     >
                        <component :is="getStatusConfig(project.status).icon" class="w-3.5 h-3.5" />
                        {{ getStatusConfig(project.status).label }}
                     </span>
                     <span class="text-[11px] text-slate-400 font-medium">
                        {{ project.startDate }} ~ {{ project.endDate }}
                     </span>
                 </div>
                 <h3 class="font-semibold text-slate-950 text-lg leading-snug tracking-tight">
                    {{ project.title }}
                </h3>
             </div>

            <!-- Project Simple Info -->
            <div class="flex-1 flex flex-col gap-4 mb-4">
                 <p class="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {{ project.description }}
                 </p>

                 <div class="mt-auto pt-4 border-t border-slate-200">
                     <div class="grid grid-cols-2 gap-4">
                         <div>
                            <div class="text-[10px] text-slate-500 mb-1 uppercase tracking-[0.18em]">월급</div>
                             <div class="text-sm font-semibold text-slate-950">{{ project.budget }}</div>
                         </div>
                         <div>
                             <div class="text-[10px] text-slate-500 mb-1 uppercase tracking-[0.18em]">종료일</div>
                             <div class="text-sm font-semibold text-slate-950">{{ project.endDate }}</div>
                         </div>
                     </div>
                 </div>
            </div>

            <!-- Footer: Stats -->
            <div class="border-t border-slate-200 pt-4 w-full">
                <div v-if="project.status === 'IN_PROGRESS'" class="w-full">
                    <div class="flex justify-between items-end mb-2">
                        <span class="text-xs font-semibold flex items-center gap-1 text-slate-600">
                            <Zap class="w-3.5 h-3.5 text-emerald-500" />
                            진행 중
                        </span>
                        <span class="text-sm font-semibold text-slate-950">{{ project.progress }}%</span>
                    </div>
                    <div class="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r rounded-full transition-all duration-1000 ease-out"
                             :class="`${getProgressColor(project.progress).bar}`"
                             :style="{ width: `${project.progress}%` }">
                        </div>
                    </div>
                </div>
                 <div v-else-if="project.status === 'COMPLETED'" class="w-full flex justify-end">
                    <span class="px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 flex items-center gap-1.5 border border-slate-200">
                        <CheckCircle class="w-4 h-4 text-slate-400" />
                        프로젝트 종료
                    </span>
                </div>
                 <div v-else class="w-full flex justify-end">
                    <span class="px-3 py-1.5 bg-sky-50 rounded-full text-xs font-semibold text-sky-700 flex items-center gap-1.5 border border-sky-200">
                        <Clock class="w-4 h-4 text-sky-500" />
                        시작 대기
                    </span>
                </div>
            </div>
        </div>
    </div>
  </div>

    <!-- Project Detail Modal -->
    <Teleport to="body">
        <ProjectDetailModal
            :is-open="isModalOpen"
            :project="selectedProject"
            @close="isModalOpen = false"
        />
    </Teleport>
</template>
