<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import { User, Code2, ArrowRight, Plus, X, Briefcase } from 'lucide-vue-next';
import type { WorkType, WorkStyle } from '@/types/onboarding';
import AnimatedBackground from '../auth/components/AnimatedBackground.vue';

const store = useOnboardingStore();
const authStore = useAuthStore();
const router = useRouter();

// Local state for skills input
const newSkillName = ref('');

onMounted(() => {
    store.ensureDraftForUser(authStore.user?.id, 'FREELANCER');

    // Reset step to 1
    store.setStep(1);

    // Pre-fill name from Auth info if available
    if (authStore.user?.name && !store.freelancerData.name) {
        store.updateFreelancerData({ name: authStore.user.name });
    }
});

const addSkill = () => {
    if (!newSkillName.value.trim()) return;
    const currentSkills = store.freelancerData.freelancer_skills || [];
    if (!currentSkills.includes(newSkillName.value.trim())) {
        store.updateFreelancerData({
            freelancer_skills: [...currentSkills, newSkillName.value.trim()]
        });
    }
    newSkillName.value = '';
};

const removeSkill = (index: number) => {
    const currentSkills = store.freelancerData.freelancer_skills || [];
    store.updateFreelancerData({
        freelancer_skills: currentSkills.filter((_, i) => i !== index)
    });
};

const handleFinish = async () => {
    if (!store.freelancerData.work_type || !store.freelancerData.location || !store.freelancerData.start_date) {
        alert('필수 정보를 입력해주세요.');
        return;
    }

    const success = await store.submitFreelancerOnboarding();
    if (success) {
        store.resetOnboardingState();
        alert('프로필 입력이 완료되었습니다!');
        router.push({ name: 'freelancer.jobs' });
    }
};

const nextStep = () => {
    if (store.currentStep === 1) {
        if (!store.freelancerData.name || !store.freelancerData.job || store.freelancerData.career_years == null || store.freelancerData.hope_salary == null) {
            alert('필수 정보를 입력해주세요.');
            return;
        }
    }
    store.nextStep();
};
</script>

<template>
  <div class="min-h-screen bg-black text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
    <!-- Animated Background -->
    <AnimatedBackground />

    <!-- Glassmorphism Overlay -->
    <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

    <div 
        class="max-w-2xl w-full space-y-8 bg-white/5 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] relative z-10"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 600 } }"
    >
        <!-- Header -->
        <div class="text-center">
            <h2 class="mt-2 text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow-sm">
                프리랜서 프로필 등록
            </h2>
            <p class="mt-3 text-lg text-white/60">
                {{ store.currentStep === 1 ? '기본 정보를 입력하고 커리어를 시작하세요.' : '상세 업무 조건을 설정하여 최적의 프로젝트를 찾으세요.' }}
            </p>
        </div>

        <!-- Progress Indicator -->
        <div class="flex justify-center items-center gap-3 mb-8">
            <div class="h-1.5 w-16 rounded-full transition-all duration-500 ease-out" 
                 :class="store.currentStep >= 1 ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-white/10'"></div>
            <div class="h-1.5 w-16 rounded-full transition-all duration-500 ease-out" 
                 :class="store.currentStep >= 2 ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-white/10'"></div>
        </div>

        <!-- Step 1: Basic Info -->
        <div v-if="store.currentStep === 1" class="space-y-6">
            <div v-motion :initial="{ opacity: 0, x: 20 }" :enter="{ opacity: 1, x: 0, transition: { delay: 100 } }">
                <label class="block text-sm font-medium text-white/80 mb-2">이름 <span class="text-red-400">*</span></label>
                <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-green-400">
                        <User class="h-5 w-5 text-white/40" />
                    </div>
                    <input 
                        type="text" 
                        :value="store.freelancerData.name"
                        @input="e => store.updateFreelancerData({ name: (e.target as HTMLInputElement).value })"
                        class="pl-12 block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 text-white placeholder:text-white/30 transition-all duration-300 hover:bg-white/10"
                        placeholder="홍길동"
                    />
                    <div class="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none group-hover:ring-white/20 transition-all"></div>
                </div>
            </div>

            <div v-motion :initial="{ opacity: 0, x: 20 }" :enter="{ opacity: 1, x: 0, transition: { delay: 200 } }">
                <label class="block text-sm font-medium text-white/80 mb-2">직무 정보<span class="text-red-400">*</span></label>
                <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-green-400">
                        <Briefcase class="h-5 w-5 text-white/40" />
                    </div>
                    <input 
                        type="text" 
                        :value="store.freelancerData.job"
                        @input="e => store.updateFreelancerData({ job: (e.target as HTMLInputElement).value })"
                        class="pl-12 block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 text-white placeholder:text-white/30 transition-all duration-300 hover:bg-white/10"
                        placeholder="직무 입력"
                    />
                    <div class="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none group-hover:ring-white/20 transition-all"></div>
                </div>
                <p class="text-xs text-white/50 mt-2">등급은 회원등급 계산기에서 자동 산정됩니다.</p>
            </div>

