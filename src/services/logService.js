import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUserStore } from '../store/userStore';

export async function logEvent(action) {
    try {
        const userStore = useUserStore();
        await addDoc(collection(db, 'logs'), {
            action,
            user: userStore.nickname || 'невідомо',
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Не вдалося записати лог:', error);
    }
}

// Приклад використання:
// await logEvent("Admin created ship: Катамаран з ВП");
