import { defineStore } from 'pinia';
import { ref } from 'vue';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/services/firebase';

export const useGoodsStore = defineStore('goods', () => {
    const goods = ref([]);
    let unsubscribe = null;

    function subscribeGoods() {
        if (unsubscribe) return;
        const q = query(collection(db, 'goods'), orderBy('name'));
        unsubscribe = onSnapshot(q, (snap) => {
            goods.value = snap.docs.map((docSnap) => ({
                id: docSnap.id,
                name: docSnap.data().name || '',
                unit: docSnap.data().unit || '',
            }));
        });
    }

    function unsubscribeGoods() {
        unsubscribe?.();
        unsubscribe = null;
    }

    return { goods, subscribeGoods, unsubscribeGoods };
});
