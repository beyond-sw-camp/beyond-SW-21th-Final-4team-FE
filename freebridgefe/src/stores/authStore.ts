import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types';
import { authApi } from '@/api/authApi';
import {
    AUTH_SESSION_CLEARED_EVENT,
    AUTH_SESSION_UPDATED_EVENT,
    clearStoredAuthData,
    setTokens
} from '@/api/axiosInstance';

function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.length > 1 ? `${localPart.charAt(0)}***` : '***';
    return `${maskedLocal}@${domain}`;
}

export const useAuthStore = defineStore('auth', () => {
    // Initialize from localStorage if available
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('access_token');
    let initialUser: User | null = null;
    if (savedUser) {
        try {
            initialUser = JSON.parse(savedUser);
            if (initialUser?.createdAt) {
                initialUser.createdAt = new Date(initialUser.createdAt);
            }
            if (initialUser?.agreedToTermsAt) {
                initialUser.agreedToTermsAt = new Date(initialUser.agreedToTermsAt);
            }
        } catch (e) {
            console.error('Failed to restore user from localStorage', e);
        }
    }
    const user = ref<User | null>(initialUser);
    const token = ref<string | null>(savedToken);
    const isLoading = ref(false);

    const isAuthenticated = computed(() => !!user.value && !!token.value);

    if (typeof window !== 'undefined') {
        window.addEventListener(AUTH_SESSION_UPDATED_EVENT, ((event: Event) => {
            const customEvent = event as CustomEvent<{ accessToken?: string }>;
            token.value = customEvent.detail?.accessToken ?? localStorage.getItem('access_token');
        }) as EventListener);

        window.addEventListener(AUTH_SESSION_CLEARED_EVENT, (() => {
            user.value = null;
            token.value = null;
        }) as EventListener);
    }

    function setAuth(userData: User, accessToken: string, refreshToken?: string) {
        user.value = userData;
        token.value = accessToken;
        localStorage.setItem('user', JSON.stringify(userData));
        setTokens(accessToken, refreshToken);
    }

    async function login(credentials: any) {
        isLoading.value = true;
        try {
            const data = await authApi.login(credentials);
            setAuth(data.user, data.accessToken, data.refreshToken);
            return data;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    async function logout() {
        try {
            await authApi.logout();
        } catch (error) {
            console.warn('Logout request failed, clearing local session anyway.', error);
        } finally {
            user.value = null;
            token.value = null;
            clearStoredAuthData();
        }
    }

    async function checkEmailDuplicate(email: string): Promise<boolean> {
        console.log(`Checking duplicate for: ${maskEmail(email)}`);
        try {
            const isAvailable = await authApi.checkEmail(email);
            return isAvailable;
        } catch (error) {
            console.error('Failed to check email duplicate:', error);
            // Fallback or handle accordingly
            return false;
        }
    }

    async function startSignup(userData: any) {
        isLoading.value = true;
        try {
            await authApi.sendVerification(userData.email);
            // Store temp user data for final signup step after verification
            sessionStorage.setItem('temp_signup_user', JSON.stringify(userData));
        } catch (error) {
            console.error('Failed to start signup:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    async function verifyEmail(email: string, code: string): Promise<boolean> {
        console.log(`Verifying ${maskEmail(email)}`);
        isLoading.value = true;
        try {
            const response = await authApi.verifyEmail(email, code);

            if (response.success) {
                // Now that email is verified, call the actual signup endpoint
                const tempUserStr = sessionStorage.getItem('temp_signup_user');
                if (tempUserStr) {
                    const userData = JSON.parse(tempUserStr);
                    await authApi.signup(userData);

                    // AUTO-LOGIN to ensure the user is authenticated for onboarding
                    await login({ email: userData.email, password: userData.password });

                    sessionStorage.removeItem('temp_signup_user');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Verification failed:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    async function resendVerificationCode(email: string) {
        console.log(`Resending verification code to ${maskEmail(email)}`);
        isLoading.value = true;
        try {
            await authApi.resendVerification(email);
        } catch (error) {
            console.error('Failed to resend code:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        startSignup,
        verifyEmail,
        resendVerificationCode,
        checkEmailDuplicate
    };
});
