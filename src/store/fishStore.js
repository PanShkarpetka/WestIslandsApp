import { defineStore } from 'pinia';
import { getFirestore, collection, doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { computed, ref } from 'vue';

/** Overall availability rating 0–10 across all fish combined. */
export function overallAvailabilityRating(fishes) {
  const totalDaily = fishes.reduce((s, f) => s + Math.max(0, Number(f.fishAmountDaily || 0)), 0);
  if (totalDaily === 0) return 0;
  const totalNow = fishes.reduce((s, f) => s + Math.max(0, Number(f.fishAmountAvailableNow || 0)), 0);
  return Math.min(10, Math.round((totalNow / totalDaily) * 10));
}

export const useFishStore = defineStore('fish', () => {
  const fishes = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let _unsub = null;

  function subscribe() {
    if (_unsub) return;
    loading.value = true;
    error.value = null;

    const db = getFirestore();
    _unsub = onSnapshot(
      collection(db, 'fishes'),
      (snap) => {
        fishes.value = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            // Sort by code range min ascending — matches the fishing roll order
            const aMin = Number(a.fishCodeNumber?.min ?? a.fishCodeNumber ?? 0);
            const bMin = Number(b.fishCodeNumber?.min ?? b.fishCodeNumber ?? 0);
            return aMin - bMin;
          });
        loading.value = false;
      },
      (err) => {
        error.value = err?.message || String(err);
        loading.value = false;
      },
    );
  }

  function unsubscribe() {
    _unsub?.();
    _unsub = null;
  }

  const fishesWithRating = computed(() => fishes.value);

  /** Single 0–10 rating for all fish combined. */
  const availabilityRating = computed(() => overallAvailabilityRating(fishes.value));

  const totalAvailableNow = computed(() =>
    fishes.value.reduce((s, f) => s + Math.max(0, Number(f.fishAmountAvailableNow || 0)), 0),
  );

  const totalDailyCapacity = computed(() =>
    fishes.value.reduce((s, f) => s + Math.max(0, Number(f.fishAmountDaily || 0)), 0),
  );

  async function setAvailability(fishId, value) {
    const db = getFirestore();
    const amount = Math.max(0, Math.round(Number(value)));
    await updateDoc(doc(db, 'fishes', fishId), { fishAmountAvailableNow: amount });
  }

  /**
   * Adjust the overall rating by `delta` points (e.g. +1 or -1).
   * Each fish receives a proportional share: round(targetRating/10 * fishAmountDaily),
   * clamped to [0, fishAmountDaily]. All writes are batched atomically.
   */
  async function adjustRating(delta) {
    const current = availabilityRating.value;
    const target = Math.max(0, Math.min(10, current + delta));
    if (target === current) return;

    const db = getFirestore();
    const batch = writeBatch(db);

    for (const fish of fishes.value) {
      const daily = Math.max(0, Number(fish.fishAmountDaily || 0));
      const newAmount = Math.min(daily, Math.round((target / 10) * daily));
      batch.update(doc(db, 'fishes', fish.id), { fishAmountAvailableNow: newAmount });
    }

    await batch.commit();
  }

  return {
    fishes,
    fishesWithRating,
    availabilityRating,
    totalAvailableNow,
    totalDailyCapacity,
    loading,
    error,
    subscribe,
    unsubscribe,
    setAvailability,
    adjustRating,
  };
});
