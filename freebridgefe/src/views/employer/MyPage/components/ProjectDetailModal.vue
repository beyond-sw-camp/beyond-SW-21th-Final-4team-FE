<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  X,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Briefcase,
  Clock,
  CheckCircle,
  Zap,
  Tag,
} from 'lucide-vue-next';
import { getEmployerApplicantStatus, type EmployerApplicantStatus } from '@/api/MyPage/projectApi';

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

interface ProjectDetail {
  id: string;
  title: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  progress: number;
  description: string;
  budget: string;
  freelancers: FreelancerProfile[];
  contractType: string;
  contractDate: string;
}

const props = defineProps<{
  project: ProjectDetail | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const applicantStatuses = ref<EmployerApplicantStatus[]>([]);
const isApplicantLoading = ref(false);
const isApplicantError = ref(false);
const applicantRequestId = ref(0);

const statusLabel = (status?: string) => {
  const key = (status ?? '').toUpperCase();
  if (!key) return '미확인';
  if (key.includes('RECEIVED') || key.includes('APPLIED')) return '접수중';
  if (key.includes('REVIEW') || key.includes('SCREEN')) return '심사중';
  if (key.includes('PROGRESS') || key.includes('IN_PROGRESS')) return '진행중';
  if (key.includes('COMPLETE') || key.includes('COMPLETED') || key.includes('DONE')) return '완료/종결';
  return status ?? '기타';
};

const applicantSummary = computed(() => {
  const counts: Record<string, number> = {};
  applicantStatuses.value.forEach((item) => {
    const label = statusLabel(item.applyStatus);
    counts[label] = (counts[label] ?? 0) + 1;
  });
  return counts;
});

const totalApplicants = computed(() => applicantStatuses.value.length);

const loadApplicantStatus = async (requestId: number) => {
  if (!props.project?.id) return;
  const projectId = Number(props.project.id);
  if (!projectId) return;
  try {
    isApplicantLoading.value = true;
    isApplicantError.value = false;
    const result = await getEmployerApplicantStatus(projectId);
    if (requestId !== applicantRequestId.value) return;
    applicantStatuses.value = result;
  } catch (error) {
    if (requestId !== applicantRequestId.value) return;
    console.error('Failed to fetch applicant status:', error);
    isApplicantError.value = true;
  } finally {
    if (requestId === applicantRequestId.value) {
      isApplicantLoading.value = false;
    }
  }
};

watch(
  () => [props.isOpen, props.project?.id],
  ([isOpen], _, onCleanup) => {
    const requestId = ++applicantRequestId.value;
    onCleanup(() => {
      if (applicantRequestId.value === requestId) {
        applicantRequestId.value = requestId + 1;
      }
    });
    if (isOpen) {
      loadApplicantStatus(requestId);
    }
  }
);

// --- Helpers for Status Colors ---
const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
        case 'BEFORE_START': return { label: '착수 예정', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
        case 'IN_PROGRESS': return { label: '진행 중', class: 'bg-green-500/10 text-green-400 border-green-500/20' };
        case 'COMPLETED': return { label: '종료', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
        default: return { label: status, class: 'bg-slate-500/10 text-slate-400' };
    }
};

const getFreelancerStatusColor = (status: string) => {
    if (status === 'ACTIVE') return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (status === 'COMPLETED') return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
};
</script>

<template>
  <div v-if="isOpen && project" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="$emit('close')">

    <div
        class="w-full max-w-4xl bg-white border border-slate-200 rounded-[32px] shadow-[0_30px_90px_-60px_rgba(15,23,42,0.2)] max-h-[90vh] overflow-y-auto custom-scrollbar"
    >
      <!-- Header -->
      <div class="fb-modal-header sticky top-0 z-10 flex items-center justify-between p-6 backdrop-blur-xl border-b border-white/10">
        <div>
           <div class="flex items-center gap-3 mb-2">
               <span class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] border rounded-full bg-white/90" :class="getStatusBadge(project.status).class">
                   {{ getStatusBadge(project.status).label }}
               </span>
               <span class="text-xs text-white/75 font-mono tracking-wide">ID: {{ project.id }}</span>
           </div>
           <h2 class="text-xl font-semibold text-white">{{ project.title }}</h2>
        </div>
        <button @click="$emit('close')" class="p-2 transition-colors rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-8 space-y-8">

        <!-- 1. Project Overview Grid -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
            <!-- Period -->
            <div class="p-5 border bg-slate-50 rounded-2xl border-slate-200">
                <div class="flex items-center gap-2 mb-2 text-xs text-slate-500 uppercase tracking-[0.2em]">
                    <Calendar class="w-4 h-4 text-sky-500" />
                    프로젝트 기간
                </div>
                <div class="text-base font-semibold text-slate-950">{{ project.startDate }} ~ {{ project.endDate }}</div>
            </div>
            <!-- Budget -->
            <div class="p-5 border bg-slate-50 rounded-2xl border-slate-200">
                <div class="flex items-center gap-2 mb-2 text-xs text-slate-500 uppercase tracking-[0.2em]">
                    <DollarSign class="w-4 h-4 text-emerald-500" />
                    총 예산
                </div>
                <div class="text-base font-semibold text-slate-950">{{ project.budget }}</div>
            </div>
            <!-- Progress -->
            <div class="p-5 border bg-slate-50 rounded-2xl border-slate-200">
                <div class="flex items-center gap-2 mb-2 text-xs text-slate-500 uppercase tracking-[0.2em]">
                    <Zap class="w-4 h-4 text-amber-500" />
                    현재 진행률
                </div>
                <div class="flex items-end gap-2">
                    <span class="text-xl font-semibold text-slate-950">{{ project.progress }}%</span>
                    <div class="flex-1 h-2 mb-1 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full" :style="{ width: `${project.progress}%` }"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. Detailed Description -->
        <div>
            <h3 class="flex items-center gap-2 mb-4 text-base font-semibold text-slate-950">
                <FileText class="w-5 h-5 text-sky-500" />
                프로젝트 상세 내용
            </h3>
            <div class="p-6 leading-relaxed border bg-slate-50 rounded-2xl border-slate-200 text-sm text-slate-700">
                {{ project.description }}
            </div>
        </div>

        <!-- 3. Applicant Status Summary -->
        <div>
            <h3 class="flex items-center gap-2 mb-4 text-base font-semibold text-slate-950">
                <Users class="w-5 h-5 text-violet-500" />
                지원자 상태 요약
            </h3>
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div v-if="isApplicantLoading" class="text-sm text-slate-400">불러오는 중...</div>
                <div v-else-if="isApplicantError" class="text-sm text-red-400">지원자 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
                <div v-else-if="totalApplicants === 0" class="text-sm text-slate-400">지원자 상태 데이터가 없습니다.</div>
                <div v-else class="flex flex-wrap gap-3">
                    <div
                      v-for="(count, label) in applicantSummary"
                      :key="label"
                      class="px-3 py-2 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 flex items-center gap-2"
                    >
                      <Tag class="w-3.5 h-3.5 text-slate-400" />
                      {{ label }}: {{ count }}명
                    </div>
                    <div class="px-3 py-2 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200">
                      총 {{ totalApplicants }}명
                    </div>
                </div>
            </div>
        </div>

      </div>

      <!-- Footer Actions -->
      <div class="sticky bottom-0 z-10 p-6 border-t bg-slate-50 border-slate-200 flex justify-end">
          <button @click="$emit('close')" class="px-6 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 rounded-full transition-colors border border-slate-200">
              닫기
          </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #e2e8f0;
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #64748b;
  border-radius: 9999px;
  border: 2px solid #e2e8f0;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #64748b #e2e8f0;
}
</style>
