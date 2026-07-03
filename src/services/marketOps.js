import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

// --- Sangam: log a worker moving boxes to a shop ---
export async function logUnloadEntry(shipmentId, { workerId, shopId, boxCount }) {
  return addDoc(collection(db, "shipments", shipmentId, "unloadEntries"), {
    workerId,
    shopId,
    boxCount,
    loggedAt: serverTimestamp(),
  });
}

export function subscribeToUnloadEntries(shipmentId, callback) {
  return onSnapshot(
    collection(db, "shipments", shipmentId, "unloadEntries"),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

// --- Shop Owner: raise a discrepancy ticket ---
export async function raiseDiscrepancy(shipmentId, { raisedBy, expectedCount, actualCount }) {
  return addDoc(collection(db, "shipments", shipmentId, "discrepancies"), {
    raisedBy,
    expectedCount,
    actualCount,
    reasonCode: null,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

// --- Sangam/Transport Owner: respond to a discrepancy ---
export async function resolveDiscrepancy(shipmentId, ticketId, reasonCode) {
  await updateDoc(doc(db, "shipments", shipmentId, "discrepancies", ticketId), {
    reasonCode,
    status: "resolved",
  });
}

// --- Shop Owner: log a sale (partial or final) ---
export async function logSale(shipmentId, { shopOwnerId, boxesSold, pricePerBox, isFinal }) {
  return addDoc(collection(db, "shipments", shipmentId, "sales"), {
    shopOwnerId,
    boxesSold,
    pricePerBox,
    totalAmount: boxesSold * pricePerBox,
    isFinal,
    loggedAt: serverTimestamp(),
  });
}

export function subscribeToSales(shipmentId, callback) {
  return onSnapshot(
    collection(db, "shipments", shipmentId, "sales"),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export function subscribeToSangamShipments(callback) {
  const q = query(
    collection(db, "shipments"),
    where("status", "in", ["picked_up", "unloading", "completed"])
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
