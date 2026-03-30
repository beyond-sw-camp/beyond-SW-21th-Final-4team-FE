import apiClient from '@/api/axiosInstance';

export interface AccountInfo {
    id: number;
    email: string;
    name: string;
    phone?: string | null;
}

export interface PasswordChange {
    current: string;
    new: string;
    confirm: string;
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface EmployerSubscriptionResponse {
    currentPlan: string;
    features: string[];
    nextBillingDate: string | null;
}

export interface EmployerSubscriptionChangeResult {
    success: boolean;
    currentPlanGrade: string;
    pendingPlanGrade: string | null;
    status: string;
    nextBillingDate: string | null;
    message: string;
}

export interface EmployerNotificationSettings {
    emailEnabled: boolean;
}

export interface FreelancerNotificationSettings {
    requestNotificationEnabled: boolean;
    contractNotificationEnabled: boolean;
}

export const getAccountInfo = async (): Promise<AccountInfo> => {
    const response = await apiClient.get<ApiResponse<any>>('/api/users/getmyinfo');
    const data = response.data.data;
    return {
        id: data.id,
        email: data.email ?? '',
        name: data.name ?? '',
        phone: data.phone
    };
};

export const updateAccountInfo = async (_data: Partial<AccountInfo>): Promise<boolean> => {
    const response = await apiClient.put<ApiResponse<AccountInfo>>('/api/users/me/info', {
        name: _data.name,
        phone: _data.phone
    });
    if (response.data.success !== true) {
        throw new Error(response.data.message ?? 'Failed to update account info');
    }
    return true;
};

export const changeEmployerPassword = async (data: PasswordChange): Promise<boolean> => {
    if (data.new !== data.confirm) {
        throw new Error('Password confirmation does not match');
    }
    await apiClient.put<ApiResponse<null>>('/api/employer/mypage/account/password', {
        currentPassword: data.current,
        newPassword: data.new
    });
    return true;
};

export const changeFreelancerPassword = async (data: PasswordChange): Promise<boolean> => {
    if (data.new !== data.confirm) {
        throw new Error('Password confirmation does not match');
    }
    await apiClient.put<ApiResponse<null>>('/api/freelancer/mypage/account/password', {
        currentPassword: data.current,
        newPassword: data.new
    });
    return true;
};

export const getEmployerSubscription = async (): Promise<EmployerSubscriptionResponse> => {
    const response = await apiClient.get<ApiResponse<EmployerSubscriptionResponse>>(
        '/api/employer/mypage/account/subscription'
    );
    return response.data.data;
};

export const updateEmployerSubscription = async (
    targetPlan: string,
    billingKey?: string | null,
    paymentId?: string | null
): Promise<EmployerSubscriptionChangeResult> => {
    const normalizedTargetPlan = targetPlan.toUpperCase() === 'FREE' ? 'BASIC' : targetPlan;
    const response = await apiClient.put<ApiResponse<EmployerSubscriptionChangeResult>>(
        '/api/employer/mypage/account/subscription',
        {
            targetPlan: normalizedTargetPlan,
            billingKey: billingKey ?? null,
            paymentId: paymentId ?? null,
        }
    );
    if (response.data.success !== true) {
        throw new Error(response.data.message ?? 'Failed to update subscription');
    }
    return {
        success: true,
        ...response.data.data
    };
};

export const getEmployerNotificationSettings = async (): Promise<EmployerNotificationSettings> => {
    const response = await apiClient.get<ApiResponse<EmployerNotificationSettings>>(
        '/api/employer/mypage/account/notifications'
    );
    return response.data.data;
};

export const updateEmployerNotificationSettings = async (emailEnabled: boolean): Promise<boolean> => {
    await apiClient.put<ApiResponse<null>>('/api/employer/mypage/account/notifications', {
        emailEnabled
    });
    return true;
};

export const getFreelancerNotificationSettings = async (): Promise<FreelancerNotificationSettings> => {
    const response = await apiClient.get<ApiResponse<FreelancerNotificationSettings>>(
        '/api/freelancer/mypage/account/notifications'
    );
    return response.data.data;
};

export const updateFreelancerNotificationSettings = async (
    requestNotificationEnabled: boolean,
    contractNotificationEnabled: boolean
): Promise<boolean> => {
    await apiClient.put<ApiResponse<null>>('/api/freelancer/mypage/account/notifications', {
        requestNotificationEnabled,
        contractNotificationEnabled
    });
    return true;
};
