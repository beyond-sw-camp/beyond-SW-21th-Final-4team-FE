export function isInlinePreviewableChatFile(contentType: unknown): boolean {
    if (typeof contentType !== 'string' || !contentType.trim()) {
        return false;
    }

    const normalizedType = contentType.toLowerCase();
    return normalizedType.startsWith('image/') || normalizedType === 'application/pdf';
}
