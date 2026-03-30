<script setup lang="ts">
import { computed } from 'vue';
import {
    X,
    CheckCircle,
    Clock,
    Send,
    User,
    FileText,
    Download,
} from 'lucide-vue-next';
import type { EmployerSettlementWithDetails } from '@/stores/contractStore';

const props = defineProps<{
    settlement: EmployerSettlementWithDetails;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'download', settlement: EmployerSettlementWithDetails): void;
}>();

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
    ISSUED: { label: '청구됨', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
    PAID: { label: '결제 완료', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
    DISBURSED: { label: '지급 완료', icon: Send, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
    CANCELLED: { label: '취소됨', icon: X, color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/30' },
};


const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
};

const handleDownload = () => {
    emit('download', props.settlement);
};
</script>

<template>
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-white">
        <div
            class="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            v-motion
            :initial="{ opacity: 0, scale: 0.95, y: 20 }"
            :enter="{ opacity: 1, scale: 1, y: 0 }"
            :leave="{ opacity: 0, scale: 0.95, y: 20 }"
        >
            <!-- Header -->
            <div class="fb-modal-header sticky top-0 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10">
                <h2 class="text-2xl font-bold text-white">정산 상세 내역</h2>
                <button
                    @click="$emit('close')"
                    class="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    v-motion
                    :hover="{ scale: 1.1, rotate: 90 }"
                    :tap="{ scale: 0.9 }"
                >
                    <X class="w-6 h-6 text-white" />
                </button>
            </div>

            <div class="p-6 space-y-6">
                <!-- Project Info Card -->
                <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="text-sm text-white/60 mb-1">프로젝트</div>
                            <div class="text-2xl font-bold text-white mb-2">{{ settlement.projectName }}</div>
                            <div class="flex items-center gap-2 text-white/70">
                                <User class="w-4 h-4" />
                                {{ settlement.freelancerName }}
                            </div>
                        </div>
                        <div
                            class="px-4 py-2 rounded-full border font-medium"
                            :class="statusConfig[settlement.status].bg"
                        >
                            <span :class="statusConfig[settlement.status].color">
                                {{ statusConfig[settlement.status].label }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Settlement Details -->
                <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
                    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <FileText class="w-5 h-5 text-blue-400" />
                        청구 정보
                    </h3>

                    <div class="space-y-4">
                        <div class="flex items-center justify-between py-3 border-b border-white/10">
                            <span class="text-white/60">청구 회차</span>
                            <span class="font-medium text-white">{{ settlement.installmentNumber }}차</span>
                        </div>
                        <div v-if="settlement.paidDate" class="flex items-center justify-between py-3 border-b border-white/10">
                            <span class="text-white/60">결제일</span>
                            <span class="font-medium text-white">{{ formatDate(settlement.paidDate) }}</span>
                        </div>
                        <div class="flex items-center justify-between py-3 border-b border-white/10">
                            <span class="text-white/60">청구 금액</span>
                            <span class="text-xl font-bold text-white">{{ formatCurrency(settlement.billingAmount) }}</span>
                        </div>
                        <div class="flex items-center justify-between py-3 border-b border-white/10">
                            <span class="text-white/60">플랫폼 수수료 (5%)</span>
                            <span class="text-white">{{ formatCurrency(settlement.platformFee) }}</span>
                        </div>
                        <div class="flex items-center justify-between py-3 bg-white/5 px-4 rounded-xl mt-2">
                            <span class="text-white font-medium">총 결제 금액</span>
                            <span class="text-2xl font-bold text-blue-400">{{ formatCurrency(settlement.totalAmount) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-3">
                    <button
                        @click="handleDownload"
                        class="flex-1 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        v-motion
                        :hover="{ scale: 1.02 }"
                        :tap="{ scale: 0.98 }"
                    >
                        <Download class="w-5 h-5" />
                        청구서 다운로드
                    </button>
                    <button
                        @click="$emit('close')"
                        class="flex-1 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-2xl transition-all"
                        v-motion
                        :hover="{ scale: 1.02 }"
                        :tap="{ scale: 0.98 }"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
