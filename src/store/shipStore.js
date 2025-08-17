import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
    collection,
    onSnapshot,
    doc,
    deleteDoc,
    updateDoc,
    addDoc
} from 'firebase/firestore';
import { db } from '../services/firebase.js';

export const useShipStore = defineStore('ships', () => {
    const ships = ref([]);

    function subscribeToShips() {
        const colRef = collection(db, 'ships');
        onSnapshot(colRef, (snapshot) => {
            ships.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
    }

    async function saveShip(ship) {
        if (ship.id) {
            const docRef = doc(db, 'ships', ship.id);
            await updateDoc(docRef, {
                name: ship.name,
                type: ship.type,
                speedUnit: ship.speedUnit,
                capacity: ship.capacity
            });
        } else {
            await addDoc(collection(db, 'ships'), {
                ...ship,
                visible: true
            });
        }
    }

    async function deleteShip(id) {
        await deleteDoc(doc(db, 'ships', id));
    }

    async function toggleVisibility(ship) {
        const docRef = doc(db, 'ships', ship.id);
        await updateDoc(docRef, {
            visible: !ship.visible
        });
    }

    return {
        ships,
        subscribeToShips,
        saveShip,
        deleteShip,
        toggleVisibility
    };
});
