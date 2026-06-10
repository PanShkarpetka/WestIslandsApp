import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/services/firebase';

export const useHeroesStore = defineStore('heroes', () => {
    const heroes = ref([]);
    let unsubscribe = null;

    const playerHeroes = computed(() =>
        heroes.value.filter((h) => h.password),
    );

    function subscribeHeroes() {
        if (unsubscribe) return;
        const q = query(collection(db, 'heroes'), orderBy('name'));
        unsubscribe = onSnapshot(q, (snap) => {
            heroes.value = snap.docs.map((docSnap) => {
                const data = docSnap.data() || {};
                return {
                    id: docSnap.id,
                    name: data.name || '',
                    inactive: data.inactive ?? false,
                    password: data.password || '',
                    telegramId: data.telegramId || '',
                    goldBalance: data.goldBalance ?? 0,
                    goods: data.goods || {},
                };
            });
        });
    }

    function unsubscribeHeroes() {
        unsubscribe?.();
        unsubscribe = null;
    }

    return { heroes, playerHeroes, subscribeHeroes, unsubscribeHeroes };
});
