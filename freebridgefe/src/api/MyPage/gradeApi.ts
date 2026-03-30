import apiClient from '@/api/axiosInstance';

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export type GradeLevel = string | '';
export type EducationType = 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'DOCTOR';
export type CertificationType = 'INDUSTRIAL_ENGINEER' | 'ENGINEER';

export interface EducationOption {
    value: EducationType;
    label: string;
}

export interface CertificationOption {
    value: CertificationType;
    label: string;
}

export interface GradeCriteriaItem {
    grade: GradeLevel;
    color: string;
    edu: string;
    cert: string;
}

export interface GradeCalculationRequest {
    type: 'education' | 'certification';
    education?: EducationType;
    certification?: CertificationType;
    yearsOfExperience: number;
}

export interface GradeCalculationResponse {
    grade: GradeLevel;
    gradeDescription?: string;
    basis?: string;
    careerYears?: number;
    qualificationType?: string;
}

export interface CalculatedGradeResult {
    grade: GradeLevel;
    gradeDescription?: string;
}

export interface GradeSaveRequest {
    type: 'education' | 'certification';
    education?: EducationType;
    certification?: CertificationType;
    yearsOfExperience: number;
    grade: GradeLevel;
}

const MOCK_EDUCATION_OPTIONS: EducationOption[] = [
    { value: 'ASSOCIATE', label: '전문학사' },
    { value: 'BACHELOR', label: '학사' },
    { value: 'MASTER', label: '석사' },
    { value: 'DOCTOR', label: '박사' }
];

const MOCK_CERTIFICATION_OPTIONS: CertificationOption[] = [
    { value: 'INDUSTRIAL_ENGINEER', label: '산업기사' },
    { value: 'ENGINEER', label: '기사' }
];

const MOCK_CRITERIA_ITEMS: GradeCriteriaItem[] = [
    { grade: '특급', color: 'bg-purple-600', edu: '박사+4년 / 석사+9년 / 학사+12년 / 전문학사+15년', cert: '기사+10년 / 산업기사+13년' },
    { grade: '고급', color: 'bg-blue-500', edu: '박사+1년 / 석사+6년 / 학사+9년 / 전문학사+12년', cert: '기사+7년 / 산업기사+10년' },
    { grade: '중급', color: 'bg-green-500', edu: '박사 / 석사+3년 / 학사+6년 / 전문학사+9년', cert: '기사+4년 / 산업기사+7년' },
    { grade: '초급', color: 'bg-slate-500', edu: '석사 / 학사 / 전문학사+3년', cert: '기사 / 산업기사' },
];

export const getEducationOptions = async (): Promise<EducationOption[]> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_EDUCATION_OPTIONS), 300));
};

export const getCertificationOptions = async (): Promise<CertificationOption[]> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_CERTIFICATION_OPTIONS), 300));
};

export const getGradeCriteria = async (): Promise<GradeCriteriaItem[]> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_CRITERIA_ITEMS), 300));
};

export const calculateGrade = async (req: GradeCalculationRequest): Promise<CalculatedGradeResult> => {
    const payload = {
        qualificationType: req.type === 'education' ? 'ACADEMIC_CAREER' : 'LICENSED',
        degree: req.type === 'education' ? req.education : undefined,
        licenseGrade: req.type === 'certification' ? req.certification : undefined,
        careerYears: req.yearsOfExperience
    };

    const response = await apiClient.post<ApiResponse<GradeCalculationResponse>>(
        '/api/freelancer/mypage/grade-calculator/calculate',
        payload
    );
    if (!response.data.success) {
        const message = response.data.message ?? 'Unknown error';
        throw new Error(`calculateGrade failed (/api/freelancer/mypage/grade-calculator/calculate): ${message}`);
    }
    if (!response.data.data) {
        throw new Error('calculateGrade failed: empty response data');
    }
    return {
        grade: response.data.data.grade,
        gradeDescription: response.data.data.gradeDescription,
    };
};

export const saveGrade = async (req: GradeSaveRequest): Promise<boolean> => {
    const response = await apiClient.post<ApiResponse<null>>(
        '/api/freelancer/mypage/grade',
        req
    );
    if (!response.data.success) {
        const message = response.data.message ?? 'Unknown error';
        throw new Error(`saveGrade failed (/api/freelancer/mypage/grade): ${message}`);
    }
    return true;
};
