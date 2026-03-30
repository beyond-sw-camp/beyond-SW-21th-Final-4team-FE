<script setup lang="ts">
import { computed } from 'vue';
import { X, Briefcase, User, Calendar, DollarSign, Clock, Eye } from 'lucide-vue-next';
import type { ContractDocument } from '@/types/contract';

const props = defineProps<{
    title: string;
    contracts: ContractDocument[];
    isFreelancer: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'selectContract', contract: ContractDocument): void;
}>();

const statusLabels: Record<string, { label: string; className: string }> = {
    DRAFT: {
        label: 'Draft',
        className: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    },
    ACTIVE: {
        label: 'Active',
        className: 'bg-green-500/20 text-green-300 border border-green-500/30',
    },
    IN_PROGRESS: {
        label: 'In Progress',
        className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    },
    COMPLETED: {
        label: 'Completed',
        className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    TERMINATED: {
        label: 'Terminated',
        className: 'bg-red-500/20 text-red-300 border border-red-500/30',
    },
};

const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ko-KR');
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
};

const handleBackdropClick = () => {
    emit('close');
};
</script>

<template>
    <div
        class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="handleBackdropClick"
    >
        <div
            class="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
            v-motion
            :initial="{ opacity: 0, scale: 0.95, y: 20 }"
            :enter="{ opacity: 1, scale: 1, y: 0 }"
            :leave="{ opacity: 0, scale: 0.95, y: 20 }"
        >
            <!-- Header -->
            <div
                class="fb-modal-header sticky top-0 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10"
            >
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
                    >
                        <Briefcase class="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-white">{{ title }}</h2>
                        <div class="text-sm text-white/60">{{ contracts.length }}건</div>
                    </div>
                </div>
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

            <!-- Contract List -->
            <div class="p-6 overflow-y-auto max-h-[calc(85vh-88px)] space-y-4">
                <div
                    v-if="contracts.length === 0"
                    class="text-center py-16 text-white/60"
                >
                    <Briefcase class="w-12 h-12 mx-auto mb-3 text-white/30" />
                    <p>해당하는 계약이 없습니다</p>
                </div>

                <div
                    v-else
                    v-for="(contract, index) in contracts"
                    :key="contract.id"
                    class="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-colors"
                    v-motion
                    :initial="{ opacity: 0, y: 10 }"
                    :enter="{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }"
                >
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-white mb-1">
                                {{ contract.projectName }}
                            </h3>
                            <div class="text-sm text-white/60 flex items-center gap-1.5">
                                <User class="w-3.5 h-3.5" />
                                {{
                                    isFreelancer
                                        ? contract.employerName
                                        : contract.freelancerName
                                }}
                            </div>
                        </div>
                        <span
                            :class="[
                                'px-3 py-1 rounded-full text-xs font-semibold',
                                statusLabels[contract.status]?.className ||
                                    statusLabels.DRAFT.className,
                            ]"
                        >
                            {{
                                statusLabels[contract.status]?.label ||
                                statusLabels.DRAFT.label
                            }}
                        </span>
                    </div>

                    <!-- Footer info -->
                    <div class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-1.5 text-white/60">
                            <Calendar class="w-3.5 h-3.5" />
                            {{ formatDate(contract.startDate) }} ~
                            {{ formatDate(contract.endDate) }}
                        </div>
                        <div class="flex items-center gap-1.5 font-semibold text-white">
                            <DollarSign class="w-3.5 h-3.5 text-green-400" />
                            {{ formatCurrency(contract.budget) }}
                        </div>
                    </div>

                    <!-- Detail button -->
                    <button
                        @click="$emit('selectContract', contract)"
                        class="mt-4 w-full py-2.5 bg-white/10 border border-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        v-motion
                        :hover="{ scale: 1.02 }"
                        :tap="{ scale: 0.98 }"
                    >
                        <Eye class="w-4 h-4" />
                        상세보기
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
