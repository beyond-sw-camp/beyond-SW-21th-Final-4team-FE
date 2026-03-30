import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/api/axiosInstance';
import { uploadEmployerLogo } from '@/api/MyPage/employer';
import type { EmployerProfile, FreelancerProfile } from '@/types/onboarding';

const DEFAULT_EMPLOYER_DATA: Partial<EmployerProfile> = {
    size: 'S1_4'
};

const DEFAULT_FREELANCER_DATA: Partial<FreelancerProfile> = {
    job: '',
    hope_salary: undefined,
    work_type: 'PERSONAL',
    work_style: 'REMOTE'
};

type SerializedFileMeta = {
    name: string;
    size: number;
    type: string;
};

type SerializedEmployerDraft = Omit<Partial<EmployerProfile>, 'logo_file'> & {
    logo_file?: SerializedFileMeta | null;
};

export const useOnboardingStore = defineStore('onboarding', () => {
    const currentStep = ref(1);
    const totalSteps = ref(2);
    const isLoading = ref(false);
    const currentDraftKey = ref<string | null>(null);

    const employerData = ref<Partial<EmployerProfile>>({ ...DEFAULT_EMPLOYER_DATA });
    const freelancerData = ref<Partial<FreelancerProfile>>({ ...DEFAULT_FREELANCER_DATA });

    function getDraftKey(userId: string | number | undefined, role: 'EMPLOYER' | 'FREELANCER') {
        return `onboarding_draft:${role}:${userId ?? 'anonymous'}`;
    }

    function persistDraft() {
        if (!currentDraftKey.value) return;

        const sanitizedEmployerData: SerializedEmployerDraft = {
            ...employerData.value,
            logo_file:
                employerData.value.logo_file instanceof File
                    ? {
                          name: employerData.value.logo_file.name,
                          size: employerData.value.logo_file.size,
                          type: employerData.value.logo_file.type
                      }
                    : null
        };

        sessionStorage.setItem(
            currentDraftKey.value,
            JSON.stringify({
                currentStep: currentStep.value,
                employerData: sanitizedEmployerData,
                freelancerData: freelancerData.value
            })
        );
    }

    function ensureDraftForUser(userId: string | number | undefined, role: 'EMPLOYER' | 'FREELANCER') {
        currentDraftKey.value = getDraftKey(userId, role);
        const rawDraft = sessionStorage.getItem(currentDraftKey.value);
        if (!rawDraft) {
            if (role === 'EMPLOYER') {
                employerData.value = { ...DEFAULT_EMPLOYER_DATA };
            } else {
                freelancerData.value = { ...DEFAULT_FREELANCER_DATA };
            }
            sessionStorage.removeItem(currentDraftKey.value);
            currentStep.value = 1;
            return;
        }

        try {
            const parsedDraft = JSON.parse(rawDraft) as {
                currentStep?: number;
                employerData?: SerializedEmployerDraft;
                freelancerData?: Partial<FreelancerProfile>;
            };

            employerData.value = {
                ...DEFAULT_EMPLOYER_DATA,
                ...(parsedDraft.employerData ?? {}),
                logo_file: null
            };
            freelancerData.value = {
                ...DEFAULT_FREELANCER_DATA,
                ...(parsedDraft.freelancerData ?? {})
            };

            if (
                typeof parsedDraft.currentStep === 'number' &&
                parsedDraft.currentStep >= 1 &&
                parsedDraft.currentStep <= totalSteps.value
            ) {
                currentStep.value = parsedDraft.currentStep;
            }
        } catch (error) {
            console.error('Failed to restore onboarding draft', error);
            sessionStorage.removeItem(currentDraftKey.value);
        }
    }

    function resetOnboardingState() {
        if (currentDraftKey.value) {
            sessionStorage.removeItem(currentDraftKey.value);
        }
        currentStep.value = 1;
        employerData.value = { ...DEFAULT_EMPLOYER_DATA };
        freelancerData.value = { ...DEFAULT_FREELANCER_DATA };
    }

    function setStep(step: number) {
        currentStep.value = step;
        persistDraft();
    }

    function nextStep() {
        if (currentStep.value < totalSteps.value) {
            currentStep.value++;
            persistDraft();
        }
    }

    function prevStep() {
        if (currentStep.value > 1) {
            currentStep.value--;
            persistDraft();
        }
    }

    function updateEmployerData(data: Partial<EmployerProfile>) {
        employerData.value = { ...employerData.value, ...data };
        persistDraft();
    }

    function updateFreelancerData(data: Partial<FreelancerProfile>) {
        freelancerData.value = { ...freelancerData.value, ...data };
        persistDraft();
    }

    async function submitEmployerOnboarding() {
        isLoading.value = true;
        try {
            const logoFile = employerData.value.logo_file;
            if (logoFile instanceof File) {
                await uploadEmployerLogo(logoFile);
            }

            const payload = {
                companyName: employerData.value.company_name ?? '',
                industry: employerData.value.industry ?? '',
                scale: employerData.value.size ?? '',
                location: employerData.value.location ?? '',
                websiteUrl: employerData.value.website ?? '',
                description: employerData.value.description ?? ''
            };

            const res = await apiClient.put('/api/employer/mypage/profile', payload);
            if (res.data?.success === true) {
                return true;
            }

            console.error(res.data?.message ?? 'Failed to submit employer onboarding');
            return false;
        } catch (e) {
            console.error(e);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function submitFreelancerOnboarding() {
        isLoading.value = true;
        try {
            const payload = {
                job: freelancerData.value.job ?? '',
                introduction: freelancerData.value.introduction ?? '',
                careerYears: freelancerData.value.career_years ?? 0,
                wage: freelancerData.value.hope_salary ?? 0,
                skills: freelancerData.value.freelancer_skills ?? [],
                workType: freelancerData.value.work_type ?? '',
                availableStartDate: freelancerData.value.start_date ?? null,
                workStyle: freelancerData.value.work_style ?? '',
                workLocation: freelancerData.value.location ?? ''
            };

            const res = await apiClient.put('/api/freelancer/mypage/profile', payload);
            if (res.data?.success === true) {
                return true;
            }

            console.error(res.data?.message ?? 'Failed to submit freelancer onboarding');
            return false;
        } catch (e) {
            console.error(e);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        currentStep,
        totalSteps,
        isLoading,
        employerData,
        freelancerData,
        setStep,
        nextStep,
        prevStep,
        ensureDraftForUser,
        resetOnboardingState,
        updateEmployerData,
        updateFreelancerData,
        submitEmployerOnboarding,
        submitFreelancerOnboarding
    };
});
