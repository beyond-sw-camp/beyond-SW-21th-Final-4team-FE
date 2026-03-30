<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMotion } from '@vueuse/motion';
import {
    ArrowLeft,
    Award,
    GraduationCap,
    CheckCircle,
    Info,
    Save,
    Loader2,
    Briefcase
} from 'lucide-vue-next';
import {
    type GradeLevel,
    type EducationType,
    type CertificationType,
    type EducationOption,
    type CertificationOption,
    type GradeCriteriaItem,
    getEducationOptions,
    getCertificationOptions,
    getGradeCriteria,
    calculateGrade,
    saveGrade
} from '@/api/MyPage/gradeApi';
import { useAlertStore } from '@/stores/alertStore';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const props = defineProps<{
  existingGrade?: string;
}>();

const savedGrade = computed(() => props.existingGrade?.trim() ?? '');

const selectedType = ref<'education' | 'certification'>('education');
const education = ref<EducationType | ''>('');
const yearsOfExperience = ref<number | ''>('');
const certification = ref<CertificationType | ''>('');
const certYears = ref<number | ''>('');
const calculatedGrade = ref<GradeLevel>('');
const calculatedGradeDescription = ref('');

const educationOptions = ref<EducationOption[]>([]);
const certificationOptions = ref<CertificationOption[]>([]);
const criteriaList = ref<GradeCriteriaItem[]>([]);

const isLoading = ref(false);
const isSaving = ref(false);
const alertStore = useAlertStore();

onMounted(async () => {
    try {
        const [eduOpts, certOpts, criteria] = await Promise.all([
            getEducationOptions(),
            getCertificationOptions(),
            getGradeCriteria()
        ]);
        educationOptions.value = eduOpts;
        certificationOptions.value = certOpts;
        criteriaList.value = criteria;

        if (eduOpts.length > 0) education.value = eduOpts[0].value;
        if (certOpts.length > 0) certification.value = certOpts[0].value;
    } catch (error) {
        console.error('Failed to load initial data', error);
    }
});

const handleCalculate = async () => {
    if (selectedType.value === 'education' && !education.value) return;
    if (selectedType.value === 'certification' && !certification.value) return;

    isLoading.value = true;
    calculatedGrade.value = '';
    calculatedGradeDescription.value = '';

    try {
        const result = await calculateGrade({
            type: selectedType.value,
            education: selectedType.value === 'education' ? (education.value as EducationType) : undefined,
            certification: selectedType.value === 'certification' ? (certification.value as CertificationType) : undefined,
            yearsOfExperience: selectedType.value === 'education' ? Number(yearsOfExperience.value) : Number(certYears.value)
        });
        calculatedGrade.value = result.grade;
        calculatedGradeDescription.value = result.gradeDescription ?? '';
    } catch (error) {
        console.error('Calculation failed', error);
        alertStore.open({ message: '등급 계산에 실패했습니다. 입력값을 확인해주세요.', type: 'error' });
    } finally {
        isLoading.value = false;
    }
};

const handleSave = async () => {
    if (!calculatedGrade.value) return;

    isSaving.value = true;
    try {
        await saveGrade({
            type: selectedType.value,
            education: selectedType.value === 'education' ? (education.value as EducationType) : undefined,
            certification: selectedType.value === 'certification' ? (certification.value as CertificationType) : undefined,
            yearsOfExperience: selectedType.value === 'education' ? Number(yearsOfExperience.value) : Number(certYears.value),
            grade: calculatedGrade.value
        });
        alertStore.open({ message: '등급 정보가 성공적으로 저장되었습니다.', type: 'success' });
    } catch (error) {
        console.error('Save failed', error);
        if (error instanceof Error && error.message.includes('saveGrade API not available')) {
            alertStore.open({ message: '등급 저장 기능은 준비 중입니다.', type: 'info' });
        } else {
            alertStore.open({ message: '저장에 실패했습니다.', type: 'error' });
        }
    } finally {
        isSaving.value = false;
    }
};

