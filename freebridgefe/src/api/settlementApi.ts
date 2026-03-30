import apiClient from '@/api/axiosInstance';

export interface VerifyEmployerPaymentRequest {
    paymentId: string;
    contractId: number;
}

export interface VerifyEmployerPaymentResponse {
    success: boolean;
    contractId: number;
    totalVerifiedAmount: number;
    installmentsCreated: number;
}

export interface EmployerSettlementItem {
    id: number;
    contractId: number;
    projectName?: string | null;
    freelancerName?: string | null;
    billingAmount: number;
    platformFee: number;
    totalPayment: number;
    installmentNumber: number;
    status: 'ISSUED' | 'PAID' | 'DISBURSED' | 'CANCELLED';
    invoicePdfUrl: string | null;
    dueDate: string;
    paidDate?: string | null;
}

export interface EmployerSettlementSummary {
    totalPaidAmount: number;
    totalDisbursedAmount: number;
    paidCount: number;
    disbursedCount: number;
    cancelledCount: number;
}

export interface FreelancerSettlementItem {
    id: number;
    contractId: number;
    employerSettlementId: number;
    projectName?: string | null;
    employerName?: string | null;
    paymentDay?: number | null;
    totalAmount: number;
    platformFee: number;
    tax: number;
    netAmount: number;
    installmentNumber: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    scheduledDate: string;
    paidDate?: string | null;
    receiptPdfUrl?: string | null;
}

export interface FreelancerSettlementSummary {
    pendingAmount: number;
    pendingCount: number;
    paidAmount: number;
    paidCount: number;
}

interface PaginationPayload<T> {
    content?: T[];
    items?: T[];
    totalElements?: number;
    totalPages?: number;
    currentPage?: number;
    page?: number;
}

export async function verifyEmployerPayment(data: VerifyEmployerPaymentRequest) {
    const response = await apiClient.post('/api/settlements/employer/verify-payment', data);
    return response.data.data as VerifyEmployerPaymentResponse;
}

export async function listEmployerSettlements(params?: {
    status?: string;
    dateRange?: string;
    sort?: string;
    page?: number;
    size?: number;
}) {
    const response = await apiClient.get('/api/settlements/employer', { params });
    return response.data.data as PaginationPayload<EmployerSettlementItem>;
}

export async function getEmployerSettlementSummary() {
    const response = await apiClient.get('/api/settlements/employer/summary');
    return response.data.data as EmployerSettlementSummary;
}

export async function getEmployerNextSettlement() {
    const response = await apiClient.get('/api/settlements/employer/next');
    return response.data.data as EmployerSettlementItem | null;
}

export async function getEmployerSettlementInvoiceUrl(settlementId: number) {
    const response = await apiClient.get(`/api/settlements/employer/${settlementId}/invoice`);
    return response.data.data as string | null;
}

export async function listFreelancerSettlements(params?: {
    status?: string;
    dateRange?: string;
    search?: string;
    sort?: string;
    page?: number;
    size?: number;
}) {
    const response = await apiClient.get('/api/settlements/freelancer', { params });
    return response.data.data as PaginationPayload<FreelancerSettlementItem>;
}

export async function getFreelancerSettlementSummary() {
    const response = await apiClient.get('/api/settlements/freelancer/summary');
    return response.data.data as FreelancerSettlementSummary;
}

export async function getFreelancerSettlementReceiptUrl(settlementId: number) {
    const response = await apiClient.get(`/api/settlements/freelancer/${settlementId}/receipt`);
    return response.data.data as string | null;
}
