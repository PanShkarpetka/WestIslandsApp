import { defineStore } from 'pinia';
import { getFirestore, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { computed, ref } from 'vue';

/** Availability rating 0–10 based on current stock vs daily max. */
export function fishAvailabilityRating(fish) {
  const daily = Number(fish.fishAmountDaily || 0);
  if (daily === 0) return 0;
  const now = Math.max(0, Number(fish.fishAmountAvailableNow || 0));
  return Math.min(10, Math.round((now / daily) * 10));
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

  const fishesWithRating = computed(() =>
    fishes.value.map((f) => ({ ...f, rating: fishAvailabilityRating(f) })),
  );

  async function setAvailability(fishId, value) {
    const db = getFirestore();
    const amount = Math.max(0, Math.round(Number(value)));
    await updateDoc(doc(db, 'fishes', fishId), { fishAmountAvailableNow: amount });
  }

  return {
    fishes,
    fishesWithRating,
    loading,
    error,
    subscribe,
    unsubscribe,
    setAvailability,
  };
});
