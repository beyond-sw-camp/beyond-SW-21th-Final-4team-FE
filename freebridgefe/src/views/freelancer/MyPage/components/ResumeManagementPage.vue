<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useMotion } from "@vueuse/motion";
import {
    ArrowLeft,
    Save,
    User,
    Calendar,
    Phone,
    Mail,
    MapPin,
    GraduationCap,
    Plus,
    Trash2,
    Briefcase,
    Award,
    Check,
    Edit3,
    X,
    Loader2
} from "lucide-vue-next";
import {
    getResumeDetail,
    updateResumeBasicInfo,
    addEducation,
    updateEducation,
    deleteEducation,
    addCareer,
    updateCareer,
    deleteCareer,
    addCertification,
    updateCertification,
    deleteCertification,
    type ResumeDetail,
    type Education,
    type Career,
    type Certification
} from '@/api/MyPage/resumeApi';
import { useAuthStore } from '@/stores/authStore';

const emit = defineEmits<{
    (e: 'back'): void;
}>();

const authStore = useAuthStore();

// --- State ---
const resumeData = ref<ResumeDetail>({
    id: 0,
    name: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    educations: [],
    careers: [],
    certifications: []
});

const isLoading = ref(true);
const isSaving = ref(false);
const deletedEducationIndexes = ref<number[]>([]);
const deletedCareerIndexes = ref<number[]>([]);
const deletedCertificationIndexes = ref<number[]>([]);

const editingEducationIndex = ref<number | null>(null);
const editingCareerIndex = ref<number | null>(null);
const editingCertificationIndex = ref<number | null>(null);
const editEducationDraft = ref<Education | null>(null);
const editCareerDraft = ref<Career | null>(null);
const editCertificationDraft = ref<Certification | null>(null);

// --- Temporary State for Adding Items ---
const isAddingEducation = ref(false);
const newEducation = ref<Education>({
    id: 0,
    schoolType: '대학교',
    schoolName: '',
    major: '',
    status: '졸업',
    entranceDate: '',
    graduationDate: ''
});

const isAddingCareer = ref(false);
const newCareer = ref<Career>({
    id: 0,
    companyName: '',
    department: '',
    position: '',
    jobType: '',
    employmentType: '정규직',
    startDate: '',
    endDate: '',
    description: ''
});

const isAddingCertification = ref(false);
const newCertification = ref<Certification>({
    id: 0,
    name: '',
    issuer: '',
    acquisitionDate: ''
});

// --- Actions ---

onMounted(async () => {
    try {
        isLoading.value = true;
        const loaded = await getResumeDetail();
        resumeData.value = loaded;
        if (authStore.user?.name && !resumeData.value.name) {
            resumeData.value.name = authStore.user.name;
        }
        if (authStore.user?.email && !resumeData.value.email) {
            resumeData.value.email = authStore.user.email;
        }
    } catch (e) {
        console.error(e);
        alert('이력서 데이터를 불러오는 데 실패했습니다.');
    } finally {
        isLoading.value = false;
    }
});

const handleSave = async () => {
    try {
        isSaving.value = true;
        // Commit any in-progress inline edits before saving
        if (editingEducationIndex.value !== null && editEducationDraft.value) {
            await saveEditEducation();
        }
        if (editingCareerIndex.value !== null && editCareerDraft.value) {
            await saveEditCareer();
        }
        if (editingCertificationIndex.value !== null && editCertificationDraft.value) {
            await saveEditCertification();
        }
        await updateResumeBasicInfo(resumeData.value);

        const sortedEducationDeletes = [...new Set(deletedEducationIndexes.value)].sort((a, b) => b - a);
        for (const index of sortedEducationDeletes) {
            await deleteEducation(index);
        }
        const sortedCareerDeletes = [...new Set(deletedCareerIndexes.value)].sort((a, b) => b - a);
        for (const index of sortedCareerDeletes) {
            await deleteCareer(index);
        }
        const sortedCertificationDeletes = [...new Set(deletedCertificationIndexes.value)].sort((a, b) => b - a);
        for (const index of sortedCertificationDeletes) {
            await deleteCertification(index);
        }

        const newEducations = resumeData.value.educations.filter((edu) => edu.isNew);
        for (const edu of newEducations) {
            await addEducation(edu);
        }
        const newCareers = resumeData.value.careers.filter((career) => career.isNew);
        for (const career of newCareers) {
            await addCareer(career);
        }
        const newCertifications = resumeData.value.certifications.filter((cert) => cert.isNew);
        for (const cert of newCertifications) {
            await addCertification(cert);
        }

        deletedEducationIndexes.value = [];
        deletedCareerIndexes.value = [];
        deletedCertificationIndexes.value = [];
        const refreshed = await getResumeDetail();
        resumeData.value = refreshed;
        if (authStore.user?.name && !resumeData.value.name) {
            resumeData.value.name = authStore.user.name;
        }
        if (authStore.user?.email && !resumeData.value.email) {
            resumeData.value.email = authStore.user.email;
        }

        alert('이력서 정보가 성공적으로 저장되었습니다.');
    } catch (e) {
        alert('저장 중 오류가 발생했습니다.');
    } finally {
        isSaving.value = false;
    }
};

