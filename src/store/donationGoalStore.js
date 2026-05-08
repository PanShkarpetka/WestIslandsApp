import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    increment,
    getDoc
} from 'firebase/firestore';
import { db } from '@/services/firebase';

export const useDonationGoalStore = defineStore('donation-goals', () => {
    const goals = ref([])
    let _unsub = null

    // === Realtime goals ===
    function subscribeToGoals() {
        if (_unsub) return _unsub
        const colRef = collection(db, 'donation-goals')
        _unsub = onSnapshot(colRef, (snapshot) => {
            goals.value = snapshot.docs.map(d => {
                const data = d.data()
                return {
                    treasury: data.treasury || false,
                    id: d.id,
                    title: data.title,
                    description: data.description,
                    targetAmount: Number(data.target || 0),
                    currentAmount: Number(data.collected || 0),
                    createdAt: data.createdAt,
                    createdBy: data.createdBy,
                    type: data.type,
                    targetBuildingKey: data.targetBuildingKey,
                    visible: data.visible !== false,
                    status: data.status || 'open' // open | locked | closed (якщо використовуєш)
                }
            })
        })
        return _unsub
    }

    function stop() {
        if (_unsub) { _unsub(); _unsub = null }
    }

    async function saveGoal(goal) {
        const data = {
            title: goal.title || '',
            description: goal.description || '',
            target: Number(goal.targetAmount ?? goal.target ?? 0),
            collected: Number(goal.currentAmount ?? goal.collected ?? 0),
            createdBy: goal.createdBy || 'Анонім',
            type: goal.type || 'building',
            targetBuildingKey: goal.targetBuildingKey || null,
            visible: typeof goal.visible === 'boolean' ? goal.visible : true,
            status: goal.status || 'open',
            createdAt: goal.createdAt || serverTimestamp()
        }

        if (goal.id) {
            await updateDoc(doc(db, 'donation-goals', goal.id), data)
        } else {
            await addDoc(collection(db, 'donation-goals'), data)
        }
    }

    async function deleteGoal(id) {
        await deleteDoc(doc(db, 'donation-goals', id))
    }

    async function toggleVisibility(goal) {
        const refDoc = doc(db, 'donation-goals', goal.id)
        await updateDoc(refDoc, { visible: !goal.visible })
    }

    // === DONATE ===
    /**
     * payload: { goalId, amount, character? (нік/персонаж), userId? }
     * - Створює документ у top-level "donations"
     * - Інкрементить "collected" у "donationGoals/{goalId}"
     * Все разом — одним batch.
     */
    async function donate(payload) {
        const goalId = payload.goalId
        const amount = Number(payload.amount || 0)
        const character = payload.character || null

        if (!goalId) throw new Error('goalId is required')
        if (!amount || amount <= 0) throw new Error('Некоректна сума')

        const goalRef = doc(db, 'donation-goals', goalId)
        const goalSnap = await getDoc(goalRef)
        if (!goalSnap.exists()) throw new Error('Ціль не знайдено')

        // опційні перевірки стану
        const g = goalSnap.data() || {}
        if (g.status === 'locked') throw new Error('Збір заблоковано')
        const goalTitle = g.title || 'No goal'

        // batch: оновити collected + створити донат у /donations
        const batch = writeBatch(db)
        batch.update(goalRef, { collected: increment(amount) })

        const donationsCol = collection(db, 'donations')
        const donationDoc = doc(donationsCol) // авто-ID
        batch.set(donationDoc, {
            goalId,
            amount,
            character,
            donatedAt: serverTimestamp()
        })
        const logRef = doc(collection(db, 'logs'))
        const who = character || 'Анонім'
        batch.set(logRef, {
            type: 'donation',
            action: `💰 ${who} задонатив ${amount} ₴ на «${goalTitle}»`,
            goalId,
            goalTitle,
            amount,
            user: character,
            timestamp: serverTimestamp()
        })

        await batch.commit()
    }

    async function toggleLockGoal(id, status) {
        if (!id) throw new Error('id is required')
        await updateDoc(doc(db, 'donation-goals', id), { status })
    }

    return {
        goals,
        subscribeToGoals,
        stop,
        saveGoal,
        deleteGoal,
        toggleVisibility,
        donate,
        toggleLockGoal
    }
})
