// stores/islandStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getFirestore, doc, onSnapshot, getDoc } from 'firebase/firestore'

export const useIslandStore = defineStore('islands', () => {
    const currentId = ref('island_rock') // за замовчуванням
    const data = ref(null)
    const loading = ref(false)
    const error = ref(null)
    let _unsub = null

    function setCurrent(id) {
        if (id === currentId.value) return
        currentId.value = id
        subscribe()
    }

    function subscribe(id = currentId.value) {
        stop()
        loading.value = true
        const db = getFirestore()
        const refDoc = doc(db, 'islands', id)
        _unsub = onSnapshot(refDoc, snap => {
            data.value = snap.exists() ? { id: snap.id, ...snap.data() } : null
            loading.value = false
        }, e => { error.value = e?.message || String(e); loading.value = false })
    }

    async function loadOnce(id = currentId.value) {
        const db = getFirestore()
        const snap = await getDoc(doc(db, 'islands', id))
        data.value = snap.exists() ? { id: snap.id, ...snap.data() } : null
    }

    function stop() { if (_unsub) { _unsub(); _unsub = null } }
    const buildingDiscount = computed(() => {
        const raw = data.value?.buildingDiscount ?? 0
        const n = Number(raw) || 0
        return n > 1 ? Math.min(n / 100, 1) : Math.max(n, 0)
    })

    return { currentId, data, loading, error, setCurrent, subscribe, loadOnce, stop, buildingDiscount }
})
