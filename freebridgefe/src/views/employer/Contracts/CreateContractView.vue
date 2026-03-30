<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    FilePlus,
    Building2,
    User,
    FolderOpen,
    Calendar,
    DollarSign,
    CheckCircle,
    ArrowLeft,
    ArrowRight,
    FileText,
    Send,
    CreditCard,
    Clock,
    Briefcase,
    MapPin,
    AlertCircle,
    Loader2,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useContractStore, type ContractWithDetails } from '@/stores/contractStore';
import { useFreelancerStore } from '@/stores/freelancerStore';
import { createContract, getEmployerRecruitmentProjects, getMatchedFreelancers, type EmployerProject, type MatchedFreelancer } from '@/api/contractApi';
import { getEmployerProfile } from '@/api/MyPage/employer';
import SignaturePadModal from './components/SignaturePadModal.vue';
import ContractPreview from '@/components/contract/ContractPreview.vue';

type CreateContractState = 'form' | 'preview' | 'signing' | 'success';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const contractStore = useContractStore();
const freelancerStore = useFreelancerStore();

const state = ref<CreateContractState>('form');
const currentStep = ref(1);
const totalSteps = 2;
const isSubmitting = ref(false);
const submitError = ref('');
const contractRoomConnectionWarning = ref('');

// Projects & matched freelancers
const projectOptions = ref<EmployerProject[]>([]);
const isLoadingProjects = ref(false);
const projectLoadError = ref('');
const selectedProjectId = ref<number | ''>('');
const freelancerOptions = ref<MatchedFreelancer[]>([]);
const isLoadingFreelancers = ref(false);
const freelancerLoadError = ref('');

function extractArray<T>(data: any): T[] {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.content)) return data.content;
    return [];
}

