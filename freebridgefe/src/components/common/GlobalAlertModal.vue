<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useAlertStore } from '@/stores/alertStore';

const alertStore = useAlertStore();
const dialogTitleId = 'global-alert-modal-title';
const dialogDescriptionId = 'global-alert-modal-description';
const modalSurfaceRef = ref<HTMLElement | null>(null);
const previouslyFocusedElement = ref<HTMLElement | null>(null);

const handleBackdropClick = () => {
  if (alertStore.showCancel) {
    void alertStore.cancel();
    return;
  }

  alertStore.close();
};

const toneClass = computed(() => {
  switch (alertStore.type) {
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'warning':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'error':
      return 'bg-rose-50 text-rose-700 border-rose-100';
    default:
      return 'bg-[#e7f9fb] text-[#1c95a2] border-[#cdeff2]';
  }
});

const restoreFocus = () => {
  if (previouslyFocusedElement.value?.isConnected) {
    previouslyFocusedElement.value.focus({ preventScroll: true });
  }
  previouslyFocusedElement.value = null;
};

watch(
  () => alertStore.isOpen,
  async (isOpen, wasOpen) => {
    if (isOpen) {
      previouslyFocusedElement.value =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      await nextTick();
      modalSurfaceRef.value?.focus();
      return;
    }

    if (wasOpen) {
      restoreFocus();
    }
  }
);

onBeforeUnmount(() => {
  restoreFocus();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="alertStore.isOpen"
      class="fb-modal-overlay fixed inset-0 z-[99999] flex items-center justify-center p-4"
      @click.self="handleBackdropClick"
    >
      <div
        ref="modalSurfaceRef"
        class="fb-modal-surface w-full max-w-md rounded-[28px] backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-labelledby="dialogTitleId"
        :aria-describedby="dialogDescriptionId"
      >
        <div class="p-6">
          <div class="inline-flex items-center px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] rounded-full border" :class="toneClass">
            Notice
          </div>
          <h3 :id="dialogTitleId" class="mt-4 text-xl font-semibold text-slate-950">{{ alertStore.title }}</h3>
          <p :id="dialogDescriptionId" class="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-500">{{ alertStore.message }}</p>
        </div>
        <div class="p-6 pt-0 flex justify-end gap-3">
          <button
            v-if="alertStore.showCancel"
            type="button"
            class="fb-button-secondary rounded-full px-5 py-2.5 text-sm"
            @click="alertStore.cancel"
          >
            {{ alertStore.cancelText }}
          </button>
          <button
            type="button"
            class="fb-button-primary rounded-full px-5 py-2.5 text-sm"
            @click="alertStore.confirm"
          >
            {{ alertStore.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
