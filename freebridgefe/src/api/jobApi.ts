import apiClient from './axiosInstance';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    httpStatus?: string;
}

interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export type RecruitmentJobStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'COMPLETED';

export interface EmployerJobPostingResponse {
    jobPostingId: number;
    employerName: string;
    title: string;
    description: string;
    techStack: string[];
    budget: number;
    duration: number;
    headcount: number;
    matchedHeadcount: number;
    status: RecruitmentJobStatus;
}

export interface FreelancerJobPostingResponse {
    jobPostingId: number;
    employerId?: number | string | null;
    employerName: string;
    title: string;
    description: string;
    techStack: string[];
    budget: number;
    duration: number;
    headcount: number;
    matchedHeadcount: number;
    status?: RecruitmentJobStatus | null;
    favorite: boolean;
}

export interface JobPostingCreateRequest {
    title: string;
    description: string;
    techStack: string[];
    budget: number;
    duration: number;
    headcount: number;
}

export interface JobPostingUpdateRequest {
    title?: string;
    description?: string;
    techStack?: string[];
    budget?: number;
    duration?: number;
    headcount?: number;
    status?: RecruitmentJobStatus;
}

const stringifyForError = (value: unknown): string => {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const assertSuccessfulApiResponse = (payload: unknown, context: string): void => {
    const payloadJson = stringifyForError(payload);

    if (!payload || typeof payload !== 'object') {
        throw new Error(`Invalid response shape in ${context}. payload=${payloadJson}`);
    }

    const wrapped = payload as Partial<ApiResponse<unknown>>;
    const apiSuccess = typeof wrapped.success === 'boolean' ? wrapped.success : undefined;
    const apiMessage = typeof wrapped.message === 'string' ? wrapped.message : '';

    if (apiSuccess === false) {
        throw new Error(`API request failed in ${context}. apiMessage=${apiMessage} payload=${payloadJson}`);
    }

    if (apiSuccess !== true) {
        throw new Error(
            `Invalid response shape in ${context}. apiSuccess=${String(apiSuccess)} apiMessage=${apiMessage} payload=${payloadJson}`
        );
    }
};

const extractContent = <T>(payload: unknown): T[] => {
    if (Array.isArray(payload)) {
        return payload as T[];
    }

    let apiSuccess: boolean | undefined;
    let apiMessage: string | undefined;

    if (payload && typeof payload === 'object') {
        const wrapped = payload as Partial<ApiResponse<unknown>>;

        if (typeof wrapped.success === 'boolean') {
            apiSuccess = wrapped.success;
        }
        if (typeof wrapped.message === 'string') {
            apiMessage = wrapped.message;
        }

        if (apiSuccess === false) {
            const payloadJson = stringifyForError(payload);
            throw new Error(
                `API request failed in extractContent. apiMessage=${apiMessage ?? ''} payload=${payloadJson}`
            );
        }

        const data = wrapped.data;

        if (Array.isArray(data)) {
            return data as T[];
        }

        if (data && typeof data === 'object') {
            const paged = data as PagedResponse<T>;
            if (Array.isArray(paged.content)) {
                return paged.content;
            }
        }
    }

    const payloadJson = stringifyForError(payload);
    const apiMeta =
        apiSuccess !== undefined || apiMessage !== undefined
            ? ` apiSuccess=${String(apiSuccess)} apiMessage=${apiMessage ?? ''}`
            : '';

    throw new Error(
        `Invalid response shape in extractContent.${apiMeta} payload=${payloadJson}`
    );
};

export const getEmployerJobPostings = async (params?: { page?: number; size?: number }): Promise<EmployerJobPostingResponse[]> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<EmployerJobPostingResponse>>>(
        '/api/employer/jobs',
        { params }
    );
    return extractContent<EmployerJobPostingResponse>(response.data);
};

export const searchFreelancerJobPostings = async (params?: {
    keyword?: string;
    liked?: boolean;
    page?: number;
    size?: number;
}): Promise<FreelancerJobPostingResponse[]> => {
    const response = await apiClient.get<ApiResponse<PagedResponse<FreelancerJobPostingResponse>>>(
        '/api/freelancer/jobs',
        { params }
    );
    return extractContent<FreelancerJobPostingResponse>(response.data);
};

export const createEmployerJobPosting = async (payload: JobPostingCreateRequest): Promise<void> => {
    const response = await apiClient.post<ApiResponse<void>>('/api/employer/jobs/post', payload);
    assertSuccessfulApiResponse(response.data, 'createEmployerJobPosting');
};

export const updateEmployerJobPosting = async (jobPostingId: number, payload: JobPostingUpdateRequest): Promise<void> => {
    const response = await apiClient.put<ApiResponse<void>>('/api/employer/jobs/put', payload, {
        params: { jobsNumber: jobPostingId }
    });
    assertSuccessfulApiResponse(response.data, 'updateEmployerJobPosting');
};

export const deleteEmployerJobPosting = async (jobPostingId: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>('/api/employer/jobs/del', {
        params: { jobsNumber: jobPostingId }
    });
    assertSuccessfulApiResponse(response.data, 'deleteEmployerJobPosting');
};

export const addFavoriteJobPosting = async (jobPostingId: number): Promise<void> => {
    const response = await apiClient.post<ApiResponse<void>>(`/api/freelancer/jobs/${jobPostingId}/like`);
    assertSuccessfulApiResponse(response.data, 'addFavoriteJobPosting');
};

export const removeFavoriteJobPosting = async (jobPostingId: number): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/freelancer/jobs/${jobPostingId}/like`);
    assertSuccessfulApiResponse(response.data, 'removeFavoriteJobPosting');
};
