// stores/islandStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    getFirestore, doc, onSnapshot, updateDoc, getDoc,
} from 'firebase/firestore'

export const useIslandStore = defineStore('islands', () => {
    const db = getFirestore()
    const currentId = ref('island_rock')
    const data = ref(null)
    const loading = ref(false)
    const error = ref(null)
    let _unsub = null

    function stop () { if (_unsub) { _unsub(); _unsub = null } }

    function subscribe (id = currentId.value) {
        stop()
        loading.value = true
        const refDoc = doc(db, 'islands', id)
        _unsub = onSnapshot(refDoc, snap => {
            const raw = snap.exists() ? snap.data() : {}

            const buildings = { ...(raw.buildings || {}) }
            data.value = { id: snap.id, ...raw, buildings }
        }, e => { error.value = e?.message || String(e) })
    }

    async function loadOnce (id = currentId.value) {
        const refDoc = doc(db, 'islands', id)
        const snap = await getDoc(refDoc)
        data.value = snap.exists() ? { id: snap.id, ...snap.data() } : null
    }

    async function updateIsland (partial) {
        if (!data.value?.id) return
        await updateDoc(doc(db, 'islands', data.value.id), partial)
    }

    async function setBuildingBuilt (key, built) {
        if (!data.value?.id) return
        // оптимістично оновлюємо локально (щоб піни змінилися відразу)
        const cur = { ...(data.value.buildings || {}) }
        cur[key] = { ...(cur[key] || {}), built: !!built }
        data.value = { ...data.value, buildings: cur }

        await updateDoc(doc(db, 'islands', data.value.id), {
            [`buildings.${key}.built`]: !!built
        })
    }

    // 0..1 (підтримує як 15, так і 0.15)
    const buildingDiscount = computed(() => {
        const raw = data.value?.buildingDiscount ?? 0
        const n = Number(raw) || 0
        return n > 1 ? Math.min(n / 100, 1) : Math.max(n, 0)
    })

    return {
        currentId, data, loading, error,
        subscribe, loadOnce, stop, updateIsland, setBuildingBuilt, buildingDiscount,
    }
})
