import apiClient from '@/api/axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PagedResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface EmployerReviewResponseDto {
  id: number;
  projectId: number;
  employerId: number;
  freelancerId: number;
  language: number;
  framework: number;
  debugging: number;
  communication: number;
  schedule: number;
  dispute: number;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FreelancerReviewResponseDto {
  id: number;
  projectId: number;
  freelancerId: number;
  employerId: number;
  atmosphere: number;
  requirementDetail: number;
  schedule: number;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployerReviewCreatePayload {
  freelancerId: number;
  language: number;
  framework: number;
  debugging: number;
  communication: number;
  schedule: number;
  dispute: number;
  description: string;
}

export interface EmployerReviewUpdatePayload {
  language: number;
  framework: number;
  debugging: number;
  communication: number;
  schedule: number;
  dispute: number;
  description: string;
}

export interface FreelancerReviewCreatePayload {
  employerId: number;
  atmosphere: number;
  requirementDetail: number;
  schedule: number;
  description: string;
}

export interface FreelancerReviewUpdatePayload {
  atmosphere: number;
  requirementDetail: number;
  schedule: number;
  description: string;
}

export interface EmployerProjectReviewDto {
  projectId: number;
  jobPostingId: number;
  freelancerId: number;
  projectName: string;
  headcount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
}

export interface FreelancerMypageProjectDto {
  projectId: number;
  title: string;
  employerName: string | null;
  applyStatus: string | null;
  appliedAt: number | null;
}

export interface EmployerRejectionReasonCreatePayload {
  projectId: number;
  projectTitle: string;
  freelancerId: number;
  reason: string;
}

export interface EmployerRejectionReasonResponseDto {
  id: number;
  projectId: number;
  projectTitle: string;
  employerId: number;
  freelancerId: number;
  reason: string;
  createdAt: string;
}

export const getEmployerReceivedReviews = async (
  page = 0,
  size = 100,
): Promise<PagedResponseDto<FreelancerReviewResponseDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<FreelancerReviewResponseDto>>>(
    '/api/employer/reviews',
    {
      params: { page, size },
    },
  );

  return response.data.data;
};

export const getEmployerWrittenReviews = async (
  page = 0,
  size = 100,
): Promise<PagedResponseDto<EmployerReviewResponseDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<EmployerReviewResponseDto>>>(
    '/api/employer/reviews/written',
    {
      params: { page, size },
    },
  );

  return response.data.data;
};

export const createEmployerReview = async (
  projectId: number,
  payload: EmployerReviewCreatePayload,
): Promise<number> => {
  const response = await apiClient.post<ApiResponse<number>>(
    `/api/employer/projects/${projectId}/reviews`,
    payload,
  );

  return response.data.data;
};

export const updateEmployerReview = async (
  reviewId: number,
  payload: EmployerReviewUpdatePayload,
): Promise<void> => {
  await apiClient.put<ApiResponse<null>>(`/api/employer/reviews/${reviewId}`, payload);
};

export const deleteEmployerReview = async (reviewId: number): Promise<void> => {
  await apiClient.delete<ApiResponse<null>>(`/api/employer/reviews/${reviewId}`);
};

export const getFreelancerReceivedReviews = async (
  page = 0,
  size = 100,
): Promise<PagedResponseDto<EmployerReviewResponseDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<EmployerReviewResponseDto>>>(
    '/api/freelancer/reviews',
    {
      params: { page, size },
    },
  );

  return response.data.data;
};

export const getFreelancerWrittenReviews = async (
  page = 0,
  size = 100,
): Promise<PagedResponseDto<FreelancerReviewResponseDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<FreelancerReviewResponseDto>>>(
    '/api/freelancer/reviews/written',
    {
      params: { page, size },
    },
  );

  return response.data.data;
};

export const createFreelancerReview = async (
  projectId: number,
  payload: FreelancerReviewCreatePayload,
): Promise<number> => {
  const response = await apiClient.post<ApiResponse<number>>(
    `/api/freelancer/projects/${projectId}/reviews`,
    payload,
  );

  return response.data.data;
};

export const updateFreelancerReview = async (
  reviewId: number,
  payload: FreelancerReviewUpdatePayload,
): Promise<void> => {
  await apiClient.put<ApiResponse<null>>(`/api/freelancer/reviews/${reviewId}`, payload);
};

export const deleteFreelancerReview = async (reviewId: number): Promise<void> => {
  await apiClient.delete<ApiResponse<null>>(`/api/freelancer/reviews/${reviewId}`);
};

export const getEmployerReviewProjects = async (
  page = 0,
  size = 100,
): Promise<PagedResponseDto<EmployerProjectReviewDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<EmployerProjectReviewDto>>>(
    '/api/employer/project',
    {
      params: { page, size },
    },
  );

  return response.data.data;
};

export const getFreelancerMypageProjects = async (
  status?: string,
): Promise<FreelancerMypageProjectDto[]> => {
  const response = await apiClient.get<ApiResponse<FreelancerMypageProjectDto[]>>(
    '/api/freelancer/mypage/projects',
    {
      params: status ? { status } : undefined,
    },
  );

  return response.data.data ?? [];
};

export const createEmployerRejectionReason = async (
  payload: EmployerRejectionReasonCreatePayload,
): Promise<number> => {
  const response = await apiClient.post<ApiResponse<number>>(
    '/api/employer/rejection-reasons',
    payload,
  );

  return response.data.data;
};

export const getEmployerRejectionReasons = async (
  page = 0,
  size = 100,
  title?: string,
): Promise<PagedResponseDto<EmployerRejectionReasonResponseDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<EmployerRejectionReasonResponseDto>>>(
    '/api/employer/rejection-reasons',
    {
      params: {
        page,
        size,
        ...(title?.trim() ? { title: title.trim() } : {}),
      },
    },
  );

  return response.data.data;
};

export const getFreelancerRejectionReasons = async (
  page = 0,
  size = 100,
  title?: string,
): Promise<PagedResponseDto<EmployerRejectionReasonResponseDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<EmployerRejectionReasonResponseDto>>>(
    '/api/freelancer/rejection-reasons',
    {
      params: {
        page,
        size,
        ...(title?.trim() ? { title: title.trim() } : {}),
      },
    },
  );

  return response.data.data;
};
