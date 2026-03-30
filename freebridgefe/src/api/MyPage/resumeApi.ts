import apiClient from '@/api/axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
  data: T;
}

export interface Education {
  id: number;
  schoolType: string;
  schoolName: string;
  major?: string;
  status: string;
  entranceDate: string;
  graduationDate: string;
  serverIndex?: number;
  isNew?: boolean;
}

export interface Career {
  id: number;
  companyName: string;
  department: string;
  position: string;
  jobType: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  description?: string;
  serverIndex?: number;
  isNew?: boolean;
}

export interface Certification {
  id: number;
  name: string;
  issuer: string;
  acquisitionDate: string;
  serverIndex?: number;
  isNew?: boolean;
}

export interface ResumeDetail {
  id: number;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  educations: Education[];
  careers: Career[];
  certifications: Certification[];
}

interface ResumeResponseDto {
  basicInfo: ResumeBasicInfoDto | null;
  educations: EducationDto[];
  careers: CareerDto[];
  certifications: CertificationDto[];
}

interface ResumeBasicInfoDto {
  name: string | null;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface EducationDto {
  educationId: number | null;
  schoolType: string | null;
  schoolName: string | null;
  major: string | null;
  admissionDate: string | null;
  graduationDate: string | null;
  status: string | null;
}

interface CareerDto {
  careerId: number | null;
  companyName: string | null;
  department: string | null;
  role: string | null;
  jobType: string | null;
  employmentType: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}

interface CertificationDto {
  certificationId: number | null;
  certificationName: string | null;
  issueOrganization: string | null;
  acquisitionDate: string | null;
}

const getApiErrorMessage = (response: ApiResponse<unknown>): string =>
  response.error?.message ?? response.message ?? 'Unknown error';

const unwrapApiResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(`resumeApi failed: ${getApiErrorMessage(response)}`);
  }

  if (response.data == null) {
    throw new Error('resumeApi failed: Missing response data');
  }

  return response.data;
};

const unwrapVoidApiResponse = (response: ApiResponse<unknown>): void => {
  if (!response.success) {
    throw new Error(`resumeApi failed: ${getApiErrorMessage(response)}`);
  }
};

const EDU_STATUS_LABELS: Record<string, string> = {
  GRADUATED: '졸업',
  ATTENDING: '재학',
  LEAVE_OF_ABSENCE: '휴학',
  OTHER: '기타',
};

const EDU_STATUS_ENUMS: Record<string, string> = {
  졸업: 'GRADUATED',
  재학: 'ATTENDING',
  휴학: 'LEAVE_OF_ABSENCE',
  기타: 'OTHER',
};

const mapEduStatusFromEnum = (status?: string | null): string => {
  if (!status) return '기타';
  return EDU_STATUS_LABELS[status] ?? '기타';
};

const mapEduStatusToEnum = (label?: string): string => {
  if (!label) return 'OTHER';
  return EDU_STATUS_ENUMS[label] ?? 'OTHER';
};

const isCurrentToken = (value?: string | null): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
    const tokens = [
    "재직중",
    "재직 중",
    "현재",
    "현직",
    "재직",
  ];
  return tokens.includes(trimmed);
};

