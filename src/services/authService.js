import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function verifyAdminPassword(inputPassword) {
    const docRef = doc(db, 'credentials', 'admin');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return false;

    const { password } = docSnap.data();
    return password === inputPassword;
}