// --- Education Actions ---
const addEducationItem = () => {
    if (!newEducation.value.schoolName) return alert('학교명을 입력해 주세요.');
    resumeData.value.educations.push({ ...newEducation.value, id: Date.now(), isNew: true });
    
    // Reset
    newEducation.value = {
        id: 0,
        schoolType: '대학교',
        schoolName: '',
        major: '',
        status: '졸업',
        entranceDate: '',
        graduationDate: ''
    };
    isAddingEducation.value = false;
};

const removeEducation = (index: number) => {
    if (confirm('해당 학력 정보를 삭제하시겠습니까?')) {
        const target = resumeData.value.educations[index];
        if (target && !target.isNew && typeof target.serverIndex === 'number') {
            if (!deletedEducationIndexes.value.includes(target.serverIndex)) {
                deletedEducationIndexes.value.push(target.serverIndex);
            }
        }
        resumeData.value.educations.splice(index, 1);
    }
};

const startEditEducation = (index: number) => {
    const target = resumeData.value.educations[index];
    if (!target) return;
    editingEducationIndex.value = index;
    editEducationDraft.value = { ...target };
};

const cancelEditEducation = () => {
    editingEducationIndex.value = null;
    editEducationDraft.value = null;
};

const saveEditEducation = async () => {
    if (editingEducationIndex.value === null || !editEducationDraft.value) return;
    const index = editingEducationIndex.value;
    const target = resumeData.value.educations[index];
    if (!target) return;
    if (target.isNew || typeof target.serverIndex !== 'number') {
        resumeData.value.educations[index] = { ...target, ...editEducationDraft.value, isNew: true };
        cancelEditEducation();
        return;
    }
    const serverIndex = target.serverIndex;
    await updateEducation(serverIndex, editEducationDraft.value);
    resumeData.value.educations[index] = { ...target, ...editEducationDraft.value, isNew: false };
    cancelEditEducation();
};

// --- Career Actions ---
const addCareerItem = () => {
    if (!newCareer.value.companyName) return alert('회사명을 입력해 주세요.');
    resumeData.value.careers.push({ ...newCareer.value, id: Date.now(), isNew: true });

    // Reset
    newCareer.value = {
        id: 0,
        companyName: '',
        department: '',
        position: '',
        jobType: '',
        employmentType: '정규직',
        startDate: '',
        endDate: '',
        description: ''
    };
    isAddingCareer.value = false;
};

const removeCareer = (index: number) => {
    if (confirm('해당 경력 정보를 삭제하시겠습니까?')) {
        const target = resumeData.value.careers[index];
        if (target && !target.isNew && typeof target.serverIndex === 'number') {
            if (!deletedCareerIndexes.value.includes(target.serverIndex)) {
                deletedCareerIndexes.value.push(target.serverIndex);
            }
        }
        resumeData.value.careers.splice(index, 1);
    }
};

const startEditCareer = (index: number) => {
    const target = resumeData.value.careers[index];
    if (!target) return;
    editingCareerIndex.value = index;
    editCareerDraft.value = { ...target };
};

