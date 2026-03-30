import apiClient from '@/api/axiosInstance';

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface EmployerFreelancerSearchItem {
    freelancerId: number;
    userId: number;
    name: string;
    job: string | null;
    careerYears: number | null;
    wage: number | null;
    introduction: string | null;
    avatarUrl: string | null;
    skills: string[];
    grade: string | null;
}

export interface EmployerFreelancerSearchResponse {
    items: EmployerFreelancerSearchItem[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface EmployerFreelancerSearchParams {
    page?: number;
    size?: number;
    keyword?: string;
}

export const getEmployerFreelancers = async (
    params: EmployerFreelancerSearchParams = {}
): Promise<EmployerFreelancerSearchResponse> => {
    const response = await apiClient.get<ApiResponse<EmployerFreelancerSearchResponse>>(
        '/api/employer/freelancers',
        {
            params: {
                page: params.page ?? 0,
                size: params.size ?? 20,
                keyword: params.keyword?.trim() || undefined
            }
        }
    );

    return {
        ...response.data.data,
        items: response.data.data.items ?? []
    };
};
