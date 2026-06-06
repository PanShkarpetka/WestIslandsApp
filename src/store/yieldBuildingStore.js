import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getFirestore, collection, query, orderBy, onSnapshot,
  addDoc, doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'

export const useYieldBuildingStore = defineStore('yieldBuildings', () => {
  const db = getFirestore()
  const yieldBuildings = ref([])
  const loading = ref(false)
  const error = ref(null)
  let _unsub = null

  function mapDoc(d) {
    const x = d.data() || {}
    return { id: d.id, name: x.name || 'Без назви', description: x.description || '' }
  }

  function subscribe() {
    stop()
    loading.value = true
    const q = query(collection(db, 'yield-buildings'), orderBy('name', 'asc'))
    _unsub = onSnapshot(q, (snap) => {
      yieldBuildings.value = snap.docs.map(mapDoc)
      loading.value = false
    }, (e) => { error.value = e?.message || String(e); loading.value = false })
  }

  function stop() { if (_unsub) { _unsub(); _unsub = null } }

  const byId = computed(() => {
    const m = new Map()
    for (const b of yieldBuildings.value) m.set(b.id, b)
    return m
  })

  async function create(name, description = '') {
    await addDoc(collection(db, 'yield-buildings'), {
      name: name.trim(),
      description: description.trim(),
      createdAt: serverTimestamp(),
    })
  }

  async function update(id, payload) {
    const updates = {}
    if (payload.name !== undefined) updates.name = payload.name.trim()
    if (payload.description !== undefined) updates.description = payload.description.trim()
    await updateDoc(doc(db, 'yield-buildings', id), updates)
  }

  async function remove(id) {
    await deleteDoc(doc(db, 'yield-buildings', id))
  }

  return { yieldBuildings, byId, loading, error, subscribe, stop, create, update, remove }
})
