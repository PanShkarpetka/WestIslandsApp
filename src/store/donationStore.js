// stores/donations.js
import { defineStore } from 'pinia'
import {
    collection, query, where, onSnapshot
} from 'firebase/firestore'
import {ref} from "vue";
import {db} from "@/services/firebase.js";

export const useDonationsStore = defineStore('donations', () => {
    const donations = ref([]);
    const totalsByCharacter = ref([]); // [{ character: string, total: number }]

    function subscribeToDonations(goalId) {
        if (!goalId) return;
        const colRef = collection(db, 'donations');
        const q = query(colRef, where('goalId', '==', goalId));

        return onSnapshot(q, (snapshot) => {
            donations.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        });
    }

    function subscribeToDonationsByCharacter(goalId) {
        if (!goalId) return;
        const colRef = collection(db, "donations");
        const q = query(colRef, where("goalId", "==", goalId));

        // Return the unsubscribe so you can stop listening later
        return onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
            donations.value = items;

            // aggregate by character
            const totalsMap = new Map(); // character -> total
            for (const d of items) {
                const name = (d.character ?? "Unknown").trim();
                const amt = Number(d.amount) || 0;
                totalsMap.set(name, (totalsMap.get(name) || 0) + amt);
            }

            // turn into a sorted array (desc by total)
            totalsByCharacter.value = Array.from(totalsMap, ([character, total]) => ({character, total}))
                .sort((a, b) => b.total - a.total);
        });
    }

    return {
        donations,
        totalsByCharacter,
        subscribeToDonations,
        subscribeToDonationsByCharacter
    };
})

