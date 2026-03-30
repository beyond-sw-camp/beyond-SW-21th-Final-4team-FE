<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Edit, Trash2, Users, DollarSign, Clock, AlertCircle, Sparkles } from 'lucide-vue-next';
import { useJobStore } from '@/stores/jobStore';
import type { JobPosting, JobStatus } from '@/types';
import JobCreateModal from './components/JobCreateModal.vue';
import JobEditModal from './components/JobEditModal.vue';

const jobStore = useJobStore();

const showCreateModal = ref(false);
const editingJob = ref<JobPosting | null>(null);

const myJobs = computed(() => jobStore.myJobs);

onMounted(async () => {
  try {
    await jobStore.fetchJobPostings();
  } catch (error) {
    console.error('Failed to load employer job postings:', error);
    window.alert('내 공고 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
});

const statusConfig: Record<JobStatus, { label: string; badge: string }> = {
  OPEN: { label: '모집중', badge: 'bg-[#eefbf7] text-[#1f8f6b] border border-[#d5f3e8]' },
  IN_PROGRESS: { label: '진행중', badge: 'bg-[#e7f9fb] text-[#1c95a2] border border-[#cdeff2]' },
  CONTRACTED: { label: '계약완료', badge: 'bg-[#f4f0ff] text-[#7a58c1] border border-[#e4dbff]' },
  CLOSED: { label: '마감', badge: 'bg-slate-100 text-slate-700 border border-slate-200' },
};

const handleDelete = async (job: JobPosting) => {
    if (job.status === 'CONTRACTED') {
      if (!confirm('계약 완료된 공고는 삭제 시 문제가 발생할 수 있습니다. 정말 삭제하시겠습니까?')) {
        return;
      }
    } else {
      if (!confirm('이 공고를 삭제하시겠습니까?')) {
        return;
      }
    }

    try {
      await jobStore.deleteJobPosting(job.id);
      window.alert('삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete job posting:', error);
      window.alert('공고 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
};

const getApplications = (jobId: string) => {
    return jobStore.getApplicationsByJob(jobId);
};
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-slate-900">
    <!-- Header -->
    <div 
        class="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0 }"
    >
      <div>
        <h1 class="mb-3 text-4xl font-bold tracking-tight text-slate-950">
          내 프로젝트 공고
        </h1>
        <p class="text-slate-500">등록한 프로젝트를 관리하세요</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="fb-button-primary gap-2 rounded-full px-6"
      >
        <Plus class="w-5 h-5" />
        새 공고 등록
      </button>
    </div>

    <div v-if="myJobs.length === 0" 
        class="fb-card p-16 text-center"
        v-motion
        :initial="{ opacity: 0, scale: 0.95 }"
        :enter="{ opacity: 1, scale: 1 }"
    >
        <div 
            class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e7f9fb]"
            v-motion
            :initial="{ scale: 0 }"
            :enter="{ scale: 1, transition: { type: 'spring', delay: 200 } }"
        >
            <AlertCircle class="w-10 h-10 text-[#21AFBF]" />
        </div>
        <h3 class="mb-3 text-2xl font-semibold text-slate-950">등록된 공고가 없습니다</h3>
        <p class="mb-8 text-slate-500">첫 프로젝트 공고를 등록해보세요</p>
        <div class="text-xs text-slate-400">
            오른쪽 상단의 공고 등록 버튼을 사용하세요
        </div>
    </div>
    
    <div v-else class="grid gap-6">
        <transition-group 
            enter-active-class="transition ease-out duration-300" 
            enter-from-class="opacity-0 translate-y-4" 
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-300"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 scale-95"
            tag="div"
            class="space-y-6"
        >
          <div
            v-for="(job, index) in myJobs"
            :key="job.id"
            class="fb-card p-8 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            :style="{ transitionDelay: `${index * 50}ms` }"
          >
            <div class="flex flex-col lg:flex-row items-start justify-between gap-6">
                <div class="flex-1 w-full">
                    <!-- Title & Status -->
                    <div class="flex items-start gap-3 mb-4 flex-wrap">
                        <h3 class="flex-1 text-2xl font-semibold text-slate-950">{{ job.title }}</h3>
                        <div
                            class="rounded-full px-4 py-2 text-sm font-medium"
                            :class="statusConfig[job.status].badge"
                        >
                            {{ statusConfig[job.status].label }}
                        </div>
                    </div>

                    <!-- Description -->
                    <p class="mb-6 leading-relaxed text-slate-600">{{ job.description }}</p>

                    <!-- Tech Stack -->
                    <div class="flex flex-wrap gap-2 mb-6">
                        <span
                            v-for="tech in job.techStack"
                            :key="tech"
                            class="rounded-full border border-[#e5ecef] bg-[#f8fbfc] px-4 py-2 text-sm font-medium text-slate-600"
                        >
                            {{ tech }}
                        </span>
                    </div>

                    <!-- Stats -->
                    <div class="flex flex-wrap gap-6 text-slate-500">
                        <div class="flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#eefbf7]">
                                <DollarSign class="w-4 h-4 text-emerald-500" />
                            </div>
                            <span class="font-medium">월급 {{ job.budget.toLocaleString() }}원</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f9fb]">
                                <Clock class="w-4 h-4 text-[#21AFBF]" />
                            </div>
                            <span class="font-medium">{{ job.duration }}개월</span>
                        </div>
                         <div class="flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50">
                                <Users class="w-4 h-4 text-violet-500" />
                            </div>
                            <span class="font-medium">지원자 {{ getApplications(job.id).length }}명</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex lg:flex-col gap-2">
                    <button
                        @click="editingJob = job"
                        aria-label="수정"
                        class="rounded-2xl border border-[#cdeff2] bg-[#e7f9fb] p-3 transition-all hover:scale-105 hover:bg-[#d9f5f8] active:scale-95"
                        title="수정"
                    >
                        <Edit class="w-5 h-5 text-[#21AFBF]" />
                    </button>
                    <button
                        @click="handleDelete(job)"
                        aria-label="삭제"
                        class="rounded-2xl border border-rose-100 bg-rose-50 p-3 transition-all hover:scale-105 hover:bg-rose-100 active:scale-95"
                        title="삭제"
                    >
                        <Trash2 class="w-5 h-5 text-rose-500" />
                    </button>
                </div>
            </div>

            <!-- Applicants -->
            <div v-if="getApplications(job.id).length > 0" class="mt-6 border-t border-slate-100 pt-6">
                <div class="mb-3 flex items-center gap-2 text-sm text-slate-500">
                    <Sparkles class="w-4 h-4 text-[#21AFBF]" />
                    최근 지원자
                </div>
                <div class="flex -space-x-3">
                    <div
                        v-for="(app, index) in getApplications(job.id).slice(0, 5)"
                        :key="app.id"
                        class="flex h-10 w-10 cursor-default items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#21AFBF] to-[#00D4DA] font-semibold text-white shadow-md transition-transform hover:z-10 hover:scale-110"
                        :title="app.freelancerName"
                    >
                        {{ app.freelancerName[0] }}
                    </div>
                    <div v-if="getApplications(job.id).length > 5" class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-sm font-semibold text-slate-600">
                        +{{ getApplications(job.id).length - 5 }}
                    </div>
                </div>
            </div>
          </div>
        </transition-group>
    </div>

    <!-- Modals -->
    <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
        <JobCreateModal
            v-if="showCreateModal"
            @close="showCreateModal = false"
            @success="showCreateModal = false"
        />
    </transition>

    <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
        <JobEditModal
            v-if="editingJob"
            :job="editingJob"
            @close="editingJob = null"
            @success="editingJob = null"
        />
    </transition>

  </div>
</template>
