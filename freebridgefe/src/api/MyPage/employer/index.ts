import apiClient from '@/api/axiosInstance';
import { getAccountInfo } from '@/api/MyPage/accountApi';

export interface EmployerProfileData {
    companyName: string;
    industry: string;
    size: string;
    location: string;
    website: string;
    email: string;
    phone: string;
    description: string;
    plan?: string;
    logoUrl?: string;
    activeProjects?: number;
    totalApplicants?: number;
    contractedFreelancers?: number;
    avgRating?: number;
    ratingDetails?: {
        atmosphere: number;
        requirementsDetail: number;
        scheduleAdherence: number;
    };
    projectStatusCounts?: {
        posted: number;
        screening: number;
        inProgress: number;
        completed: number;
    };
    crmAlerts?: {
        isFirstJobEncouraged?: boolean;
        hasPendingApplicants?: boolean;
        isContractConversionNeeded?: boolean;
        isRehiringRecommended?: boolean;
        isSubscriptionAttentionNeeded?: boolean;
        isPremiumUpsellEligible: boolean;
        isPrimeUpsellEligible?: boolean;
        upsellTarget?: 'PRO' | 'PRIME';
    };
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

interface EmployerProfileDto {
    companyName: string | null;
    industry: string | null;
    scale: string | null;
    location: string | null;
    websiteUrl: string | null;
    phone: string | null;
    description: string | null;
    logoUrl: string | null;
    status: string | null;
}

interface CrmAlertsResponseDto {
    isFirstJobEncouraged: boolean;
    hasPendingApplicants: boolean;
    isContractConversionNeeded: boolean;
    isRehiringRecommended: boolean;
    isSubscriptionAttentionNeeded: boolean;
    isPremiumUpsellEligible: boolean;
    isPrimeUpsellEligible?: boolean;
    upsellTarget?: 'PRO' | 'PRIME';
}

const mapProfileDto = (dto: EmployerProfileDto): EmployerProfileData => ({
    companyName: dto.companyName ?? '',
    industry: dto.industry ?? '',
    size: dto.scale ?? '',
    location: dto.location ?? '',
    website: dto.websiteUrl ?? '',
    email: '',
    phone: dto.phone ?? '',
    description: dto.description ?? '',
    plan: undefined,
    logoUrl: dto.logoUrl ?? undefined,
    activeProjects: undefined,
    totalApplicants: undefined,
    contractedFreelancers: undefined,
    avgRating: undefined,
    ratingDetails: undefined,
    projectStatusCounts: undefined,
    crmAlerts: undefined
});

export interface Application {
    id: string;
    jobId: string;
    freelancerId: string;
    freelancerName: string;
    message: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    rejectionReason?: string;
    createdAt: string;
    resumeUrl?: string;
    portfolioUrl?: string;
}

export interface ApplicationGroup {
    jobId: string;
    jobTitle: string;
    applications: Application[];
}

export const getApplications = async (): Promise<ApplicationGroup[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return [
        {
            jobId: 'j1',
            jobTitle: 'React Dashboard Development',
            applications: [
                {
                    id: 'a1',
                    jobId: 'j1',
                    freelancerId: 'f1',
                    freelancerName: 'Kim Frontend',
                    message: '5 years of React and TypeScript experience.',
                    status: 'PENDING',
                    createdAt: '2024-02-10',
                    resumeUrl: '#',
                    portfolioUrl: '#'
                },
                {
                    id: 'a2',
                    jobId: 'j1',
                    freelancerId: 'f2',
                    freelancerName: 'Lee Fullstack',
                    message: 'Ready to contribute immediately.',
                    status: 'REJECTED',
                    rejectionReason: 'Skill mismatch',
                    createdAt: '2024-02-09',
                    resumeUrl: '#'
                }
            ]
        },
        {
            jobId: 'j2',
            jobTitle: 'Shopping Mall Admin Renewal',
            applications: [
                {
                    id: 'a3',
                    jobId: 'j2',
                    freelancerId: 'f3',
                    freelancerName: 'Park Publisher',
                    message: 'Specialized in responsive UI implementation.',
                    status: 'ACCEPTED',
                    createdAt: '2024-02-08',
                    portfolioUrl: '#'
                }
            ]
        }
    ];
};

export const acceptApplication = async (applicationId: string): Promise<void> => {
    console.log(`Accepted application: ${applicationId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
};

export const rejectApplication = async (applicationId: string, reason: string): Promise<void> => {
    console.log(`Rejected application: ${applicationId}, reason: ${reason}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
};

export const getEmployerProfile = async (_employerId?: string | number): Promise<EmployerProfileData> => {
    const [profileRes, crmRes, accountInfo] = await Promise.all([
        apiClient.get<ApiResponse<EmployerProfileDto>>('/api/employer/mypage/profile'),
        apiClient.get<ApiResponse<CrmAlertsResponseDto>>('/api/employer/mypage/profile/crm-alerts').catch(() => null),
        getAccountInfo().catch(() => null)
    ]);
    const mapped = mapProfileDto(profileRes.data.data);
    return {
        ...mapped,
        email: accountInfo?.email ?? mapped.email,
        phone: accountInfo?.phone ?? mapped.phone,
        crmAlerts: crmRes?.data?.data ?? undefined
    };
};

export const updateEmployerProfile = async (data: EmployerProfileData): Promise<void> => {
    const payload = {
        companyName: data.companyName,
        industry: data.industry,
        scale: data.size,
        location: data.location,
        websiteUrl: data.website,
        description: data.description,
        phone: data.phone
    };
    await apiClient.put<ApiResponse<null>>('/api/employer/mypage/profile', payload);
};

export const uploadEmployerLogo = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<ApiResponse<string>>(
        '/api/employer/mypage/profile/logo',
        form
    );
    return response.data.data;
};
