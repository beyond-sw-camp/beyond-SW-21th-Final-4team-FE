<template>
    <div 
        ref="windowRef"
        :style="dragStyle"
        class="flex w-80 flex-col rounded-t-lg border border-slate-200 bg-white shadow-lg"
        :class="[
            minimized ? 'h-12' : 'h-[400px]',
            isDragging ? 'shadow-2xl' : 'transition-all duration-300'
        ]"
    >
        <!-- Header -->
        <div 
            ref="headerRef"
            @pointerdown="onPointerDown"
            @click="toggleMinimize"
            class="z-20 flex h-12 shrink-0 cursor-move items-center justify-between rounded-t-lg border-b border-sky-200/70 bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] px-3"
        >
            <div class="flex items-center gap-2">
                <div class="relative">
                     <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/80 text-xs font-bold text-[#0f2b2e]">
                        {{ otherParticipantName.charAt(0) }}
                    </div>
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500"></span>
                </div>
                <div>
                    <h3 class="max-w-[120px] truncate text-sm font-bold text-[#0f2b2e]">{{ otherParticipantName }}</h3>
                    <p v-if="!minimized" class="text-[10px] text-[#0f2b2e]/80">Active now</p>
                </div>
            </div>
            <div class="flex items-center gap-1 text-[#0f2b2e]/70">
                <button @click.stop="toggleMinimize" class="rounded p-1 hover:bg-white/25">
                    <MinusIcon class="w-4 h-4" />
                </button>
                <button @click.stop="closeWindow" class="rounded p-1 hover:bg-white/25 hover:text-rose-700">
                    <XIcon class="w-4 h-4" />
                </button>
            </div>
        </div>

        <!-- Content -->
        <div v-show="!minimized" class="flex flex-1 flex-col overflow-hidden bg-white">
            <!-- Messages -->
            <div class="custom-scrollbar flex-1 overflow-y-auto bg-slate-50 p-3" ref="messagesContainer">
                 <div
                    v-if="nonSystemMessages.length === 0"
                    class="flex h-full min-h-[120px] items-center justify-center text-xs text-slate-400"
                >
                    새로운 대화를 시작해보세요.
                </div>
                <div
                    v-else-if="isReadOnly"
                    class="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-slate-700"
                >
                    상대방이 채팅방을 나갔습니다. 이 채팅은 읽기 전용입니다.
                </div>
                 <div v-for="msg in messages" :key="msg.id" class="mb-3">
                    <div 
                        :class="['flex flex-col', isMyMessage(msg) ? 'items-end' : 'items-start']"
                    >
                        <div 
                            :class="[
                                'max-w-[85%] px-3 py-2 rounded-lg text-sm relative group',
                                isMyMessage(msg)
                                    ? 'bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] text-[#0f2b2e] rounded-br-none shadow-sm'
                                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                            ]"
                        >
                            <template v-if="msg.type === 'FILE' && getFileUrl(msg)">
                                <a
                                    :href="getFileUrl(msg)"
                                    :target="shouldOpenFileInNewTab(msg) ? '_blank' : undefined"
                                    :rel="shouldOpenFileInNewTab(msg) ? 'noopener noreferrer' : undefined"
                                    :download="!shouldOpenFileInNewTab(msg) ? getFileName(msg) : undefined"
                                    class="underline underline-offset-2"
                                >
                                    {{ getFileName(msg) }}
                                </a>
                            </template>
                            <template v-else-if="msg.type === 'FILE'">
                                {{ getFileName(msg) }}
                            </template>
                            <template v-else>
                                {{ msg.content }}
                            </template>
                            <span class="text-[9px] opacity-70 block text-right mt-1">
                                {{ formatTime(msg.createdAt) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Input -->
            <div class="border-t border-slate-200 bg-white p-2">
                <div class="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                    <textarea 
                        v-model="newMessage"
                        @compositionstart="isComposing = true"
                        @compositionend="handleCompositionEnd"
                        @keydown.enter.exact.prevent="handleMessageEnter"
                        rows="1"
                        class="max-h-20 flex-1 resize-none border-none bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:ring-0"
                        placeholder="Write a message..."
                         style="min-height: 32px;"
                        :disabled="isReadOnly"
                    ></textarea>
                    <button 
                        @click="sendMessage"
                        :disabled="!newMessage.trim() || isReadOnly"
                        class="rounded-md bg-gradient-to-r from-[#21AFBF] to-[#00D4DA] p-1.5 text-[#0f2b2e] hover:brightness-105 disabled:opacity-50"
                    >
                        <SendIcon class="w-3 h-3" />
                    </button>
                </div>
                <div class="flex justify-between items-center mt-1 px-1">
                    <div class="flex gap-2">
                        <button class="text-slate-400 hover:text-[#21AFBF]"><ImageIcon class="w-4 h-4" /></button>
                        <button class="text-slate-400 hover:text-[#21AFBF]"><PaperclipIcon class="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, type CSSProperties } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { 
    X as XIcon, 
    Minus as MinusIcon, 
    Image as ImageIcon,
    Paperclip as PaperclipIcon,
    Send as SendIcon
} from 'lucide-vue-next';
import { format } from 'date-fns';
import type { ChatMessage } from '@/types';
import { isInlinePreviewableChatFile } from '@/utils/chatFile';

const props = defineProps<{
    roomId: string;
    minimized: boolean;
}>();

const chatStore = useChatStore();
const authStore = useAuthStore();
const newMessage = ref('');
const isComposing = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

const room = computed(() => chatStore.rooms.find(r => r.id === props.roomId));
const messages = computed(() => chatStore.messages[props.roomId] || []);
const nonSystemMessages = computed(() => messages.value.filter((msg) => msg.type !== 'SYSTEM'));
const isReadOnly = computed(() => chatStore.isRoomReadOnly(props.roomId));

const otherParticipantName = computed(() => {
    if (!room.value) return '알 수 없음';
    return chatStore.getOtherParticipantName(room.value);
});

function isMyMessage(msg: ChatMessage) {
    if (!authStore.user) return false;
    return chatStore.getMyParticipantIds().includes(msg.senderId);
}

function formatTime(date: Date) {
    return format(new Date(date), 'h:mm a');
}

function getFileUrl(message: ChatMessage) {
    const url = message.metadata?.fileUrl;
    return typeof url === 'string' && url.trim() ? url : '';
}

function getFileName(message: ChatMessage) {
    const fileName = message.metadata?.fileName;
    if (typeof fileName === 'string' && fileName.trim()) {
        return fileName;
    }
    return message.content || '파일';
}

function shouldOpenFileInNewTab(message: ChatMessage) {
    return isInlinePreviewableChatFile(message.metadata?.contentType);
}

const windowRef = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);
const isDocked = ref(true);

