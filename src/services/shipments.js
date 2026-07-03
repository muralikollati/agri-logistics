import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  or,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

// --- Request Initiation ---
// createdBy indicates which path was used (see architecture doc Section 2):
//   "farmer"          -> Farmer raised it himself, no box detail yet
//   "transport_owner" -> Transport Owner raised it on farmer's behalf
export async function requestPickup({ farmers = [], transportOwnerId, createdBy, driver = null, vehicleNumber = null }) {
  const driverId = driver ? driver.uid : null;
  return addDoc(collection(db, "shipments"), {
    farmers,
    transportOwnerId,
    driver,
    vehicleNumber,
    status: driverId ? "assigned" : "requested",
    boxCount: null,
    shopAllocations: [],
    pin: null,
    pinAttempts: 0,
    pinLockedUntil: null,
    pinVerifiedBy: null,
    requestedAt: serverTimestamp(),
    assignedAt: driverId ? serverTimestamp() : null,
    pickedUpAt: null,
    createdBy,
  });
}

// --- Driver Assignment (Transport Owner action) ---
export async function assignDriver(shipmentId, driver) {
  await updateDoc(doc(db, "shipments", shipmentId), {
    driver,
    status: "assigned",
    assignedAt: serverTimestamp(),
  });
}

// --- Pickup Entry (Driver action) ---
// This is the write that triggers PIN generation server-side
// (see functions/src/onPickupSubmitted.js)
export async function submitPickupEntry(shipmentId, { boxCount, shopAllocations, vehicleNumber }) {
  await updateDoc(doc(db, "shipments", shipmentId), {
    boxCount,
    shopAllocations, // [{ shopId, shopOwnerId, boxCount }, ...]
    shopOwnerIds: shopAllocations.map((a) => a.shopOwnerId),
    vehicleNumber,
    status: "picked_up",
    pickedUpAt: serverTimestamp(),
  });
}

// --- Live subscription to a single shipment ---
export function subscribeToShipment(shipmentId, callback) {
  return onSnapshot(doc(db, "shipments", shipmentId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

// --- Query helpers ---
export function subscribeToFarmerShipments(farmerId, callback) {
  const q = query(collection(db, "shipments"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.farmers && s.farmers.some((f) => f.uid === farmerId));
    list.sort((a, b) => {
      const t1 = a.requestedAt?.seconds || 0;
      const t2 = b.requestedAt?.seconds || 0;
      return t2 - t1;
    });
    callback(list);
  });
}

export function subscribeToDriverAssignments(driverId, callback) {
  const q = query(
    collection(db, "shipments"),
    where("driver.uid", "==", driverId),
    where("status", "in", ["assigned", "picked_up", "unloading"])
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToAllDriverShipments(driverId, callback) {
  const q = query(
    collection(db, "shipments"),
    where("driver.uid", "==", driverId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const t1 = a.requestedAt?.seconds || 0;
      const t2 = b.requestedAt?.seconds || 0;
      return t2 - t1;
    });
    callback(list);
  });
}

export function subscribeToUnassignedRequests(transportOwnerId, callback) {
  const q = query(
    collection(db, "shipments"),
    where("transportOwnerId", "==", transportOwnerId),
    where("status", "==", "requested")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToOwnerShipments(transportOwnerId, callback) {
  const q = query(
    collection(db, "shipments"),
    where("transportOwnerId", "==", transportOwnerId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const t1 = a.requestedAt?.seconds || 0;
      const t2 = b.requestedAt?.seconds || 0;
      return t2 - t1;
    });
    callback(list);
  });
}

export async function updateShipment(shipmentId, data) {
  return updateDoc(doc(db, "shipments", shipmentId), data);
}

export async function deleteShipment(shipmentId) {
  const { deleteDoc } = require("firebase/firestore");
  return deleteDoc(doc(db, "shipments", shipmentId));
}
