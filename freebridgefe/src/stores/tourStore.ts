import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { UserRole } from '@/types';
import { getFirstTourRoute, getTourSteps, type TourStep } from '@/tour/steps';

export const useTourStore = defineStore('tour', () => {
  const isActive = ref(false);
  const role = ref<UserRole | null>(null);
  const steps = ref<TourStep[]>([]);
  const currentIndex = ref(0);
  const storageKey = ref<string | null>(null);

  const total = computed(() => steps.value.length);
  const currentStep = computed(() => steps.value[currentIndex.value] ?? null);

  const makeStorageKey = (nextRole: UserRole, userId?: string) =>
    `tourSeen:${nextRole}:${userId ?? 'anon'}`;

  const hasSeen = (nextRole: UserRole, userId?: string) =>
    localStorage.getItem(makeStorageKey(nextRole, userId)) === '1';

  const start = (nextRole: UserRole, userId?: string, force = false) => {
    if (!force && hasSeen(nextRole, userId)) return false;
    role.value = nextRole;
    steps.value = getTourSteps(nextRole);
    currentIndex.value = 0;
    storageKey.value = makeStorageKey(nextRole, userId);
    isActive.value = true;
    return true;
  };

  const finish = () => {
    if (storageKey.value) {
      localStorage.setItem(storageKey.value, '1');
    }
    isActive.value = false;
    role.value = null;
    steps.value = [];
    currentIndex.value = 0;
    storageKey.value = null;
  };

  const skip = () => finish();

  const next = (): string | null => {
    if (currentIndex.value < steps.value.length - 1) {
      const nextStep = steps.value[currentIndex.value + 1];
      currentIndex.value += 1;
      return nextStep.route;
    }
    finish();
    return null;
  };

  const prev = () => {
    if (currentIndex.value > 0) {
      currentIndex.value -= 1;
    }
  };

  const restart = (nextRole: UserRole, userId?: string) => start(nextRole, userId, true);

  const firstRouteForRole = (nextRole: UserRole) => getFirstTourRoute(nextRole);

  return {
    isActive,
    role,
    steps,
    currentIndex,
    currentStep,
    total,
    hasSeen,
    start,
    finish,
    skip,
    next,
    prev,
    restart,
    firstRouteForRole,
  };
});
