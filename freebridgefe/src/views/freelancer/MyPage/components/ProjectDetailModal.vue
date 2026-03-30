<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { FreelancerProject } from '@/api/MyPage/projectApi.ts';
import { getProjectDetail } from '@/api/MyPage/projectApi.ts';
import { X, Calendar, DollarSign, User as UserIcon, FileText, CreditCard, MessageSquare, Download } from 'lucide-vue-next';

const props = defineProps<{
    projectId: number | null;
    isOpen: boolean;
}>();

const emit = defineEmits(['close']);

const isLoading = ref(false);
const project = ref<FreelancerProject | null>(null);
const activeTab = ref('detail');

const tabs = [
    { id: 'detail', label: '상세 정보', icon: FileText },
    { id: 'contract', label: '전자 계약서', icon: FileText },
    { id: 'payment', label: '정산 내역', icon: CreditCard },
    { id: 'review', label: '프로젝트 후기', icon: MessageSquare },
];

// 프로젝트 상세 정보 로드
const loadProjectDetail = async () => {
    if (!props.projectId) return;
    
    isLoading.value = true;
    try {
        const data = await getProjectDetail(props.projectId);
        project.value = data || null;
    } catch (error) {
        console.error('Failed to load project detail:', error);
    } finally {
        isLoading.value = false;
    }
};

watch(
    () => [props.projectId, props.isOpen] as const,
    ([newId, isOpen]) => {
      if (newId && isOpen) {
        loadProjectDetail();
        activeTab.value = 'detail';
      }
    }
);

</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="$emit('close')"></div>

        <!-- Modal Content -->
        <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_30px_90px_-52px_rgba(15,23,42,0.22)] animate-fade-in-up">
            
            <!-- Header -->
            <div class="fb-modal-header flex justify-between items-start p-6 border-b border-white/10">
                <div v-if="project">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-0.5 text-xs font-bold rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">
                            {{ project.status === 'ongoing' ? '진행 중' : project.status === 'scheduled' ? '진행 예정' : '완료' }}
                        </span>
                        <span class="text-white/80 text-xs font-mono flex items-center gap-1">
                            <Calendar class="w-3 h-3" /> {{ project.period }}
                        </span>
                    </div>
                    <h2 class="text-xl font-bold text-white mb-1">{{ project.title }}</h2>
                    <div class="flex items-center gap-4 text-sm text-slate-400">
                        <div class="flex items-center gap-1">
                            <UserIcon class="w-4 h-4" />
                            <span>{{ project.clientName }}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <DollarSign class="w-4 h-4" />
                            <span>{{ project.amount }}</span>
                        </div>
                    </div>
                </div>
                <div v-else class="h-16 w-48 bg-white/5 rounded animate-pulse"></div>

                <button @click="$emit('close')" class="p-2 hover:bg-white/20 rounded-full text-white transition-colors">
                    <X class="w-6 h-6" />
                </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-6 min-h-[300px]">
                <div v-if="isLoading" class="flex items-center justify-center h-full text-slate-500">
                    <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
                    불러오는 중...
                </div>
                
                <div v-else-if="project" class="space-y-8 animate-fade-in">
                    
                    <!-- Detail Info -->
                    <div class="space-y-6">
                        <div class="space-y-2">
                            <h3 class="text-lg font-bold text-slate-950 flex items-center gap-2">
                                <FileText class="w-5 h-5 text-blue-400" />
                                프로젝트 소개
                            </h3>
                            <p class="text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-200 whitespace-pre-wrap">
                                {{ project.description }}
                            </p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-3">
                                <h3 class="text-lg font-bold text-slate-950">기술 스택</h3>
                                <div class="flex flex-wrap gap-2">
                                    <span v-for="tech in project.techStack" :key="tech" class="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-sm border border-sky-200">
                                        {{ tech }}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="space-y-3">
                                <h3 class="text-lg font-bold text-slate-950">일정 정보</h3>
                                <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-slate-400">프로젝트 기간</span>
                                        <span class="text-slate-950 font-mono">{{ project.period }}</span>
                                    </div>
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-slate-400">D-Day</span>
                                        <span class="text-slate-950 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{{ project.dDay }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="flex flex-col items-center justify-center h-full text-slate-500">
                    <p>프로젝트 정보를 찾을 수 없습니다.</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button @click="$emit('close')" class="px-3 md:px-4 py-2 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-white transition-colors">
                    닫기
                </button>
            </div>
        </div>
    </div>
</template>