// Draggable Logic
import { useDraggable } from '@vueuse/core';

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
    // Initial sync just in case, though onStart handles the critical moment
    if (windowRef.value) {
        const rect = windowRef.value.getBoundingClientRect();
        x.value = rect.left;
        y.value = rect.top;
    }
});

const wasDragged = ref(false);

watch(isDragging, (newVal) => {
    if (newVal) {
        if (isDocked.value) isDocked.value = false;
        wasDragged.value = true;
    }
});

const dragStyle = computed<CSSProperties>(() => {
    if (isDocked.value) return {};
    return {
        position: 'fixed',
        left: `${x.value}px`,
        top: `${y.value}px`,
        zIndex: 100 // Ensure it's on top when dragged
    };
});

function toggleMinimize() {
    if (wasDragged.value) {
        wasDragged.value = false;
        return;
    }
    chatStore.minimizeDockedRoom(props.roomId, !props.minimized);
}

function closeWindow() {
    chatStore.closeDockedRoom(props.roomId);
}

function onPointerDown() {
    wasDragged.value = false;
}

function handleCompositionEnd() {
    isComposing.value = false;
}

function handleMessageEnter(event: KeyboardEvent) {
    if (event.isComposing || isComposing.value) {
        return;
    }
    sendMessage();
}

function sendMessage() {
    const content = newMessage.value.trim();
    if (!content) return;

    chatStore.sendMessage(content, 'TEXT', undefined, props.roomId);
    newMessage.value = '';
    scrollToBottom();
}

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
}

onMounted(scrollToBottom);
watch(messages, scrollToBottom, { deep: true });
</script>
