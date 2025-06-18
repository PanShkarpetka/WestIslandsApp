import { db } from '../firebase.js';
import {
    collection,
    doc,
    onSnapshot,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { currentUser, isAdmin } from '../auth.js';
import {logAction} from "../logs/logs.js";

const shipsRef = collection(db, "ships");

export let allShips = [];

export function loadShips(renderShipList) {
    onSnapshot(collection(db, "ships"), snapshot => {
        allShips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderShipList(allShips);
    });
}

export async function createShip(shipData) {
    if (!isAdmin) return alert("Only admins can create ships.");

    await addDoc(shipsRef, shipData);
    await logAction(`Admin created ship: ${shipData.name}`);
}

export async function deleteShip(selectedShipId) {
    if (!isAdmin) return alert("Only admins can delete ships.");
    const shipRef = doc(db, 'ships', selectedShipId);
    await deleteDoc(shipRef);
    await logAction(`Admin deleted ship: ${selectedShipId}`);
}

export async function saveShipChanges(selectedShipId) {
    if (!selectedShipId || !currentUser) return;
    const shipRef = doc(db, "ships", selectedShipId);
    const updatedFields = {
        name: document.getElementById("editName").value,
        currentHP: parseInt(document.getElementById("editHP").value) || 0,
        ac: parseInt(document.getElementById("editAC").value) || 0,
        hullDiceUsed: parseInt(document.getElementById("editHullDiceUsed").value) || 0,
        crewCurrent: parseInt(document.getElementById("editCrewCurrent").value) || 0,
        passengerCurrent: parseInt(document.getElementById("editPassengerCurrent").value) || 0,
        tonnageCurrent: parseInt(document.getElementById("editTonnageCurrent").value) || 0,
        weaponSlotsUsed: parseInt(document.getElementById("editWeaponSlotsUsed").value) || 0
    };
    if (isAdmin) {
        updatedFields.type = document.getElementById("editType").value || '';
        updatedFields.description = document.getElementById("editDescription").value || '';
        updatedFields.maxHP = parseInt(document.getElementById("editMaxHP").value) || 0;
        updatedFields.hullDices = parseInt(document.getElementById("editHullDices").value) || 0;
        updatedFields.crewMin = parseInt(document.getElementById("editCrewMin").value) || 0;
        updatedFields.crewMax = parseInt(document.getElementById("editCrewMax").value) || 0;
        updatedFields.passengerMax = parseInt(document.getElementById("editPassengerMax").value) || 0;
        updatedFields.tonnageMax = parseInt(document.getElementById("editTonnageMax").value) || 0;
        updatedFields.damageThreshold = parseInt(document.getElementById("editDamageThreshold").value) || 0;
        updatedFields.weaponSlotsMax = parseInt(document.getElementById("editWeaponSlotsMax").value) || 0;
        updatedFields.initiative = parseInt(document.getElementById("editInitiative").value) || 0;
        updatedFields.sailStations = parseInt(document.getElementById("editSailStations").value) || 0;
        updatedFields.speedUnit = parseInt(document.getElementById("editSpeedUnit").value) || 0;
        updatedFields.speedMax = parseInt(document.getElementById("editSpeedMax").value) || 0;
        updatedFields.size = document.getElementById("editSize").value || '';
    }
    const ship = (await getDoc(shipRef)).data();
    const fieldsChanged = Object.entries(updatedFields)
        .filter(([key, val]) => ship[key] !== val)
        .map(([key, val]) => `${key} = ${val}`)
        .join(', ');

    await updateDoc(shipRef, updatedFields);
    M.toast({ html: "Ship updated." });
    await logAction(`${currentUser} updated ship ${ship.name || ship.id}: ${fieldsChanged}`);
}

export async function toggleShipVisibility(selectedShipId) {
    if (!selectedShipId || !currentUser) return;
    const shipRef = doc(db, "ships", selectedShipId);
    const ship = (await getDoc(shipRef)).data();
    const updatedVisibility = !ship.visibility;
    await updateDoc(shipRef, { visibility: updatedVisibility });
    M.toast({ html: `Ship ${!updatedVisibility ? "hidden" : "visible"}` });
    await logAction(`${currentUser} toggled ship ${ship.name || ship.id} visibility`);
}
