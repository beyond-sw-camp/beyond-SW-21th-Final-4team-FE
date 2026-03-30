import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/stores/authStore';
import type { ChatRoom, ChatMessage, UserRole } from '@/types';
import {
    getMyChatRooms,
    getChatMessages,
    createChatRoom as apiCreateRoom,
    sendChatFileMessage as apiSendChatFileMessage,
    leaveChatRoom as apiLeaveRoom,
    markChatRoomAsRead as apiMarkChatRoomAsRead,
    updateChatRoomContract as apiUpdateChatRoomContract
} from '@/api/chatApi';
import { API_BASE_URL, getAccessToken } from '@/api/axiosInstance';
import { CHAT_MUTED_ROOMS_KEY } from '@/constants/chatUi';

export const useChatStore = defineStore('chat', () => {
    const authStore = useAuthStore();
    const STOMP_RECONNECT_DELAY_MS = 5000;

    type OutboundChatMessagePayload = {
        roomId: string;
        content: string;
        type: ChatMessage['type'];
        metadata?: any;
    };

    type PendingChatMessage = {
        payload: OutboundChatMessagePayload;
        senderId: string;
    };
    type ChatAlert = {
        id: string;
        roomId: string;
        senderName: string;
        content: string;
        createdAt: Date;
    };

    function normalizeParticipantId(id: string | number, role?: UserRole): string {
        const raw = String(id).trim();
        if (!raw) return raw;

        const normalized = raw.toLowerCase();
        if (/^[efa]\d+$/i.test(normalized)) {
            return normalized;
        }

        if (/^\d+$/.test(normalized) && role) {
            const prefix = role === 'EMPLOYER' ? 'e' : 'f';
            return `${prefix}${normalized}`;
        }

        return raw;
    }

    function buildParticipantIdVariants(id: string | number, role?: UserRole): string[] {
        const raw = String(id).trim();
        if (!raw) return [];

        const normalized = raw.toLowerCase();
        if (/^[efa]\d+$/i.test(normalized)) {
            return [normalized];
        }

        const variants = new Set<string>([normalized]);

        if (/^\d+$/.test(normalized)) {
            variants.add(`e${normalized}`);
            variants.add(`f${normalized}`);
            variants.add(`a${normalized}`);
        }

        const roleBasedId = normalizeParticipantId(normalized, role);
        if (roleBasedId) {
            variants.add(roleBasedId.toLowerCase());
        }

        return Array.from(variants);
    }

    function idsMatch(leftId: string | number, rightId: string | number, rightRole?: UserRole): boolean {
        const leftVariants = new Set(buildParticipantIdVariants(leftId));
        return buildParticipantIdVariants(rightId, rightRole).some((candidate) => leftVariants.has(candidate));
    }

    function resolveParticipantNameFromMap(
        participantNames: Record<string, string> | undefined,
        participantId: string | number
    ): string | undefined {
        if (!participantNames) return undefined;

        const matchedEntry = Object.entries(participantNames).find(
            ([candidateId, candidateName]) => Boolean(candidateName?.trim()) && idsMatch(candidateId, participantId)
        );

        return matchedEntry?.[1]?.trim() || undefined;
    }

    function getCounterpartRole(): UserRole | undefined {
        if (!authStore.user) return undefined;
        return authStore.user.role === 'EMPLOYER' ? 'FREELANCER' : 'EMPLOYER';
    }

    // ── 참가자 ID 유틸 ─────────────────────────────────────────────────────
    function getCurrentChatParticipantId(): string | null {
        if (!authStore.user) return null;

        return normalizeParticipantId(authStore.user.id, authStore.user.role) || null;
    }

    function getMyParticipantIds(): string[] {
        if (!authStore.user) return [];

        const rawId = String(authStore.user.id);
        const normalizedId = getCurrentChatParticipantId();

        return Array.from(new Set([rawId, normalizedId].filter(Boolean) as string[]));
    }

    function getOtherParticipantId(room: ChatRoom): string | undefined {
        const myIds = getMyParticipantIds();
        return room.participants.find(
            (participantId) => !myIds.some((myId) => idsMatch(participantId, myId, authStore.user?.role))
        );
    }

    function getParticipantName(room: ChatRoom, participantId: string): string | undefined {
        const normalizedParticipantId = normalizeIdForRoom(room, participantId);
        const resolvedName =
            resolveParticipantNameFromMap(room.participantNames, normalizedParticipantId) ??
            resolveParticipantNameFromMap(room.participantNames, participantId);

        if (resolvedName) {
            return resolvedName;
        }

        const currentParticipantId = getCurrentChatParticipantId();
        if (currentParticipantId && idsMatch(normalizedParticipantId, currentParticipantId, authStore.user?.role)) {
            return authStore.user?.role === 'EMPLOYER'
                ? authStore.user.companyName || authStore.user.name
                : authStore.user?.name;
        }

        return undefined;
    }

    function getOtherParticipantName(room: ChatRoom): string {
        const otherId = getOtherParticipantId(room);
        if (!otherId) return '알 수 없음';
        return getParticipantName(room, otherId) || '알 수 없음';
    }

    function normalizeParticipantListForCurrentUser(participants: Array<string | number>): string[] {
        const myNormalizedId = getCurrentChatParticipantId();
        const myIds = getMyParticipantIds();
        const counterpartRole = getCounterpartRole();
        const myIdVariants = new Set(myIds.flatMap((id) => buildParticipantIdVariants(id, authStore.user?.role)));

        return Array.from(
            new Set(
                participants
                    .map((id) => {
                        const sid = String(id).trim();
                        if (!sid) return sid;

                        const isMine = buildParticipantIdVariants(sid).some((candidate) => myIdVariants.has(candidate));
                        if (isMine) {
                            return myNormalizedId ?? normalizeParticipantId(sid, authStore.user?.role);
                        }

                        return normalizeParticipantId(sid, counterpartRole);
                    })
                    .filter(Boolean)
            )
        );
    }

    function participantsMatch(leftParticipants: Array<string | number>, rightParticipants: Array<string | number>): boolean {
        const normalizedLeft = normalizeParticipantListForCurrentUser(leftParticipants);
        const normalizedRight = normalizeParticipantListForCurrentUser(rightParticipants);

        return normalizedLeft.length === normalizedRight.length &&
            normalizedLeft.every((participantId) => normalizedRight.includes(participantId)) &&
            normalizedRight.every((participantId) => normalizedLeft.includes(participantId));
    }

    // ── 상태 ───────────────────────────────────────────────────────────────
    const rooms = ref<ChatRoom[]>([]);
    const messages = ref<{ [roomId: string]: ChatMessage[] }>({});
    const currentRoomId = ref<string | null>(null);
    const isLoadingRooms = ref(false);
    const isLoadingMessages = ref<{ [roomId: string]: boolean }>({});
    const pendingMessages = ref<PendingChatMessage[]>([]);
    const messageBuffer = ref<{ [roomId: string]: ChatMessage[] }>({});
    const hasLoadedHistory = ref<{ [roomId: string]: boolean }>({});
    const chatAlerts = ref<ChatAlert[]>([]);
    const isMainChatVisible = ref(false);
    const roomReadSyncInFlight = new Set<string>();

    // ── STOMP WebSocket ────────────────────────────────────────────────────
    let stompClient: Client | null = null;
    const subscriptions: Record<string, { unsubscribe: () => void }> = {};

    function isRoomMuted(roomId: string): boolean {
        if (typeof window === 'undefined') return false;

        const stored = localStorage.getItem(CHAT_MUTED_ROOMS_KEY);
        if (!stored) return false;

        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return false;
            return parsed.includes(roomId);
        } catch {
            return false;
        }
    }

    function dismissAlert(alertId: string) {
        chatAlerts.value = chatAlerts.value.filter((alert) => alert.id !== alertId);
    }

    function playIncomingAlertSound() {
        if (typeof window === 'undefined') return;

        const audioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextClass) return;

        const context = new audioContextClass();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.14);

        gainNode.gain.setValueAtTime(0.001, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.2);

        window.setTimeout(() => {
            context.close().catch(() => undefined);
        }, 250);
    }

    function triggerIncomingAlert(room: ChatRoom, message: ChatMessage) {
        const senderName = getParticipantName(room, message.senderId) || '새 메시지';
        const nextAlert: ChatAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            roomId: room.id,
            senderName,
            content: message.content || '(내용 없음)',
            createdAt: new Date()
        };

        chatAlerts.value = [nextAlert, ...chatAlerts.value].slice(0, 5);
        window.setTimeout(() => {
            dismissAlert(nextAlert.id);
        }, 4000);

        playIncomingAlertSound();

        if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
        if (document.visibilityState === 'visible') return;
        if (Notification.permission !== 'granted') return;

        const browserNotification = new Notification(senderName, {
            body: message.content || '새 메시지가 도착했습니다.'
        });
        browserNotification.onclick = () => {
            window.focus();
            selectRoom(room.id);
            browserNotification.close();
        };
    }

    function applyRoomEventFromMessage(roomId: string, message: ChatMessage) {
        if (message.type !== 'SYSTEM') return;
        if (message.metadata?.eventType !== 'ROOM_LEFT') return;

        const participantId =
            typeof message.metadata?.participantId === 'string' ? message.metadata.participantId : null;
        if (!participantId) return;

        const roomIndex = rooms.value.findIndex((room) => room.id === roomId);
        if (roomIndex === -1) return;

        const room = rooms.value[roomIndex];
        const normalizedParticipantId = normalizeIdForRoom(room, participantId);
        const leftBy = room.leftBy || [];
        if (!leftBy.some((leftParticipantId) => idsMatch(leftParticipantId, normalizedParticipantId))) {
            room.leftBy = [...leftBy, normalizedParticipantId];
        }
    }

    function clearLocalUnreadCount(roomId: string) {
        if (!authStore.user) return;

        const myIds = getMyParticipantIds();
        const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
        if (roomIndex === -1) return;

        myIds.forEach((id) => {
            if (id in rooms.value[roomIndex].unreadCount) {
                rooms.value[roomIndex].unreadCount[id] = 0;
            }
        });
    }

    async function markRoomAsRead(roomId: string, options?: { skipLocalReset?: boolean }) {
        if (!authStore.user || !roomId) return false;

        const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
        if (roomIndex === -1) return false;

        if (!options?.skipLocalReset) {
            clearLocalUnreadCount(roomId);
        }

        if (roomReadSyncInFlight.has(roomId)) {
            return true;
        }

        roomReadSyncInFlight.add(roomId);
        try {
            const updatedRoom = await apiMarkChatRoomAsRead(roomId);
            const updatedRoomIndex = rooms.value.findIndex((r) => r.id === roomId);
            if (updatedRoomIndex === -1) {
                rooms.value = [updatedRoom, ...rooms.value];
            } else {
                rooms.value[updatedRoomIndex] = {
                    ...rooms.value[updatedRoomIndex],
                    ...updatedRoom
                };
            }
            return true;
        } catch (error) {
            console.error('[Chat] Failed to sync room read state:', error);
            return false;
        } finally {
            roomReadSyncInFlight.delete(roomId);
        }
    }

    function connectWebSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            const token = getAccessToken(); // axiosInstance의 토큰 키 사용
            if (!token) {
                resolve();
                return;
            }

            stompClient = new Client({
                webSocketFactory: () =>
                    new SockJS(
                        `${API_BASE_URL}/ws/chat`
                    ),
                connectHeaders: {
                    Authorization: `Bearer ${token}`
                },
                beforeConnect: (client) => {
                    const latestToken = getAccessToken();
                    client.connectHeaders = latestToken
                        ? { Authorization: `Bearer ${latestToken}` }
                        : {};
                    client.reconnectDelay = STOMP_RECONNECT_DELAY_MS;
                },
                reconnectDelay: STOMP_RECONNECT_DELAY_MS,
                onConnect: () => {
                    console.log('[STOMP] Connected');
                    if (currentRoomId.value) {
                        subscribeToRoom(currentRoomId.value);
                    }

                    // Subscribe to all rooms to receive global unread counts
                    rooms.value.forEach(r => subscribeToRoom(r.id));

                    // Flush pending messages on reconnect
                    while (pendingMessages.value.length > 0) {
                        const pendingMessage = pendingMessages.value.shift();
                        if (!pendingMessage) continue;
                        stompClient?.publish({
                            destination: '/app/chat/message',
                            body: JSON.stringify(pendingMessage.payload)
                        });
                    }
                    resolve();
                },
                onStompError: (frame) => {
                    console.error('[STOMP] Error:', frame.headers['message']);
                    reject(new Error(frame.headers['message']));
                }
            });

            stompClient.activate();
        });
    }

    function subscribeToRoom(roomId: string) {
        if (!stompClient || !stompClient.connected) return;
        if (subscriptions[roomId]) return; // 이미 구독 중

        const sub = stompClient.subscribe(`/topic/chat/room/${roomId}`, (stompMessage) => {
            try {
                const raw = JSON.parse(stompMessage.body);
                const msg: ChatMessage = {
                    id: raw.messageId || raw.id || `ws-${Date.now()}`,
                    roomId: raw.roomId,
                    senderId: raw.senderId,
                    content: raw.content,
                    type: raw.type,
                    metadata: raw.metadata,
                    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
                    readBy: raw.readBy ?? []
                };

                if (!messages.value[roomId]) {
                    messages.value[roomId] = [];
                }

                applyRoomEventFromMessage(roomId, msg);

                // Remove from pending queue if present
                pendingMessages.value = pendingMessages.value.filter(
                    (p) => !(
                        p.payload.roomId === msg.roomId &&
                        p.payload.content === msg.content &&
                        p.payload.type === msg.type &&
                        p.senderId === msg.senderId
                    )
                );

                // 로딩 중이라면 버퍼에만 저장하고 반환
                if (isLoadingMessages.value[roomId]) {
                    if (!messageBuffer.value[roomId]) messageBuffer.value[roomId] = [];
                    // 버퍼 중복 방지 (id 기반)
                    const existsInBuffer = messageBuffer.value[roomId].some((m) => m.id === msg.id);
                    if (!existsInBuffer) {
                        messageBuffer.value[roomId].push(msg);
                    }
                    return;
                }

                // 낙관적 메시지를 실제 서버 메시지로 교체 (content 동일 + optimistic ID인 경우)
                const optimisticIdx = messages.value[roomId].findIndex(
                    (m) =>
                        m.id.startsWith('m-local-') &&
                        m.roomId === msg.roomId &&
                        m.content === msg.content &&
                        m.type === msg.type &&
                        m.senderId === msg.senderId
                );
                if (optimisticIdx !== -1) {
                    messages.value[roomId][optimisticIdx] = msg;
                } else {
                    // 일반 중복 방지 (id 기반)
                    const exists = messages.value[roomId].some((m) => m.id === msg.id);
                    if (!exists) {
                        messages.value[roomId].push(msg);
                    }
                }

                // 방 목록 lastMessage, updatedAt 갱신
                const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
                if (roomIndex !== -1) {
                    rooms.value[roomIndex].lastMessage = msg;
                    rooms.value[roomIndex].updatedAt = msg.createdAt;

                    const roomIsVisible = isRoomVisible(roomId);

                    // 실제로 보이지 않는 방인 경우 unreadCount 증가
                    if (!roomIsVisible) {
                        const myIds = getMyParticipantIds();
                        rooms.value[roomIndex].participants.forEach((p) => {
                            if (!myIds.includes(p)) return;
                            rooms.value[roomIndex].unreadCount[p] =
                                (rooms.value[roomIndex].unreadCount[p] || 0) + 1;
                        });
                    }

                    const isMine = getMyParticipantIds().includes(msg.senderId);
                    if (roomIsVisible && !isMine) {
                        void markRoomAsRead(roomId, { skipLocalReset: true });
                    }
                    const shouldAlert = !roomIsVisible && !isMine && !isRoomMuted(roomId);
                    if (shouldAlert) {
                        triggerIncomingAlert(rooms.value[roomIndex], msg);
                    }
                }
            } catch (e) {
                console.error('[STOMP] Failed to parse message:', e);
            }
        });

        subscriptions[roomId] = sub;
    }

    function unsubscribeFromRoom(roomId: string) {
        if (subscriptions[roomId]) {
            subscriptions[roomId].unsubscribe();
            delete subscriptions[roomId];
        }
    }

    function disconnectWebSocket() {
        if (stompClient) {
            stompClient.deactivate();
            stompClient = null;
        }
        Object.keys(subscriptions).forEach((id) => unsubscribeFromRoom(id));
    }

    // ── REST: 채팅방 목록 조회 ──────────────────────────────────────────────
    async function fetchRooms() {
        if (!authStore.isAuthenticated) return;
        isLoadingRooms.value = true;
        try {
            const fetchedRooms = await getMyChatRooms();
            rooms.value = fetchedRooms;

            // Subscribe to all fetched rooms to receive background updates
            if (stompClient && stompClient.connected) {
                rooms.value.forEach(r => subscribeToRoom(r.id));
            }
        } catch (e) {
            console.error('[Chat] Failed to fetch rooms:', e);
        } finally {
            isLoadingRooms.value = false;
        }
    }

    // ── REST: 이전 메시지 조회 ──────────────────────────────────────────────
    async function fetchMessages(roomId: string, cursorDateStr?: string) {
        isLoadingMessages.value[roomId] = true;
        try {
            const result = await getChatMessages(roomId, cursorDateStr, 30);
            if (!messages.value[roomId]) {
                messages.value[roomId] = [];
            }
            if (cursorDateStr) {
                messages.value[roomId] = [...result.content, ...messages.value[roomId]];
            } else {
                messages.value[roomId] = result.content;
                hasLoadedHistory.value[roomId] = true;
            }

            // 로딩 중 쌓인 버퍼 머지 및 중복 제거
            const buffer = messageBuffer.value[roomId];
            if (buffer && buffer.length > 0) {
                buffer.forEach((bufferedMsg) => {
                    // content+senderId로 낙관적 UI인지 확인
                    const optimisticIdx = messages.value[roomId].findIndex(
                        (m) =>
                            m.id.startsWith('m-local-') &&
                            m.content === bufferedMsg.content &&
                            m.senderId === bufferedMsg.senderId
                    );
                    if (optimisticIdx !== -1) {
                        messages.value[roomId][optimisticIdx] = bufferedMsg;
                    } else {
                        // 중복 확인 후 추가
                        const exists = messages.value[roomId].some((m) => m.id === bufferedMsg.id);
                        if (!exists) {
                            messages.value[roomId].push(bufferedMsg);
                        }
                    }
                });

                // 최신 메시지 방 목록 업데이트
                const lastBufferedMsg = buffer[buffer.length - 1];
                const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
                if (roomIndex !== -1 && lastBufferedMsg) {
                    rooms.value[roomIndex].lastMessage = lastBufferedMsg;
                    const newTime = new Date(lastBufferedMsg.createdAt).getTime();
                    if (newTime > new Date(rooms.value[roomIndex].updatedAt).getTime()) {
                        rooms.value[roomIndex].updatedAt = lastBufferedMsg.createdAt;
                    }
                }

                messageBuffer.value[roomId] = []; // flush
            }

            // 시간순 정렬 (혹시 모를 꼬임 방지)
            messages.value[roomId].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            return result;
        } catch (e) {
            console.error('[Chat] Failed to fetch messages:', e);
            return null;
        } finally {
            isLoadingMessages.value[roomId] = false;
        }
    }

    // ── Getters ────────────────────────────────────────────────────────────
    function normalizeIdForRoom(room: ChatRoom, id: string): string {
        const raw = String(id).trim();
        if (!raw) return raw;

        const matchedParticipant = room.participants.find((participantId) => idsMatch(participantId, raw));
        if (matchedParticipant) {
            return String(matchedParticipant);
        }

        const matchedParticipantNameKey = Object.keys(room.participantNames || {}).find((participantId) =>
            idsMatch(participantId, raw)
        );
        if (matchedParticipantNameKey) {
            return matchedParticipantNameKey;
        }

        return raw;
    }

    const myRooms = computed(() => {
        if (!authStore.user) return [];
        const myIds = getMyParticipantIds();

        return rooms.value
            .filter((room) => {
                const normalizedMyIds = myIds.map((id) => normalizeIdForRoom(room, id));
                const isParticipant = room.participants
                    .map((id) => normalizeIdForRoom(room, String(id)))
                    .some((id) => normalizedMyIds.includes(id));
                const hasLeft = (room.leftBy || [])
                    .map((id) => normalizeIdForRoom(room, String(id)))
                    .some((id) => normalizedMyIds.includes(id));
                return isParticipant && !hasLeft;
            })
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });

    const currentMessages = computed(() => {
        if (!currentRoomId.value) return [];
        return messages.value[currentRoomId.value] || [];
    });

    const currentRoom = computed(() => {
        return rooms.value.find((r) => r.id === currentRoomId.value);
    });

    // ── 방 선택: 메시지 로드 + WebSocket 구독 ──────────────────────────────
    function selectRoom(roomId: string) {
        currentRoomId.value = roomId;
        void markRoomAsRead(roomId);

        if (!hasLoadedHistory.value[roomId]) {
            // Await fetchMessages completes before fully proceeding, but subscribe To room immediately.
            // Loading buffer will handle the realtime messages.
            fetchMessages(roomId);
        }

        subscribeToRoom(roomId);
    }

    // ── 메시지 전송 (STOMP → 로컬 Fallback) ────────────────────────────────
    function sendMessage(
        content: string,
        type: ChatMessage['type'] = 'TEXT',
        metadata?: any,
        roomId?: string
    ) {
        const targetRoomId = roomId ?? currentRoomId.value;
        if (!targetRoomId) return;

        if (type !== 'SYSTEM' && isRoomReadOnly(targetRoomId)) return;
        if (!authStore.user) return;

        const senderId = getCurrentChatParticipantId() || String(authStore.user.id);
        const tempId = `m-local-${Date.now()}`;
        const payload: OutboundChatMessagePayload = {
            roomId: targetRoomId,
            content,
            type,
            metadata
        };

        if (stompClient && stompClient.connected) {
            stompClient.publish({
                destination: '/app/chat/message',
                body: JSON.stringify(payload)
            });
        } else {
            pendingMessages.value.push({ payload, senderId });
        }

        // 낙관적 UI / 로컬 추가
        const newMessage: ChatMessage = {
            id: tempId,
            roomId: targetRoomId,
            senderId,
            content,
            type,
            metadata,
            createdAt: new Date(),
            readBy: authStore.user ? [senderId] : []
        };

        if (!messages.value[targetRoomId]) {
            messages.value[targetRoomId] = [];
        }
        messages.value[targetRoomId].push(newMessage);

        // 주의: rooms.value lastMessage 및 unreadCount는 STOMP 응답(ack) 수신 시에만 갱신하여 
        // 영구적인 상태 불일치를 방지합니다.
    }

    function upsertMessageInRoom(roomId: string, msg: ChatMessage) {
        if (!messages.value[roomId]) {
            messages.value[roomId] = [];
        }

        const optimisticIdx = messages.value[roomId].findIndex(
            (message) =>
                message.id.startsWith('m-local-') &&
                message.roomId === msg.roomId &&
                message.content === msg.content &&
                message.type === msg.type &&
                message.senderId === msg.senderId
        );

        if (optimisticIdx !== -1) {
            messages.value[roomId][optimisticIdx] = msg;
        } else {
            const existingIdx = messages.value[roomId].findIndex((message) => message.id === msg.id);
            if (existingIdx !== -1) {
                messages.value[roomId][existingIdx] = msg;
            } else {
                messages.value[roomId].push(msg);
            }
        }

        const roomIndex = rooms.value.findIndex((room) => room.id === roomId);
        if (roomIndex !== -1) {
            rooms.value[roomIndex].lastMessage = msg;
            const currentUpdatedAt = new Date(rooms.value[roomIndex].updatedAt).getTime();
            const nextUpdatedAt = new Date(msg.createdAt).getTime();
            if (!Number.isFinite(currentUpdatedAt) || nextUpdatedAt >= currentUpdatedAt) {
                rooms.value[roomIndex].updatedAt = msg.createdAt;
            }
        }
    }

    async function sendFileMessage(file: File, roomId?: string) {
        const targetRoomId = roomId ?? currentRoomId.value;
        if (!targetRoomId) return null;

        if (isRoomReadOnly(targetRoomId)) return null;
        if (!authStore.user) return null;

        const sentMessage = await apiSendChatFileMessage(targetRoomId, file);
        upsertMessageInRoom(targetRoomId, sentMessage);
        return sentMessage;
    }

    function sendSystemMessage(roomId: string, content: string, type: ChatMessage['type'] = 'SYSTEM') {
        sendMessage(content, type, undefined, roomId);
    }

    function normalizeRoomContractId(contractId: number | string | null | undefined): number | null {
        const parsedContractId = Number(contractId);
        if (!Number.isFinite(parsedContractId) || parsedContractId <= 0) {
            return null;
        }
        return parsedContractId;
    }

    // ── 채팅방 생성 (REST API) ──────────────────────────────────────────────
    async function createRoom(
        participants: string[],
        names: { [key: string]: string },
        context: {
            relatedJobId?: string;
            relatedApplicationId?: string;
            relatedProposalId?: string;
            contractId?: number | null;
        }
    ) {
        const myNormalizedId = getCurrentChatParticipantId();
        const normalizedParticipants = normalizeParticipantListForCurrentUser(participants);
        const normalizedContractId = normalizeRoomContractId(context.contractId);

        const normalizedNames = normalizedParticipants.reduce<Record<string, string>>((acc, participantId) => {
            const resolvedName = resolveParticipantNameFromMap(names, participantId);
            if (resolvedName) {
                acc[participantId] = resolvedName;
            }
            return acc;
        }, {});

        if (myNormalizedId && authStore.user) {
            normalizedNames[myNormalizedId] = normalizedNames[myNormalizedId] ||
                (authStore.user.role === 'EMPLOYER'
                    ? authStore.user.companyName || authStore.user.name
                    : authStore.user.name);
        }

        const existingRoom = rooms.value.find(
            (r) =>
                participantsMatch(r.participants, normalizedParticipants) &&
                (normalizedContractId
                    ? Number(r.contractId) === normalizedContractId
                    : (
                        (r.relatedApplicationId && context.relatedApplicationId && r.relatedApplicationId === context.relatedApplicationId) ||
                        (r.relatedProposalId && context.relatedProposalId && r.relatedProposalId === context.relatedProposalId) ||
                        (r.relatedJobId && context.relatedJobId && r.relatedJobId === context.relatedJobId) ||
                        (!r.relatedApplicationId && !r.relatedProposalId && !r.relatedJobId && !r.contractId &&
                            !context.relatedApplicationId && !context.relatedProposalId && !context.relatedJobId)
                    ))
        );
        if (existingRoom) return existingRoom.id;

        try {
            const newRoom = await apiCreateRoom({
                participants: normalizedParticipants,
                participantNames: normalizedNames,
                relatedJobId: context.relatedJobId,
                relatedApplicationId: context.relatedApplicationId,
                relatedProposalId: context.relatedProposalId,
                contractId: normalizedContractId ?? undefined
            });
            rooms.value = [newRoom, ...rooms.value.filter((room) => room.id !== newRoom.id)];
            messages.value[newRoom.id] = [];
            if (stompClient && stompClient.connected) {
                subscribeToRoom(newRoom.id);
            }
            return newRoom.id;
        } catch (e) {
            console.error('[Chat] Failed to create room:', e);
            throw e;
        }
    }

    async function ensureContractRoomFromSourceRoom(roomId: string, contractId: number | null | undefined) {
        const normalizedContractId = normalizeRoomContractId(contractId);
        if (!normalizedContractId) {
            return null;
        }

        let sourceRoom = rooms.value.find((room) => room.id === roomId);
        if (!sourceRoom) {
            await fetchRooms().catch(() => undefined);
            sourceRoom = rooms.value.find((room) => room.id === roomId);
        }
        if (!sourceRoom) {
            return null;
        }

        if (Number(sourceRoom.contractId) === normalizedContractId) {
            return sourceRoom.id;
        }

        return createRoom(sourceRoom.participants, sourceRoom.participantNames || {}, {
            relatedJobId: sourceRoom.relatedJobId,
            relatedApplicationId: sourceRoom.relatedApplicationId,
            relatedProposalId: sourceRoom.relatedProposalId,
            contractId: normalizedContractId
        });
    }

    // ── 방 관련 유틸 ───────────────────────────────────────────────────────
    function isRoomReadOnly(roomId: string): boolean {
        const room = rooms.value.find((r) => r.id === roomId);
        if (!room || !authStore.user) return false;

        const myIds = getMyParticipantIds().map((id) => normalizeIdForRoom(room, id));
        const leftBy = (room.leftBy || []).map((id) => normalizeIdForRoom(room, String(id)));
        return leftBy.some((id) => !myIds.includes(id));
    }

    async function leaveRoom(roomId: string) {
        const roomIndex = rooms.value.findIndex((room) => room.id === roomId);
        if (roomIndex === -1) return false;

        try {
            await apiLeaveRoom(roomId);
        } catch (error) {
            console.error('[Chat] Failed to leave room:', error);
            return false;
        }

        rooms.value = rooms.value.filter((r) => r.id !== roomId);
        if (messages.value[roomId]) delete messages.value[roomId];
        if (hasLoadedHistory.value[roomId]) delete hasLoadedHistory.value[roomId];
        if (isLoadingMessages.value[roomId]) delete isLoadingMessages.value[roomId];
        if (messageBuffer.value[roomId]) delete messageBuffer.value[roomId];

        unsubscribeFromRoom(roomId);

        if (currentRoomId.value === roomId) currentRoomId.value = null;
        openDockedRooms.value = openDockedRooms.value.filter((r) => r.roomId !== roomId);
        return true;
    }

    function updateRoomContract(roomId: string, contractId: number | null) {
        const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
        if (roomIndex === -1) return;
        rooms.value[roomIndex] = {
            ...rooms.value[roomIndex],
            contractId: contractId ?? undefined
        };
    }

    async function persistRoomContract(
        roomId: string,
        contractId: number | null,
        options?: { overrideExisting?: boolean }
    ) {
        const previousRoom = rooms.value.find((r) => r.id === roomId);
        const previousContractId = previousRoom?.contractId ?? null;

        try {
            const updatedRoom = await apiUpdateChatRoomContract(roomId, contractId, options);
            const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
            if (roomIndex === -1) {
                rooms.value = [updatedRoom, ...rooms.value];
                return true;
            }

            rooms.value[roomIndex] = {
                ...rooms.value[roomIndex],
                ...updatedRoom
            };
            return true;
        } catch (error) {
            console.error('[Chat] Failed to persist room contract:', error);
            updateRoomContract(roomId, previousContractId);
            return false;
        }
    }

    // ── Docking Chat State ─────────────────────────────────────────────────
    const isRoomListOpen = ref(false);
    const openDockedRooms = ref<{ roomId: string; minimized: boolean }[]>([]);

    function setMainChatVisible(isVisible: boolean) {
        isMainChatVisible.value = isVisible;
    }

    function isRoomVisible(roomId: string) {
        if (isMainChatVisible.value && currentRoomId.value === roomId) {
            return true;
        }

        const dockedRoom = openDockedRooms.value.find((room) => room.roomId === roomId);
        return Boolean(dockedRoom && !dockedRoom.minimized);
    }

    function toggleRoomList() {
        isRoomListOpen.value = !isRoomListOpen.value;
    }

    function openDockedRoom(roomId: string) {
        const existing = openDockedRooms.value.find((r) => r.roomId === roomId);
        if (existing) {
            existing.minimized = false;
        } else {
            if (openDockedRooms.value.length >= 3) {
                openDockedRooms.value.shift();
            }
            openDockedRooms.value.push({ roomId, minimized: false });
        }
        selectRoom(roomId);
    }

    function closeDockedRoom(roomId: string) {
        openDockedRooms.value = openDockedRooms.value.filter((r) => r.roomId !== roomId);
    }

    function minimizeDockedRoom(roomId: string, minimized: boolean) {
        const room = openDockedRooms.value.find((r) => r.roomId === roomId);
        if (room) room.minimized = minimized;
    }

    function resetChatUIState() {
        currentRoomId.value = null;
        isRoomListOpen.value = false;
        openDockedRooms.value = [];
    }

    function resetDockedUIState() {
        isRoomListOpen.value = false;
        openDockedRooms.value = [];
    }

    return {
        rooms,
        messages,
        currentRoomId,
        isLoadingRooms,
        isLoadingMessages,
        myRooms,
        currentMessages,
        currentRoom,
        selectRoom,
        sendMessage,
        sendFileMessage,
        sendSystemMessage,
        createRoom,
        ensureContractRoomFromSourceRoom,
        fetchRooms,
        fetchMessages,
        connectWebSocket,
        disconnectWebSocket,
        subscribeToRoom,
        getCurrentChatParticipantId,
        getMyParticipantIds,
        getOtherParticipantId,
        isRoomListOpen,
        setMainChatVisible,
        openDockedRooms,
        toggleRoomList,
        openDockedRoom,
        closeDockedRoom,
        minimizeDockedRoom,
        resetChatUIState,
        resetDockedUIState,
        leaveRoom,
        markRoomAsRead,
        isRoomReadOnly,
        updateRoomContract,
        persistRoomContract,
        chatAlerts,
        dismissAlert,
        getParticipantName,
        getOtherParticipantName
    };
});




