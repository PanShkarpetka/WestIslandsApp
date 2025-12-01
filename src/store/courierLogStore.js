import { defineStore } from 'pinia'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

export const useCourierLogStore = defineStore('courierLogStore', {
    actions: {
        async addLog({history = '', distance = 'N/A', conSaveMod = 'N/A', speed = 'N/A', dangerChance = 'N/A', character = 'N/A', success = false}) {
            try {
                await addDoc(collection(db, 'courierLogs'), {
                    timestamp: new Date(),
                    history,
                    distance,
                    conSaveMod,
                    speed,
                    dangerChance,
                    character,
                    success,
                })
            } catch (error) {
                console.error('Failed to add log:', error)
            }
        }
    }
})