const cancelEditCareer = () => {
    editingCareerIndex.value = null;
    editCareerDraft.value = null;
};

const saveEditCareer = async () => {
    if (editingCareerIndex.value === null || !editCareerDraft.value) return;
    const index = editingCareerIndex.value;
    const target = resumeData.value.careers[index];
    if (!target) return;
    if (target.isNew || typeof target.serverIndex !== 'number') {
        resumeData.value.careers[index] = { ...target, ...editCareerDraft.value, isNew: true };
        cancelEditCareer();
        return;
    }
    const serverIndex = target.serverIndex;
    await updateCareer(serverIndex, editCareerDraft.value);
    resumeData.value.careers[index] = { ...target, ...editCareerDraft.value, isNew: false };
    cancelEditCareer();
};

// --- Certification Actions ---
const addCertificationItem = () => {
    if (!newCertification.value.name) return alert('자격증명을 입력해 주세요.');
    resumeData.value.certifications.push({ ...newCertification.value, id: Date.now(), isNew: true });

    // Reset
    newCertification.value = {
        id: 0,
        name: '',
        issuer: '',
        acquisitionDate: ''
    };
    isAddingCertification.value = false;
};

const removeCertification = (index: number) => {
    if (confirm('해당 자격증 정보를 삭제하시겠습니까?')) {
        const target = resumeData.value.certifications[index];
        if (target && !target.isNew && typeof target.serverIndex === 'number') {
            if (!deletedCertificationIndexes.value.includes(target.serverIndex)) {
                deletedCertificationIndexes.value.push(target.serverIndex);
            }
        }
        resumeData.value.certifications.splice(index, 1);
    }
};

const startEditCertification = (index: number) => {
    const target = resumeData.value.certifications[index];
    if (!target) return;
    editingCertificationIndex.value = index;
    editCertificationDraft.value = { ...target };
};

const cancelEditCertification = () => {
    editingCertificationIndex.value = null;
    editCertificationDraft.value = null;
};

const saveEditCertification = async () => {
    if (editingCertificationIndex.value === null || !editCertificationDraft.value) return;
    const index = editingCertificationIndex.value;
    const target = resumeData.value.certifications[index];
    if (!target) return;
    if (target.isNew || typeof target.serverIndex !== 'number') {
        resumeData.value.certifications[index] = { ...target, ...editCertificationDraft.value, isNew: true };
        cancelEditCertification();
        return;
    }
    const serverIndex = target.serverIndex;
    await updateCertification(serverIndex, editCertificationDraft.value);
    resumeData.value.certifications[index] = { ...target, ...editCertificationDraft.value, isNew: false };
    cancelEditCertification();
};
</script>

