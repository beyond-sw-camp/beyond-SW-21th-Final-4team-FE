<template>
    <div :class="['flex mb-6 transition-all duration-300 ease-out group', isMine ? 'justify-end' : 'justify-start']">
        <!-- Avatar (Optionally show only for other) -->
        <div
            v-if="!isMine && !isSystem"
            class="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#21AFBF]/20 bg-gradient-to-br from-[#21AFBF]/18 to-[#00D4DA]/20 text-xs font-bold text-[#0f2b2e] shadow-sm"
        >
            {{ senderName.charAt(0) }}
        </div>

        <div class="max-w-[65%] flex flex-col" :class="isMine ? 'items-end' : 'items-start'">
            <!-- System Message -->
            <div v-if="isSystem" class="flex justify-center w-full my-6">
                <span class="rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-xs text-slate-500 shadow-sm">
                    {{ message.content }}
                </span>
            </div>

            <!-- User Message -->
            <template v-else>
                <!-- Sender Name (Only for other) -->
                <span v-if="!isMine" class="text-[11px] text-slate-500 mb-1.5 ml-1 font-medium tracking-wide">{{ senderName }}</span>
                
                <!-- Contract/Business Alert Card -->
                <ChatMessageContract 
                    v-if="message.type === 'CONTRACT_ALERT'" 
                    :message="message" 
                    class="mb-1"
                />

                <component
                    :is="fileUrl ? 'a' : 'div'"
                    v-else-if="message.type === 'FILE'"
                    :href="fileUrl || undefined"
                    :target="opensFileInNewTab ? '_blank' : undefined"
                    :rel="opensFileInNewTab ? 'noopener noreferrer' : undefined"
                    :download="fileUrl && !opensFileInNewTab ? fileName : undefined"
                    class="flex min-w-[240px] items-center gap-3 px-4 py-3 text-[14px] shadow-md transition-all hover:shadow-lg"
                    :class="[
                        isMine
                            ? 'fb-chat-own-bubble rounded-[22px] rounded-tr-sm'
                            : 'rounded-[22px] rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-sm'
                    ]"
                >
                    <div
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        :class="isMine ? 'bg-white/20' : 'bg-slate-100'"
                    >
                        <PaperclipIcon class="h-4 w-4" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium">{{ fileName }}</p>
                        <p class="text-[11px] opacity-80">{{ fileDescription }}</p>
                    </div>
                    <DownloadIcon v-if="fileUrl" class="h-4 w-4 shrink-0 opacity-80" />
                </component>

                <!-- Standard Text Message -->
                <div 
                    v-else
                    class="px-4 py-2 text-[14px] relative shadow-md transition-all hover:shadow-lg"
                    :class="[
                        isMine 
                            ? 'fb-chat-own-bubble rounded-[22px] rounded-tr-sm' 
                            : 'rounded-[22px] rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-sm'
                    ]"
                >
                    <p class="whitespace-pre-wrap leading-relaxed break-words font-light tracking-wide">{{ message.content }}</p>
                </div>
                
                <!-- Timestamp -->
                <span 
                    class="text-[10px] text-slate-600 mt-1.5 mx-2 font-medium tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-200 translation-y-1 group-hover:translate-y-0"
                    :class="isMine ? 'text-right' : 'text-left'"
                >
                    {{ formatTime(message.createdAt) }}
                </span>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage } from '@/types';
import { format } from 'date-fns';
import { Download as DownloadIcon, Paperclip as PaperclipIcon } from 'lucide-vue-next';
import ChatMessageContract from './ChatMessageContract.vue';
import { isInlinePreviewableChatFile } from '@/utils/chatFile';

const props = defineProps<{
    message: ChatMessage;
    senderName: string;
}>();

const authStore = useAuthStore();
const chatStore = useChatStore();

const isSystem = computed(() => props.message.type === 'SYSTEM');

const isMine = computed(() => {
    if (!authStore.user) return false;
    return chatStore.getMyParticipantIds().includes(props.message.senderId);
});

const fileUrl = computed(() => {
    const url = props.message.metadata?.fileUrl;
    return typeof url === 'string' && url.trim() ? url : '';
});

const opensFileInNewTab = computed(() =>
    isInlinePreviewableChatFile(props.message.metadata?.contentType)
);

const fileName = computed(() => {
    const name = props.message.metadata?.fileName;
    if (typeof name === 'string' && name.trim()) {
        return name;
    }
    return props.message.content || '파일';
});

const fileDescription = computed(() => {
    const parts: string[] = [];
    const contentType = props.message.metadata?.contentType;
    const fileSize = Number(props.message.metadata?.fileSize);

    if (typeof contentType === 'string' && contentType.trim()) {
        parts.push(contentType);
    }
    if (Number.isFinite(fileSize) && fileSize > 0) {
        parts.push(formatFileSize(fileSize));
    }

    return parts.join(' · ') || '파일 첨부';
});

function formatTime(date: Date) {
    if (!date) return '';
    return format(new Date(date), 'HH:mm');
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
</script>

<style scoped>
.fb-chat-own-bubble {
    background: linear-gradient(90deg, #21afbf 0%, #00d4da 100%);
    color: #0f2b2e !important;
    box-shadow: 0 14px 24px rgba(33, 175, 191, 0.22);
}

.fb-chat-own-bubble p,
.fb-chat-own-bubble svg,
.fb-chat-own-bubble a,
.fb-chat-own-bubble span {
    color: #0f2b2e !important;
}
</style>
