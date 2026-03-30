<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMotion } from '@vueuse/motion';
import {
  Star,
  MessageSquare,
  ArrowLeft,
  CheckCircle,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const authStore = useAuthStore();
const currentUser = authStore.user;

// Mock Reviews
const mockReviews = [
  {
    id: 'r1',
    reviewerName: '김토스',
    revieweeId: currentUser?.id,
    rating: 5.0,
    expertise: 5,
    communication: 5,
    scheduleAdherence: 5,
    comment: '정말 훌륭한 개발자입니다. 요구사항을 정확히 파악하고, 일정보다 빠르게 완수해주셨어요. 코드 퀄리티도 매우 높습니다. 다음 프로젝트도 꼭 같이 하고 싶습니다.',
    createdAt: '2024-01-15'
  },
   {
    id: 'r2',
    reviewerName: '이카카오',
    revieweeId: currentUser?.id,
    rating: 4.5,
    expertise: 5,
    communication: 4,
    scheduleAdherence: 5,
    comment: '기술적인 역량이 매우 뛰어나십니다. 다만 커뮤니케이션 툴 사용에 있어 약간의 적응 기간이 필요했던 것 같습니다. 결과물은 대만족입니다.',
    createdAt: '2023-12-20'
  },
   {
    id: 'r3',
    reviewerName: '박네이버',
    revieweeId: currentUser?.id,
    rating: 4.8,
    expertise: 5,
    communication: 5,
    scheduleAdherence: 4,
    comment: '복잡한 문제를 효율적으로 해결해주셨습니다. 중간 보고도 철저히 해주셔서 안심하고 맡길 수 있었습니다.',
    createdAt: '2023-11-10'
  }
];

const filter = ref<'ALL' | 'POSITIVE' | 'NEGATIVE'>('ALL');

const filteredReviews = computed(() => {
    switch (filter.value) {
        case 'POSITIVE':
            return mockReviews.filter(r => r.rating >= 4.0);
        case 'NEGATIVE':
            return mockReviews.filter(r => r.rating < 4.0);
        default:
            return mockReviews;
    }
});

const calculateAverage = (field: 'expertise' | 'communication' | 'scheduleAdherence') => {
    if (mockReviews.length === 0) return 0;
    return mockReviews.reduce((sum, r) => sum + r[field], 0) / mockReviews.length;
};

const overallRating = computed(() => {
    if (mockReviews.length === 0) return 0;
    return mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length;
});
</script>

<template>
  <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans text-white">
    <button
        @click="$emit('back')"
        class="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        v-motion
        :initial="{ opacity: 0, x: -10 }"
        :enter="{ opacity: 1, x: 0 }"
    >
        <ArrowLeft class="w-5 h-5" />
        <span>돌아가기</span>
    </button>

    <div
        class="mb-12"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0 }"
    >
        <h1 class="mb-4 text-4xl font-bold tracking-tight text-white">
            고용주 평가
        </h1>
        <p class="text-white/60">
            클라이언트가 남긴 소중한 피드백을 확인해보세요
        </p>
    </div>

    <!-- Summary Cards -->
    <div class="grid md:grid-cols-4 gap-6 mb-12">
        <div
            class="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 flex flex-col items-center justify-center text-center"
            v-motion
            :initial="{ opacity: 0, scale: 0.9 }"
            :enter="{ opacity: 1, scale: 1, transition: { delay: 100 } }"
        >
            <div class="text-sm text-white/60 mb-2">전체 평점</div>
            <div class="text-5xl font-bold text-white mb-2">{{ overallRating.toFixed(1) }}</div>
            <div class="flex gap-1">
                <Star
                    v-for="star in 5"
                    :key="star"
                    class="w-4 h-4"
                    :class="star <= overallRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'"
                />
            </div>
        </div>

        <div
            v-for="(stat, index) in [
                { label: '전문성', value: calculateAverage('expertise'), icon: Star, color: 'text-purple-400', bg: 'bg-purple-400' },
                { label: '의사소통', value: calculateAverage('communication'), icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400' },
                { label: '일정 준수', value: calculateAverage('scheduleAdherence'), icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400' },
            ]"
            :key="stat.label"
            class="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
            v-motion
            :initial="{ opacity: 0, scale: 0.9 }"
            :enter="{ opacity: 1, scale: 1, transition: { delay: 200 + index * 100 } }"
        >
            <div class="flex items-center gap-2 mb-4">
                <component :is="stat.icon" class="w-5 h-5" :class="stat.color" />
                <span class="text-white/80 font-medium">{{ stat.label }}</span>
            </div>
            <div class="flex items-end gap-2">
                <span class="text-3xl font-bold text-white">{{ stat.value.toFixed(1) }}</span>
                <span class="text-white/40 mb-1">/ 5.0</span>
            </div>
            <div class="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    class="h-full transition-all duration-1000"
                    :class="stat.bg"
                    :style="{ width: `${(stat.value / 5) * 100}%` }"
                ></div>
            </div>
        </div>
    </div>

    <!-- Reviews List -->
    <div
        class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8"
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 400 } }"
    >
        <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                <MessageSquare class="w-6 h-6 text-white/60" />
                상세 후기
            </h2>
            <div class="flex gap-2">
                <button
                    v-for="opt in [
                        { id: 'ALL', label: '전체' },
                        { id: 'POSITIVE', label: '긍정적' },
                        { id: 'NEGATIVE', label: '부정적' },
                    ]"
                    :key="opt.id"
                    @click="filter = opt.id as any"
                    class="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    :class="filter === opt.id ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'"
                >
                    {{ opt.label }}
                </button>
            </div>
        </div>

        <div class="space-y-4">
            <div
                v-for="(review, index) in filteredReviews"
                :key="review.id"
                class="bg-white/5 border border-white/10 rounded-2xl p-6"
                v-motion
                :initial="{ opacity: 0, y: 10 }"
                :enter="{ opacity: 1, y: 0, transition: { delay: index * 50 } }"
            >
                <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-white text-lg">{{ review.reviewerName }}</span>
                            <span class="text-white/40 text-sm">
                                {{ new Date(review.createdAt).toLocaleDateString('ko-KR') }}
                            </span>
                        </div>
                        <div class="flex items-center gap-1">
                            <Star
                                v-for="star in 5"
                                :key="star"
                                class="w-3 h-3"
                                :class="star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'"
                            />
                            <span class="ml-2 text-white font-medium">{{ review.rating.toFixed(1) }}</span>
                        </div>
                    </div>

                    <div class="flex gap-4 text-sm text-white/60">
                        <div class="flex flex-col items-center">
                            <span>전문성</span>
                            <span class="text-white font-medium">{{ review.expertise }}</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span>소통</span>
                            <span class="text-white font-medium">{{ review.communication }}</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span>일정</span>
                            <span class="text-white font-medium">{{ review.scheduleAdherence }}</span>
                        </div>
                    </div>
                </div>

                <p class="rounded-xl border border-slate-200 bg-slate-50 p-4 leading-relaxed text-slate-700">
                  {{ review.comment }}
                </p>
            </div>

            <div v-if="filteredReviews.length === 0" class="text-center py-12 text-white/40">
                해당하는 후기가 없습니다.
            </div>
        </div>
    </div>
  </div>
</template>
