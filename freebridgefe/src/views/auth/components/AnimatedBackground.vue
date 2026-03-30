<script setup lang="ts">
// Using CSS animations for background to keep it lightweight if possible,
// or use @vueuse/motion if we really want to replicate the complex motion.
// Given the complexity of the original AnimatedBackground with multiple looping animations,
// using @vueuse/motion is easier to maintain than writing complex keyframes manually.

import { useMotion } from '@vueuse/motion' 
// Note: We'll use v-motion directive in template.
</script>

<template>
  <div class="absolute inset-0 overflow-hidden">
    <!-- Gradient Orbs -->
    <div
      v-motion
      :initial="{ x: -100, y: -100 }"
      :enter="{
        x: [0, 100, 0],
        y: [0, -100, 0],
        scale: [1, 1.2, 1],
        transition: {
          duration: 20000,
          repeat: Infinity,
          ease: 'easeInOut',
        }
      }"
      class="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
      style="background: radial-gradient(circle, rgba(45,91,255,0.8) 0%, rgba(173,70,255,0.4) 100%);"
    />

    <div
      v-motion
      :initial="{ right: -100, top: 200 }"
      :enter="{
        x: [0, -80, 0],
        y: [0, 120, 0],
        scale: [1, 1.1, 1],
        transition: {
          duration: 18000,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1000,
        }
      }"
      class="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-30"
      style="background: radial-gradient(circle, rgba(0,184,219,0.8) 0%, rgba(0,201,80,0.4) 100%);"
    />

    <div
      v-motion
      :initial="{ left: '50%', bottom: -100 }"
      :enter="{
        x: [0, 60, 0],
        y: [0, -60, 0],
        scale: [1, 1.15, 1],
        transition: {
          duration: 15000,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2000,
        }
      }"
      class="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-20"
      style="background: radial-gradient(circle, rgba(173,70,255,0.6) 0%, rgba(255,70,130,0.4) 100%);"
    />

    <!-- Floating Shapes -->
    <div
      v-for="i in 6"
      :key="i"
      v-motion
      :initial="{ y: 0, opacity: 0.2 }"
      :enter="{
        y: [0, -30, 0],
        opacity: [0.2, 0.5, 0.2],
        transition: {
          duration: (5000 + i * 1000),
          repeat: Infinity,
          ease: 'easeInOut',
          delay: i * 500,
        }
      }"
      class="absolute w-2 h-2 rounded-full bg-white/20"
      :style="{
        left: `${20 + i * 15}%`,
        top: `${10 + i * 10}%`,
      }"
    />

    <!-- Mesh Gradient Overlay -->
    <div
      class="absolute inset-0 opacity-40"
      style="background: 
        radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.3) 0px, transparent 50%),
        radial-gradient(at 97% 21%, hsla(125, 98%, 72%, 0.3) 0px, transparent 50%),
        radial-gradient(at 52% 99%, hsla(354, 98%, 61%, 0.3) 0px, transparent 50%),
        radial-gradient(at 10% 29%, hsla(256, 96%, 67%, 0.3) 0px, transparent 50%),
        radial-gradient(at 97% 96%, hsla(38, 60%, 74%, 0.3) 0px, transparent 50%),
        radial-gradient(at 33% 50%, hsla(222, 67%, 73%, 0.3) 0px, transparent 50%),
        radial-gradient(at 79% 53%, hsla(343, 68%, 79%, 0.3) 0px, transparent 50%)
      "
    />
  </div>
</template>
