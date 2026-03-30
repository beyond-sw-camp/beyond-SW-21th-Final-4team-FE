<template>
    <div class="fixed bottom-0 right-4 z-50 flex items-end gap-3 pointer-events-none">
        <!-- Docked Rooms (Individual Windows) -->
        <div class="flex items-end gap-3 pointer-events-auto">
            <DockedChatWindow 
                v-for="room in chatStore.openDockedRooms"
                :key="room.roomId"
                :roomId="room.roomId"
                :minimized="room.minimized"
            />
        </div>

        <!-- Main Messaging List -->
        <div class="pointer-events-auto flex flex-col items-end">
            <!-- Toggle Button (Only visible if list is closed) -->
            <button 
                v-if="!chatStore.isRoomListOpen"
                @click="chatStore.toggleRoomList"
                class="flex h-12 w-72 items-center justify-between gap-2 rounded-t-lg border border-slate-200 bg-white px-4 py-2 shadow-lg transition-colors hover:bg-slate-50"
            >
                <div class="relative">
                     <img :src="userAvatar" class="w-6 h-6 rounded-full border border-slate-200" />
                    <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-white bg-emerald-500"></span>
                </div>
                <span class="text-sm font-bold text-slate-800">메시지</span>
                <ChevronUpIcon class="w-4 h-4 text-slate-500" />
            </button>

            <!-- Room List Window -->
            <DockedRoomList v-else />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import DockedRoomList from './DockedRoomList.vue';
import DockedChatWindow from './DockedChatWindow.vue';
import { ChevronUp as ChevronUpIcon } from 'lucide-vue-next';

const chatStore = useChatStore();
const authStore = useAuthStore();

const userAvatar = computed(() => {
    return `https://ui-avatars.com/api/?name=${authStore.user?.name || 'Me'}&background=random`;
});
</script>
