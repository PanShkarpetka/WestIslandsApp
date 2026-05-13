// stores/population.js
import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import {
    getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc
} from 'firebase/firestore'
import { normalizeAmount } from '@/utils/numbers.js'

export const usePopulationStore = defineStore('population', () => {
    const state = reactive({
        items: [],              // документи population для острова
        totalPopulation: 0,     // населення з islands/<islandId>
        loading: false,
        error: null,
        _unsubGroups: null,
        _unsubIsland: null,
        islandId: null,
    })

    function stopListening() {
        if (state._unsubGroups) { state._unsubGroups(); state._unsubGroups = null }
        if (state._unsubIsland) { state._unsubIsland(); state._unsubIsland = null }
    }

    function startListening(islandId) {
        stopListening()
        state.loading = true
        state.error = null
        state.islandId = islandId || null

        const db = getFirestore()

        // 1) population по islandId (якщо є поле); інакше — вся колекція
        const refGroups = collection(db, 'population')
        const qGroups = query(refGroups, orderBy('name'))
        state._unsubGroups = onSnapshot(qGroups, (snap) => {
            state.items = snap.docs
                .map(d => {
                    const data = d.data()
                    return {
                        id: d.id,
                        ...data,
                        count: Number(data.count ?? 0),
                    }
                })
                // Підтримка острівних даних, але не ховаємо глобальні записи без islandId
                .filter(g => {
                    if (!islandId) return true
                    const fromIsland = g.islandId ?? g.island
                    return fromIsland ? fromIsland === islandId : true
                })
            state.loading = false
        }, (err) => {
            state.error = err.message
            state.loading = false
        })

        // 2) island doc з населенням
        if (islandId) {
            const islandRef = doc(db, 'islands', islandId)
            state._unsubIsland = onSnapshot(islandRef, (snap) => {
                const data = snap.data() || {}
                const pop = data.population ?? 0
                state.totalPopulation = Number(pop) || 0
            }, (err) => {
                console.error('[population] island error:', err)
                state.error = err.message
            })
        } else {
            state.totalPopulation = 0
        }
    }

    async function setGroupCount(id, count) {
        if (!id) throw new Error('id is required')
        const value = Math.max(0, Number(count) || 0)
        const ref = doc(getFirestore(), 'population', id)
        await updateDoc(ref, { count: value })
    }

    const totalCountFromGroups = computed(() =>
        state.items.reduce((s, g) => s + (g.count || 0), 0)
    )

    const groupIncomePerPerson = (group) => normalizeAmount(
        group?.incomePerPerson ?? group?.income ?? group?.incomePer ?? 0
    )

    // Беремо total з islands; якщо 0 — fallback на суму груп
    const totalPopulation = computed(() =>
        state.totalPopulation > 0 ? state.totalPopulation : totalCountFromGroups.value
    )

    const populationIncomeTotal = computed(() => {
        const total = state.items.reduce((sum, group) => {
            const count = Number(group.count || 0)
            return sum + groupIncomePerPerson(group) * count
        }, 0)
        return normalizeAmount(total)
    })

    // Збагачені елементи: percent + votes (із 10)
    const groupsAugmented = computed(() => {
        const total = totalPopulation.value || 1
        return state.items.map(g => {
            const percent = (g.count || 0) / total * 100
            const votes   = (percent / 100) * 10
            const incomePerPerson = groupIncomePerPerson(g)
            const incomeTotal = normalizeAmount(incomePerPerson * (g.count || 0))
            return {
                ...g,
                percent,                        // напр. 50.0
                votes,                          // напр. 5.0
                percentRounded: Math.round(percent * 10) / 10,
                votesRounded: Math.round(votes * 10) / 10,
                incomePerPerson,
                incomeTotal,
            }
        })
    })

    const bureaucratStats = computed(() => {
        const bureaucrats = state.items.filter((g) => g.faction === 'bureaucrats')
        const nonBureaucrats = state.items.filter((g) => g.faction !== 'bureaucrats')
        const bureaucratCount = bureaucrats.reduce((s, g) => s + (g.count || 0), 0)
        const totalNonBureaucratPop = nonBureaucrats.reduce((s, g) => s + (g.count || 0), 0)
        const bureaucratCapacity = bureaucratCount * 100
        const coveredCount = Math.min(bureaucratCapacity, totalNonBureaucratPop)
        const isFull = totalNonBureaucratPop > 0 && coveredCount >= totalNonBureaucratPop
        const coveragePercent = totalNonBureaucratPop > 0
            ? normalizeAmount((coveredCount / totalNonBureaucratPop) * 100)
            : 0
        const maintenanceCost = normalizeAmount(
            bureaucrats.reduce((s, g) => s + (groupIncomePerPerson(g)) * (g.count || 0), 0)
        )
        return { bureaucratCount, totalNonBureaucratPop, bureaucratCapacity, coveredCount, isFull, coveragePercent, maintenanceCost }
    })

    return {
        ...toRefs(state),
        startListening,
        stopListening,
        totalPopulation,
        totalCountFromGroups,
        populationIncomeTotal,
        groupsAugmented,
        bureaucratStats,
        setGroupCount,
    }
})
