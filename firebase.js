import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCTOq4pmhWJ6OOnQ9_TyBKvESxdK3N6HEI",
    authDomain: "west-islands-dnd.firebaseapp.com",
    projectId: "west-islands-dnd",
    storageBucket: "west-islands-dnd.firebasestorage.app",
    messagingSenderId: "212367138749",
    appId: "1:212367138749:web:00e4a15796b7a569d8bcd4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