<template>
    <div class="max-w-7xl mx-auto px-4 md:px-8 py-10 font-sans text-slate-800">
        <!-- Header -->
        <div class="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
                <button
                    @click="$emit('back')"
                    class="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white transition-all hover:bg-slate-50 hover:border-slate-300"
                >
                    <ArrowLeft class="w-6 h-6 text-sky-600" />
                </button>
                <div>
                    <h1 class="text-3xl font-bold text-slate-950 tracking-tight">이력서 상세 관리</h1>
                    <p class="text-base text-slate-500 mt-1">기본 정보와 학력/경력/자격증을 관리하세요.</p>
                </div>
            </div>
            <button
                @click="handleSave"
                :disabled="isSaving"
                class="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200/20 bg-gradient-to-r from-sky-400/80 via-sky-300/75 to-cyan-200/80 px-6 py-3 font-bold text-slate-950 shadow-[0_16px_40px_-20px_rgba(125,211,252,0.95)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
                <Save v-else class="w-4 h-4" />
                <span>{{ isSaving ? '저장 중...' : '저장하기' }}</span>
            </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center py-40">
            <Loader2 class="w-10 h-10 animate-spin text-sky-500" />
        </div>

        <div v-else class="space-y-8 animate-fade-in-up">
            <div class="rounded-[28px] border border-sky-100 bg-gradient-to-r from-white via-sky-50 to-cyan-50 p-5 shadow-[0_20px_60px_-36px_rgba(56,189,248,0.18)]">
                <div class="flex items-start gap-3">
                    <div class="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                        <Check class="w-4 h-4" />
                    </div>
                    <div>
                        <p class="text-sm font-semibold tracking-wide text-sky-700">저장 안내</p>
                        <p class="mt-1 text-sm leading-relaxed text-slate-700">
                            항목을 추가하거나 삭제한 뒤에는 반드시 우측 상단의 저장하기 버튼을 눌러 최종 반영해 주세요.
                        </p>
                    </div>
                </div>
            </div>
            <!-- 1. 기본 정보 (Basic Info) -->
            <section class="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-8 shadow-[0_28px_90px_-54px_rgba(15,23,42,0.95)] backdrop-blur-2xl">
                <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <div class="p-2 bg-blue-500/10 rounded-lg">
                        <User class="w-5 h-5 text-blue-400" />
                    </div>
                    기본 정보
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">이름</label>
                        <input
                            type="text"
                            v-model="resumeData.name"
                            class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-[#1e293b] transition-all"
                            placeholder="이름 입력"
                        />
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">생년월일</label>
                        <input
                            type="date"
                            v-model="resumeData.birthDate"
                            class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-[#1e293b] transition-all"
                        />
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">연락처</label>
                        <div class="relative">
                            <Phone class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                type="tel"
                                v-model="resumeData.phone"
                                class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-[#1e293b] transition-all"
                                placeholder="010-0000-0000"
                            />
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">이메일</label>
                        <div class="relative">
                            <Mail class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                type="email"
                                v-model="resumeData.email"
                                class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-[#1e293b] transition-all"
                                placeholder="example@email.com"
                            />
                        </div>
                    </div>
                    <div class="md:col-span-2 space-y-2">
                        <label class="text-xs text-slate-400 font-bold ml-1">주소</label>
                        <div class="relative">
                            <MapPin class="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                            <input
                                type="text"
                                v-model="resumeData.address"
                                class="w-full bg-[#1e293b]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-[#1e293b] transition-all"
                                placeholder="주소 입력"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <!-- 2. 학력 사항 (Education) -->
            <section class="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-8 shadow-[0_28px_90px_-54px_rgba(15,23,42,0.95)] backdrop-blur-2xl">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                         <div class="p-2 bg-green-500/10 rounded-lg">
                            <GraduationCap class="w-5 h-5 text-green-400" />
                        </div>
                        학력 사항
                    </h2>
                    <button 
                        v-if="!isAddingEducation"
                        @click="isAddingEducation = true"
                        class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-slate-300 hover:text-white transition-all flex items-center gap-2"
                    >
                        <Plus class="w-4 h-4" /> 항목 추가
                    </button>
                </div>

                <!-- List -->
                <div class="space-y-4">
                    <div 
                        v-for="(edu, index) in resumeData.educations" 
                        :key="edu.id" 
                        class="group bg-[#1e293b]/30 hover:bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 transition-all"
                    >
                        <template v-if="editingEducationIndex === index && editEducationDraft">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">학교 구분</label>
                                    <select v-model="editEducationDraft.schoolType" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                                        <option
                                            v-if="editEducationDraft.schoolType && !['고등학교', '전문대', '대학교'].includes(editEducationDraft.schoolType)"
                                            :value="editEducationDraft.schoolType"
                                            disabled
                                        >
                                            {{ editEducationDraft.schoolType }}
                                        </option>
                                        <option value="고등학교">고등학교</option>
                                        <option value="대학교">대학교</option>
                                        <option value="대학원">대학원</option>
                                    </select>
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">학교명</label>
                                    <input type="text" v-model="editEducationDraft.schoolName" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">전공</label>
                                    <input type="text" v-model="editEducationDraft.major" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">상태</label>
                                    <select v-model="editEducationDraft.status" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                                        <option value="졸업">졸업</option>
                                        <option value="재학">재학</option>
                                        <option value="휴학">휴학</option>
                                        <option value="기타">기타</option>
                                    </select>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="space-y-1">
                                        <label class="text-xs text-slate-500 ml-1">입학일</label>
                                        <input type="text" v-model="editEducationDraft.entranceDate" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="YYYY.MM" />
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs text-slate-500 ml-1">졸업일</label>
                                        <input type="text" v-model="editEducationDraft.graduationDate" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="YYYY.MM" />
                                    </div>
                                </div>
                            </div>
                            <div class="flex justify-end gap-2">
                                <button @click="cancelEditEducation" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">취소</button>
                                <button @click="saveEditEducation" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-bold transition-colors">수정 완료</button>
                            </div>
                        </template>
                        <template v-else>
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div class="flex-1">
                                    <div class="flex items-center gap-3 mb-2">
                                        <span class="text-xs px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 font-bold">{{ edu.schoolType }}</span>
                                        <span class="text-xs text-slate-500 px-2 py-0.5 rounded-md bg-white/5">{{ edu.status }}</span>
                                    </div>
                                    <h3 class="font-bold text-white text-lg">{{ edu.schoolName }}</h3>
                                    <p class="text-sm text-slate-400 mt-1">{{ edu.major }}</p>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="text-sm text-slate-500 font-mono bg-black/20 px-3 py-1 rounded-lg">{{ edu.entranceDate }} ~ {{ edu.graduationDate }}</span>
                                    <button 
                                        @click="startEditEducation(index)" 
                                        class="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="수정"
                                    >
                                        <Edit3 class="w-5 h-5" />
                                    </button>
                                    <button 
                                        @click="removeEducation(index)" 
                                        class="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="삭제"
                                    >
                                        <Trash2 class="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>

                    <!-- Add Form -->
                    <div v-if="isAddingEducation" class="bg-[#1e293b]/50 border border-green-500/30 rounded-2xl p-6 animate-fade-in-down">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-bold text-green-400">신규 학력 추가</h3>
                            <button @click="isAddingEducation = false" class="text-slate-500 hover:text-white"><X class="w-4 h-4" /></button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">학교 구분</label>
                                <select v-model="newEducation.schoolType" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                                    <option value="고등학교">고등학교</option>
                                    <option value="대학교">대학교</option>
                                    <option value="대학원">대학원</option>
                                </select>
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">학교명</label>
                                <input type="text" v-model="newEducation.schoolName" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="예: 한국대학교" />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">전공</label>
                                <input type="text" v-model="newEducation.major" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="예: 컴퓨터공학과" />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">상태</label>
                                <select v-model="newEducation.status" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                                    <option value="졸업">졸업</option>
                                    <option value="재학">재학</option>
                                    <option value="휴학">휴학</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">입학일</label>
                                    <input type="text" v-model="newEducation.entranceDate" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="YYYY.MM" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">졸업일</label>
                                    <input type="text" v-model="newEducation.graduationDate" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="YYYY.MM" />
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end gap-2">
                            <button @click="isAddingEducation = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">취소</button>
                            <button @click="addEducationItem" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-bold transition-colors">추가 완료</button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 3. 경력 사항 (Career) -->
            <section class="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-8 shadow-[0_28px_90px_-54px_rgba(15,23,42,0.95)] backdrop-blur-2xl">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <div class="p-2 bg-orange-500/10 rounded-lg">
                            <Briefcase class="w-5 h-5 text-orange-400" />
                        </div>
                        경력 사항
                    </h2>
                    <button 
                        v-if="!isAddingCareer"
                        @click="isAddingCareer = true"
                        class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-slate-300 hover:text-white transition-all flex items-center gap-2"
                    >
                        <Plus class="w-4 h-4" /> 항목 추가
                    </button>
                </div>

                <div class="space-y-6">
                    <div 
                        v-for="(career, index) in resumeData.careers" 
                        :key="career.id" 
                        class="relative pl-8 group"
                    >
                        <!-- Timeline Line -->
                        <div class="absolute left-[11px] top-8 bottom-0 w-0.5 bg-white/10 group-last:hidden"></div>
                        <!-- Dot -->
                        <div class="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-[#1e293b] border-2 border-orange-500 z-10"></div>

                        <div class="bg-[#1e293b]/30 hover:bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 transition-all relative">
                            <template v-if="editingCareerIndex === index && editCareerDraft">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div class="col-span-1 md:col-span-2 space-y-1">
                                        <label class="text-xs text-slate-500 ml-1">회사명</label>
                                        <input type="text" v-model="editCareerDraft.companyName" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs text-slate-500 ml-1">부서</label>
                                        <input type="text" v-model="editCareerDraft.department" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs text-slate-500 ml-1">직위/직무</label>
                                        <input type="text" v-model="editCareerDraft.position" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs text-slate-500 ml-1">고용 형태</label>
                                        <select v-model="editCareerDraft.employmentType" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                                            <option value="정규직">정규직</option>
                                            <option value="계약직">계약직</option>
                                            <option value="프리랜서">프리랜서</option>
                                            <option value="인턴">인턴</option>
                                        </select>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-xs text-slate-500 ml-1">담당 업무/직무</label>
                                        <input type="text" v-model="editCareerDraft.jobType" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                    </div>
                                    <div class="grid grid-cols-2 gap-2">
                                        <div class="space-y-1">
                                            <label class="text-xs text-slate-500 ml-1">입사일</label>
                                            <input type="text" v-model="editCareerDraft.startDate" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="YYYY.MM" />
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-xs text-slate-500 ml-1">퇴사일</label>
                                            <input type="text" v-model="editCareerDraft.endDate" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="YYYY.MM 또는 재직중" />
                                        </div>
                                    </div>
                                    <div class="col-span-1 md:col-span-2 space-y-1">
                                        <label class="text-xs text-slate-500 ml-1">상세 설명</label>
                                        <textarea v-model="editCareerDraft.description" rows="3" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none resize-none"></textarea>
                                    </div>
                                </div>
                                <div class="flex justify-end gap-2">
                                    <button @click="cancelEditCareer" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">취소</button>
                                    <button @click="saveEditCareer" class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg font-bold transition-colors">수정 완료</button>
                                </div>
                            </template>
                            <template v-else>
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 class="font-bold text-white text-lg">{{ career.companyName }}</h3>
                                        <div class="flex items-center gap-2 mt-1 text-sm">
                                            <span class="text-orange-400 font-bold">{{ career.position }}</span>
                                            <span class="text-slate-600">|</span>
                                            <span class="text-slate-400">{{ career.department }}</span>
                                            <span class="text-slate-600">|</span>
                                            <span class="text-xs px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{{ career.employmentType }}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-sm text-slate-500 font-mono bg-black/20 px-3 py-1 rounded-lg">{{ career.startDate }} ~ {{ career.endDate }}</span>
                                        <button 
                                            @click="startEditCareer(index)" 
                                            class="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <Edit3 class="w-5 h-5" />
                                        </button>
                                        <button 
                                            @click="removeCareer(index)" 
                                            class="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        >
                                            <Trash2 class="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="bg-black/20 rounded-xl p-4 border border-white/5">
                                    <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{{ career.description }}</p>
                                    <div class="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                                        <span class="text-xs text-slate-500 font-bold">담당 업무:</span>
                                        <span class="text-xs text-slate-400">{{ career.jobType }}</span>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>

                    <!-- Add Form -->
                    <div v-if="isAddingCareer" class="bg-[#1e293b]/50 border border-orange-500/30 rounded-2xl p-6 animate-fade-in-down ml-8">
                         <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-bold text-orange-400">신규 경력 추가</h3>
                            <button @click="isAddingCareer = false" class="text-slate-500 hover:text-white"><X class="w-4 h-4" /></button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div class="col-span-1 md:col-span-2 space-y-1">
                                <label class="text-xs text-slate-500 ml-1">회사명</label>
                                <input type="text" v-model="newCareer.companyName" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">부서</label>
                                <input type="text" v-model="newCareer.department" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                            </div>
                             <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">직위/직무</label>
                                <input type="text" v-model="newCareer.position" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">고용 형태</label>
                                <select v-model="newCareer.employmentType" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none">
                                    <option value="정규직">정규직</option>
                                    <option value="계약직">계약직</option>
                                    <option value="프리랜서">프리랜서</option>
                                    <option value="인턴">인턴</option>
                                </select>
                            </div>
                             <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">담당 업무/직무</label>
                                <input type="text" v-model="newCareer.jobType" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="예: 백엔드 개발" />
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">입사일</label>
                                    <input type="text" v-model="newCareer.startDate" placeholder="YYYY.MM" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">퇴사일</label>
                                    <input type="text" v-model="newCareer.endDate" placeholder="YYYY.MM 또는 재직중" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                </div>
                            </div>
                            <div class="col-span-1 md:col-span-2 space-y-1">
                                 <label class="text-xs text-slate-500 ml-1">상세 설명</label>
                                 <textarea v-model="newCareer.description" rows="3" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none resize-none" placeholder="주요 성과와 업무 내용을 적어주세요."></textarea>
                            </div>
                        </div>
                        <div class="flex justify-end gap-2">
                            <button @click="isAddingCareer = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">취소</button>
                            <button @click="addCareerItem" class="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg font-bold transition-colors">추가 완료</button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 4. 자격증(Certifications) -->
            <section class="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-8 shadow-[0_28px_90px_-54px_rgba(15,23,42,0.95)] backdrop-blur-2xl">
               <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <div class="p-2 bg-yellow-500/10 rounded-lg">
                            <Award class="w-5 h-5 text-yellow-400" />
                        </div>
                        자격증
                    </h2>
                    <button 
                        v-if="!isAddingCertification"
                        @click="isAddingCertification = true"
                        class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-slate-300 hover:text-white transition-all flex items-center gap-2"
                    >
                        <Plus class="w-4 h-4" /> 항목 추가
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div 
                        v-for="(cert, index) in resumeData.certifications" 
                        :key="cert.id" 
                        class="bg-[#1e293b]/30 hover:bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 transition-all group flex flex-col justify-between"
                    >
                        <template v-if="editingCertificationIndex === index && editCertificationDraft">
                            <div class="grid grid-cols-1 gap-4 mb-4">
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">자격증명</label>
                                    <input type="text" v-model="editCertificationDraft.name" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">발급기관</label>
                                    <input type="text" v-model="editCertificationDraft.issuer" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs text-slate-500 ml-1">취득일</label>
                                    <input type="text" v-model="editCertificationDraft.acquisitionDate" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" placeholder="YYYY.MM" />
                                </div>
                            </div>
                            <div class="flex justify-end gap-2">
                                <button @click="cancelEditCertification" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">취소</button>
                                <button @click="saveEditCertification" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg font-bold transition-colors">수정 완료</button>
                            </div>
                        </template>
                        <template v-else>
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <Award class="w-8 h-8 text-yellow-500/50" />
                                    <div class="flex items-center gap-2">
                                        <button @click="startEditCertification(index)" class="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit3 class="w-4 h-4" />
                                        </button>
                                        <button @click="removeCertification(index)" class="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 class="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 class="font-bold text-white text-lg leading-tight">{{ cert.name }}</h3>
                                <p class="text-sm text-slate-400 mt-1">{{ cert.issuer }}</p>
                            </div>
                            <div class="mt-4 pt-4 border-t border-white/5 text-xs text-slate-500 font-mono">
                                취득일 {{ cert.acquisitionDate }}
                            </div>
                        </template>
                    </div>

                    <!-- Add Form Card -->
                    <div v-if="isAddingCertification" class="col-span-1 md:col-span-2 lg:col-span-3 bg-[#1e293b]/50 border border-yellow-500/30 rounded-2xl p-6 animate-fade-in">
                         <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-bold text-yellow-400">신규 자격증 추가</h3>
                            <button @click="isAddingCertification = false" class="text-slate-500 hover:text-white"><X class="w-4 h-4" /></button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">자격증명</label>
                                <input type="text" v-model="newCertification.name" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">발급기관</label>
                                <input type="text" v-model="newCertification.issuer" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs text-slate-500 ml-1">취득일</label>
                                <input type="text" v-model="newCertification.acquisitionDate" placeholder="YYYY.MM" class="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
                            </div>
                        </div>
                        <div class="flex justify-end gap-2">
                             <button @click="isAddingCertification = false" class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">취소</button>
                            <button @click="addCertificationItem" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg font-bold transition-colors">추가 완료</button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>