const getGradeColor = (grade: GradeLevel) => {
    switch (grade) {
        case '특급': return 'from-violet-100 to-pink-100 shadow-violet-200/60';
        case '고급': return 'from-sky-100 to-cyan-100 shadow-sky-200/60';
        case '중급': return 'from-emerald-100 to-teal-100 shadow-emerald-200/60';
        case '초급': return 'from-slate-100 to-slate-200 shadow-slate-200/60';
        default: return 'from-slate-50 to-slate-100 shadow-slate-200/50';
    }
};

const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
        case '특급': return 'bg-violet-500 shadow-lg shadow-violet-200';
        case '고급': return 'bg-sky-500 shadow-lg shadow-sky-200';
        case '중급': return 'bg-emerald-500 shadow-lg shadow-emerald-200';
        case '초급': return 'bg-slate-500 shadow-lg shadow-slate-200';
        default: return 'bg-slate-400';
    }
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-10 font-sans text-white">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-10">
        <button
            @click="$emit('back')"
            class="p-2 hover:bg-white/5 rounded-full transition-colors"
        >
            <ArrowLeft class="w-6 h-6 text-white/80" />
        </button>
        <div>
            <h1 class="text-3xl font-bold text-white tracking-tight">회원 등급 조회</h1>
            <p class="text-base text-slate-400 mt-1">학력, 경력, 자격증 정보를 바탕으로 회원 등급을 확인하세요.</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left Column: Input Form -->
        <div class="lg:col-span-7 space-y-6 animate-fade-in-up">

            <!-- Type Selection Cards -->
            <div class="grid grid-cols-2 gap-4">
                <button
                    @click="selectedType = 'education'; calculatedGrade = ''"
                    class="relative p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center justify-center text-center group overflow-hidden"
                    :class="selectedType === 'education'
                        ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'"
                >
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" v-if="selectedType !== 'education'"></div>
                    <div class="p-3 bg-blue-500/20 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                        <GraduationCap class="w-8 h-8 text-blue-400" />
                    </div>
                    <div class="font-bold text-lg text-white mb-1">학력 기준</div>
                    <div class="text-xs text-slate-400">학력 + 경력 기준 결정</div>

                    <div v-if="selectedType === 'education'" class="absolute top-4 right-4">
                        <CheckCircle class="w-5 h-5 text-blue-400 fill-blue-400/20" />
                    </div>
                </button>

                <button
                    @click="selectedType = 'certification'; calculatedGrade = ''"
                    class="relative p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center justify-center text-center group overflow-hidden"
                    :class="selectedType === 'certification'
                        ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'"
                >
                    <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" v-if="selectedType !== 'certification'"></div>
                     <div class="p-3 bg-emerald-500/20 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Award class="w-8 h-8 text-emerald-400" />
                    </div>
                    <div class="font-bold text-lg text-white mb-1">자격증 기준</div>
                    <div class="text-xs text-slate-400">자격증 + 경력 기준 결정</div>

                    <div v-if="selectedType === 'certification'" class="absolute top-4 right-4">
                        <CheckCircle class="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                    </div>
                </button>
            </div>

            <!-- Input Fields -->
            <div class="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                <!-- Education Inputs -->
                <div v-if="selectedType === 'education'" class="space-y-6 animate-fade-in">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2 mb-6">
                        <GraduationCap class="w-5 h-5 text-blue-400" />
                        학력 및 경력 정보 입력
                    </h2>
                     <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">최종 학력</label>
                        <div class="relative">
                            <select
                                v-model="education"
                                @change="calculatedGrade = ''"
                                class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-[#1e293b] transition-all appearance-none"
                            >
                                <option value="" disabled selected>선택하세요</option>
                                <option
                                    v-for="opt in educationOptions"
                                    :key="opt.value"
                                    :value="opt.value"
                                    class="bg-[#1e293b]"
                                >
                                    {{ opt.label }}
                                </option>
                            </select>
                            <div class="absolute right-4 top-3.5 pointer-events-none text-slate-500">▼</div>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">IT 분야 경력 (년)</label>
                        <div class="relative">
                            <Briefcase class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                type="number"
                                min="0"
                                v-model.number="yearsOfExperience"
                                @input="calculatedGrade = ''"
                                class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-[#1e293b] transition-all"
                                placeholder="예: 3"
                            />
                        </div>
                    </div>
                </div>

                <!-- Certification Inputs -->
                <div v-if="selectedType === 'certification'" class="space-y-6 animate-fade-in">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2 mb-6">
                        <Award class="w-5 h-5 text-emerald-400" />
                        자격증 및 경력 정보 입력
                    </h2>
                     <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">보유 자격증</label>
                        <div class="relative">
                            <select
                                v-model="certification"
                                @change="calculatedGrade = ''"
                                class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 focus:bg-[#1e293b] transition-all appearance-none"
                            >
                                 <option value="" disabled selected>선택하세요</option>
                                 <option
                                    v-for="opt in certificationOptions"
                                    :key="opt.value"
                                    :value="opt.value"
                                    class="bg-[#1e293b]"
                                >
                                    {{ opt.label }}
                                </option>
                            </select>
                            <div class="absolute right-4 top-3.5 pointer-events-none text-slate-500">▼</div>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">IT 분야 경력 (년)</label>
                        <div class="relative">
                            <Briefcase class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                type="number"
                                min="0"
                                v-model.number="certYears"
                                @input="calculatedGrade = ''"
                                class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-emerald-500/50 focus:bg-[#1e293b] transition-all"
                                placeholder="예: 3"
                            />
                        </div>
                    </div>
                </div>

                <div class="mt-8 pt-6 border-t border-white/5">
                    <button
                        @click="handleCalculate"
                        :disabled="(selectedType === 'education' ? !education : !certification) || isLoading"
                    class="w-full py-4 bg-gradient-to-r from-sky-400 to-cyan-300 hover:from-sky-300 hover:to-cyan-200 disabled:from-slate-200 disabled:to-slate-300 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl transition-all shadow-[0_18px_40px_-24px_rgba(125,211,252,0.8)] disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        <Loader2 v-if="isLoading" class="w-5 h-5 animate-spin" />
                        <span v-else>회원 등급 계산하기</span>
                    </button>
                </div>
            </div>

            <!-- Grade Criteria Table -->
             <div class="bg-white border border-slate-200 rounded-3xl p-8">
                <h3 class="text-lg font-bold text-slate-950 mb-6 flex items-center gap-2">
                    <Info class="w-5 h-5 text-sky-500" />
                    등급 산정 기준
                </h3>
                 <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead>
                            <tr class="border-b border-slate-200">
                                <th class="py-3 px-4 text-slate-700 font-bold w-20">등급</th>
                                <th class="py-3 px-4 text-slate-700 font-semibold">학력 기준</th>
                                <th class="py-3 px-4 text-slate-700 font-semibold">자격증 기준</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                             <tr v-for="item in criteriaList" :key="item.grade" class="hover:bg-slate-50 transition-colors">
                                <td class="py-4 px-4">
                                    <span :class="`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold text-white ${getGradeBadgeColor(item.grade)}`">{{ item.grade }}</span>
                                </td>
                                <td class="py-4 px-4 text-slate-700 text-xs leading-relaxed">{{ item.edu }}</td>
                                <td class="py-4 px-4 text-slate-700 text-xs leading-relaxed">{{ item.cert }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Right Column: Result & Info -->
        <div class="lg:col-span-5 space-y-6 animate-fade-in-up" style="animation-delay: 100ms;">
            <!-- Result Card -->
            <div
                class="relative rounded-3xl p-8 text-center min-h-[360px] flex flex-col items-center justify-center transition-all duration-500 shadow-[0_26px_70px_-46px_rgba(15,23,42,0.14)] overflow-hidden border border-slate-200"
                :class="calculatedGrade
                    ? `bg-gradient-to-br ${getGradeColor(calculatedGrade)}`
                    : 'bg-white border-slate-200'"
            >
                <!-- Background Pattern -->
                <div v-if="calculatedGrade" class="absolute -top-20 -right-20 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
                <div v-if="calculatedGrade" class="absolute -bottom-20 -left-20 w-64 h-64 bg-black/20 rounded-full blur-3xl"></div>

                <template v-if="calculatedGrade">
                    <div class="relative z-10 animate-fade-in-up">
                        <div class="mb-4 inline-flex p-4 bg-white/80 rounded-full ring-4 ring-white/60 shadow-inner">
                            <CheckCircle class="w-10 h-10 text-sky-600" />
                        </div>
                        <div class="text-sm font-medium text-slate-600 mb-1 tracking-wide uppercase">산정 결과</div>
                        <div class="text-6xl font-black text-slate-950 mb-2">{{ calculatedGrade }}</div>
                        <div class="text-base text-slate-600 font-medium mb-8">등급이 산정되었습니다.</div>

                        <div class="bg-white/85 rounded-xl p-4 text-left border border-white/80 mb-8 max-w-xs mx-auto">
                            <div class="flex items-start gap-3">
                                <Info class="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                                <p class="text-xs text-slate-600 leading-relaxed">
                                    이 결과는 입력하신 정보를 바탕으로 계산한 예상 등급입니다.
                                    실제 등급은 증빙 서류에 따라 달라질 수 있습니다.
                                </p>
                            </div>
                        </div>

                         <button
                            @click="handleSave"
                            :disabled="isSaving"
                            class="w-full px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin text-slate-900" />
                            <Save v-else class="w-4 h-4 text-slate-900" />
                            등급 정보 저장하기
                        </button>
                    </div>
                </template>

                 <template v-else-if="savedGrade">
                    <div class="relative z-10 animate-fade-in-up">
                        <div class="mb-4 inline-flex p-4 bg-white/80 rounded-full ring-4 ring-white/60 shadow-inner">
                            <Award class="w-10 h-10 text-sky-600" />
                        </div>
                        <div class="text-sm font-medium text-slate-600 mb-1 tracking-wide uppercase">현재 등급</div>
                        <div class="text-5xl font-black text-slate-950 mb-2">{{ savedGrade }}</div>
                        <div class="text-base text-slate-600 font-medium">당신의 등급은 {{ savedGrade }} 등급입니다.</div>
                    </div>
                </template>

                 <template v-else>
                    <div class="text-slate-500 flex flex-col items-center">
                        <div class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Award class="w-10 h-10 text-slate-600" />
                        </div>
                        <p class="text-lg font-bold text-slate-400">등급을 계산해보세요</p>
                        <p class="text-sm text-slate-500 mt-2">왼쪽에서 정보를 입력하면<br />결과가 표시됩니다.</p>
                    </div>
                </template>
            </div>

            <!-- Warning Card -->
            <div class="bg-amber-50 border border-amber-100 rounded-3xl p-6 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-amber-100 rounded-full blur-2xl"></div>
                <h4 class="text-amber-700 font-bold flex items-center gap-2 mb-3 relative z-10">
                    <Info class="w-5 h-5" />
                    유의 사항
                </h4>
                <p class="text-sm text-slate-700 leading-relaxed relative z-10">
                    입력하신 정보가 허위로 판명될 경우, 회사 정책에 따라
                    <span class="text-amber-700 font-bold underline decoration-amber-300 decoration-2 underline-offset-2">계정 정지 또는 법적 책임</span>이 발생할 수 있습니다.
                    반드시 사실에 근거한 정보를 입력해 주세요.
                </p>
            </div>
        </div>
    </div>
  </div>
</template>
