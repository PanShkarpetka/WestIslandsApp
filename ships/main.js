import { currentUser, isAdmin, initAuthUI } from '../auth.js';
import {loadShips, saveShipChanges, createShip, deleteShip, toggleShipVisibility, allShips} from './ships.js';

let selectedShipId = null;

function showAdminBtns() {
    const toggleShipBtn = document.getElementById("toggleShipBtn");
    const deleteShipBtn = document.getElementById("deleteShipBtn");

    toggleShipBtn.style.display = "inline-block";
    deleteShipBtn.style.display = "inline-block";
}
function hideAdminBtns() {
    const toggleShipBtn = document.getElementById("toggleShipBtn");
    const deleteShipBtn = document.getElementById("deleteShipBtn");

    toggleShipBtn.style.display = "none";
    deleteShipBtn.style.display = "none";
}

document.addEventListener('DOMContentLoaded', () => {
    M.Modal.init(document.querySelectorAll('.modal'));
    M.Collapsible.init(document.querySelectorAll('.collapsible'));

    initAuthUI(() => {
        renderShipList(allShips);
        clearShipEditor();
        selectedShipId = null;
    });
    loadShips(renderShipList);

    document.getElementById("saveShipBtn").addEventListener("click", () => saveShipChanges(selectedShipId));
    const toggleShipBtn = document.getElementById("toggleShipBtn");
    const deleteShipBtn = document.getElementById("deleteShipBtn");

    if (isAdmin) {
        showAdminBtns();
        toggleShipBtn.addEventListener("click", () => toggleShipVisibility(selectedShipId));
        deleteShipBtn.addEventListener("click", () => async () => {
            clearShipEditor();
            selectedShipId = null;
            await deleteShip(selectedShipId);
        });

    } else {
        hideAdminBtns();
    }
});
function getValue(id) {
    return document.getElementById(id).value;
}

const createShipBtn = document.getElementById("createShipBtn");
if (createShipBtn) {
    document.getElementById("createShipBtn").addEventListener("click", async () => {
        const newShip = {
            name: getValue("newName"),
            type: getValue("newType"),
            description: getValue("newDescription"),
            maxHP: parseInt(getValue("newMaxHP"), 10),
            currentHP: parseInt(getValue("newMaxHP"), 10), // start full
            ac: parseInt(getValue("newAC"), 10),
            hullDices: parseInt(getValue("newHullDice"), 10),
            hullDiceValue: getValue("newHullDiceValue"),
            hullDiceUsed: 0,
            crewMin: parseInt(getValue("newCrewMin"), 10),
            crewMax: parseInt(getValue("newCrewMax"), 10),
            crewCurrent: 0,
            passengerMax: parseInt(getValue("newPassengerMax"), 10),
            passengerCurrent: 0,
            tonnageMax: parseInt(getValue("newTonnageMax"), 10),
            tonnageCurrent: 0,
            damageThreshold: parseInt(getValue("newDamageThreshold"), 10),
            weaponSlotsMax: parseInt(getValue("newWeaponSlots"), 10),
            weaponSlotsUsed: 0,
            initiative: parseInt(getValue("newInitiative"), 10),
            sailStations: parseInt(getValue("newSailStations"), 10),
            speedUnit: getValue("newSpeedUnit"),
            speedMax: parseInt(getValue("newSpeedMax"), 10),
            size: getValue("newSize"),
            imageUrl: document.getElementById("shipImagePath").value || ''
        };
        await createShip(newShip);
    });
} else {
    console.error('createShipBtn is not loaded')
}

