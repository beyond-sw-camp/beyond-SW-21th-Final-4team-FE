import { defineStore } from 'pinia';
import { ref } from 'vue';

const FAVORITES_STORAGE_KEY = 'freelancerFavoriteJobIds';

const loadFavoriteIds = (): string[] => {
  const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

export const useFavoritesStore = defineStore('favorites', () => {
  const favoriteIds = ref<string[]>(loadFavoriteIds());

  const persist = () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds.value));
  };

  const addFavorite = (id: string) => {
    if (favoriteIds.value.includes(id)) return;
    favoriteIds.value = [...favoriteIds.value, id];
    persist();
  };

  const removeFavorite = (id: string) => {
    favoriteIds.value = favoriteIds.value.filter((favoriteId) => favoriteId !== id);
    persist();
  };

  const toggleFavorite = (id: string) => {
    if (favoriteIds.value.includes(id)) {
      removeFavorite(id);
      return;
    }
    addFavorite(id);
  };

  return {
    favoriteIds,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  };
});
