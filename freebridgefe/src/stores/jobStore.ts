import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { getUserById } from '@/api/authApi';
import { getEmployerRejectionReasons, getFreelancerRejectionReasons } from '@/api/reviewApi';
import type { Application, JobPosting, JobStatus } from '@/types';
import {
    acceptEmployerApplication,
    createFreelancerApplication,
    getEmployerApplications,
    getFreelancerApplications,
    rejectEmployerApplication,
    type ApplicationResponseDto
} from '@/api/applicationApi';
import {
    addFavoriteJobPosting,
    createEmployerJobPosting,
    deleteEmployerJobPosting,
    getEmployerJobPostings,
    removeFavoriteJobPosting,
    searchFreelancerJobPostings,
    updateEmployerJobPosting,
    type EmployerJobPostingResponse,
    type FreelancerJobPostingResponse,
    type RecruitmentJobStatus
} from '@/api/jobApi';

type JobPostingInput = Omit<JobPosting, 'id' | 'createdAt' | 'updatedAt'>;
type UIJobPosting = JobPosting;

type FetchJobPostingsOptions = {
    keyword?: string;
    favoriteOnly?: boolean;
};

const mapRecruitmentStatusToJobStatus = (status: RecruitmentJobStatus): JobStatus => {
    if (status === 'COMPLETED') {
        return 'CONTRACTED';
    }

    return status;
};

const mapJobStatusToRecruitmentStatus = (status: JobStatus): RecruitmentJobStatus => {
    if (status === 'CONTRACTED') {
        return 'COMPLETED';
    }

    return status;
};

const toNumericJobPostingId = (jobId: string): number => {
    if (!/^\d+$/.test(jobId)) {
        throw new Error('유효하지 않은 공고 ID입니다.');
    }
    return Number(jobId);
};

const toNumericApplicationId = (applicationId: string): number => {
    if (!/^\d+$/.test(applicationId)) {
        throw new Error('유효하지 않은 지원 ID입니다.');
    }
    return Number(applicationId);
};

const mapEmployerJobPosting = (
    posting: EmployerJobPostingResponse,
    employerId: string
): UIJobPosting => {
    const now = new Date();

    return {
        id: String(posting.jobPostingId),
        employerId,
        employerName: posting.employerName,
        title: posting.title,
        description: posting.description,
        techStack: posting.techStack,
        budget: posting.budget,
        duration: posting.duration,
        status: mapRecruitmentStatusToJobStatus(posting.status),
        createdAt: now,
        updatedAt: now,
        headcount: posting.headcount,
        matchedHeadcount: posting.matchedHeadcount,
        favorite: false
    };
};

const mapFreelancerApiToUiJobPosting = (posting: FreelancerJobPostingResponse): UIJobPosting => {
    const now = new Date();
    const employerId =
        posting.employerId === null || posting.employerId === undefined
            ? `employer-${posting.jobPostingId}`
            : String(posting.employerId);

    const jobStatus: JobStatus = posting.status
        ? mapRecruitmentStatusToJobStatus(posting.status)
        : 'OPEN';

    return {
        id: String(posting.jobPostingId),
        employerId,
        employerName: posting.employerName,
        title: posting.title,
        description: posting.description,
        techStack: posting.techStack,
        budget: posting.budget,
        duration: posting.duration,
        status: jobStatus,
        createdAt: now,
        updatedAt: now,
        headcount: posting.headcount,
        matchedHeadcount: posting.matchedHeadcount,
        favorite: posting.favorite
    };
};

const getErrorMessage = (error: unknown): string => {
    if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as any).response?.data?.message === 'string'
    ) {
        return (error as any).response.data.message;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }
    return '요청 처리 중 오류가 발생했습니다.';
};

