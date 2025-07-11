import { db } from '../firebase.js';
import {
  collection, addDoc, getDoc, getDocs, doc, updateDoc, increment, serverTimestamp, query, where
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

import { isAdmin, currentUser, initAuthUI } from '../auth.js';
// noinspection ES6PreferShortImport
import { countCostWithDiscount } from "../helpers/index.js";

let islandId = "island_rock";
let islandData = null;
let selectedGoalId = null;
let selectedGoalData = null;
let buildingsMeta = {};

document.addEventListener('DOMContentLoaded', () => {
  M.Modal.init(document.querySelectorAll('.modal'));
  M.FormSelect.init(document.querySelectorAll('select'));

  initAuthUI(async () => {
    if (!isAdmin) {
      document.getElementById("donateCharacterWrapper").style.display = "none";
    }
    try {
      await Promise.all([loadBuildingsMeta(), loadDonationGoals(), loadIsland()])
    } catch( err) {
      console.error(err)
    }
  });

  document.getElementById("goalType").addEventListener("change", (e) => {
    const show = e.target.value === "building";
    document.getElementById("buildingSelectWrapper").style.display = show ? "block" : "none";
  });
  document.getElementById("buildingSelect").addEventListener("change", (e) => {
    const key = e.target.value;

    document.getElementById("goalAmount").value = countCostWithDiscount(islandData, buildingsMeta[key].cost);
    M.updateTextFields();
  });


  document.getElementById("createGoalBtn").addEventListener("click", createDonationGoal);
  document.getElementById("confirmDonateBtn").addEventListener("click", donateToGoal);
});
async function loadIsland() {
  const ref = doc(db, "islands", islandId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    M.toast({html: "Island not found"});
    return;
  }
  islandData = snap.data();
}

async function loadBuildingsMeta() {
  const snapshot = await getDocs(collection(db, "buildings"));
  const select = document.getElementById("buildingSelect");
  snapshot.forEach(docSnap => {
    buildingsMeta[docSnap.id] = docSnap.data();
    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = buildingsMeta[docSnap.id].name || docSnap.id;
    select.appendChild(option);
  });
  M.FormSelect.init(select);
}

async function createDonationGoal() {
  if (!currentUser) {
    M.toast({ html: "Увійдіть, щоб створити збір" });
    return;
  }
  const title = document.getElementById("goalTitle").value.trim();
  const type = document.getElementById("goalType").value;
  const amount = parseInt(document.getElementById("goalAmount").value.trim());
  const description = document.getElementById("goalDescription").value.trim();
  let targetBuildingKey = "";

  if (!title || !amount || amount <= 0) {
    M.toast({ html: "Заповніть усі поля коректно" });
    return;
  }

  if (type === "building") {
    const buildingId = document.getElementById("buildingSelect").value;
    if (!buildingId) {
      M.toast({ html: "Оберіть будівлю" });
      return;
    }
    targetBuildingKey = buildingId;
  }

  const goal = {
    title,
    description,
    type,
    targetBuildingKey,
    target: amount,
    collected: 0,
    createdBy: currentUser || "Анонім",
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, "donationGoals"), goal);
  M.toast({ html: "Збір створено" });
  document.getElementById("goalTitle").value = "";
  document.getElementById("goalDescription").value = "";
  document.getElementById("goalAmount").value = "";
  M.updateTextFields();
  loadDonationGoals();
}

async function loadDonationGoals() {
  const list = document.getElementById("goalList");
  const snapshot = await getDocs(collection(db, "donationGoals"));
  list.innerHTML = '<li class="collection-header"><h5>Активні збори</h5></li>';

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const progress = Math.min(100, Math.round((data.collected / data.target) * 100));
    const isComplete = data.collected >= data.target;

    const li = document.createElement("li");
    li.className = "collection-item";
    li.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center">
        <span><strong>${data.title}</strong><br/><small>${data.description}</small></span>
        <div>
          ${isComplete
          ? '<span class="new badge green" data-badge-caption="ЗІБРАНО"></span>'
          : `<button class="btn-small blue make-donation" ${isComplete ? 'disabled' : ''}  data-id="${docSnap.id}" data-title="${data.title}" data-desc="${data.description}" data-target="${data.target}" data-collected="${data.collected}">Донат</button>`}
          <button class="btn-small grey show-donations" data-id="${docSnap.id}" data-title="${data.title}">
              <i class="material-icons">list</i>
          </button>
        </div>
      </div>
      <div class="progress" style="margin-top:0.5em"><div class="determinate" style="width: ${progress}%"></div></div>
      <small>${data.collected} / ${data.target} золота</small>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll("button.make-donation").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedGoalId = btn.dataset.id;
      selectedGoalData = {
        title: btn.dataset.title,
        description: btn.dataset.desc,
        target: parseInt(btn.dataset.target),
        collected: parseInt(btn.dataset.collected)
      };

      document.getElementById("donateGoalTitle").textContent = selectedGoalData.title;
      document.getElementById("donateGoalDesc").textContent = selectedGoalData.description;
      document.getElementById("donateGoalTarget").textContent = selectedGoalData.target;
      document.getElementById("donateGoalCollected").textContent = selectedGoalData.collected;

      M.Modal.getInstance(document.getElementById("donateModal")).open();
    });
  });
  list.querySelectorAll("button.show-donations").forEach(btn => {
    btn.addEventListener("click", async () => {
      selectedGoalId = btn.dataset.id;
      selectedGoalData = {
        title: btn.dataset.title,
      };
      const donationList = document.getElementById("donationListContent");
      donationList.innerHTML = '<li class="collection-item">Завантаження...</li>';
      document.getElementById("donationListTitle").textContent = `Пожертви: ${selectedGoalData.title}`;

      M.Modal.getInstance(document.getElementById("donationListModal")).open();

      const q = query(collection(db, "donations"), where("goalId", "==", selectedGoalId));
      const snapshot = await getDocs(q);

      const summary = {};

      snapshot.forEach(doc => {
        const d = doc.data();
        const name = d.character || "Анонім";
        summary[name] = (summary[name] || 0) + d.amount;
      });

      const sorted = Object.entries(summary).sort((a, b) => b[1] - a[1]);

      donationList.innerHTML = sorted.length
          ? sorted.map(([name, amount]) => `<li class="collection-item"><strong>${name}</strong>: ${amount} золота</li>`).join("")
          : '<li class="collection-item">Пожертв ще немає</li>';
    });
  });
}

async function donateToGoal() {
  if (!currentUser) {
    M.toast({ html: "Увійдіть, щоб зробити пожертву" });
    return;
  }
  const name = isAdmin
      ? document.getElementById("donateCharacter").value.trim()
      : currentUser;
  const amount = parseInt(document.getElementById("donateAmount").value.trim());

  if (!name || !amount || amount <= 0 || !selectedGoalId) {
    M.toast({ html: "Невірні дані для пожертви" });
    return;
  }

  const donation = {
    goalId: selectedGoalId,
    character: name,
    amount: amount,
    donatedAt: serverTimestamp()
  };

  await addDoc(collection(db, "donations"), donation);
  await updateDoc(doc(db, "donationGoals", selectedGoalId), {
    collected: increment(amount)
  });

  await addDoc(collection(db, "logs"), {
    user: name,
    action: `Пожертвував ${amount} золота на '${selectedGoalData.title}'`,
    timestamp: serverTimestamp()
  });

  M.toast({ html: "Дякуємо за пожертву!" });
  M.Modal.getInstance(document.getElementById("donateModal")).close();
  loadDonationGoals();
}
