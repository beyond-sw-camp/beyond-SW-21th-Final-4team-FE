<script setup lang="ts">
import { computed } from 'vue';
import { X, DollarSign, Clock, Calendar, Download } from 'lucide-vue-next';
import type { FreelancerSettlementWithDetails } from '@/stores/contractStore';

const props = defineProps<{
  settlement: FreelancerSettlementWithDetails;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'download', settlement: FreelancerSettlementWithDetails): void;
}>();

// Simplified status for UI
const isPaid = computed(() => props.settlement.status === 'PAID');

const statusDisplay = computed(() => {
  if (isPaid.value) {
    return { label: '지급 완료', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' };
  }
  if (props.settlement.status === 'CANCELLED') {
    return { label: '취소됨', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/30' };
  }
  return { label: '지급 예정', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' };
});

// Calculate correct netAmount (only tax is deducted for freelancers)
const calculatedNetAmount = computed(() => {
  return props.settlement.totalAmount - props.settlement.tax;
});

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
        <!-- Project Info -->
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <div class="flex items-start justify-between">
            <div>
              <div class="text-sm text-white/60 mb-1">프로젝트</div>
              <div class="text-2xl font-bold text-white mb-2">{{ settlement.projectName }}</div>
              <div class="text-white/70">{{ settlement.employerName }}</div>
              <div class="text-sm text-white/50 mt-2">{{ settlement.installmentNumber }}차 정산</div>
            </div>
            <div
              class="px-4 py-2 rounded-full border font-medium"
              :class="statusDisplay.bg"
            >
              <span :class="statusDisplay.color">
                {{ statusDisplay.label }}
              </span>
            </div>
          </div>
        </div>

        <!-- Payment Schedule -->
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar class="w-5 h-5 text-blue-400" />
            지급 일정
          </h3>
          <div class="grid md:grid-cols-1 gap-4">
            <div class="bg-white/5 rounded-xl p-4">
              <div class="flex items-center gap-2 text-white/60 mb-2">
                <Clock class="w-4 h-4" />
                <span class="text-sm">정기 지급일</span>
              </div>
              <div class="font-bold text-white text-lg">
                매월 15일

<!--당장은 하드 코딩이지만 나중에는 계약서에서 값을 뽑아오는 방식으로
    매월 {{ settlement.paymentDay }}일-->
              </div>
            </div>
          </div>
        </div>

        <!-- Amount Breakdown -->
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign class="w-5 h-5 text-green-400" />
            금액 상세
          </h3>

          <div class="space-y-4">
            <div class="flex items-center justify-between pb-4 border-b border-white/10">
              <span class="text-white/60">총 정산 금액</span>
              <span class="text-2xl font-medium text-white">
                {{ settlement.totalAmount.toLocaleString() }}원
              </span>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between text-red-400">
                <span>원천세 (3.3%)</span>
                <span>- {{ settlement.tax.toLocaleString() }}원</span>
              </div>
            </div>

            <div class="pt-4 border-t border-white/10 flex items-center justify-between">
              <span class="text-lg font-medium text-white">실수령액</span>
              <span class="text-3xl font-bold text-green-400">
                {{ calculatedNetAmount.toLocaleString() }}원
              </span>
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
            정산 내역서 다운로드
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