export const useJobStore = defineStore('job', () => {
    const authStore = useAuthStore();

    const jobPostings = ref<JobPosting[]>([]);
    const isLoading = ref(false);
    const errorMessage = ref<string | null>(null);
    const applications = ref<Application[]>([]);
    const isFetchingApplications = ref(false);
    const applicationFetchError = ref<string | null>(null);
    const userNameCache: Record<string, string> = {};

    const myJobs = computed(() => {
        if (!authStore.user || authStore.user.role !== 'EMPLOYER') {
            return [];
        }

        const currentEmployerId = String(authStore.user.id);
        return jobPostings.value.filter((job) => String(job.employerId) === currentEmployerId);
    });

    const getJobById = (id: string) => jobPostings.value.find((job) => job.id === id);

    const getCurrentFreelancerName = () => authStore.user?.name || '프리랜서';

    async function resolveUserNames(userIds: Array<string | number>): Promise<Record<string, string>> {
        const uniqueIds = Array.from(new Set(userIds.map((id) => String(id)).filter(Boolean)));
        const missingIds = uniqueIds.filter((id) => !userNameCache[id]);

        await Promise.all(
            missingIds.map(async (id) => {
                try {
                    const user = await getUserById(Number(id));
                    userNameCache[id] = user?.name || '';
                } catch {
                    userNameCache[id] = '';
                }
            })
        );

        return uniqueIds.reduce<Record<string, string>>((acc, id) => {
            if (userNameCache[id]) {
                acc[id] = userNameCache[id];
            }
            return acc;
        }, {});
    }

    function mapApplication(dto: ApplicationResponseDto, names: Record<string, string>): Application {
        const currentUserId = String(authStore.user?.id ?? '');
        const freelancerName =
            String(dto.freelancerId) === currentUserId && authStore.user?.role === 'FREELANCER'
                ? getCurrentFreelancerName()
                : names[String(dto.freelancerId)] || `프리랜서 #${dto.freelancerId}`;

        return {
            id: String(dto.applicationId),
            jobId: String(dto.jobPostingId),
            freelancerId: String(dto.freelancerId),
            freelancerName,
            message: dto.message,
            status: dto.status,
            createdAt: new Date(dto.createdAt)
        };
    }

    async function hydrateApplications(items: ApplicationResponseDto[]): Promise<Application[]> {
        const names = await resolveUserNames(items.map((item) => item.freelancerId));
        return items.map((item) => mapApplication(item, names));
    }

    async function attachEmployerRejectionReasons(items: Application[]): Promise<Application[]> {
        if (!authStore.user || authStore.user.role !== 'EMPLOYER' || items.length === 0) {
            return items;
        }

        try {
            const response = await getEmployerRejectionReasons(0, 200);
            const reasonsByKey = new Map(
                (response.content ?? []).map((reason) => [
                    `${reason.projectId}:${reason.freelancerId}`,
                    reason.reason
                ])
            );

            return items.map((item) => ({
                ...item,
                rejectionReason:
                    item.status === 'REJECTED'
                        ? reasonsByKey.get(`${item.jobId}:${item.freelancerId}`) || item.rejectionReason
                        : undefined
            }));
        } catch (error) {
            console.warn('Failed to fetch employer rejection reasons:', error);
            return items;
        }
    }

    async function attachFreelancerRejectionReasons(items: Application[]): Promise<Application[]> {
        if (!authStore.user || authStore.user.role !== 'FREELANCER' || items.length === 0) {
            return items;
        }

        try {
            const response = await getFreelancerRejectionReasons(0, 200);
            const reasonsByKey = new Map(
                (response.content ?? []).map((reason) => [
                    `${reason.projectId}:${reason.freelancerId}`,
                    reason.reason
                ])
            );

            return items.map((item) => ({
                ...item,
                rejectionReason:
                    item.status === 'REJECTED'
                        ? reasonsByKey.get(`${item.jobId}:${item.freelancerId}`) || item.rejectionReason
                        : undefined
            }));
        } catch (error) {
            console.warn('Failed to fetch freelancer rejection reasons:', error);
            return items;
        }
    }

    const isFavorite = (id: string): boolean => {
        const target = getJobById(id);
        return Boolean(target?.favorite);
    };

    async function fetchJobPostings(options: FetchJobPostingsOptions = {}): Promise<void> {
        if (!authStore.user) {
            jobPostings.value = [];
            return;
        }

        isLoading.value = true;
        errorMessage.value = null;

        try {
            if (authStore.user.role === 'EMPLOYER') {
                const postings = await getEmployerJobPostings({ page: 0, size: 100 });
                jobPostings.value = postings.map((posting) =>
                    mapEmployerJobPosting(posting, String(authStore.user?.id ?? ''))
                );
                return;
            }

            const postings = await searchFreelancerJobPostings({
                page: 0,
                size: 100,
                keyword: options.keyword?.trim() || undefined,
                ...(options.favoriteOnly ? { liked: true } : {})
            });
            jobPostings.value = postings.map(mapFreelancerApiToUiJobPosting);
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchEmployerApplications(page = 0, size = 100) {
        if (!authStore.user || authStore.user.role !== 'EMPLOYER') {
            applications.value = [];
            return;
        }

        isFetchingApplications.value = true;
        applicationFetchError.value = null;

        try {
            const response = await getEmployerApplications(page, size);
            const hydrated = await hydrateApplications(response.content ?? []);
            applications.value = await attachEmployerRejectionReasons(hydrated);
            return response;
        } catch (error) {
            applications.value = [];
            applicationFetchError.value = getErrorMessage(error);
            throw error;
        } finally {
            isFetchingApplications.value = false;
        }
    }

    async function fetchFreelancerApplications(page = 0, size = 100) {
        if (!authStore.user || authStore.user.role !== 'FREELANCER') {
            applications.value = [];
            return;
        }

        isFetchingApplications.value = true;
        applicationFetchError.value = null;

        try {
            const response = await getFreelancerApplications(page, size);
            const hydrated = await hydrateApplications(response.content ?? []);
            applications.value = await attachFreelancerRejectionReasons(hydrated);
            return response;
        } catch (error) {
            applications.value = [];
            applicationFetchError.value = getErrorMessage(error);
            throw error;
        } finally {
            isFetchingApplications.value = false;
        }
    }

    async function addJobPosting(job: JobPostingInput): Promise<void> {
        if (!authStore.user || authStore.user.role !== 'EMPLOYER') {
            throw new Error('고용주만 공고를 등록할 수 있습니다.');
        }

        await createEmployerJobPosting({
            title: job.title,
            description: job.description,
            techStack: job.techStack,
            budget: job.budget,
            duration: job.duration,
            headcount: job.headcount && job.headcount > 0 ? job.headcount : 1
        });

        await fetchJobPostings();
    }

    async function updateJobPosting(id: string, updates: Partial<JobPosting>): Promise<void> {
        if (!authStore.user || authStore.user.role !== 'EMPLOYER') {
            throw new Error('고용주만 공고를 수정할 수 있습니다.');
        }

        const current = getJobById(id);

        await updateEmployerJobPosting(toNumericJobPostingId(id), {
            title: updates.title,
            description: updates.description,
            techStack: updates.techStack,
            budget: updates.budget,
            duration: updates.duration,
            headcount: updates.headcount ?? current?.headcount,
            status: updates.status ? mapJobStatusToRecruitmentStatus(updates.status) : undefined
        });

        await fetchJobPostings();
    }

    async function deleteJobPosting(id: string): Promise<void> {
        if (!authStore.user || authStore.user.role !== 'EMPLOYER') {
            throw new Error('고용주만 공고를 삭제할 수 있습니다.');
        }

        await deleteEmployerJobPosting(toNumericJobPostingId(id));
        jobPostings.value = jobPostings.value.filter((job) => job.id !== id);
    }

    async function toggleFavorite(id: string): Promise<void> {
        if (!authStore.user || authStore.user.role !== 'FREELANCER') {
            return;
        }

        const index = jobPostings.value.findIndex((job) => job.id === id);
        if (index === -1) {
            return;
        }

        const numericJobId = toNumericJobPostingId(id);
        const currentlyFavorite = Boolean(jobPostings.value[index].favorite);

        if (currentlyFavorite) {
            await removeFavoriteJobPosting(numericJobId);
        } else {
            await addFavoriteJobPosting(numericJobId);
        }

        jobPostings.value[index] = {
            ...jobPostings.value[index],
            favorite: !currentlyFavorite
        };
    }

    function getApplicationsByJob(jobId: string) {
        return applications.value.filter((app) => app.jobId === jobId);
    }

    function getApplicationById(applicationId: string) {
        return applications.value.find((app) => app.id === applicationId);
    }

    async function addApplication(app: Omit<Application, 'id' | 'createdAt'>): Promise<Application> {
        if (!authStore.user || authStore.user.role !== 'FREELANCER') {
            throw new Error('프리랜서만 지원할 수 있습니다.');
        }

        applicationFetchError.value = null;
        const result = await createFreelancerApplication({
            jobPostingId: toNumericJobPostingId(app.jobId),
            message: app.message
        });

        await fetchFreelancerApplications();

        const persistedApplication = applications.value.find(
            (item) => item.id === String(result.applicationId)
        );

        if (!persistedApplication) {
            throw new Error('지원 등록 응답은 성공했지만 새 지원 내역이 조회되지 않았습니다.');
        }

        return persistedApplication;
    }

    async function updateApplicationStatus(
        id: string,
        status: Application['status'],
        rejectionReason?: string
    ): Promise<string | null> {
        if (!authStore.user || authStore.user.role !== 'EMPLOYER') {
            throw new Error('고용주만 지원 상태를 변경할 수 있습니다.');
        }

        const index = applications.value.findIndex((app) => app.id === id);
        if (index === -1) return null;

        if (status === 'ACCEPTED') {
            await acceptEmployerApplication(toNumericApplicationId(id));
        } else if (status === 'REJECTED') {
            await rejectEmployerApplication(toNumericApplicationId(id));
        }

        applications.value[index] = {
            ...applications.value[index],
            status,
            rejectionReason
        };

        await fetchJobPostings().catch((error) => {
            console.warn('Failed to refresh job postings after application status update:', error);
        });
        await fetchEmployerApplications().catch((error) => {
            console.warn('Failed to refresh applications after application status update:', error);
        });

        if (status === 'ACCEPTED') {
            const chatStore = useChatStore();
            const app = applications.value.find((application) => application.id === id) ?? applications.value[index];
            const job = getJobById(app.jobId);

            if (job) {
                const rawEmployerId = String(job.employerId);
                const rawFreelancerId = String(app.freelancerId);
                const employerId = rawEmployerId.startsWith('e') ? rawEmployerId : `e${rawEmployerId}`;
                const freelancerId = rawFreelancerId.startsWith('f') ? rawFreelancerId : `f${rawFreelancerId}`;

                const roomId = await chatStore.createRoom(
                    [employerId, freelancerId],
                    {
                        [employerId]: job.employerName || 'Employer',
                        [freelancerId]: app.freelancerName || 'Freelancer'
                    },
                    {
                        relatedJobId: job.id,
                        relatedApplicationId: app.id
                    }
                ).catch((e) => {
                    console.error('Failed to create room:', e);
                    return null;
                });

                if (roomId) {
                    chatStore.selectRoom(roomId);
                    return roomId;
                }
            }
        }

        return null;
    }

    return {
        jobPostings,
        myJobs,
        applications,
        isFetchingApplications,
        applicationFetchError,
        isLoading,
        errorMessage,
        getJobById,
        fetchJobPostings,
        fetchEmployerApplications,
        fetchFreelancerApplications,
        addJobPosting,
        updateJobPosting,
        deleteJobPosting,
        isFavorite,
        toggleFavorite,
        getApplicationsByJob,
        getApplicationById,
        addApplication,
        updateApplicationStatus
    };
});