function getNumericQueryValue(value: unknown) {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getStringQueryValue(value: unknown) {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (rawValue === undefined || rawValue === null) return null;
    const normalizedValue = String(rawValue).trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function formatDateInput(value?: Date | string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function findMatchingProjectByJobId(jobId: number | null) {
    if (!jobId) return null;
    return projectOptions.value.find((project) =>
        Number(project.projectId) === jobId || Number(project.jobPostingId) === jobId
    ) || null;
}

async function loadMatchedFreelancers(id: number) {
    isLoadingFreelancers.value = true;
    freelancerLoadError.value = '';
    freelancerOptions.value = [];
    selectedFreelancerId.value = '';
    try {
        const data = await getMatchedFreelancers(id);
        freelancerOptions.value = data.content;
        if (data.content.length === 0) {
            freelancerLoadError.value = '이 프로젝트에 매칭된 프리랜서가 없습니다.';
        }
    } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || '';
        freelancerLoadError.value = `프리랜서 목록을 불러오지 못했습니다. ${msg}`;
        console.error('Failed to load matched freelancers:', e);
    } finally {
        isLoadingFreelancers.value = false;
    }
}

async function onProjectSelect(id: number | '') {
    selectedProjectId.value = id;
    freelancerLoadError.value = '';
    if (id !== '') {
        await loadMatchedFreelancers(Number(id));
    } else {
        freelancerOptions.value = [];
        selectedFreelancerId.value = '';
    }
}

onMounted(async () => {
    isLoadingProjects.value = true;
    projectLoadError.value = '';

    const [projectsResult, profileResult] = await Promise.allSettled([
        getEmployerRecruitmentProjects(),
        getEmployerProfile(),
    ]);

    if (projectsResult.status === 'fulfilled') {
        projectOptions.value = extractArray<EmployerProject>(projectsResult.value);
        if (projectOptions.value.length === 0) {
            projectLoadError.value = '등록된 프로젝트가 없습니다.';
        }
    } else {
        const e = projectsResult.reason;
        const msg = e?.response?.data?.message || e?.message || '';
        projectLoadError.value = `프로젝트 목록을 불러오지 못했습니다. ${msg}`;
        console.error('Failed to load projects:', e);
    }

    if (profileResult.status === 'fulfilled') {
        const profile = profileResult.value;
        if (profile.companyName) employerBusinessName.value = profile.companyName;
        if (profile.location) employerAddress.value = profile.location;
        // CEO name: fallback to auth user name
        if (!employerCEO.value) employerCEO.value = authStore.user?.name || '';
    }

    isLoadingProjects.value = false;
    await applyRouteContextToCreateForm();
});

// Step 1: Basic Info
const selectedFreelancerId = ref<number | ''>('');
const projectName = ref('');
const jobDescription = ref('');
const startDate = ref('');
const endDate = ref('');
const budget = ref('');
const paymentDay = ref<number>(25);

// Step 2: Work Schedule
type WorkScheduleType = 'FLEXIBLE' | 'FIXED';
const workScheduleType = ref<WorkScheduleType>('FLEXIBLE');
const workStartTime = ref('09:00');
const workEndTime = ref('18:00');
const breakStartTime = ref('12:00');
const breakEndTime = ref('13:00');
const workDaysPerWeek = ref<number>(5);
const weeklyHoliday = ref('토, 일');

// Employer Info (editable, pre-filled from user profile)
const employerBusinessName = ref(authStore.user?.companyName || authStore.user?.name || '');
const employerAddress = ref(authStore.user?.companyAddress || '');
const employerCEO = ref(authStore.user?.representativeName || '');

// Created contract reference
const createdContract = ref<ContractWithDetails | null>(null);
const createdContractRoomId = ref<string | null>(null);

const selectedFreelancer = computed(() =>
    freelancerOptions.value.find((f) => f.freelancerId === Number(selectedFreelancerId.value))
);

// Validation
const isStep1Valid = computed(
    () =>
        selectedProjectId.value !== '' &&
        selectedFreelancerId.value !== '' &&
        projectName.value.trim() &&
        jobDescription.value.trim() &&
        startDate.value &&
        endDate.value &&
        budget.value &&
        paymentDay.value
);

const isStep2Valid = computed(() => {
    if (!employerBusinessName.value.trim() || !employerAddress.value.trim() || !employerCEO.value.trim()) {
        return false;
    }
    if (workScheduleType.value === 'FIXED') {
        return (
            workStartTime.value &&
            workEndTime.value &&
            breakStartTime.value &&
            breakEndTime.value &&
            workDaysPerWeek.value &&
            weeklyHoliday.value
        );
    }
    return true;
});

const isFormValid = computed(() => isStep1Valid.value && isStep2Valid.value);

// Preview contract data
const previewContract = computed(() => {
    const isFlexible = workScheduleType.value === 'FLEXIBLE';
    return {
        projectName: projectName.value,
        freelancerId: selectedFreelancer.value?.freelancerId ?? Number(selectedFreelancerId.value),
        employerId: Number(authStore.user?.id),
        startDate: startDate.value ? new Date(startDate.value) : undefined,
        endDate: endDate.value ? new Date(endDate.value) : undefined,
        budget: Number(budget.value),
        paymentDay: paymentDay.value,
        jobDescription: jobDescription.value,
        workLocation: '원격근무',
        workStartTime: isFlexible ? '자율' : workStartTime.value,
        workEndTime: isFlexible ? '자율' : workEndTime.value,
        breakStartTime: breakStartTime.value,
        breakEndTime: breakEndTime.value,
        workDaysPerWeek: isFlexible ? 5 : workDaysPerWeek.value,
        weeklyHoliday: isFlexible ? '토, 일' : weeklyHoliday.value,
        employerBusinessName: employerBusinessName.value,
        employerAddress: employerAddress.value,
        employerCEO: employerCEO.value,
        freelancerName: selectedFreelancer.value?.freelancerName || '',
        employerName: employerBusinessName.value,
    };
});

const nextStep = () => {
    if (currentStep.value < totalSteps) {
        currentStep.value++;
    }
};

const prevStep = () => {
    if (currentStep.value > 1) {
        currentStep.value--;
    }
};

const handlePreview = () => {
    if (!isFormValid.value) return;
    state.value = 'preview';
};

const handleStartSigning = () => {
    state.value = 'signing';
};

const handleSign = async (data: { signature: string }) => {
    const signatureDataUrl = data.signature;
    if (!selectedFreelancer.value || !authStore.user || selectedProjectId.value === '') return;

    isSubmitting.value = true;
    submitError.value = '';
    contractRoomConnectionWarning.value = '';

    const isFlexible = workScheduleType.value === 'FLEXIBLE';
    const routeJobId = getNumericQueryValue(route.query.jobId);
    const routeApplicationId = getStringQueryValue(route.query.applicationId);
    const routeProposalId = getStringQueryValue(route.query.proposalId);

    try {
        const response = await createContract({
            projectName: projectName.value,
            freelancerId: selectedFreelancer.value.freelancerId,
            freelancerName: selectedFreelancer.value.freelancerName,
            relatedJobId: routeJobId ? String(routeJobId) : undefined,
            relatedApplicationId: routeApplicationId ?? undefined,
            relatedProposalId: routeProposalId ?? undefined,
            startDate: startDate.value,
            endDate: endDate.value,
            budget: Number(budget.value),
            paymentDay: paymentDay.value,
            jobDescription: jobDescription.value,
            workLocation: '원격근무',
            workStartTime: isFlexible ? '자율' : workStartTime.value,
            workEndTime: isFlexible ? '자율' : workEndTime.value,
            breakStartTime: breakStartTime.value,
            breakEndTime: breakEndTime.value,
            workDaysPerWeek: isFlexible ? 5 : workDaysPerWeek.value,
            weeklyHoliday: isFlexible ? '토, 일' : weeklyHoliday.value,
            employerBusinessName: employerBusinessName.value,
            employerAddress: employerAddress.value,
            employerCEO: employerCEO.value,
            employerSignature: signatureDataUrl,
        });

        contractStore.addContract(response);
        const routeRoomId = getStringQueryValue(route.query.roomId);
        if (routeRoomId) {
            try {
                const contractRoomId = await chatStore.ensureContractRoomFromSourceRoom(
                    routeRoomId,
                    response.contractId ?? response.id
                );
                if (contractRoomId) {
                    createdContractRoomId.value = contractRoomId;
                } else {
                    contractRoomConnectionWarning.value = '계약은 생성되었지만 계약 채팅방 연결에 실패했습니다. 계약 목록에서 다시 시도해 주세요.';
                    console.warn('Contract room connection returned empty result after contract creation.', {
                        routeRoomId,
                        contractId: response.contractId ?? response.id,
                    });
                }
            } catch (roomError) {
                contractRoomConnectionWarning.value = '계약은 생성되었지만 계약 채팅방 연결에 실패했습니다. 계약 목록에서 다시 시도해 주세요.';
                console.warn('Failed to connect contract room after successful contract creation.', roomError);
            }
        }
        createdContract.value = response;
        state.value = 'success';
    } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || '계약서 생성에 실패했습니다.';
        submitError.value = msg;
        state.value = 'preview'; // go back to preview on error
    } finally {
        isSubmitting.value = false;
    }
};

const handleReset = () => {
    selectedProjectId.value = '';
    selectedFreelancerId.value = '';
    freelancerOptions.value = [];
    projectName.value = '';
    jobDescription.value = '';
    startDate.value = '';
    endDate.value = '';
    budget.value = '';
    paymentDay.value = 25;
    workScheduleType.value = 'FLEXIBLE';
    workStartTime.value = '09:00';
    workEndTime.value = '18:00';
    breakStartTime.value = '12:00';
    breakEndTime.value = '13:00';
    workDaysPerWeek.value = 5;
    weeklyHoliday.value = '토, 일';
    submitError.value = '';
    contractRoomConnectionWarning.value = '';
    createdContract.value = null;
    createdContractRoomId.value = null;
    currentStep.value = 1;
    state.value = 'form';
};

async function applyRouteContextToCreateForm() {
    const routeJobId = getNumericQueryValue(route.query.jobId);
    const routeProposalId = getStringQueryValue(route.query.proposalId);
    const routeContractId = getNumericQueryValue(route.query.contractId);

    let sourceContract: ContractWithDetails | null = null;
    if (routeContractId) {
        await contractStore.ensureContractsLoaded().catch(() => undefined);
        sourceContract = contractStore.findContractByAnyId(routeContractId);
    }

    let sourceProposal = null;
    if (routeProposalId) {
        if (!freelancerStore.proposals.some((proposal) => proposal.id === routeProposalId)) {
            await freelancerStore.fetchEmployerProposals().catch(() => undefined);
        }
        sourceProposal = freelancerStore.proposals.find((proposal) => proposal.id === routeProposalId) || null;
    }

    const fallbackJobId =
        routeJobId ??
        (sourceProposal?.jobId ? Number(sourceProposal.jobId) : null) ??
        (sourceContract?.projectId ? Number(sourceContract.projectId) : null);

    const matchedProject = findMatchingProjectByJobId(fallbackJobId);
    if (matchedProject && (selectedProjectId.value !== matchedProject.projectId || freelancerOptions.value.length === 0)) {
        await onProjectSelect(matchedProject.projectId);
    }

    const routeFreelancerId =
        sourceProposal?.freelancerId ? Number(sourceProposal.freelancerId) : sourceContract?.freelancerId ?? null;
    if (routeFreelancerId && Number.isFinite(routeFreelancerId)) {
        selectedFreelancerId.value = routeFreelancerId;
    }

    const fallbackProjectName =
        sourceContract?.projectName ||
        matchedProject?.projectName ||
        (sourceProposal?.message ? sourceProposal.message.slice(0, 24) : '');
    if (fallbackProjectName) {
        projectName.value = fallbackProjectName;
    }

    const fallbackJobDescription =
        sourceContract?.jobDescription ||
        sourceProposal?.message ||
        jobDescription.value;
    if (fallbackJobDescription) {
        jobDescription.value = fallbackJobDescription;
    }

    if (sourceContract) {
        startDate.value = formatDateInput(sourceContract.startDate);
        endDate.value = formatDateInput(sourceContract.endDate);
        budget.value = String(sourceContract.budget ?? '');
        paymentDay.value = sourceContract.paymentDay ?? 25;
    }
}

const navigateToContracts = () => {
    const query: Record<string, string> = {};
    const routeRoomId = getStringQueryValue(route.query.roomId);

    if (createdContractRoomId.value) {
        query.roomId = createdContractRoomId.value;
    } else if (routeRoomId) {
        query.roomId = routeRoomId;
    }
    if (createdContract.value?.contractId) {
        query.contractId = String(createdContract.value.contractId);
    }

    router.push({ name: 'employer.contracts', query });
};

watch(
    () => [route.query.jobId, route.query.applicationId, route.query.proposalId, route.query.contractId],
    () => {
        void applyRouteContextToCreateForm();
    }
);
</script>

<template>
    <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 text-white">
        <!-- Form State -->
        <template v-if="state === 'form'">
            <div v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0 }" class="mb-8">
                <div class="flex items-center gap-3 mb-3">
                    <FilePlus class="w-10 h-10 text-white" />
                    <h1 class="text-4xl font-bold text-white">계약서 작성</h1>
                </div>
                <p class="text-white/60">프리랜서와의 표준근로계약서를 작성하세요</p>
            </div>

            <!-- Progress Steps -->
            <div class="mb-8 flex items-center gap-4">
                <div
                    v-for="step in totalSteps"
                    :key="step"
                    class="flex items-center gap-2"
                >
                    <div
                        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                        :class="
                            currentStep >= step
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-white/40'
                        "
                    >
                        {{ step }}
                    </div>
                    <span
                        class="text-sm"
                        :class="currentStep >= step ? 'text-white' : 'text-white/40'"
                    >
                        {{ step === 1 ? '기본 정보' : '근무 조건' }}
                    </span>
                    <div v-if="step < totalSteps" class="w-12 h-px bg-white/20 mx-2" />
                </div>
            </div>

            <div
                v-motion
                :initial="{ opacity: 0, y: 20 }"
                :enter="{ opacity: 1, y: 0, transition: { delay: 0.1 } }"
                class="max-w-2xl"
            >
                <div class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 space-y-6">
                    <!-- Step 1: Basic Info -->
                    <template v-if="currentStep === 1">
                        <!-- Company Name -->
                        <div>
                            <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                <Building2 class="w-4 h-4" />
                                기업명
                            </label>
                            <input
                                v-model="employerBusinessName"
                                type="text"
                                placeholder="기업명을 입력하세요"
                                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors"
                            />
                        </div>

                        <!-- Project Select -->
                        <div>
                            <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                <FolderOpen class="w-4 h-4" />
                                채용 프로젝트
                            </label>
                            <div class="relative">
                                <select
                                    :value="selectedProjectId"
                                    @change="onProjectSelect(($event.target as HTMLSelectElement).value === '' ? '' : Number(($event.target as HTMLSelectElement).value))"
                                    :disabled="isLoadingProjects"
                                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-50"
                                >
                                    <option value="" class="bg-gray-900">
                                        {{ isLoadingProjects ? '불러오는 중...' : '프로젝트를 선택하세요' }}
                                    </option>
                                    <option
                                        v-for="p in projectOptions"
                                        :key="p.projectId"
                                        :value="p.projectId"
                                        class="bg-gray-900"
                                    >
                                        {{ p.projectName || `프로젝트 #${p.projectId} (${p.status})` }}
                                    </option>
                                </select>
                                <Loader2 v-if="isLoadingProjects" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-white/40" />
                            </div>
                            <p v-if="projectLoadError" class="mt-1 text-xs text-red-400">{{ projectLoadError }}</p>
                        </div>

                        <!-- Freelancer Select -->
                        <div>
                            <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                <User class="w-4 h-4" />
                                매칭된 프리랜서
                            </label>
                            <div class="relative">
                                <select
                                    v-model="selectedFreelancerId"
                                    :disabled="selectedProjectId === '' || isLoadingFreelancers"
                                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-50"
                                >
                                    <option value="" class="bg-gray-900">
                                        {{ isLoadingFreelancers ? '불러오는 중...' : selectedProjectId === '' ? '프로젝트를 먼저 선택하세요' : '프리랜서를 선택하세요' }}
                                    </option>
                                    <option
                                        v-for="f in freelancerOptions"
                                        :key="f.freelancerId"
                                        :value="f.freelancerId"
                                        class="bg-gray-900"
                                    >
                                        {{ f.freelancerName }}
                                    </option>
                                </select>
                                <Loader2 v-if="isLoadingFreelancers" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-white/40" />
                            </div>
                            <p v-if="freelancerLoadError" class="mt-1 text-xs text-red-400">{{ freelancerLoadError }}</p>
                            <!-- Freelancer profile preview -->
                            <div
                                v-if="selectedFreelancer"
                                class="mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm space-y-1"
                            >
                                <div class="text-white/60">직무: <span class="text-white">{{ selectedFreelancer.job }}</span></div>
                                <div class="text-white/60">등급: <span class="text-white">{{ selectedFreelancer.grade }}</span></div>
                            </div>
                        </div>

                        <!-- Project Name -->
                        <div>
                            <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                <FolderOpen class="w-4 h-4" />
                                프로젝트명
                            </label>
                            <input
                                v-model="projectName"
                                type="text"
                                placeholder="프로젝트명을 입력하세요"
                                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors"
                            />
                        </div>

                        <!-- Job Description -->
                        <div>
                            <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                <Briefcase class="w-4 h-4" />
                                업무 내용
                            </label>
                            <textarea
                                v-model="jobDescription"
                                rows="3"
                                placeholder="수행할 업무 내용을 상세히 입력하세요"
                                class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors resize-none"
                            />
                        </div>

                        <!-- Dates -->
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                    <Calendar class="w-4 h-4" />
                                    계약 시작일
                                </label>
                                <input
                                    v-model="startDate"
                                    type="date"
                                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                    <Calendar class="w-4 h-4" />
                                    계약 종료일
                                </label>
                                <input
                                    v-model="endDate"
                                    type="date"
                                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <!-- Budget & Payment Day -->
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                    <DollarSign class="w-4 h-4" />
                                    월 급여 (원)
                                </label>
                                <input
                                    v-model="budget"
                                    type="number"
                                    placeholder="월 급여액"
                                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                    <CreditCard class="w-4 h-4" />
                                    매월 정산일
                                </label>
                                <select
                                    v-model="paymentDay"
                                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                                >
                                    <option :value="10" class="bg-gray-900">매월 10일</option>
                                    <option :value="15" class="bg-gray-900">매월 15일</option>
                                    <option :value="25" class="bg-gray-900">매월 25일</option>
                                    <option :value="28" class="bg-gray-900">매월 28일</option>
                                </select>
                            </div>
                        </div>

                        <!-- Next Button -->
                        <button
                            @click="nextStep"
                            :disabled="!isStep1Valid"
                            class="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-lg transition-all"
                            :class="
                                isStep1Valid
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                            "
                        >
                            다음 단계
                            <ArrowRight class="w-5 h-5" />
                        </button>
                    </template>

                    <!-- Step 2: Work Schedule & Employer Details -->
                    <template v-else-if="currentStep === 2">
                        <!-- Work Schedule Type -->
                        <div>
                            <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                <Clock class="w-4 h-4" />
                                근무 형태
                            </label>
                            <div class="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    @click="workScheduleType = 'FLEXIBLE'"
                                    class="p-4 rounded-xl border transition-all text-left"
                                    :class="workScheduleType === 'FLEXIBLE'
                                        ? 'bg-blue-500/20 border-blue-500/50 text-white'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'"
                                >
                                    <div class="font-medium mb-1">자율 근무</div>
                                    <div class="text-xs text-white/50">업무 마감일 기준 자유롭게 작업</div>
                                </button>
                                <button
                                    type="button"
                                    @click="workScheduleType = 'FIXED'"
                                    class="p-4 rounded-xl border transition-all text-left"
                                    :class="workScheduleType === 'FIXED'
                                        ? 'bg-blue-500/20 border-blue-500/50 text-white'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'"
                                >
                                    <div class="font-medium mb-1">지정 시간 근무</div>
                                    <div class="text-xs text-white/50">정해진 시간에 근무</div>
                                </button>
                            </div>
                        </div>

                        <!-- Fixed Schedule Details -->
                        <template v-if="workScheduleType === 'FIXED'">
                            <!-- Work Hours -->
                            <div class="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label class="text-sm font-medium text-white/60 mb-2 block">근무 시작시간</label>
                                    <input
                                        v-model="workStartTime"
                                        type="time"
                                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-white/60 mb-2 block">근무 종료시간</label>
                                    <input
                                        v-model="workEndTime"
                                        type="time"
                                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <!-- Work Days -->
                            <div class="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label class="text-sm font-medium text-white/60 mb-2 block">주 근무일수</label>
                                    <select
                                        v-model="workDaysPerWeek"
                                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                                    >
                                        <option v-for="n in 7" :key="n" :value="n" class="bg-gray-900">{{ n }}일</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-white/60 mb-2 block">주휴일</label>
                                    <input
                                        v-model="weeklyHoliday"
                                        type="text"
                                        placeholder="예: 토, 일"
                                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </template>

                        <!-- Break Time (always shown) -->
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-white/60 mb-2 block">휴게 시작시간</label>
                                <input
                                    v-model="breakStartTime"
                                    type="time"
                                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label class="text-sm font-medium text-white/60 mb-2 block">휴게 종료시간</label>
                                <input
                                    v-model="breakEndTime"
                                    type="time"
                                    class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <!-- Employer Info (editable) -->
                        <div class="pt-4 border-t border-white/10">
                            <h3 class="text-lg font-semibold mb-4">사업주 정보</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                        <MapPin class="w-4 h-4" />
                                        사업장 주소
                                    </label>
                                    <input
                                        v-model="employerAddress"
                                        type="text"
                                        placeholder="예: 서울특별시 강남구 테헤란로 123"
                                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label class="flex items-center gap-2 text-sm font-medium text-white/60 mb-2">
                                        <User class="w-4 h-4" />
                                        대표자명
                                    </label>
                                    <input
                                        v-model="employerCEO"
                                        type="text"
                                        placeholder="대표자명을 입력하세요"
                                        class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Buttons -->
                        <div class="flex gap-3">
                            <button
                                @click="prevStep"
                                class="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeft class="w-5 h-5" />
                                이전 단계
                            </button>
                            <button
                                @click="handlePreview"
                                :disabled="!isStep2Valid"
                                class="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-lg transition-all"
                                :class="
                                    isStep2Valid
                                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                                "
                            >
                                <FileText class="w-5 h-5" />
                                계약서 미리보기
                            </button>
                        </div>
                    </template>
                </div>
            </div>
        </template>

        <!-- Preview State -->
        <template v-else-if="state === 'preview'">
            <div v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0 }" class="mb-8">
                <div class="flex items-center gap-3 mb-3">
                    <FileText class="w-10 h-10 text-white" />
                    <h1 class="text-4xl font-bold text-white">계약서 미리보기</h1>
                </div>
                <p class="text-white/60">내용을 확인하고 서명을 진행하세요</p>
            </div>

            <!-- Error Banner -->
            <div
                v-if="submitError"
                class="max-w-4xl mx-auto mb-6 flex items-center gap-3 px-5 py-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400"
            >
                <AlertCircle class="w-5 h-5 flex-shrink-0" />
                <span class="text-sm">{{ submitError }}</span>
            </div>

            <div class="mb-6">
                <ContractPreview :contract="previewContract" />
            </div>

            <div class="max-w-4xl mx-auto flex gap-3">
                <button
                    @click="state = 'form'"
                    class="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft class="w-5 h-5" />
                    수정하기
                </button>
                <button
                    @click="handleStartSigning"
                    class="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                    <FilePlus class="w-5 h-5" />
                    서명하기
                </button>
            </div>
        </template>

        <!-- Signing State -->
        <template v-else-if="state === 'signing'">
            <div v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0 }" class="mb-12">
                <div class="flex items-center gap-3 mb-3">
                    <FilePlus class="w-10 h-10 text-white" />
                    <h1 class="text-4xl font-bold text-white">전자 서명</h1>
                </div>
                <p class="text-white/60">계약서에 서명을 진행하세요</p>
            </div>

            <SignaturePadModal
                :signerName="employerCEO || authStore.user?.name || ''"
                :disabled="isSubmitting"
                @sign="handleSign"
                @close="state = 'preview'"
            />

            <!-- Submitting overlay -->
            <div
                v-if="isSubmitting"
                class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            >
                <div class="flex flex-col items-center gap-4 text-white">
                    <Loader2 class="w-10 h-10 animate-spin" />
                    <span class="text-lg font-medium">계약서를 생성하는 중...</span>
                </div>
            </div>
        </template>

        <!-- Success State -->
        <template v-else>
            <div
                v-motion
                :initial="{ opacity: 0, y: 20 }"
                :enter="{ opacity: 1, y: 0 }"
                class="max-w-2xl mx-auto"
            >
                <div class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center">
                    <div
                        class="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg"
                        v-motion
                        :initial="{ scale: 0 }"
                        :enter="{ scale: 1, transition: { type: 'spring', delay: 0.2 } }"
                    >
                        <CheckCircle class="w-10 h-10 text-white" />
                    </div>

                    <h2 class="text-3xl font-bold mb-3">계약서가 생성되었습니다</h2>

                    <div class="space-y-2 mb-8">
                        <div class="flex items-center justify-center gap-2 text-white/60">
                            <Send class="w-4 h-4" />
                            <span>프리랜서에게 서명 요청이 전송되었습니다</span>
                        </div>
                        <div
                            v-if="contractRoomConnectionWarning"
                            class="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-left text-amber-300"
                        >
                            <AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0" />
                            <div class="space-y-1">
                                <p class="text-sm font-semibold">계약 채팅방 연결이 완료되지 않았습니다</p>
                                <p class="text-sm text-amber-200/90">{{ contractRoomConnectionWarning }}</p>
                            </div>
                        </div>
                        <div
                            v-if="createdContract"
                            class="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-left space-y-2"
                        >
                            <div class="flex items-center gap-2 text-white/80">
                                <FileText class="w-4 h-4" />
                                <span class="font-medium">{{ createdContract.projectName }}</span>
                            </div>
                            <div class="text-sm text-white/50">
                                계약번호: #{{ createdContract.contractId }}
                            </div>
                            <div class="text-sm text-white/50">
                                프리랜서: {{ createdContract.freelancerName }}
                            </div>
                            <div class="text-sm text-white/50">
                                계약 기간: {{ new Date(createdContract.startDate).toLocaleDateString('ko-KR') }} ~ {{ new Date(createdContract.endDate).toLocaleDateString('ko-KR') }}
                            </div>
                            <div class="text-sm text-white/50">
                                월 급여: {{ createdContract.budget.toLocaleString() }}원
                            </div>
                            <div class="mt-3 pt-3 border-t border-white/10">
                                <span class="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                                    <Clock class="w-3 h-3" />
                                    프리랜서 서명 대기중
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3">
                        <button
                            @click="handleReset"
                            class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-colors"
                        >
                            <FilePlus class="w-4 h-4" />
                            새 계약서 작성
                        </button>
                        <button
                            @click="navigateToContracts"
                            class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 rounded-xl text-white font-semibold hover:bg-blue-600 transition-colors"
                        >
                            <ArrowLeft class="w-4 h-4" />
                            계약서 목록
                        </button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
}
</style>
