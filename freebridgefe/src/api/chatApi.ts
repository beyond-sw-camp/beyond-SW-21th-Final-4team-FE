import apiClient from './axiosInstance';
import type { ChatRoom, ChatMessage } from '@/types';

// ─── Response Mapping Types ──────────────────────────────────────────────────

const CHAT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const CHAT_ALLOWED_UPLOAD_MIME_TYPES = new Set([
    'text/plain',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);
const CHAT_ALLOWED_UPLOAD_EXTENSIONS = [
    '.txt',
    '.pdf',
    '.zip',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp'
];

export const CHAT_FILE_INPUT_ACCEPT = [
    'image/*',
    '.txt',
    '.pdf',
    '.zip',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx'
].join(',');

export const CHAT_SUPPORTED_FILE_DESCRIPTION =
    '지원 형식: 이미지, txt, pdf, zip, doc/docx, xls/xlsx, ppt/pptx (최대 20MB)';

export interface BackendChatRoomResponse {
    roomId: string;
    participants: string[];
    participantNames: Record<string, string>;
    lastMessage?: BackendChatMessageResponse;
    unreadCount: Record<string, number>;
    participantPresence?: Record<string, boolean>;
    relatedJobId?: string;
    relatedApplicationId?: string;
    relatedProposalId?: string;
    contractId?: number;
    leftBy?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface BackendChatMessageResponse {
    messageId: string;
    roomId: string;
    senderId: string;
    content: string;
    type: string;
    metadata?: any;
    createdAt: string;
    readBy: string[];
}

export interface CursorPageResponse<T> {
    items?: T[];
    content?: T[];
    nextCursor?: string;
    hasNext: boolean;
}

// ─── Mapping Helpers ─────────────────────────────────────────────────────────

function mapToChatRoom(r: BackendChatRoomResponse): ChatRoom {
    return {
        id: r.roomId,
        participants: r.participants,
        participantNames: r.participantNames,
        lastMessage: r.lastMessage ? mapToChatMessage(r.lastMessage) : undefined,
        unreadCount: r.unreadCount ?? {},
        participantPresence: r.participantPresence ?? {},
        relatedJobId: r.relatedJobId,
        relatedApplicationId: r.relatedApplicationId,
        relatedProposalId: r.relatedProposalId,
        contractId: r.contractId,
        leftBy: r.leftBy,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt)
    };
}

function mapToChatMessage(m: BackendChatMessageResponse): ChatMessage {
    return {
        id: m.messageId,
        roomId: m.roomId,
        senderId: m.senderId,
        content: m.content,
        type: m.type as ChatMessage['type'],
        metadata: m.metadata,
        createdAt: new Date(m.createdAt),
        readBy: m.readBy ?? []
    };
}

export function validateChatUploadFile(file: File): string | null {
    if (!file || file.size <= 0) {
        return '업로드할 파일이 없습니다.';
    }

    if (file.size > CHAT_UPLOAD_MAX_BYTES) {
        return '채팅 파일은 20MB 이하만 업로드할 수 있습니다.';
    }

    const normalizedType = file.type.toLowerCase();
    const normalizedName = file.name.toLowerCase();
    const hasAllowedExtension = CHAT_ALLOWED_UPLOAD_EXTENSIONS.some((extension) =>
        normalizedName.endsWith(extension)
    );
    const isAllowedMimeType =
        normalizedType.startsWith('image/') || CHAT_ALLOWED_UPLOAD_MIME_TYPES.has(normalizedType);

    if (!isAllowedMimeType && !hasAllowedExtension) {
        return CHAT_SUPPORTED_FILE_DESCRIPTION;
    }

    return null;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * 내 채팅방 목록 조회
 * GET /api/chat/rooms
 */
export async function getMyChatRooms(): Promise<ChatRoom[]> {
    const res = await apiClient.get<BackendChatRoomResponse[]>('/api/chat/rooms');
    return res.data.map(mapToChatRoom);
}

/**
 * 채팅방 읽음 처리
 * POST /api/chat/rooms/{roomId}/read
 */
export async function markChatRoomAsRead(roomId: string): Promise<ChatRoom> {
    const res = await apiClient.post<BackendChatRoomResponse>(`/api/chat/rooms/${roomId}/read`);
    return mapToChatRoom(res.data);
}

/**
 * 채팅방 이전 메시지 조회 (커서 기반 페이징)
 * GET /api/chat/rooms/{roomId}/messages?size=20&cursorDateStr=...
 */
export async function getChatMessages(
    roomId: string,
    cursorDateStr?: string,
    size = 20
): Promise<CursorPageResponse<ChatMessage>> {
    const params: Record<string, any> = { size };
    if (cursorDateStr) params.cursorDateStr = cursorDateStr;

    const res = await apiClient.get<CursorPageResponse<BackendChatMessageResponse>>(
        `/api/chat/rooms/${roomId}/messages`,
        { params }
    );
    const messageItems = res.data.items ?? res.data.content ?? [];

    return {
        content: messageItems.map(mapToChatMessage),
        nextCursor: res.data.nextCursor,
        hasNext: res.data.hasNext
    };
}

/**
 * 채팅방 생성
 * POST /api/chat/rooms
 */
export async function createChatRoom(body: {
    participants: string[];
    participantNames: Record<string, string>;
    relatedJobId?: string;
    relatedApplicationId?: string;
    relatedProposalId?: string;
    contractId?: number;
}): Promise<ChatRoom> {
    const res = await apiClient.post<BackendChatRoomResponse>('/api/chat/rooms', body);
    return mapToChatRoom(res.data);
}

/**
 * 채팅방 나가기
 * POST /api/chat/rooms/{roomId}/leave
 */
export async function leaveChatRoom(roomId: string): Promise<ChatRoom> {
    const res = await apiClient.post<BackendChatRoomResponse>(`/api/chat/rooms/${roomId}/leave`);
    return mapToChatRoom(res.data);
}

/**
 * 채팅방 계약 연결 업데이트
 * PATCH /api/chat/rooms/{roomId}/contract
 */
export async function updateChatRoomContract(
    roomId: string,
    contractId: number | null,
    options?: { overrideExisting?: boolean }
): Promise<ChatRoom> {
    const res = await apiClient.patch<BackendChatRoomResponse>(`/api/chat/rooms/${roomId}/contract`, {
        contractId,
        overrideExisting: options?.overrideExisting ?? false
    });
    return mapToChatRoom(res.data);
}

/**
 * 채팅 파일 업로드 및 FILE 메시지 생성
 * POST /api/chat/rooms/{roomId}/files
 */
export async function sendChatFileMessage(roomId: string, file: File): Promise<ChatMessage> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<BackendChatMessageResponse>(
        `/api/chat/rooms/${roomId}/files`,
        formData
    );
    return mapToChatMessage(res.data);
}

