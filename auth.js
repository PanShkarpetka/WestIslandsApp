import { db } from './firebase.js';
import {
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export let currentUser = null;
export let isAdmin = false;

export function initAuthUI(onAuthChange = ()=>{}) {
    const savedUser = localStorage.getItem("nickname");
    if (savedUser) {
        setUser(savedUser);
        onAuthChange(currentUser, isAdmin);
    }

    // Modal open
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const modal = M.Modal.getInstance(document.getElementById("loginModal"));
            modal.open();
        });
    }

    // Login
    const confirmLoginBtn = document.getElementById("confirmLoginBtn");
    if (confirmLoginBtn) {
        confirmLoginBtn.addEventListener("click", async () => {
            const nickname = document.getElementById("loginNickname").value.trim();
            const password = document.getElementById("loginPassword").value;

            if (!nickname) {
                M.toast({ html: "Please enter a nickname" });
                return;
            }

            if (nickname === "admin") {
                const credDoc = await getDoc(doc(db, "credentials", "admin"));
                if (!credDoc.exists()) {
                    M.toast({ html: "Admin credentials not found in database" });
                    return;
                }

                const correctPassword = credDoc.data().password;
                if (password !== correctPassword) {
                    M.toast({ html: "Wrong admin password" });
                    return;
                }
            }

            localStorage.setItem("nickname", nickname);
            setUser(nickname);

            const modal = M.Modal.getInstance(document.getElementById("loginModal"));
            modal.close();

            onAuthChange(currentUser, isAdmin);
        });
    }

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("nickname");
            currentUser = null;
            isAdmin = false;
            if (onAuthChange) onAuthChange(null, false);
            updateNavbarAndAdminControls();

        });
    }
}

function setUser(nickname) {
    currentUser = nickname;
    isAdmin = (nickname === "admin");
    updateNavbarAndAdminControls();
}

function updateNavbarAndAdminControls() {
    const userDisplay = document.getElementById("userDisplay");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const adminControls = document.getElementById("admin-controls");

    if (adminControls) adminControls.style.display = isAdmin ? "block" : "none";

    if (userDisplay) userDisplay.textContent = currentUser || "";
    if (loginBtn) loginBtn.style.display = currentUser ? "none" : "inline-block";
    if (logoutBtn) logoutBtn.style.display = currentUser ? "inline-block" : "none";
}
