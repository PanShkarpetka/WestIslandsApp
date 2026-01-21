import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUserStore } from '../store/userStore.js';

export async function logEvent(
    action,
    {
        userStore = useUserStore,
        addDocFn = addDoc,
        collectionFn = collection,
        serverTimestampFn = serverTimestamp,
        dbRef = db,
        logger = console,
    } = {},
) {
    try {
        const store = userStore();
        await addDocFn(collectionFn(dbRef, 'logs'), {
            action,
            user: store.nickname || 'невідомо',
            timestamp: serverTimestampFn(),
        });
    } catch (error) {
        logger.error('Не вдалося записати лог:', error);
    }
}

// Приклад використання:
// await logEvent("Admin created ship: Катамаран з ВП");
