import apiClient from './axiosInstance.ts';
import type { UserRole } from '@/types';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    httpStatus?: string;
}

export interface LoginData {
    accessToken: string;
    refreshToken: string;
    user: {
        id: number;
        email: string;
        name: string;
        role: UserRole;
        termsAgreed: boolean;
        privacyAgreed: boolean;
        emailVerified: boolean;
        createdAt: string;
    };
    grade: string | null;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    role: 'FREELANCER' | 'EMPLOYER';
    termsAgreed: boolean;
    privacyAgreed: boolean;
    phone?: string;
}

export interface RegisterData {
    id: number;
    email: string;
    name: string;
    role: string;
    termsAgreed: boolean;
    privacyAgreed: boolean;
    emailVerified: boolean;
    createdAt: string;
}

/**
 * Login user with email and password
 */
export const login = async (credentials: LoginRequest): Promise<LoginData> => {
    const response = await apiClient.post<ApiResponse<LoginData>>('/api/users/login', credentials);
    return response.data.data;
};

/**
 * Register a new user
 */
export const register = async (userData: RegisterRequest): Promise<RegisterData> => {
    // Debug logging removed to prevent PII exposure
    const response = await apiClient.post<ApiResponse<RegisterData>>('/api/users/signup', userData);
    return response.data.data;
};

/**
 * Check if email is already registered
 */
export const checkEmailAvailability = async (email: string): Promise<{ exists: boolean; available: boolean }> => {
    const response = await apiClient.get<ApiResponse<{ exists: boolean; available: boolean }>>(
        '/api/users/check-email',
        { params: { email } }
    );
    return response.data.data;
};

/**
 * Send verification code to email
 */
export const sendVerification = async (email: string) => {
    const response = await apiClient.post<ApiResponse<any>>('/api/auth/send-verification', { email });
    return response.data.data || {};
};

/**
 * Verify email with code
 */
export const verifyEmail = async (email: string, code: string) => {
    const response = await apiClient.post<ApiResponse<any>>('/api/auth/verify-email', { email, code });
    return response.data; // Return full response to check success
};

/**
 * Resend verification code
 */
export const resendVerification = async (email: string) => {
    const response = await apiClient.post<ApiResponse<any>>('/api/auth/resend-verification', { email });
    return response.data.data || {};
};

/**
 * Get user by ID
 */
export const getUserById = async (id: number) => {
    const response = await apiClient.get<ApiResponse<any>>(`/api/users/${id}`);
    return response.data.data ?? response.data;
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/users/by-email', {
        params: { email }
    });
    return response.data.data;
};

/**
 * Test JWT authentication and get current user
 */
export const getCurrentUser = async () => {
    const response = await apiClient.get<ApiResponse<any>>('/api/users/me/test');
    return response.data.data;
};

/**
 * Get users with optional role filtering
 * Robustly tries both /api/users and /api/v1/users and different role casings
 */
export const getUsers = async (params?: { role?: string }): Promise<any[]> => {
    const endpoints = [
        '/api/v1/employer/freelancers',
        '/api/v1/freelancers',
        '/api/freelancers',
        '/api/v1/users',
        '/api/users'
    ];
    const roles = params?.role ? [params.role.toUpperCase(), params.role.toLowerCase(), params.role] : [undefined];

    let lastError = null;

    for (const endpoint of endpoints) {
        for (const roleValue of roles) {
            try {
                console.log(`Trying to fetch from ${endpoint} with role: ${roleValue}`);
                const response = await apiClient.get<ApiResponse<any[]>>(endpoint, {
                    params: roleValue ? { role: roleValue } : {}
                });

                if (response.data && (response.data.success || Array.isArray(response.data))) {
                    const data = (response.data as any).data || response.data;
                    const items = Array.isArray(data) ? data : (data && (data as any).items ? (data as any).items : []);
                    console.log(`Successfully reached ${endpoint}. Items found: ${items.length}`);
                    return items;
                }
            } catch (err: any) {
                // Only log non-404 errors to console to keep it cleaner, or log 404s as warnings
                if (err.response?.status !== 404) {
                    console.warn(`Error from ${endpoint}:`, err.message);
                }
                lastError = err;
            }
        }
    }

    if (lastError) throw lastError;
    return [];
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
    await apiClient.post('/api/users/logout');
};

/**
 * Verify if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem('access_token');
    return !!token;
};

// Grouped export for compatibility with authStore.ts
export const authApi = {
    login,
    signup: register,
    checkEmail: async (email: string) => {
        const result = await checkEmailAvailability(email);
        return result.available;
    },
    verifyEmail,
    sendVerification,
    resendVerification,
    getUsers,
    getUserById,
    getUserByEmail,
    getCurrentUser,
    logout,
    isAuthenticated
};