<div class="grid grid-cols-2 gap-6" v-motion :initial="{ opacity: 0, x: 20 }" :enter="{ opacity: 1, x: 0, transition: { delay: 300 } }">
                <div>
                    <label class="block text-sm font-medium text-white/80 mb-2">총 경력 (년) <span class="text-red-400">*</span></label>
                    <div class="relative group">
                         <input 
                            type="number" 
                            min="0"
                            :value="store.freelancerData.career_years"
                            @input="e => store.updateFreelancerData({ career_years: Math.max(0, Number((e.target as HTMLInputElement).value)) })"
                            class="block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 px-4 text-white placeholder:text-white/30 transition-all duration-300 hover:bg-white/10"
                            placeholder="0"
                        />
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-white/80 mb-2">희망 월 급여 (만원) <span class="text-red-400">*</span></label>
                    <div class="relative group">
                        <input 
                            type="number" 
                            min="0"
                            step="100"
                            :value="store.freelancerData.hope_salary"
                            @input="e => store.updateFreelancerData({ hope_salary: Math.max(0, Number((e.target as HTMLInputElement).value)) })"
                            class="block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 px-4 text-white placeholder:text-white/30 transition-all duration-300 hover:bg-white/10"
                            placeholder="500"
                        />
                        <p class="mt-2 text-xs text-white/45">월급 기준으로 입력해 주세요.</p>
                    </div>
                </div>
            </div>

            <div v-motion :initial="{ opacity: 0, x: 20 }" :enter="{ opacity: 1, x: 0, transition: { delay: 400 } }">
                <label class="block text-sm font-medium text-white/80 mb-2">자기소개</label>
                <div class="relative group">
                    <div class="absolute top-4 left-4 pointer-events-none">
                        <Briefcase class="h-5 w-5 text-white/40 group-focus-within:text-green-400 transition-colors" />
                    </div>
                    <textarea 
                        :value="store.freelancerData.introduction"
                        @input="e => store.updateFreelancerData({ introduction: (e.target as HTMLTextAreaElement).value })"
                        rows="4"
                        class="pl-12 block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 px-4 resize-none text-white placeholder:text-white/30 transition-all duration-300 hover:bg-white/10"
                        placeholder="본인의 강점과 주요 경력을 간단히 작성해주세요."
                    ></textarea>
                </div>
            </div>

            <button 
                @click="nextStep" 
                class="group w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
                <span class="mr-2">다음 단계로</span>
                <ArrowRight class="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>

        <!-- Step 2: Work Conditions & Skills -->
        <div v-else-if="store.currentStep === 2" class="space-y-6">
            <div class="grid grid-cols-2 gap-6" v-motion :initial="{ opacity: 0, x: 20 }" :enter="{ opacity: 1, x: 0, transition: { delay: 100 } }">
                <div>
                    <label class="block text-sm font-medium text-white/80 mb-2">근무 형태 <span class="text-red-400">*</span></label>
                    <div class="relative group">
                        <select 
                            :value="store.freelancerData.work_type"
                            @change="e => store.updateFreelancerData({ work_type: (e.target as HTMLSelectElement).value as WorkType })"
                            class="block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 px-4 text-white transition-all duration-300 hover:bg-white/10 [&>option]:bg-[#1a1a1a]"
                        >
                            <option value="PERSONAL">개인</option>
                            <option value="TEAM">팀</option>
                        </select>
                    </div>
                </div>
                <div>
                     <label class="block text-sm font-medium text-white/80 mb-2">근무 방식 <span class="text-red-400">*</span></label>
                    <div class="relative group">
                        <select 
                            :value="store.freelancerData.work_style"
                            @change="e => store.updateFreelancerData({ work_style: (e.target as HTMLSelectElement).value as WorkStyle })"
                            class="block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 px-4 text-white transition-all duration-300 hover:bg-white/10 [&>option]:bg-[#1a1a1a]"
                        >
                            <option value="REMOTE">원격</option>
                            <option value="ONSITE">상주</option>
                            <option value="HYBRID">하이브리드</option>
                        </select>
                    </div>
                </div>
            </div>

            <div v-motion :initial="{ opacity: 0, x: 20 }" :enter="{ opacity: 1, x: 0, transition: { delay: 200 } }">
                 <label class="block text-sm font-medium text-white/80 mb-2">업무 시작 가능일 <span class="text-red-400">*</span></label>
                 <div class="relative group">
                    <input 
                        type="date" 
                        :value="store.freelancerData.start_date"
                        @input="e => store.updateFreelancerData({ start_date: (e.target as HTMLInputElement).value })"
                        class="block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 px-4 text-white placeholder:text-white/30 transition-all duration-300 hover:bg-white/10 [color-scheme:dark]"
                    />
                 </div>
            </div>

            <div v-motion :initial="{ opacity: 0, x: 20 }" :enter="{ opacity: 1, x: 0, transition: { delay: 300 } }">
                 <label class="block text-sm font-medium text-white/80 mb-2">희망 근무 지역 <span class="text-red-400">*</span></label>
                 <div class="relative group">
                    <input 
                        type="text" 
                        :value="store.freelancerData.location"
                        @input="e => store.updateFreelancerData({ location: (e.target as HTMLInputElement).value })"
                        class="block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 px-4 text-white placeholder:text-white/30 transition-all duration-300 hover:bg-white/10"
                        placeholder="예: 서울, 판교, 또는 원격"
                    />
                 </div>
            </div>

             <!-- Tech Stack Input -->
            <div v-motion :initial="{ opacity: 0, x: 20 }" :enter="{ opacity: 1, x: 0, transition: { delay: 400 } }">
                 <label class="block text-sm font-medium text-white/80 mb-2">기술 스택</label>
                 <div class="flex gap-3">
                    <div class="relative flex-grow group">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-green-400">
                            <Code2 class="h-5 w-5 text-white/40" />
                        </div>
                        <input 
                            type="text" 
                            v-model="newSkillName" 
                            @keyup.enter="addSkill"
                            class="pl-12 block w-full bg-white/5 border border-white/10 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500/50 focus:border-transparent sm:text-sm py-4 text-white placeholder:text-white/30 transition-all duration-300 hover:bg-white/10"
                            placeholder="기술명 입력 (Enter로 추가)"
                        />
                    </div>
                    <button @click="addSkill" class="px-5 py-2 bg-white/10 rounded-2xl hover:bg-white/20 transition-all active:scale-95 text-white border border-white/10 hover:border-white/30 shadow-lg">
                        <Plus class="w-6 h-6" />
                    </button>
                </div>

                <div class="mt-4 flex flex-wrap gap-2 min-h-[40px]">
                     <span 
                        v-for="(skill, index) in store.freelancerData.freelancer_skills" 
                        :key="index"
                        v-motion
                        :initial="{ opacity: 0, scale: 0.8 }"
                        :enter="{ opacity: 1, scale: 1 }"
                        class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-300 border border-green-500/20 shadow-sm backdrop-blur-sm transition-all hover:bg-green-500/20"
                    >
                        {{ skill }}
                        <button @click="removeSkill(index)" class="ml-2 p-0.5 rounded-full hover:bg-white/10 inline-flex items-center justify-center text-green-400 hover:text-green-200 focus:outline-none transition-colors">
                            <X class="w-3.5 h-3.5" />
                        </button>
                    </span>
                    <span v-if="!store.freelancerData.freelancer_skills?.length" class="text-sm text-white/40 py-2 italic flex items-center">
                        <div class="w-1.5 h-1.5 rounded-full bg-white/20 mr-2"></div>
                        보유하신 기술을 추가해주세요.
                    </span>
                </div>
            </div>

            <div class="flex gap-4 mt-8 pt-4 border-t border-white/5">
                 <button @click="store.prevStep" class="flex-1 py-4 px-6 border border-white/10 rounded-2xl text-lg font-bold text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/20 transition-all active:scale-[0.98]">
                    이전
                </button>
                <button 
                    @click="handleFinish" 
                    class="group flex-1 py-4 px-6 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <span class="flex items-center justify-center gap-2">
                        완료하기
                        <ArrowRight class="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

