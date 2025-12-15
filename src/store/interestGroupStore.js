// stores/interestGroup.js
import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import {
    getFirestore, collection, query, where, orderBy, onSnapshot, doc,
} from 'firebase/firestore'

export const useInterestGroupStore = defineStore('interestGroup', () => {
    const state = reactive({
        items: [],              // документи interestGroup для острова
        totalPopulation: 0,     // населення з islands/<islandId>
        loading: false,
        error: null,
        _unsubGroups: null,
        _unsubIsland: null,
        islandId: null,
    })

    function stopListener() {
        if (state._unsubGroups) { state._unsubGroups(); state._unsubGroups = null }
        if (state._unsubIsland) { state._unsubIsland(); state._unsubIsland = null }
    }

    function startListener(islandId) {
        stopListener()
        state.loading = true
        state.error = null
        state.islandId = islandId || null

        const db = getFirestore()

        // 1) interestGroup по islandId (якщо задано) або вся колекція
        const refGroups = collection(db, 'interestGroup')
        const qGroups = islandId
            ? query(refGroups, where('islandId', '==', islandId), orderBy('name'))
            : query(refGroups, orderBy('name'))
        state._unsubGroups = onSnapshot(qGroups, (snap) => {
            state.items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            state.loading = false
        }, (err) => {
            state.error = err.message
            state.loading = false
        })

        // 2) island doc з населенням (лише якщо islandId передано)
        if (islandId) {
            const islandRef = doc(db, 'islands', islandId)
            state._unsubIsland = onSnapshot(islandRef, (snap) => {
                const data = snap.data() || {}
                const pop = data.population ?? data.populationCount ?? data.people ?? 0
                state.totalPopulation = Number(pop) || 0
            }, (err) => {
                console.error('[interestGroup] island error:', err)
                state.error = err.message
            })
        } else {
            state.totalPopulation = 0
        }
    }

    const totalCountFromGroups = computed(() =>
        state.items.reduce((s, g) => s + (g.count || 0), 0)
    )

    // Беремо total з islands; якщо 0 — fallback на суму груп
    const totalPopulation = computed(() =>
        state.totalPopulation > 0 ? state.totalPopulation : totalCountFromGroups.value
    )

    // Збагачені елементи: percent + votes (із 10)
    const groupsAugmented = computed(() => {
        const total = totalPopulation.value || 1
        return state.items.map(g => {
            const percent = (g.count || 0) / total * 100
            const votes   = (percent / 100) * 10
            return {
                ...g,
                percent,                        // напр. 50.0
                votes,                          // напр. 5.0
                percentRounded: Math.round(percent * 10) / 10,
                votesRounded: Math.round(votes * 10) / 10,
            }
        })
    })

    return {
        ...toRefs(state),
        startListener,
        stopListener,
        totalPopulation,
        totalCountFromGroups,
        groupsAugmented,
    }
})
