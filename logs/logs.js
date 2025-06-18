import { db } from '../firebase.js';
import {currentUser, initAuthUI, isAdmin} from '../auth.js';
import {
  collection, onSnapshot, orderBy, query, addDoc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

const logRef = collection(db, "logs");

document.addEventListener('DOMContentLoaded', () => {
  M.Modal.init(document.querySelectorAll('.modal'));

  initAuthUI(() => {
    if (!isAdmin) {
      try {
        document.getElementById("notAllowed").style.display = "block";
      } catch (err) {
        console.error(err);
      }
      return;
    }
    const logPage = document.getElementById("logPage");
    if (logPage) logPage.style.display = "block";
    loadLogs();
  });
});

function loadLogs() {
  const logList = document.getElementById("logList");
  const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));

  onSnapshot(q, snapshot => {
    if (logList) {
      logList.innerHTML = snapshot.docs.map(doc => {
        const data = doc.data();
        const time = data.timestamp?.toDate().toLocaleString() || "???";
        return `
        <li class="collection-item">
          <strong>${data.user || "Unknown"}:</strong> ${data.action}
          <br><span class="grey-text text-darken-1">${time}</span>
        </li>
      `;
      }).join("");
    }
  });
}

export async function logAction(action) {
  await addDoc(logRef, {
    timestamp: new Date(),
    user: currentUser,
    action,
  });
}
