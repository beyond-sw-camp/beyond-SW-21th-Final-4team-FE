<template>
    <div class="flex flex-col h-full relative">
        <!-- Chat Header -->
        <div class="h-20 px-6 flex items-center justify-between bg-white/90 backdrop-blur-sm border-b border-slate-200 shrink-0 z-20">
            <div class="flex items-center gap-4">
                <div class="relative">
                    <div class="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-lg font-bold border border-slate-200 ring-2 ring-white">
                        {{ otherParticipantName.charAt(0) }}
                    </div>
                </div>
                <div>
                    <h2 class="font-bold text-lg text-slate-950 leading-tight">{{ otherParticipantName }}</h2>
                </div>
            </div>

            <!-- Tabs Switcher (Pill Style) -->
            <div class="flex bg-slate-100 p-1 rounded-full border border-slate-200">
                <button 
                    @click="activeTab = 'CHAT'"
                    :class="['px-5 py-2 text-sm font-medium rounded-full transition-all', activeTab === 'CHAT' ? 'bg-white text-slate-950 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800']"
                >
                    채팅
                </button>
                <button 
                    @click="activeTab = 'CONTRACT'"
                    :class="['px-5 py-2 text-sm font-medium rounded-full transition-all flex items-center gap-2', activeTab === 'CONTRACT' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800']"
                >
                    <FileTextIcon class="w-4 h-4" /> 계약
                    <span v-if="contractNeedsAttention" class="w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
            </div>
            
            <div class="flex gap-2">
                 <button
                    @click="handleLeaveRoom"
                    :disabled="isLeavingRoom"
                    class="w-10 h-10 rounded-full bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 flex items-center justify-center"
                    :class="isLeavingRoom ? 'opacity-50 cursor-not-allowed' : ''"
                    title="대화 나가기"
                 >
                    <LogOutIcon class="w-5 h-5" />
                 </button>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1 min-h-0 overflow-hidden relative bg-transparent">
            <!-- Tab: CHAT -->
            <div v-show="activeTab === 'CHAT'" class="h-full flex flex-col min-h-0">
                <!-- Messages List -->
                <div class="flex-1 min-h-0 overflow-y-auto p-6" ref="messagesContainer">
                    <div
                        v-if="nonSystemMessages.length === 0"
                        class="h-full min-h-[220px] flex items-center justify-center text-slate-400 text-sm"
                    >
                        새로운 대화를 시작해보세요.
                    </div>
                    <div
                        v-else-if="isReadOnly"
                        class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600"
                    >
                        상대방이 채팅방을 나갔습니다. 이 채팅은 읽기 전용입니다.
                    </div>
                    <div v-for="msg in messages" :key="msg.id">
                        <MessageBubble 
                            :message="msg" 
                            :senderName="getSenderName(msg.senderId)" 
                        />
                    </div>
                </div>

                <!-- Floating Input Area (Instagram Style) -->
                <div class="p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200 shrink-0">
                    <div class="max-w-4xl mx-auto flex items-center gap-2">
                        <!-- Quick Actions (Left) -->
                        <label
                            class="p-2.5 rounded-full bg-slate-100 text-slate-500 transition-colors"
                            :class="isReadOnly || isUploadingFile ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'hover:text-slate-900 hover:bg-slate-200 cursor-pointer'"
                        >
                            <PlusIcon class="w-6 h-6" />
                            <input
                                type="file"
                                class="hidden"
                                :accept="CHAT_FILE_INPUT_ACCEPT"
                                :disabled="isReadOnly || isUploadingFile"
                                @change="handleFileUpload"
                            />
                        </label>

                        <!-- Input Container (Pill) -->
                        <div class="flex-1 relative bg-white rounded-full border border-slate-200 transition-colors flex items-center px-4 py-1.5 focus-within:bg-white">
                            <textarea
                                :value="newMessage"
                                @input="handleMessageInput"
                                @compositionstart="isComposing = true"
                                @compositionend="handleCompositionEnd"
                                @keydown.enter.exact.prevent="handleMessageEnter"
                                rows="1"
                                placeholder="메시지를 입력하세요..."
                                class="flex-1 bg-transparent border-none focus:ring-0 outline-none resize-none py-2.5 h-[44px] max-h-[44px] min-h-[44px] overflow-y-auto text-slate-900 placeholder-slate-400 leading-relaxed custom-scrollbar text-[15px]"
                                :disabled="isReadOnly"
                            ></textarea>
                            
                            <!-- Business Action Icons inside Pill -->
                            <div class="flex items-center gap-1.5 ml-2" v-if="!newMessage.trim()"></div>
                            
                            <!-- Send Button (Show only when typing) -->
                            <button 
                                v-else
                                @click="sendMessage"
                                :disabled="isReadOnly"
                                class="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 transform active:scale-95 ml-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <SendIcon class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: CONTRACT -->
            <div v-show="activeTab === 'CONTRACT'" class="h-full">
                <ContractTab :roomId="roomId" :isActive="activeTab === 'CONTRACT'" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { AxiosError } from 'axios';
import { useChatStore } from '@/stores/chatStore';
import { useContractStore } from '@/stores/contractStore';
import { useAuthStore } from '@/stores/authStore';
import { CHAT_FILE_INPUT_ACCEPT, CHAT_SUPPORTED_FILE_DESCRIPTION, validateChatUploadFile } from '@/api/chatApi';
import MessageBubble from './MessageBubble.vue';
import ContractTab from './ContractTab.vue';
import { 
    FileText as FileTextIcon,
    LogOut as LogOutIcon,
    Send as SendIcon,
    Plus as PlusIcon
} from 'lucide-vue-next';