function renderShipList(ships) {
    const shipList = document.getElementById("shipList");
    shipList.innerHTML = ships
        .sort((a, b) => {
            if (a.visibility !== b.visibility) {
                return (b.visibility === true ? 1 : 0) - (a.visibility === true ? 1 : 0);
            }
            return b.maxHP - a.maxHP;
        })


//         .map((ship, index) => `
//     <div ${!isAdmin && !ship.visibility ? 'hidden' : '' }>
//       <div class="collapsible-header collapsible ship-cart" data-index="${index}">
//         <div style="display: flex; align-items: center; gap: 3rem;">
//             <img 
//                 id="shipImage"
//                 src=${ship.imageUrl}
//                 alt="Ship Image"
//                 style="width: 150px; object-fit: cover; border-radius: 8px;"
//             />
//             <div>
//                 <div>
//                     <strong>${ship.name}</strong>
//                     ${!ship.visibility ? '<span style="margin-left: 5px;" class="new badge red" data-badge-caption="Hidden"></span>' : ''} 
//                 </div>
//                 <div class="grey-text text-darken-1">Ship Type: ${ship.type}</div>
//                 <div class="grey-text text-darken-1">HP: ${ship.currentHP}/${ship.maxHP}</div>
//                 <div class="grey-text text-darken-1">AC: ${ship.ac}, Crew: ${ship.crewCurrent}/${ship.crewMax}</div>
//                 <div class="grey-text text-darken-1">Passengers: ${ship.passengerCurrent}/${ship.passengerMax}</div>
//             </div>
//         </div>
//       </div>
//       <div class="collapsible-body">
//         <p>${ship.description || 'Опис відсутній'}</p>
//       </div>
//     </div>
//   `).join("");


//   <div class="ship-card collapsible-header collapsible" style="${!isAdmin && !ship.visibility ? 'display: none;' : ''}" data-index="${index}">

.map((ship, index) => `
  <div class="ship-card collapsible-header collapsible" style="${!isAdmin && !ship.visibility ? 'display: none;' : ''}" data-index="${index}">
    <img class="ship-image" src="${ship.imageUrl}" alt="Ship Image" />
    <div class="ship-info">
      <div class="ship-header">
        <strong>${ship.name}</strong>
        ${!ship.visibility ? '<span class="new badge red" data-badge-caption="Hidden"></span>' : ''}
      </div>
      <div class="ship-stats">
        <span><i class="material-icons tiny">shield</i> ${ship.ac}</span>
        <span><i class="material-icons tiny">rowing</i> ${ship.crewMin}/${ship.crewMax}</span>
        <span><i class="material-icons tiny">man</i> ${ship.passengerMax}</span>
      </div>
      <div class="ship-hp">
        <div class="hp-bar">
          <div class="hp-fill" style="width: ${Math.floor((ship.currentHP / ship.maxHP) * 100)}%"></div>
        </div>
        <small>${ship.currentHP}/${ship.maxHP} HP</small>
      </div>

      <div class="hull-dice">
        ${
            ship.hullDices > 15
            ? `<span class="hull-text">${ship.hullDices - ship.hullDiceUsed}/${ship.hullDices}</span>`
            : Array.from({ length: ship.hullDices }).map((_, i) => `<i class="material-icons ${i < ship.hullDiceUsed ? 'grey-text' : ''}">casino</i>`).join('')
        }
      </div>

      <div class="ship-meta-row">
        <span class="ship-meta-label">Тип:</span>
        <span class="ship-meta-value">${ship.type || '—'}</span>
        </div>
      <div class="ship-meta-row">
        <span class="ship-meta-label">Швидкість:</span>
        <span class="ship-meta-value">${ship.speedMax / 10 || '—'} M/h</span>
      </div>
      <div class="ship-meta-row">
        <span class="ship-meta-label">Розмір:</span>
        <span class="ship-meta-value">${ship.size || '—'}</span>
      </div>

      <p class="ship-description">${ship.description || 'Опис відсутній'}</p>
    </div>
  </div>
`).join("");


  
    M.Collapsible.init(document.querySelectorAll('.collapsible'));

    shipList.querySelectorAll(".collapsible-header").forEach(header => {
        header.addEventListener("click", () => {
            const index = header.dataset.index;
            const ship = ships[index];
            if (selectedShipId === ship.id) {
                clearShipEditor();
                selectedShipId = null;
            } else {
                selectedShipId = ship.id;
                showShipEditor(ship);
            }
        });
    });
}

