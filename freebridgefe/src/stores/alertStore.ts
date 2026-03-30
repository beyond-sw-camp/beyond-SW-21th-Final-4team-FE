import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertPayload {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: (() => void | Promise<void>) | null;
  onCancel?: (() => void | Promise<void>) | null;
}

export const useAlertStore = defineStore('alert', () => {
  const isOpen = ref(false);
  const title = ref('알림');
  const message = ref('');
  const type = ref<AlertType>('info');
  const confirmText = ref('확인');
  const cancelText = ref('취소');
  const showCancel = ref(false);
  const onConfirm = ref<(() => void | Promise<void>) | null>(null);
  const onCancel = ref<(() => void | Promise<void>) | null>(null);

  const open = (payload: AlertPayload) => {
    title.value = payload.title ?? '알림';
    message.value = payload.message;
    type.value = payload.type ?? 'info';
    confirmText.value = payload.confirmText ?? '확인';
    cancelText.value = payload.cancelText ?? '취소';
    showCancel.value = payload.showCancel ?? false;
    onConfirm.value = payload.onConfirm ?? null;
    onCancel.value = payload.onCancel ?? null;
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
    showCancel.value = false;
    onConfirm.value = null;
    onCancel.value = null;
  };

  const confirm = async () => {
    const confirmHandler = onConfirm.value;
    close();
    if (confirmHandler) {
      await confirmHandler();
    }
  };

  const cancel = async () => {
    const cancelHandler = onCancel.value;
    close();
    if (cancelHandler) {
      await cancelHandler();
    }
  };

  return {
    isOpen,
    title,
    message,
    type,
    confirmText,
    cancelText,
    showCancel,
    open,
    close,
    confirm,
    cancel,
  };
});
