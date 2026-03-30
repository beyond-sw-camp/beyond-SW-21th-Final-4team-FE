<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import type { FreelancerProfileDashboard } from '@/api/MyPage/freelancerApi.ts';
import { updateFreelancerProfile, uploadFreelancerAvatar } from '@/api/MyPage/freelancerApi.ts';
import { ArrowLeft, Save, Upload, Plus, X } from 'lucide-vue-next';

const props = defineProps<{
    profile: FreelancerProfileDashboard;
}>();

const emit = defineEmits(['back', 'update']);

const authStore = useAuthStore();
const currentUser = computed(() => authStore.user);

const isLoading = ref(false);

// Form Data (Clone props to avoid direct mutation)
const formData = ref<Partial<FreelancerProfileDashboard>>({
    name: props.profile.name,
    job: props.profile.job,
    careerYears: props.profile.careerYears,
    salary: props.profile.salary,
    introduction: props.profile.introduction,
    avatar: props.profile.avatar,
    workConditions: { ...props.profile.workConditions },
    skills: [...props.profile.skills]
});

const newSkill = ref('');

const addSkill = () => {
    if (newSkill.value.trim() && !formData.value.skills?.includes(newSkill.value.trim())) {
        formData.value.skills?.push(newSkill.value.trim());
        newSkill.value = '';
    }
};

const removeSkill = (skillToRemove: string) => {
    formData.value.skills = formData.value.skills?.filter(skill => skill !== skillToRemove);
};

// Handle Avatar Upload
const handleAvatarUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
        if (formData.value.avatar?.startsWith('blob:')) {
          URL.revokeObjectURL(formData.value.avatar);
        }
        if (file.size > 5 * 1024 * 1024) {
          alert('파일 크기는 5MB 이하만 업로드할 수 있습니다.');
          return;
        }
        const objectUrl = URL.createObjectURL(file);
        formData.value.avatar = objectUrl;
        try {
          const uploadedUrl = await uploadFreelancerAvatar(file);
          formData.value.avatar = uploadedUrl;
        } catch (error) {
          console.error('Failed to upload avatar:', error);
          alert('프로필 이미지 업로드에 실패했습니다.');
        }
    }
};

const saveProfile = async () => {
    isLoading.value = true;
    try {
        const userId = currentUser.value?.id || 'guest';
        
        // structuredClone cannot clone File or Blob objects
        // Create a plain object without circular/complex references
        const payload = JSON.parse(JSON.stringify(formData.value));
        // Manually assign the avatar back since JSON.stringify strips out Blob URLs if they are complex (though usually it's just a string)
        // Ensure the string is plain
        payload.avatar = formData.value.avatar ? String(formData.value.avatar) : null;
        
        const updated = await updateFreelancerProfile(userId, payload);
        emit('update', updated);
        alert('프로필이 성공적으로 업데이트되었습니다.');
        emit('back'); // Go back to dashboard
    } catch (error) {
        console.error('Failed to update profile:', error);
        alert('프로필 업데이트에 실패했습니다.');
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <div class="flex items-center gap-4 mb-6">
            <button @click="$emit('back')" class="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                <ArrowLeft class="w-6 h-6" />
            </button>
            <h2 class="text-2xl font-bold text-white">프로필 수정</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Left Column: Avatar -->
            <div class="col-span-1 space-y-6">
                <div class="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] flex flex-col items-center">
                    <div class="relative group cursor-pointer w-32 h-32 mb-4">
                         <div class="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 bg-slate-800">
                            <img v-if="formData.avatar" :src="formData.avatar" class="w-full h-full object-cover" />
                            <div v-else class="w-full h-full flex items-center justify-center text-slate-500">No Image</div>
                        </div>
                        <div class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload class="w-8 h-8 text-white" />
                        </div>
                        <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" @change="handleAvatarUpload" />
                    </div>
                    <p class="text-xs text-slate-400 text-center">
                        이미지를 클릭해 프로필 이미지를 변경하세요.<br>
                        (JPG, PNG / Max 5MB).
                    </p>
                </div>
            </div>

            <!-- Right Column: Basic Info -->
            <div class="col-span-2 space-y-6">
                <div class="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] space-y-4">
                    <h3 class="text-lg font-bold text-white border-b border-white/10 pb-2">기본 정보</h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs text-slate-400 font-bold">이름</label>
                            <input v-model="formData.name" type="text" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors" />
                        </div>
                         <div class="space-y-1">
                            <label class="text-xs text-slate-400 font-bold">직무 (Job Title)</label>
                            <input v-model="formData.job" type="text" placeholder="ex) 프론트엔드 개발자" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors" />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div class="space-y-1">
                            <label class="text-xs text-slate-400 font-bold">총 경력 (년)</label>
                            <input v-model.number="formData.careerYears" type="number" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors" />
                        </div>
                         <div class="space-y-1">
                            <label class="text-xs text-slate-400 font-bold">희망 월급 (만원)</label>
                            <input v-model.number="formData.salary" type="number" placeholder="ex) 5000000" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors" />
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-xs text-slate-400 font-bold">자기소개 (한 줄 소개)</label>
                        <textarea v-model="formData.introduction" rows="3" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors resize-none"></textarea>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] space-y-4">
            <h3 class="text-lg font-bold text-white border-b border-white/10 pb-2">근무 조건 (희망)</h3>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4" v-if="formData.workConditions">
                <div class="space-y-1">
                    <label class="text-xs text-slate-400 font-bold">프리랜서 유형</label>
                    <select v-model="formData.workConditions.type" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors">
                        <option>개인</option>
                        <option>팀</option>
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-xs text-slate-400 font-bold">업무 시작 가능일</label>
                    <input v-model="formData.workConditions.startDate" type="date" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors" />
                </div>
                 <div class="space-y-1">
                    <label class="text-xs text-slate-400 font-bold">희망 근무 방식</label>
                    <select v-model="formData.workConditions.workStyle" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors">
                        <option>원격</option>
                        <option>상주</option>
                        <option>원격+상주 (하이브리드)</option>
                    </select>
                </div>
                 <div class="space-y-1">
                    <label class="text-xs text-slate-400 font-bold">근무 지역</label>
                    <input v-model="formData.workConditions.location" type="text" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors" />
                </div>
            </div>
        </div>

         <div class="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] space-y-4">
            <h3 class="text-lg font-bold text-white border-b border-white/10 pb-2">기술 스택 (Skills)</h3>
            <div class="flex gap-2">
                <input
                    v-model="newSkill"
                    @keyup.enter="addSkill"
                    type="text"
                    placeholder="기술 스택 입력 후 Enter"
                    class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-white/30 focus:outline-none focus:bg-white/10 transition-colors"
                />
                <button @click="addSkill" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                    <Plus class="w-4 h-4" />
                </button>
            </div>
            <div class="flex flex-wrap gap-2 mt-2">
                <span v-for="skill in formData.skills" :key="skill" class="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold flex items-center gap-2 border border-blue-500/30">
                    {{ skill }}
                    <button @click="removeSkill(skill)" class="hover:text-white"><X class="w-3 h-3" /></button>
                </span>
            </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
            <button @click="$emit('back')" class="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all font-bold">
                        취소
            </button>
            <button
                @click="saveProfile"
                :disabled="isLoading"
                class="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
                <Save class="w-4 h-4" />
                {{ isLoading ? '저장 중...' : '저장하기' }}
            </button>
        </div>

    </div>


  
</template>
