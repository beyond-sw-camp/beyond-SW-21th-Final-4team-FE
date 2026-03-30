import apiClient from '@/api/axiosInstance';

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface EmployerReviewSummary {
    averageRate: number;
    atmosphereRate: number;
    requirementsDetailRate: number;
    scheduleAdherenceRate: number;
}

export interface EmployerReputationAi {
    aiSummary: string;
    positiveKeywords: string[];
    negativeKeywords: string[];
}

export interface FreelancerReviewSummary {
    averageRate: number;
    topPercentile: number;
    expertiseRate: number;
    communicationRate: number;
    scheduleRate: number;
}

export interface FreelancerAiReputationReport {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    technicalScores: { name: string; score: number }[];
    softSkills: { name: string; score: number }[];
}

export interface FreelancerAiPositivityIndex {
    positivityScore: number;
    grade: string;
}

export interface FreelancerStrengthWeakness {
    strengths: string[];
    weaknesses: string[];
}

export interface DetailedScore {
    professionalism: {
        programming: number;
        framework: number;
        problemSolving: number;
    };
    collaboration: {
        communication: number;
        scheduleAdherence: number;
        dispute: number;
    };
}

export interface Evaluation {
    id: number;
    companyName: string;
    projectName: string;
    score: number; // 0~5
    comment: string;
    tags: string[]; // ['친절해요', '결제가 빨라요']
    createdAt: string; // YYYY-MM-DD
    detailedScores: DetailedScore;
}

export interface RejectionFeedback {
    id: number;
    companyName: string;
    projectName: string;
    reason: string;
    createdAt: string;
    tags?: string[];
}

// NOTE: Backend endpoints are not available yet. Throw to let UI show "coming soon".
export const getRejectionFeedbacks = async (_userId: number | 'guest'): Promise<RejectionFeedback[]> => {
    throw new Error('API not implemented: rejection feedbacks unavailable');
};

// NOTE: Backend endpoints are not available yet. Throw to let UI show "coming soon".
export const getEvaluations = async (_userId: number | 'guest'): Promise<Evaluation[]> => {
    throw new Error('API not implemented: evaluations unavailable');
};

export const getEmployerReviewSummary = async (): Promise<EmployerReviewSummary> => {
    const response = await apiClient.get<ApiResponse<EmployerReviewSummary>>(
        '/api/employer/mypage/reviews/summary'
    );
    return response.data.data;
};

export const getEmployerReputationAi = async (): Promise<EmployerReputationAi> => {
    const response = await apiClient.get<ApiResponse<EmployerReputationAi>>(
        '/api/employer/mypage/reputation/ai'
    );
    return response.data.data;
};

export const getFreelancerReviewSummary = async (): Promise<FreelancerReviewSummary> => {
    const response = await apiClient.get<ApiResponse<FreelancerReviewSummary>>(
        '/api/freelancer/mypage/reviews/summary'
    );
    if (!response.data.success || response.data.data == null) {
        const message = response.data.message ?? 'Unknown error';
        throw new Error(`getFreelancerReviewSummary failed (/api/freelancer/mypage/reviews/summary): ${message}`);
    }
    return response.data.data;
};

export const getFreelancerAiReputationReport = async (): Promise<FreelancerAiReputationReport> => {
    const response = await apiClient.get<ApiResponse<FreelancerAiReputationReport>>(
        '/api/freelancer/mypage/reviews/ai/report'
    );
    if (!response.data.success || response.data.data == null) {
        const message = response.data.message ?? 'Unknown error';
        throw new Error(`getFreelancerAiReputationReport failed (/api/freelancer/mypage/reviews/ai/report): ${message}`);
    }
    return response.data.data;
};

export const getFreelancerAiPositivityIndex = async (): Promise<FreelancerAiPositivityIndex> => {
    const response = await apiClient.get<ApiResponse<FreelancerAiPositivityIndex>>(
        '/api/freelancer/mypage/reviews/ai/positivity'
    );
    if (!response.data.success || response.data.data == null) {
        const message = response.data.message ?? 'Unknown error';
        throw new Error(`getFreelancerAiPositivityIndex failed (/api/freelancer/mypage/reviews/ai/positivity): ${message}`);
    }
    return response.data.data;
};

export const getFreelancerStrengthWeakness = async (): Promise<FreelancerStrengthWeakness> => {
    const response = await apiClient.get<ApiResponse<FreelancerStrengthWeakness>>(
        '/api/freelancer/mypage/reviews/ai/strength-weakness'
    );
    if (!response.data.success || response.data.data == null) {
        const message = response.data.message ?? 'Unknown error';
        throw new Error(`getFreelancerStrengthWeakness failed (/api/freelancer/mypage/reviews/ai/strength-weakness): ${message}`);
    }
    return response.data.data;
};
