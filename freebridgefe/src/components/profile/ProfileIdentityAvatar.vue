<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    imageUrl?: string | null;
    label?: string | null;
    shape?: 'circle' | 'square';
    variant?: 'freelancer' | 'employer' | 'neutral';
    sizeClass?: string;
    textClass?: string;
    ringClass?: string;
  }>(),
  {
    imageUrl: null,
    label: '',
    shape: 'circle',
    variant: 'neutral',
    sizeClass: 'h-24 w-24',
    textClass: 'text-3xl font-bold',
    ringClass: 'border border-white/10',
  },
);

const getInitial = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed?.charAt(0) || '?';
};

const variantClass = () => {
  if (props.variant === 'freelancer') {
    return 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-white shadow-inner';
  }

  if (props.variant === 'employer') {
    return 'bg-white/5 text-blue-200 shadow-inner';
  }

  return 'bg-slate-800 text-slate-300 shadow-inner';
};

const shapeClass = () => (props.shape === 'square' ? 'rounded-[24px]' : 'rounded-full');
</script>

<template>
  <div
    class="flex items-center justify-center overflow-hidden"
    :class="[sizeClass, textClass, ringClass, variantClass(), shapeClass()]"
  >
    <img v-if="imageUrl" :src="imageUrl" :alt="`${label || 'profile'} avatar`" class="h-full w-full object-cover" />
    <span v-else>{{ getInitial(label) }}</span>
  </div>
</template>
