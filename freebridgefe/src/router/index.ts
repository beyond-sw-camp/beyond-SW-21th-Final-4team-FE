import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAlertStore } from '@/stores/alertStore'
import { pinia } from '@/stores/pinia'
import { getEmployerProfile } from '@/api/MyPage/employer'
import { getEmployerSubscription } from '@/api/MyPage/accountApi'
import { normalizeEmployerPlan } from '@/utils/employerSubscription'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'landing',
        component: () => import('@/views/auth/LandingView.vue')
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/auth/LoginView.vue')
    },
    {
        path: '/signup',
        name: 'signup',
        component: () => import('@/views/auth/SignupView.vue')
    },
    {
        path: '/guide',
        component: () => import('@/layouts/PlatformLayout.vue'),
        children: [
            {
                path: '',
                name: 'guide',
                component: () => import('@/views/Guide/UserGuideView.vue'),
                meta: { requiresAuth: false }
            }
        ]
    },
    {
        path: '/onboarding',
        component: () => import('@/layouts/BlankLayout.vue'), // Using a direct render function or importing a simple layout
        children: [
            {
                path: 'employer',
                name: 'onboarding.employer',
                component: () => import('@/views/onboarding/EmployerOnboarding.vue'),
                meta: { requiresAuth: true, role: 'EMPLOYER' }
            },
            {
                path: 'freelancer',
                name: 'onboarding.freelancer',
                component: () => import('@/views/onboarding/FreelancerOnboarding.vue'),
                meta: { requiresAuth: true, role: 'FREELANCER' }
            }
        ]
    },

    // Employer Routes
    {
        path: '/employer',
        component: () => import('@/layouts/PlatformLayout.vue'),
        meta: { requiresAuth: true, role: 'EMPLOYER' },
        children: [
            {
                path: '',
                redirect: '/employer/jobs'
            },
            {
                path: 'dashboard',
                name: 'employer.dashboard',
                redirect: '/employer/jobs'
            },
            {
                path: 'jobs',
                name: 'employer.jobs',
                component: () => import('@/views/employer/Jobs/JobList.vue')
            },
            {
                path: 'applications',
                name: 'employer.applications',
                component: () => import('@/views/employer/Applications/ApplicationList.vue')
            },
            {
                path: 'applications/:applicationId/reject',
                name: 'employer.applications.reject',
                component: () => import('@/views/employer/Applications/ApplicationRejectReasonWrite.vue')
            },
            {
                path: 'recommended',
                name: 'employer.recommended',
                component: () => import('@/views/employer/Recommended/RecommendedView.vue')
            },
            {
                path: 'settlements',
                name: 'employer.settlements',
                component: () => import('@/views/employer/Settlements/SettlementsView.vue')
            },
            {
                path: 'freelancers',
                name: 'employer.freelancers',
                component: () => import('@/views/employer/Freelancers/FreelancerSearchView.vue')
            },
            {
                path: 'contracts',
                name: 'employer.contracts',
                component: () => import('@/views/employer/Contracts/ContractsView.vue')
            },
            {
                path: 'payments',
                name: 'employer.payments',
                component: () => import('@/views/employer/Payments/PaymentView.vue')
            },
            {
                path: 'contracts/create',
                name: 'employer.contracts.create',
                component: () => import('@/views/employer/Contracts/CreateContractView.vue')
            },
            {
                path: 'mypage',
                name: 'employer.mypage',
                component: () => import('@/views/employer/MyPage/MyPageView.vue')
            },
            {
                path: 'review',
                name: 'employer.review',
                component: () => import('@/views/employer/Review/ReviewList.vue')
            },
            {
                path: 'review/write',
                name: 'employer.review.write',
                component: () => import('@/views/employer/Review/ReviewWrite.vue')
            },
            {
                path: 'freelancer/:id',
                name: 'employer.freelancer.profile',
                component: () => import('@/views/employer/Freelancer/FreelancerProfileView.vue')
            }
        ]
    },

    // Freelancer Routes
    {
        path: '/freelancer',
        component: () => import('@/layouts/PlatformLayout.vue'),
        meta: { requiresAuth: true, role: 'FREELANCER' },
        children: [
            {
                path: 'jobs',
                name: 'freelancer.jobs',
                component: () => import('@/views/freelancer/Jobs/JobBrowser.vue')
            },
            {
                path: 'applications',
                name: 'freelancer.applications',
                component: () => import('@/views/freelancer/Applications/MyApplications.vue')
            },
            {
                path: 'recommended',
                name: 'freelancer.recommended',
                redirect: '/freelancer/jobs'
            },
            {
                path: 'contracts',
                name: 'freelancer.contracts',
                component: () => import('@/views/freelancer/Contracts/ContractList.vue')
            },
            {
                path: 'settlement',
                name: 'freelancer.settlement',
                component: () => import('@/views/freelancer/Settlement/SettlementView.vue')
            },
            {
                path: 'mypage',
                name: 'freelancer.mypage',
                component: () => import('@/views/freelancer/MyPage/MyPageFreelancer.vue')
            },
            {
                path: 'review',
                name: 'freelancer.review',
                component: () => import('@/views/freelancer/Review/ReviewList.vue')
            },
            {
                path: 'review/write',
                name: 'freelancer.review.write',
                component: () => import('@/views/freelancer/Review/ReviewWrite.vue')
            },
        ]
    },
    {
        path: '/chat',
        component: () => import('@/layouts/PlatformLayout.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                name: 'chat',
                component: () => import('@/views/ChatView.vue')
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

// Navigation Guard
router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()
    const alertStore = useAlertStore(pinia)

    // Check auth requirement
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next('/login')
        return
    }

    // Check role requirement
    if (to.meta.role && authStore.user?.role !== to.meta.role) {
        if (authStore.user?.role === 'EMPLOYER') {
            next('/employer/jobs')
        } else {
            next('/freelancer/jobs')
        }
        return
    }

    if (to.name === 'employer.recommended' && authStore.user?.role === 'EMPLOYER') {
        try {
            const subscription = await getEmployerSubscription()
            const normalizedPlan = normalizeEmployerPlan(subscription.currentPlan)

            if (!['PRO', 'PRIME'].includes(normalizedPlan)) {
                alertStore.open({
                    title: '알림',
                    message: '추천 프리랜서 기능은 프로 플랜 이상에서만 사용할 수 있습니다. 구독 플랜을 업그레이드해 주세요.',
                    type: 'info',
                    confirmText: '확인',
                })
                next({ name: 'employer.mypage', query: { tab: 'account' } })
                return
            }
        } catch (error) {
            console.error('Failed to validate subscription plan for recommended page:', error)
            alertStore.open({
                title: '오류',
                message: '구독 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.',
                type: 'error',
                confirmText: '확인',
            })
            next('/employer/jobs')
            return
        }
    }

    next()
})

export default router

