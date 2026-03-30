import apiClient from '@/api/axiosInstance';

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface EmployerProjectStats {
    totalProjects: number;
    activeApplicants: number;
    contractedFreelancers: number;
}

export interface EmployerProjectListItem {
    projectId: number;
    title: string;
    status: string;
    applicantCount: number;
    createdAt: string | null;
    deadline: string | null;
    description?: string | null;
    monthlySalary?: string | number | null;
}

export interface EmployerApplicantStatus {
    freelancerId: number;
    applyStatus: string;
}
export interface FreelancerProjectStats {
    appliedProjects: number;
    inProgressProjects: number;
    completedProjects: number;
}

export interface FreelancerAppliedProject {
    projectId: number;
    title: string;
    employerName: string;
    applyStatus: string | null;
    appliedAt: number | null;
}
export interface FreelancerProject {
    id: number;
    title: string;
    clientName: string;
    status: 'scheduled' | 'ongoing' | 'completed';
    period: string;
    amount: string;
    dDay: string;

    // 상세 정보 (Detail)
    description: string;
    techStack: string[];
    contract: {
        status: 'signed' | 'pending';
        signedDate: string;
        fileUrl: string; // 계약서 PDF 다운로드 링크
    };
    payment: {
        totalAmount: number;
        paidAmount: number;
        nextPaymentDate: string;
        history: { date: string; amount: number; status: string }[];
    };
    review: {
        clientRating: number;
        clientComment: string;
        myRating: number;
        myComment: string;
    } | null;
}

const MOCK_PROJECTS: FreelancerProject[] = [
    {
        id: 1,
        title: '차세대 시스템 구축 프로젝트',
        clientName: '프리브릿지',
        status: 'ongoing',
        period: '2024.02.01 ~ 2024.08.31',
        amount: '55,000원/시간',
        dDay: 'D-150',
        description:
            '기존 레거시 시스템을 MSA 기반으로 전환하는 차세대 프로젝트입니다. Spring Boot와 Kafka를 활용한 이벤트 기반 아키텍처 설계를 담당합니다.',
        techStack: ['Java', 'Spring Boot', 'Kafka', 'Oracle', 'Redis'],
        contract: {
            status: 'signed',
            signedDate: '2024.01.15',
            fileUrl: '#'
        },
        payment: {
            totalAmount: 63000000,
            paidAmount: 9000000,
            nextPaymentDate: '2024.04.01',
            history: [
                { date: '2024.03.01', amount: 9000000, status: '지급완료' }
            ]
        },
        review: null
    },
    {
        id: 2,
        title: '이커머스 리뉴얼 프로젝트',
        clientName: '쿠팡',
        status: 'scheduled',
        period: '2024.09.01 ~ 2025.02.28',
        amount: '50,000원/시간',
        dDay: '시작 전',
        description:
            '대규모 트래픽을 처리할 수 있는 이커머스 플랫폼의 프론트엔드 리뉴얼 프로젝트입니다.',
        techStack: ['React', 'Next.js', 'TypeScript', 'GraphQL'],
        contract: {
            status: 'signed',
            signedDate: '2024.08.20',
            fileUrl: '#'
        },
        payment: {
            totalAmount: 51000000,
            paidAmount: 0,
            nextPaymentDate: '2024.10.01',
            history: []
        },
        review: null
    },
    {
        id: 3,
        title: '사내 운영 대시보드 개발',
        clientName: '라인',
        status: 'completed',
        period: '2023.08.01 ~ 2024.01.31',
        amount: '45,000원/시간',
        dDay: '종료',
        description: '사내 운영 효율화를 위한 Admin 대시보드 개발 프로젝트입니다.',
        techStack: ['Vue.js', 'TailwindCSS', 'Node.js'],
        contract: {
            status: 'signed',
            signedDate: '2023.07.20',
            fileUrl: '#'
        },
        payment: {
            totalAmount: 48000000,
            paidAmount: 48000000,
            nextPaymentDate: '-',
            history: [
                { date: '2023.09.01', amount: 8000000, status: '지급완료' },
                { date: '2023.10.01', amount: 8000000, status: '지급완료' },
                { date: '2023.11.01', amount: 8000000, status: '지급완료' },
                { date: '2023.12.01', amount: 8000000, status: '지급완료' },
                { date: '2024.01.01', amount: 8000000, status: '지급완료' },
                { date: '2024.02.01', amount: 8000000, status: '지급완료' }
            ]
        },
        review: {
            clientRating: 5.0,
            clientComment: '일정 준수와 커뮤니케이션이 뛰어났습니다. 코드 퀄리티도 매우 좋았습니다.',
            myRating: 4.8,
            myComment: '요구사항이 명확하여 작업하기 수월했습니다.'
        }
    }
];
const MOCK_APPLIED_PROJECTS: FreelancerAppliedProject[] = [
    {
        projectId: 101,
        title: '쇼핑몰 고도화 프로젝트',
        employerName: '프리브릿지',
        applyStatus: '심사중',
        appliedAt: 1740200000000
    },
    {
        projectId: 102,
        title: '이커머스 리뉴얼 프로젝트',
        employerName: '쿠팡',
        applyStatus: '합격',
        appliedAt: 1740100000000
    },
    {
        projectId: 103,
        title: '사내 운영 대시보드 개발',
        employerName: '라인',
        applyStatus: '거절',
        appliedAt: 1740000000000
    }
];
export const getFreelancerProjectStats = async (): Promise<FreelancerProjectStats> => {
    const response = await apiClient.get<ApiResponse<FreelancerProjectStats>>(
        '/api/freelancer/mypage/projects/stats'
    );
    return response.data.data ?? { appliedProjects: 0, inProgressProjects: 0, completedProjects: 0 };
};

export const getFreelancerProjects = async (
    userId: string,
    status?: string
): Promise<FreelancerAppliedProject[]> => {
    if (userId === 'guest') {
        const filtered = status
            ? MOCK_APPLIED_PROJECTS.filter((project) => project.applyStatus === status)
            : MOCK_APPLIED_PROJECTS;
        return Promise.resolve(filtered);
    }
    const response = await apiClient.get<ApiResponse<FreelancerAppliedProject[]>>(
        '/api/freelancer/mypage/projects',
        { params: status ? { status } : undefined }
    );
    return response.data.data ?? [];
};

export const getProjectDetail = (projectId: number): Promise<FreelancerProject | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(MOCK_PROJECTS.find(p => p.id === projectId));
        }, 500);
    });
};

export const getEmployerProjectStats = async (): Promise<EmployerProjectStats> => {
    const response = await apiClient.get<ApiResponse<EmployerProjectStats>>('/api/employer/mypage/projects/stats');
    return response.data.data;
};

export const getEmployerProjects = async (status?: string): Promise<EmployerProjectListItem[]> => {
    const response = await apiClient.get<ApiResponse<EmployerProjectListItem[]>>(
        '/api/employer/mypage/projects',
        { params: status ? { status } : undefined }
    );
    return response.data.data ?? [];
};

export const getEmployerApplicantStatus = async (projectId: number): Promise<EmployerApplicantStatus[]> => {
    const response = await apiClient.get<ApiResponse<EmployerApplicantStatus[]>>(
        `/api/employer/mypage/projects/${projectId}/applicants/status`
    );
    return response.data.data ?? [];
};

