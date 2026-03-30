import apiClient from '@/api/axiosInstance';

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface ProposalCreatePayload {
    jobPostingId: number;
    freelancerId: number;
    message: string;
}

export interface ProposalCreateResult {
    proposalId: number;
}

export interface ProposalResponseDto {
    proposalId: number;
    jobPostingId: number | null;
    freelancerId: number;
    employerId: number;
    message: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
}

export interface PagedResponseDto<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export const createEmployerProposal = async (
    payload: ProposalCreatePayload
): Promise<ProposalCreateResult> => {
    const response = await apiClient.post<ApiResponse<ProposalCreateResult>>(
        '/api/employer/proposals',
        payload
    );
    return response.data.data;
};

export const getEmployerProposals = async (
    page = 0,
    size = 100
): Promise<PagedResponseDto<ProposalResponseDto>> => {
    const response = await apiClient.get<ApiResponse<PagedResponseDto<ProposalResponseDto>>>(
        '/api/employer/proposals',
        {
            params: { page, size }
        }
    );
    return response.data.data;
};

export const getFreelancerProposals = async (
    page = 0,
    size = 100
): Promise<PagedResponseDto<ProposalResponseDto>> => {
    const response = await apiClient.get<ApiResponse<PagedResponseDto<ProposalResponseDto>>>(
        '/api/freelancer/proposal',
        {
            params: { page, size }
        }
    );
    return response.data.data;
};

export const acceptFreelancerProposal = async (
    proposalId: number
): Promise<{ projectId: number }> => {
    const response = await apiClient.patch<ApiResponse<{ projectId: number }>>(
        `/api/freelancer/agree/${proposalId}`
    );
    return response.data.data;
};

export const rejectFreelancerProposal = async (
    proposalId: number
): Promise<{ proposalId: number }> => {
    const response = await apiClient.patch<ApiResponse<{ proposalId: number }>>(
        `/api/freelancer/deny/${proposalId}`
    );
    return response.data.data;
};