const normalizeDate = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isCurrentToken(trimmed)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}\.\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(".", "-")}-01`;
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  return trimmed;
};

export const getResumeDetail = async (): Promise<ResumeDetail> => {
  const response = await apiClient.get<ApiResponse<ResumeResponseDto>>(
    '/api/freelancer/mypage/resume',
  );
  const data = unwrapApiResponse(response.data);
  const basicInfo = data?.basicInfo;
  const educations = (data?.educations ?? []).map((edu, index) => ({
    id: edu.educationId ?? index + 1,
    schoolType: edu.schoolType ?? '미입력',
    schoolName: edu.schoolName ?? '',
    major: edu.major ?? '',
    status: mapEduStatusFromEnum(edu.status),
    entranceDate: edu.admissionDate ?? '',
    graduationDate: edu.graduationDate ?? '',
    serverIndex: edu.educationId ?? index,
  }));

  const careers = (data?.careers ?? []).map((career, index) => ({
    id: career.careerId ?? index + 1,
    companyName: career.companyName ?? '',
    department: career.department ?? '',
    position: career.role ?? '',
    jobType: career.jobType ?? '',
    employmentType: career.employmentType ?? '',
    startDate: career.startDate ?? '',
    endDate: career.endDate ?? '',
    isCurrent: career.endDate == null,
    description: career.description ?? '',
    serverIndex: career.careerId ?? index,
  }));

  const certifications = (data?.certifications ?? []).map((cert, index) => ({
    id: cert.certificationId ?? index + 1,
    name: cert.certificationName ?? '',
    issuer: cert.issueOrganization ?? '',
    acquisitionDate: cert.acquisitionDate ?? '',
    serverIndex: cert.certificationId ?? index,
  }));

  return {
    id: 0,
    name: basicInfo?.name ?? '',
    birthDate: basicInfo?.birthDate ?? '',
    phone: basicInfo?.phone ?? '',
    email: basicInfo?.email ?? '',
    address: basicInfo?.address ?? '',
    educations,
    careers,
    certifications,
  };
};

export const updateResumeBasicInfo = async (data: ResumeDetail): Promise<void> => {
  const response = await apiClient.put<ApiResponse<null>>('/api/freelancer/mypage/resume', {
    name: data.name,
    birthDate: normalizeDate(data.birthDate),
    phone: data.phone,
    email: data.email,
    address: data.address,
  });
  unwrapVoidApiResponse(response.data);
};

export const addEducation = async (education: Education): Promise<void> => {
  const response = await apiClient.post<ApiResponse<null>>('/api/freelancer/mypage/resume/educations', {
    schoolType: education.schoolType,
    schoolName: education.schoolName,
    major: education.major ?? '',
    eduStatus: mapEduStatusToEnum(education.status),
    entranceDate: normalizeDate(education.entranceDate),
    graduationDate: normalizeDate(education.graduationDate),
  });
  unwrapVoidApiResponse(response.data);
};

export const updateEducation = async (index: number, education: Education): Promise<void> => {
  const response = await apiClient.put<ApiResponse<null>>(`/api/freelancer/mypage/resume/educations/${index}`, {
    schoolType: education.schoolType,
    schoolName: education.schoolName,
    major: education.major ?? '',
    eduStatus: mapEduStatusToEnum(education.status),
    entranceDate: normalizeDate(education.entranceDate),
    graduationDate: normalizeDate(education.graduationDate),
  });
  unwrapVoidApiResponse(response.data);
};

export const deleteEducation = async (index: number): Promise<void> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/api/freelancer/mypage/resume/educations/${index}`);
  unwrapVoidApiResponse(response.data);
};

export const addCareer = async (career: Career): Promise<void> => {
  const isCurrent = career.isCurrent || isCurrentToken(career.endDate);
  const response = await apiClient.post<ApiResponse<null>>('/api/freelancer/mypage/resume/careers', {
    companyName: career.companyName,
    department: career.department,
    position: career.position,
    jobType: career.jobType,
    employmentType: career.employmentType,
    startDate: normalizeDate(career.startDate),
    endDate: isCurrent ? null : normalizeDate(career.endDate),
    description: career.description ?? '',
  });
  unwrapVoidApiResponse(response.data);
};

export const updateCareer = async (index: number, career: Career): Promise<void> => {
  const isCurrent = career.isCurrent || isCurrentToken(career.endDate);
  const response = await apiClient.put<ApiResponse<null>>(`/api/freelancer/mypage/resume/careers/${index}`, {
    companyName: career.companyName,
    department: career.department,
    position: career.position,
    jobType: career.jobType,
    employmentType: career.employmentType,
    startDate: normalizeDate(career.startDate),
    endDate: isCurrent ? null : normalizeDate(career.endDate),
    description: career.description ?? '',
  });
  unwrapVoidApiResponse(response.data);
};

export const deleteCareer = async (index: number): Promise<void> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/api/freelancer/mypage/resume/careers/${index}`);
  unwrapVoidApiResponse(response.data);
};

export const addCertification = async (cert: Certification): Promise<void> => {
  const response = await apiClient.post<ApiResponse<null>>('/api/freelancer/mypage/resume/certifications', {
    name: cert.name,
    issuer: cert.issuer,
    acquisitionDate: normalizeDate(cert.acquisitionDate),
  });
  unwrapVoidApiResponse(response.data);
};

export const updateCertification = async (
  index: number,
  cert: Certification,
): Promise<void> => {
  const response = await apiClient.put<ApiResponse<null>>(`/api/freelancer/mypage/resume/certifications/${index}`, {
    name: cert.name,
    issuer: cert.issuer,
    acquisitionDate: normalizeDate(cert.acquisitionDate),
  });
  unwrapVoidApiResponse(response.data);
};

export const deleteCertification = async (index: number): Promise<void> => {
  const response = await apiClient.delete<ApiResponse<null>>(`/api/freelancer/mypage/resume/certifications/${index}`);
  unwrapVoidApiResponse(response.data);
};
