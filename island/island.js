import { db } from '../firebase.js';
import { initAuthUI, currentUser, isAdmin } from '../auth.js';
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import {logAction} from "../logs/logs.js";

let islandId = "island_rock";
let islandData = null;
let editMode = false;
let buildingsMeta = {};
let buildingDonations = {};


document.addEventListener('DOMContentLoaded', async () => {
  M.Modal.init(document.querySelectorAll('.modal'));

  initAuthUI(async () => {
    if (isAdmin) {
      document.getElementById("editToggleBtn").style.display = "inline-block";
    }
    await loadIsland();
  });
  await loadIsland();

  document.getElementById("editToggleBtn").addEventListener("click", toggleEdit);
  document.getElementById("saveBtn").addEventListener("click", saveChanges);

  document.getElementById("buildBtn").addEventListener("click", () => updateBuildingState(true));
  document.getElementById("destroyBtn").addEventListener("click", () => updateBuildingState(false));
});

async function loadIsland() {
  const ref = doc(db, "islands", islandId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    M.toast({ html: "Island not found" });
    return;
  }

  islandData = snap.data();
  renderIsland(islandData);
  await loadBuildings();
  await loadBuildingDonations();
  renderBuildings(islandData.buildings || {});

}

async function loadBuildings() {
  const ref = collection(db, "buildings");
  const snapshot = await getDocs(ref);
  snapshot.forEach(doc => {
    buildingsMeta[doc.id] = doc.data();
  });
  console.log("Buildings loaded:", buildingsMeta);
}

async function loadBuildingDonations() {
  const snapshot = await getDocs(collection(db, "donationGoals"));
  snapshot.forEach(doc => {
    const goal = doc.data();
    if (goal.type === "building" && goal.targetBuildingKey) {
      buildingDonations[goal.targetBuildingKey] = {
        title: goal.title,
        collected: goal.collected,
        target: goal.target,
        targetBuildingKey: goal.targetBuildingKey
      };
    }
  });
}

function renderIsland(data) {
  document.getElementById("islandNameDisplay").textContent = data.name || "Без назви";
  document.getElementById("islandName").value = data.name || "";
  document.getElementById("population").value = data.population || 0;
  document.getElementById("sailors").value = data.sailors || 0;
  document.getElementById("characters").value = data.characters || 0;
  document.getElementById("buildingDiscount").value = data.buildingDiscount || 0;
  document.getElementById("repairDiscount").value = data.repairDiscount || 0;

  M.updateTextFields();
  setInputsEditable(false);
}

function toggleEdit() {
  editMode = !editMode;
  setInputsEditable(editMode);
  document.getElementById("saveBtn").style.display = editMode ? "inline-block" : "none";
}

function setInputsEditable(enable) {
  ["islandName", "population", "sailors", "characters", "buildingDiscount", "repairDiscount"].forEach(id => {
    document.getElementById(id).disabled = !enable;
  });
}

async function saveChanges() {
  if (!islandId || !isAdmin) return;

  const name = document.getElementById("islandName").value.trim();
  const population = parseInt(document.getElementById("population").value) || 0;
  const sailors = parseInt(document.getElementById("sailors").value) || 0;
  const characters = parseInt(document.getElementById("characters").value) || 0;
  const buildingDiscount = parseInt(document.getElementById("buildingDiscount").value) || 0;
  const repairDiscount = parseInt(document.getElementById("repairDiscount").value) || 0;

  await updateDoc(doc(db, "islands", islandId), {
    name, population, sailors, characters, buildingDiscount, repairDiscount
  });

  M.toast({ html: "Острів оновлено" });
  editMode = false;
  setInputsEditable(false);
  document.getElementById("saveBtn").style.display = "none";
  document.getElementById("islandNameDisplay").textContent = name;
  loadIsland()
}

function renderBuildings(buildingStates) {
  Object.keys(buildingsMeta).forEach(key => {
    const el = document.getElementById(`building-${key}`);
    if (!el) return;

    if (buildingStates[key]?.built) {
      el.classList.add("built");
    } else {
      el.classList.remove("built");
    }

    el.addEventListener("click", () => showBuildingModal(key, buildingStates[key]?.built || false));
  });
}

function showBuildingModal(key, built) {
  const data = buildingsMeta[key];
  if (!data) return;

  const countCostWithDiscount = (cost) => cost * (100 - islandData?.buildingDiscount || 0) / 100;

  document.getElementById("building-icon-modal").src = `images/buildings/${key}.png`;
  document.getElementById("buildingName").textContent = data.name;
  document.getElementById("buildingDescription").textContent = data.description;
  document.getElementById("buildingCost").textContent = countCostWithDiscount(data.cost) + " золота";
  document.getElementById("buildingGrowth").textContent = "+" + data.growth + " населення";

  document.getElementById("adminButtons").style.display = isAdmin ? "flex" : "none";

  document.getElementById("buildBtn").dataset.key = key;
  document.getElementById("destroyBtn").dataset.key = key;
  document.getElementById("buildBtn").style.display = built ? "none" : "inline-block";
  document.getElementById("destroyBtn").style.display = built ? "inline-block" : "none";

  const statusEl = document.getElementById("buildingStatus");
  statusEl.className = "badge status-badge";
  const availableByBuildings = (() => {
    if (Array.isArray(data.requirements) && data.requirements.length > 0) {
      return data.requirements.every(reqId => islandData?.buildings?.[reqId]?.built === true);
    }
    return true;
  })();
  const availableByPopulation = data?.requiredPopulation ? islandData?.population >= data?.requiredPopulation : true;

  if (built) {
    statusEl.textContent = "Збудовано";
    statusEl.classList.add("status-built");
  } else if (!availableByBuildings || !availableByPopulation) {
    statusEl.textContent = "Заблоковано";
    statusEl.classList.add("status-blocked");
  } else {
    statusEl.textContent = "Доступно";
    statusEl.classList.add("status-available");
  }
  const donation = buildingDonations[key];
  if (donation) {
    const progress = Math.min(100, Math.round((donation.collected / donation.target) * 100));
    const progressHtml = `
    <p><strong>Збір:</strong> ${donation.collected} / ${donation.target} золота</p>
    <div class="progress"><div class="determinate" style="width:${progress}%"></div></div>
  `;
    document.getElementById("buildingDescription").insertAdjacentHTML("beforeend", progressHtml);
  }

  const modal = M.Modal.getInstance(document.getElementById("buildingModal"));
  modal.open();
}

async function updateBuildingState(build) {
  const buildBtn = document.getElementById("buildBtn");
  const destroyBtn = document.getElementById("destroyBtn");
  const key = (() => {
    if (build) {
      buildBtn.style.display = "none";
      destroyBtn.style.display = "inline-block";
      return buildBtn.dataset.key;
    }

    buildBtn.style.display = "inline-block";
    destroyBtn.style.display = "none";
    return destroyBtn.dataset.key;
  })()

  if (!key || !isAdmin) return;

  const ref = doc(db, "islands", islandId);
  const update = {
    [`buildings.${key}`]: { built: build }
  };
  await updateDoc(ref, update);
  M.toast({ html: build ? "Будівлю збудовано" : "Будівлю знищено" });
  loadIsland();

  await logAction(`Building ${key} was ${ build ? 'built' : 'destroyed'}`);
}

document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById("toggleThemeBtn");
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      const newTheme = document.body.classList.contains("dark-theme") ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
    });
  }
});
