import apiClient from '@/api/axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ContractSummaryDto {
  id: number;
  contractId: number;
  projectName: string;
  freelancerId: number;
  employerId: number;
  relatedJobId?: string | null;
  relatedApplicationId?: string | null;
  relatedProposalId?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  budget: number;
  employerSigned: boolean;
  freelancerSigned: boolean;
  freelancerName?: string | null;
  employerName?: string | null;
}

export interface ContractResponseDto extends ContractSummaryDto {
  commissionRate?: number | null;
  paymentDay?: number | null;
  contractPdfUrl?: string | null;
  signedPdfUrl?: string | null;
  signedDate?: string | null;
  aiLegalAdvice?: string | null;
  jobDescription?: string | null;
  workLocation?: string | null;
  workStartTime?: string | null;
  workEndTime?: string | null;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  workDaysPerWeek?: number | null;
  weeklyHoliday?: string | null;
  employerBusinessName?: string | null;
  employerAddress?: string | null;
  employerCEO?: string | null;
  freelancerAddress?: string | null;
  freelancerPhone?: string | null;
  employerSignature?: string | null;
  employerSignedDate?: string | null;
  freelancerSignature?: string | null;
  freelancerSignedDate?: string | null;
}

export interface ContractListResponseDto {
  items: ContractSummaryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContractListParams {
  status?: string | string[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateContractRequest {
  projectName: string;
  freelancerId: number;
  freelancerName?: string;
  relatedJobId?: string;
  relatedApplicationId?: string;
  relatedProposalId?: string;
  startDate: string;
  endDate: string;
  budget: number;
  paymentDay: number;
  jobDescription: string;
  workLocation: string;
  workStartTime: string;
  workEndTime: string;
  breakStartTime: string;
  breakEndTime: string;
  workDaysPerWeek: number;
  weeklyHoliday: string;
  employerBusinessName: string;
  employerAddress: string;
  employerCEO: string;
  freelancerAddress?: string;
  freelancerPhone?: string;
  employerSignature?: string;
}

export interface SignContractRequest {
  signature: string;
  freelancerAddress?: string;
  freelancerPhone?: string;
}

export interface EmployerProject {
  projectId: number;
  jobPostingId: number;
  freelancerId: number;
  projectName: string;
  headcount: number;
  startDate: string;
  endDate: string;
  status: string;
}

export interface EmployerProjectsResponse {
  content: EmployerProject[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MatchedFreelancer {
  projectId: number;
  freelancerId: number;
  freelancerName: string;
  job: string;
  grade: string;
  avatarUrl: string;
  status: string;
}

export interface MatchedFreelancersResponse {
  content: MatchedFreelancer[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const listContracts = async (
  params: ContractListParams = {},
): Promise<ContractListResponseDto> => {
  const response = await apiClient.get<ApiResponse<ContractListResponseDto>>('/api/contracts', {
    params: {
      status: params.status,
      search: params.search,
      page: params.page ?? 1,
      limit: params.limit ?? 100,
    },
  });

  return response.data.data;
};

export async function getContract(contractId: number): Promise<ContractResponseDto> {
  const response = await apiClient.get<ApiResponse<ContractResponseDto>>(`/api/contracts/${contractId}`);
  return response.data.data;
}

export async function requestAiLegalReview(contractId: number): Promise<ContractResponseDto> {
  const response = await apiClient.post<ApiResponse<ContractResponseDto>>(
    `/api/contracts/${contractId}/ai-review`,
  );
  return response.data.data;
}

export async function getContractPdfUrl(contractId: number): Promise<string> {
  const response = await apiClient.get<ApiResponse<string>>(`/api/contracts/${contractId}/pdf`);
  return response.data.data;
}

export async function createContract(data: CreateContractRequest): Promise<ContractResponseDto> {
  const response = await apiClient.post<ApiResponse<ContractResponseDto>>('/api/contracts', data);
  return response.data.data;
}

export async function signContract(
  contractId: number,
  data: SignContractRequest,
): Promise<ContractResponseDto> {
  const response = await apiClient.patch<ApiResponse<ContractResponseDto>>(
    `/api/contracts/${contractId}/sign`,
    data,
  );
  return response.data.data;
}

export async function completeContract(contractId: number): Promise<ContractResponseDto> {
  const response = await apiClient.patch<ApiResponse<ContractResponseDto>>(
    `/api/contracts/${contractId}/complete`,
  );
  return response.data.data;
}

export async function rejectContract(contractId: number): Promise<ContractResponseDto> {
  const response = await apiClient.patch<ApiResponse<ContractResponseDto>>(
    `/api/contracts/${contractId}/reject`,
  );
  return response.data.data;
}

export async function getEmployerRecruitmentProjects(
  page = 0,
  size = 100,
): Promise<EmployerProjectsResponse> {
  const response = await apiClient.get<ApiResponse<EmployerProjectsResponse>>('/api/employer/project', {
    params: { page, size },
  });
  return response.data.data;
}

export async function getMatchedFreelancers(
  projectId: number,
  page = 0,
  size = 10,
): Promise<MatchedFreelancersResponse> {
  const response = await apiClient.get<ApiResponse<MatchedFreelancersResponse>>(
    `/api/employer/projects/${projectId}/matched-freelancers`,
    { params: { page, size } },
  );
  return response.data.data;
}
