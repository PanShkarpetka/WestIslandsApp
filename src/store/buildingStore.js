// stores/buildingStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore'

export const useBuildingStore = defineStore('buildings', () => {
    const buildings = ref([])          // [{ id, name, cost, ... }]
    const loading = ref(false)
    const error = ref(null)
    let _unsub = null

    const byId = computed(() => {
        const m = new Map()
        for (const b of buildings.value) m.set(b.id, b)
        return m
    })

    function mapDoc(d) {
        const data = d.data() || {}
        const cost = Number(
            data.cost ?? 0
        )
        return {
            id: d.id,
            name: data.name || 'Без назви',
            cost,
            ...data,
        }
    }

    function subscribe() {
        stop()
        loading.value = true
        error.value = null

        const db = getFirestore()
        const q = query(collection(db, 'buildings'), orderBy('name', 'asc'))

        _unsub = onSnapshot(q, (snap) => {
            buildings.value = snap.docs.map(mapDoc)
            loading.value = false
        }, (e) => {
            error.value = e?.message || String(e)
            loading.value = false
        })
    }

    function stop() {
        if (_unsub) { _unsub(); _unsub = null }
    }

    return { buildings, byId, loading, error, subscribe, stop }
})