const props = defineProps<{
    roomId: string;
}>();

const chatStore = useChatStore();
const authStore = useAuthStore();
const contractStore = useContractStore();
const router = useRouter();

const activeTab = ref<'CHAT' | 'CONTRACT'>('CHAT');
const newMessage = ref('');
const isComposing = ref(false);
const isLeavingRoom = ref(false);
const isUploadingFile = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

const currentRoom = computed(() => chatStore.rooms.find(r => r.id === props.roomId));
const messages = computed(() => chatStore.messages[props.roomId] || []);
const nonSystemMessages = computed(() => messages.value.filter((msg) => msg.type !== 'SYSTEM'));
const isReadOnly = computed(() => chatStore.isRoomReadOnly(props.roomId));

const otherParticipantName = computed(() => {
    if (!currentRoom.value) return '알 수 없음';
    return chatStore.getOtherParticipantName(currentRoom.value);
});

const roomContract = computed(() => contractStore.findContractForChatRoom(currentRoom.value));

const contractNeedsAttention = computed(() => {
    if (!authStore.user) return false;
    const contract = roomContract.value;
    if (!contract || contract.status !== 'WAITING_SIGNATURE') return false;
    if (authStore.user.role === 'EMPLOYER') {
        return !contract.employerSignedDate;
    }
    return !contract.freelancerSignedDate;
});

const shouldLoadContracts = computed(() => {
    if (!currentRoom.value) return false;
    if (activeTab.value === 'CONTRACT') return true;
    if (currentRoom.value.contractId) return true;
    return messages.value.some((message) => message.type === 'CONTRACT_ALERT');
});

const shouldRefreshContracts = computed(() => {
    if (!shouldLoadContracts.value) return false;
    if (!contractStore.hasFetchedContracts) return true;
    if (currentRoom.value?.contractId && !contractStore.findContractByAnyId(currentRoom.value.contractId)) {
        return true;
    }

    return messages.value.some((message) => {
        if (message.type !== 'CONTRACT_ALERT') return false;
        const contractId = message.metadata?.contractId;
        return !!contractId && !contractStore.findContractByAnyId(contractId);
    });
});

async function handleLeaveRoom() {
    if (!props.roomId) return;
    if (isLeavingRoom.value) return;
    if (!confirm('이 채팅방에서 나가시겠습니까?')) return;
    isLeavingRoom.value = true;
    try {
        const hasLeftRoom = await chatStore.leaveRoom(props.roomId);
        if (!hasLeftRoom) {
            alert('채팅방 나가기에 실패했습니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        await router.push('/chat');
    } finally {
        isLeavingRoom.value = false;
    }
}

function getSenderName(senderId: string) {
    if (senderId === 'SYSTEM') return 'System';
    if (!currentRoom.value) return '알 수 없음';
    return chatStore.getParticipantName(currentRoom.value, senderId) || '알 수 없음';
}

function handleMessageInput(event: Event) {
    newMessage.value = (event.target as HTMLTextAreaElement).value;
}

function handleCompositionEnd(event: CompositionEvent) {
    isComposing.value = false;
    handleMessageInput(event);
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

async function handleFileUpload(event: Event) {
    if (isReadOnly.value) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validationMessage = validateChatUploadFile(file);
    if (validationMessage) {
        alert(validationMessage);
        input.value = '';
        return;
    }

    isUploadingFile.value = true;
    try {
        await chatStore.sendFileMessage(file, props.roomId);
        scrollToBottom();
    } catch (error) {
        console.error('Failed to upload chat file:', error);
        alert(resolveChatUploadErrorMessage(error));
    } finally {
        input.value = '';
        isUploadingFile.value = false;
    }
}

function resolveChatUploadErrorMessage(error: unknown) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    const serverMessage = axiosError.response?.data?.error || axiosError.response?.data?.message;

    if (typeof serverMessage === 'string' && serverMessage.trim()) {
        return serverMessage;
    }

    return `파일 업로드에 실패했습니다. ${CHAT_SUPPORTED_FILE_DESCRIPTION}`;
}

function scrollToBottom() {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
}

async function fetchContractsForChat() {
    try {
        await contractStore.fetchContracts();
    } catch (error) {
        console.error('Failed to refresh contracts for chat:', error);
    }
}

async function ensureContractsLoadedForChat() {
    if (!shouldLoadContracts.value) return;
    try {
        if (shouldRefreshContracts.value) {
            await fetchContractsForChat();
            return;
        }
        await contractStore.ensureContractsLoaded();
    } catch (error) {
        console.error('Failed to load contracts for chat:', error);
    }
}

// Scroll to bottom on mount and when messages change
onMounted(() => {
    scrollToBottom();
    void ensureContractsLoadedForChat();
});
watch(messages, scrollToBottom, { deep: true });
watch(shouldLoadContracts, (nextShouldLoadContracts) => {
    if (!nextShouldLoadContracts) return;
    void ensureContractsLoadedForChat();
}, { immediate: true });
watch(shouldRefreshContracts, (nextShouldRefreshContracts) => {
    if (!nextShouldRefreshContracts) return;
    void fetchContractsForChat();
}, { immediate: true });

watch(
    () => props.roomId,
    () => {
        activeTab.value = 'CHAT';
    }
);
</script>
