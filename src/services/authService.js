import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';

export async function verifyAdminPassword(
    inputPassword,
    { dbRef = db, docFn = doc, getDocFn = getDoc } = {},
) {
    const docRef = docFn(dbRef, 'credentials', 'admin');
    const docSnap = await getDocFn(docRef);

    if (!docSnap.exists()) return false;

    const { password } = docSnap.data();
    return password === inputPassword;
}
