<script setup lang="ts">
import { computed } from 'vue';
import type { Contract } from '@/stores/contractStore';

const props = defineProps<{
    contract: Partial<Contract> & {
        employerName?: string;
        freelancerName?: string;
    };
}>();

const formatDate = (date: Date | string | undefined) => {
    if (!date) return { y: '____', m: '__', d: '__' };
    const d = new Date(date);
    return {
        y: d.getFullYear().toString(),
        m: (d.getMonth() + 1).toString().padStart(2, '0'),
        d: d.getDate().toString().padStart(2, '0'),
    };
};

const formatTime = (time: string | undefined) => {
    if (!time) return { h: '__', m: '__', isFlexible: false };
    if (time === '자율') return { h: '자율', m: '', isFlexible: true };
    const [h, m] = time.split(':');
    return { h: h || '__', m: m || '__', isFlexible: false };
};

const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '________';
    return amount.toLocaleString();
};

const startDate = computed(() => formatDate(props.contract.startDate));
const endDate = computed(() => formatDate(props.contract.endDate));
const currentDate = computed(() => formatDate(new Date()));
const workStart = computed(() => formatTime(props.contract.workStartTime));
const workEnd = computed(() => formatTime(props.contract.workEndTime));
const breakStart = computed(() => formatTime(props.contract.breakStartTime));
const breakEnd = computed(() => formatTime(props.contract.breakEndTime));

const isFlexibleWork = computed(() => workStart.value.isFlexible);
</script>

<template>
    <div class="contract-preview bg-white text-black p-8 rounded-lg shadow-lg max-w-4xl mx-auto text-sm leading-relaxed">
        <h1 class="text-2xl font-bold text-center mb-8 tracking-wide">표준근로계약서</h1>

        <div class="mb-6">
            <p>
                <span class="underline font-medium">{{ contract.employerBusinessName || contract.employerName || '________' }}</span>
                (이하 "사업주"라 함)과(와)
                <span class="underline font-medium">{{ contract.freelancerName || '________' }}</span>
                (이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.
            </p>
        </div>

        <div class="space-y-4">
            <!-- 1. 근로계약기간 -->
            <div class="flex">
                <span class="font-semibold w-40 shrink-0">1. 근로계약기간 :</span>
                <span>
                    {{ startDate.y }}년 {{ startDate.m }}월 {{ startDate.d }}일부터
                    {{ endDate.y }}년 {{ endDate.m }}월 {{ endDate.d }}일까지
                </span>
            </div>

            <!-- 2. 근무장소 -->
            <div class="flex">
                <span class="font-semibold w-40 shrink-0">2. 근무장소 :</span>
                <span>{{ contract.workLocation || '원격근무' }}</span>
            </div>

            <!-- 3. 업무의 내용 -->
            <div class="flex">
                <span class="font-semibold w-40 shrink-0">3. 업무의 내용 :</span>
                <span>{{ contract.jobDescription || '________' }}</span>
            </div>

            <!-- 4. 소정근로시간 -->
            <div class="flex">
                <span class="font-semibold w-40 shrink-0">4. 소정근로시간 :</span>
                <span v-if="isFlexibleWork">
                    자율근무 (업무 마감일 기준 자유롭게 근무)
                </span>
                <span v-else>
                    {{ workStart.h }}시 {{ workStart.m }}분부터
                    {{ workEnd.h }}시 {{ workEnd.m }}분까지
                    (휴게시간 : {{ breakStart.h }}시 {{ breakStart.m }}분 ~ {{ breakEnd.h }}시 {{ breakEnd.m }}분)
                </span>
            </div>

            <!-- 5. 근무일/휴일 -->
            <div class="flex">
                <span class="font-semibold w-40 shrink-0">5. 근무일/휴일 :</span>
                <span>
                    매주 {{ contract.workDaysPerWeek || '__' }}일 근무, 주휴일 매주 {{ contract.weeklyHoliday || '토, 일' }}요일
                </span>
            </div>

            <!-- 6. 임금 -->
            <div>
                <span class="font-semibold">6. 임금 :</span>
                <div class="ml-8 mt-1 space-y-1">
                    <div>- 월급 : <span class="underline">{{ formatCurrency(contract.budget) }}</span>원</div>
                    <div>- 상여금 : 없음</div>
                    <div>- 기타급여 : 없음</div>
                    <div>- 임금지급일 : 매월 {{ contract.paymentDay || '__' }}일 (휴일의 경우는 전일 지급)</div>
                    <div>- 지급방법 : 계좌이체</div>
                </div>
            </div>

            <!-- 7. 연차유급휴가 -->
            <div class="flex">
                <span class="font-semibold w-40 shrink-0">7. 연차유급휴가 :</span>
                <span class="text-gray-600">근로기준법에서 정하는 바에 따라 부여함</span>
            </div>

            <!-- 8. 사회보험 적용여부 -->
            <div>
                <span class="font-semibold">8. 사회보험 적용여부 :</span>
                <span class="ml-2">☑ 고용보험, ☑ 산재보험, ☑ 국민연금, ☑ 건강보험</span>
            </div>

            <!-- 9~11. 기타 조항 -->
            <div class="mt-4 text-gray-700 space-y-1">
                <p>9. 근로계약서 교부: 사업주는 근로계약을 체결함과 동시에 본 계약서를 근로자에게 교부함</p>
                <p>10. 성실이행의무: 사업주와 근로자는 각자의 의무를 성실히 이행하여야 함</p>
                <p>11. 기타: 이 계약에 정함이 없는 사항은 근로기준법령에 의함</p>
            </div>
        </div>

        <!-- 서명 영역 -->
        <div class="mt-10 pt-6 border-t border-gray-300">
            <div class="text-center mb-6">
                {{ currentDate.y }}년 {{ currentDate.m }}월 {{ currentDate.d }}일
            </div>

            <div class="grid grid-cols-2 gap-8">
                <!-- 사업주 -->
                <div class="border border-gray-300 rounded-lg p-4">
                    <div class="font-bold mb-3">(사업주)</div>
                    <div class="space-y-1 text-sm">
                        <div>사업체명: {{ contract.employerBusinessName || '________' }}</div>
                        <div>주 소: {{ contract.employerAddress || '________' }}</div>
                        <div class="flex items-center gap-2">
                            <span>대표자: {{ contract.employerCEO || '________' }} (서명)</span>
                            <img
                                v-if="contract.employerSignature"
                                :src="contract.employerSignature"
                                class="h-12 inline-block"
                                alt="사업주 서명"
                            />
                        </div>
                    </div>
                </div>

                <!-- 근로자 -->
                <div class="border border-gray-300 rounded-lg p-4">
                    <div class="font-bold mb-3">(근로자)</div>
                    <div class="space-y-1 text-sm">
                        <div>주 소: {{ contract.freelancerAddress || '________' }}</div>
                        <div>연락처: {{ contract.freelancerPhone || '________' }}</div>
                        <div class="flex items-center gap-2">
                            <span>성 명: {{ contract.freelancerName || '________' }} (서명)</span>
                            <img
                                v-if="contract.freelancerSignature"
                                :src="contract.freelancerSignature"
                                class="h-12 inline-block"
                                alt="근로자 서명"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.contract-preview {
    font-family: 'Noto Sans KR', sans-serif;
}
</style>