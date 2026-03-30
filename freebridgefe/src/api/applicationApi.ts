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

export interface ApplicationCreatePayload {
  jobPostingId: number;
  message: string;
}

export interface ApplicationCreateResult {
  applicationId: number;
}

export interface ApplicationResponseDto {
  applicationId: number;
  jobPostingId: number;
  freelancerId: number;
  employerId: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export const createFreelancerApplication = async (
  payload: ApplicationCreatePayload,
): Promise<ApplicationCreateResult> => {
  const response = await apiClient.post<ApiResponse<ApplicationCreateResult>>(
    '/api/freelancer/application',
    payload,
  );
  return response.data.data;
};

export const getEmployerApplications = async (
  page = 0,
  size = 100,
): Promise<PagedResponseDto<ApplicationResponseDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<ApplicationResponseDto>>>(
    '/api/employer/applications',
    { params: { page, size } },
  );
  return response.data.data;
};

export const getFreelancerApplications = async (
  page = 0,
  size = 100,
): Promise<PagedResponseDto<ApplicationResponseDto>> => {
  const response = await apiClient.get<ApiResponse<PagedResponseDto<ApplicationResponseDto>>>(
    '/api/freelancer/application',
    { params: { page, size } },
  );
  return response.data.data;
};

export const acceptEmployerApplication = async (
  applicationId: number,
): Promise<{ projectId: number }> => {
  const response = await apiClient.patch<ApiResponse<{ projectId: number }>>(
    `/api/employer/agree/${applicationId}`,
  );
  return response.data.data;
};

export const rejectEmployerApplication = async (
  applicationId: number,
): Promise<{ applicationId: number }> => {
  const response = await apiClient.patch<ApiResponse<{ applicationId: number }>>(
    `/api/employer/deny/${applicationId}`,
  );
  return response.data.data;
};