function loadShipProperties(ship) {
    document.getElementById("editName").value = ship.name || "";
    document.getElementById("editHP").value = ship.currentHP || 0;
    document.getElementById("editAC").value = ship.ac || 0;
    document.getElementById("editHullDiceUsed").value = ship.hullDiceUsed || 0;
    document.getElementById("editCrewCurrent").value = ship.crewCurrent || 0;
    document.getElementById("editPassengerCurrent").value = ship.passengerCurrent || 0;
    document.getElementById("editTonnageCurrent").value = ship.tonnageCurrent || 0;
    document.getElementById("editWeaponSlotsUsed").value = ship.weaponSlotsUsed || 0;
}
function loadShipParameters(ship) {
    document.getElementById("editDescription").value = ship.description || '';
    document.getElementById("editType").value = ship.type || '';
    document.getElementById("editMaxHP").value = ship.maxHP || 0;
    document.getElementById("editHullDices").value = ship.hullDices || 0;
    document.getElementById("editCrewMin").value = ship.crewMin || 0;
    document.getElementById("editCrewMax").value = ship.crewMax || 0;
    document.getElementById("editPassengerMax").value = ship.passengerMax || 0;
    document.getElementById("editTonnageMax").value = ship.tonnageMax || 0;
    document.getElementById("editDamageThreshold").value = ship.damageThreshold || 0;
    document.getElementById("editWeaponSlotsMax").value = ship.weaponSlotsMax || 0;
    document.getElementById("editInitiative").value = ship.initiative || 0;
    document.getElementById("editSailStations").value = ship.sailStations || 0;
    document.getElementById("editSpeedUnit").value = ship.speedUnit || 0;
    document.getElementById("editSpeedMax").value = ship.speedMax || 0;
    document.getElementById("editSize").value = ship.size || '';
}
function switchShipParameters(hidden) {
    const inputs = document.getElementsByClassName('admin-only') || [];

    for (let i of inputs) {
        i.style.display = hidden ? 'none' : 'block';
    }
}

function showShipEditor(ship) {
    loadShipProperties(ship);

    if (isAdmin) {
        loadShipParameters(ship);
        switchShipParameters();
        document.getElementById("shipInfoList").style.display = "none";
        showAdminBtns();
    } else {
        hideAdminBtns();
        switchShipParameters(true);
        const infoList = document.getElementById("shipInfoList");
        const infoRows = [
            ["Type", ship.type],
            ["Max HP", ship.maxHP],
            ["Hull Dice (Max)", ship.hullDices],
            ["Min Crew", ship.crewMin],
            ["Max Crew", ship.crewMax],
            ["Max Passengers", ship.passengerMax],
            ["Max Tonnage", ship.tonnageMax],
            ["Damage Threshold", ship.damageThreshold],
            ["Max Weapon Slots", ship.weaponSlotsMax],
            ["Initiative", ship.initiative],
            ["Sail Stations", ship.sailStations],
            ["Speed Unit", ship.speedUnit],
            ["Max Speed", ship.speedMax],
            ["Size", ship.size]
        ];
        infoList.innerHTML = '<li class="collection-header"><h6>Ship Details</h6></li>' +
            infoRows.map(([label, value]) => `
          <li class="collection-item" style="display: flex; justify-content: space-between;">
               <span class="grey-text text-darken-1">${label}</span>
               <span><strong>${value}</strong></span>
          </li>
        `).join("");
        infoList.style.display = 'block'
    }
    document.getElementById("shipEditor").style.display = "block";
    M.updateTextFields();

    document.querySelectorAll("#shipEditor input").forEach(input => {
        input.disabled = currentUser === null;
    });
    document.getElementById("saveShipBtn").style.display = currentUser === null ? "none" : "inline-block";
}

export function clearShipEditor() {
    document.getElementById("shipEditor").style.display = "none";
}

document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById("toggleThemeBtn");
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
    }

    themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-theme");
        const newTheme = document.body.classList.contains("dark-theme") ? "dark" : "light";
        localStorage.setItem("theme", newTheme);
    });
});
