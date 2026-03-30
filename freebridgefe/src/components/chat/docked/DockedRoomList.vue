<template>
    <div 
        ref="windowRef"
        :style="dragStyle"
        class="flex w-72 flex-col rounded-t-lg border border-slate-200 bg-white shadow-lg"
        :class="[
            isMinimized ? 'h-12' : 'h-[500px]',
            isDragging ? 'shadow-2xl' : 'transition-all duration-300'
        ]"
    >
        <!-- Header -->
        <div 
            ref="headerRef"
            @pointerdown="onPointerDown"
            @click="toggleMinimize" 
            class="z-20 flex h-12 shrink-0 cursor-move items-center justify-between rounded-t-lg border-b border-sky-200/70 bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-4"
        >
            <div class="flex items-center gap-2">
                <div class="relative">
                    <img :src="userAvatar" class="w-8 h-8 rounded-full border border-white/70" alt="User" />
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500"></span>
                </div>
                <h3 class="text-sm font-bold text-[#0f2b2e]">Messaging</h3>
            </div>
            <div class="flex items-center gap-3 text-[#0f2b2e]/70">
                <button @click.stop="isMinimized = !isMinimized" class="hover:text-[#0f2b2e]">
                    <ChevronUpIcon v-if="isMinimized" class="w-4 h-4" />
                    <ChevronDownIcon v-else class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Content (Hidden when minimized) -->
        <div v-show="!isMinimized" class="flex flex-1 flex-col overflow-hidden bg-white">
            <!-- Search -->
            <div class="border-b border-slate-200 p-2">
                <div class="relative">
                    <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search messages" 
                        class="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#21AFBF] focus:bg-white"
                    />
                </div>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto custom-scrollbar">
                <div 
                    v-for="room in chatStore.myRooms" 
                    :key="room.id"
                    @click="openRoom(room.id)"
                    class="flex cursor-pointer gap-3 border-b border-slate-100 p-3 transition-colors hover:bg-slate-50"
                >
                    <!-- Avatar -->
                   <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#21AFBF]/20 bg-gradient-to-br from-[#21AFBF]/18 to-[#00D4DA]/20 font-bold text-[#0f2b2e]">
                        {{ getOtherParticipantName(room).charAt(0) }}
                   </div>

                   <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline">
                            <h4 class="truncate text-sm font-semibold text-slate-900">
                                {{ getOtherParticipantName(room) }}
                            </h4>
                            <span class="whitespace-nowrap text-[10px] text-slate-400">
                                {{ formatDate(room.lastMessage?.createdAt) }}
                            </span>
                        </div>
                        <p class="mt-0.5 truncate text-xs text-slate-500">
                            {{ room.lastMessage?.content || 'No messages' }}
                        </p>
                   </div>
                </div>
                
                 <!-- Empty State -->
                <div v-if="chatStore.myRooms.length === 0" class="p-6 text-center text-slate-500 mt-4">
                    <p class="text-xs">No active conversations</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type CSSProperties } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { 
    ChevronUp as ChevronUpIcon,
    ChevronDown as ChevronDownIcon,
    Search as SearchIcon
} from 'lucide-vue-next';
import { format } from 'date-fns';
import type { ChatRoom } from '@/types';
import { useDraggable } from '@vueuse/core';

const chatStore = useChatStore();
const authStore = useAuthStore();

const isMinimized = ref(false);

const userAvatar = computed(() => {
    // Placeholder avatar
    return `https://ui-avatars.com/api/?name=${authStore.user?.name || 'Me'}&background=random`;
});

function openRoom(roomId: string) {
    chatStore.openDockedRoom(roomId);
}

function getOtherParticipantName(room: ChatRoom) {
    return chatStore.getOtherParticipantName(room);
}

function formatDate(date: Date | undefined) {
    if (!date) return '';
    return format(new Date(date), 'MMM d');
}

const windowRef = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);
const isDocked = ref(true);

// Draggable Logic
const { x, y, isDragging } = useDraggable(windowRef, {
  initialValue: { x: 0, y: 0 },
  handle: headerRef,
  preventDefault: true,
  onStart: () => {
      if (isDocked.value && windowRef.value) {
          const rect = windowRef.value.getBoundingClientRect();
          x.value = rect.left;
          y.value = rect.top;
      }
  }
});

onMounted(() => {
    if (authStore.isAuthenticated) {
        chatStore.fetchRooms().catch((error) => {
            console.error('Failed to refresh chat rooms on docked list mount:', error);
        });
    }
    if (windowRef.value) {
        const rect = windowRef.value.getBoundingClientRect();
        x.value = rect.left;
        y.value = rect.top;
    }
});

const dragStyle = computed<CSSProperties>(() => {
    if (isDocked.value) return {};
    return {
        position: 'fixed',
        left: `${x.value}px`,
        top: `${y.value}px`,
        zIndex: 100
    };
});

// Robust Drag vs Click Detection
const dragStartPos = ref({ x: 0, y: 0 });
const isClick = ref(true);

function onPointerDown(e: PointerEvent) {
    dragStartPos.value = { x: e.clientX, y: e.clientY };
    isClick.value = true;
    
    // Add temporary listener to track movement
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e: PointerEvent) {
    const dx = Math.abs(e.clientX - dragStartPos.value.x);
    const dy = Math.abs(e.clientY - dragStartPos.value.y);
    if (dx > 5 || dy > 5) { // Threshold of 5px
        isClick.value = false;
        if (isDocked.value) isDocked.value = false; // Undock on drag
    }
}

function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
}

function toggleMinimize() {
    if (!isClick.value) return; // Ignore if it was a drag
    isMinimized.value = !isMinimized.value;
}
</script>
