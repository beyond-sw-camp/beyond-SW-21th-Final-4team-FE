<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, Eraser, Check, PenTool, AlertCircle, MapPin, Phone } from 'lucide-vue-next';
import { useSignaturePad } from '@/composables/useSignaturePad';

const props = defineProps<{
    signerName: string;
    error?: string;
    disabled?: boolean;
    isFreelancer?: boolean;
}>();

const emit = defineEmits<{
    (e: 'sign', data: { signature: string; freelancerAddress?: string; freelancerPhone?: string }): void;
    (e: 'close'): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { isEmpty, clear, toDataURL } = useSignaturePad(canvasRef, {
    penColor: '#1e293b',
    backgroundColor: 'rgba(255, 255, 255, 1)',
    minWidth: 0.5,
    maxWidth: 2.5,
});

const freelancerAddress = ref('');
const freelancerPhone = ref('');

const isInfoValid = computed(() => {
    if (!props.isFreelancer) return true;
    return freelancerAddress.value.trim() !== '' && freelancerPhone.value.trim() !== '';
});

const canConfirm = computed(() => !isEmpty.value && !props.disabled && isInfoValid.value);

const handleConfirm = () => {
    if (!canConfirm.value) return;
    const dataUrl = toDataURL('image/png');
    emit('sign', {
        signature: dataUrl,
        freelancerAddress: props.isFreelancer ? freelancerAddress.value.trim() : undefined,
        freelancerPhone: props.isFreelancer ? freelancerPhone.value.trim() : undefined,
    });
};

const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
        emit('close');
    }
};
</script>

<template>
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        @click="handleBackdropClick"
    >
        <div
            class="w-full max-w-lg bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            v-motion
            :initial="{ opacity: 0, scale: 0.95, y: 20 }"
            :enter="{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', duration: 500 } }"
            :leave="{ opacity: 0, scale: 0.95, y: 20 }"
        >
            <!-- Header -->
            <div class="fb-modal-header flex items-center justify-between p-6 border-b border-white/20">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"
                    >
                        <PenTool class="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">전자 서명</h3>
                        <p class="text-sm text-white/80">서명자: {{ signerName }}</p>
                    </div>
                </div>
                <button
                    @click="$emit('close')"
                    class="p-2 hover:bg-white/15 rounded-full transition-colors"
                    v-motion
                    :hover="{ scale: 1.1, rotate: 90 }"
                    :tap="{ scale: 0.9 }"
                >
                    <X class="w-5 h-5 text-white" />
                </button>
            </div>

            <!-- Freelancer Info Inputs (프리랜서 서명 시에만 표시) -->
            <div v-if="isFreelancer" class="px-6 pt-6 space-y-4">
                <p class="text-sm text-slate-500">서명 전에 아래 정보를 먼저 입력해주세요</p>
                <div>
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                        <MapPin class="w-4 h-4" />
                        주소
                    </label>
                    <input
                        v-model="freelancerAddress"
                        type="text"
                        placeholder="예: 경기도 성남시 분당구 판교로 123"
                        class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#21AFBF]/50 focus:outline-none transition-colors"
                    />
                </div>
                <div>
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                        <Phone class="w-4 h-4" />
                        연락처
                    </label>
                    <input
                        v-model="freelancerPhone"
                        type="tel"
                        placeholder="예: 010-1234-5678"
                        class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-[#21AFBF]/50 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            <!-- Canvas Area -->
            <div class="p-6">
                <div class="text-sm text-slate-500 mb-3">아래 영역에 서명해주세요</div>
                <div
                    class="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden"
                >
                    <canvas
                        ref="canvasRef"
                        class="w-full cursor-crosshair touch-none"
                        style="height: 200px"
                    />
                    <div
                        v-if="isEmpty"
                        class="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <p class="text-slate-300 text-lg font-medium">여기에 서명하세요</p>
                    </div>
                </div>
            </div>

            <!-- Error -->
            <div v-if="error" class="px-6 pb-2 flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle class="w-4 h-4 flex-shrink-0" />
                {{ error }}
            </div>

            <!-- Info validation hint -->
            <div
                v-if="isFreelancer && !isInfoValid"
                class="px-6 pb-2 flex items-center gap-2 text-orange-500 text-sm"
            >
                <AlertCircle class="w-4 h-4 flex-shrink-0" />
                주소와 연락처를 입력해야 서명할 수 있습니다
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3 p-6 pt-0">
                <button
                    @click="clear"
                    class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium transition-colors"
                    v-motion
                    :hover="{ scale: 1.02 }"
                    :tap="{ scale: 0.98 }"
                >
                    <Eraser class="w-4 h-4" />
                    지우기
                </button>
                <button
                    @click="handleConfirm"
                    :disabled="!canConfirm"
                    class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all"
                    :class="
                        canConfirm
                            ? 'bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] text-slate-900 shadow-lg'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    "
                    v-motion
                    :hover="canConfirm ? { scale: 1.02 } : {}"
                    :tap="canConfirm ? { scale: 0.98 } : {}"
                >
                    <Check class="w-4 h-4" />
                    서명 확인
                </button>
            </div>
        </div>
    </div>
</template>
