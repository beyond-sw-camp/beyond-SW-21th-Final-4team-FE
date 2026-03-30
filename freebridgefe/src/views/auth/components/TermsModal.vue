<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { watch, onUnmounted } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  content: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
};

watch(() => props.isOpen, (open) => {
  if (open) {
    document.addEventListener('keydown', onKeydown);
  } else {
    document.removeEventListener('keydown', onKeydown);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>

      <!-- Modal Content -->
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
        class="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        v-motion
        :initial="{ opacity: 0, scale: 0.95 }"
        :enter="{ opacity: 1, scale: 1 }"
      >
        <!-- Header -->
        <div class="fb-modal-header flex items-center justify-between p-5 border-b border-white/10">
          <h3 id="terms-modal-title" class="text-xl font-bold text-white">{{ title }}</h3>
          <button
            @click="$emit('close')"
            class="text-white/60 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto text-white/80 leading-relaxed whitespace-pre-wrap text-sm custom-scrollbar">
          {{ content }}
        </div>

        <!-- Footer -->
        <div class="p-5 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            @click="$emit('close')"
            class="px-6 py-2 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
}
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
