import { defineStore } from 'pinia'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

export const useLogStore = defineStore('logStore', {
    actions: {
        async addLog(log) {
            try {
                await addDoc(collection(db, 'logs'), log)
            } catch (error) {
                console.error('Failed to add log:', error)
            }
        }
    }
})
