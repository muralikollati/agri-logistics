const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db, sendPush } = require("./helpers");

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// This is the security-critical function: the correct PIN is compared here,
// server-side, and NEVER sent back to the Sangam client — only a
// success/fail boolean and an attempts-remaining count. This is what makes
// the PIN mechanism actually enforceable rather than just a UI convention.
exports.verifyPin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const { shipmentId, enteredPin } = data;
  const shipmentRef = db.collection("shipments").doc(shipmentId);
  const shipmentSnap = await shipmentRef.get();

  if (!shipmentSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Shipment not found");
  }
  const shipment = shipmentSnap.data();

  if (shipment.pinLockedUntil && shipment.pinLockedUntil.toMillis() > Date.now()) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Too many attempts. Try again after the lockout period."
    );
  }

  if (shipment.pin !== enteredPin) {
    const attempts = (shipment.pinAttempts || 0) + 1;
    const update = { pinAttempts: attempts };

    if (attempts >= MAX_ATTEMPTS) {
      update.pinLockedUntil = admin.firestore.Timestamp.fromMillis(Date.now() + LOCKOUT_MS);
      await sendPush(
        shipment.transportOwnerId,
        "PIN attempts exceeded",
        `Shipment ${shipmentId} locked for 15 min after 5 failed attempts`
      );
    }

    await shipmentRef.update(update);
    return { success: false, attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts) };
  }

  await shipmentRef.update({
    pinVerifiedBy: context.auth.uid,
    status: "unloading",
  });

  return { success: true };
});

exports.checkVehicleArrival = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const { vehicleNumber } = data;
  if (!vehicleNumber) {
    throw new functions.https.HttpsError("invalid-argument", "Vehicle number is required");
  }

  const shipmentsRef = db.collection("shipments");
  const q = shipmentsRef
    .where("vehicleNumber", "==", vehicleNumber.trim().toUpperCase())
    .where("status", "==", "picked_up")
    .limit(1);

  const snap = await q.get();
  if (snap.empty) {
    return { found: false };
  }

  return { found: true, shipmentId: snap.docs[0].id };
});

exports.completeUnloading = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const { shipmentId } = data;
  if (!shipmentId) {
    throw new functions.https.HttpsError("invalid-argument", "Shipment ID is required");
  }

  const shipmentRef = db.collection("shipments").doc(shipmentId);
  const docSnap = await shipmentRef.get();
  if (!docSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Shipment not found");
  }

  const shipmentData = docSnap.data();

  // Enforce Sangam authorization
  if (shipmentData.pinVerifiedBy !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Unauthorized. PIN must be verified first.");
  }

  await shipmentRef.update({
    status: "unloaded",
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Fan out notifications using helper
  const { sendPush } = require("./helpers");
  const farmers = shipmentData.farmers || [];
  const detailsMsg = `Vehicle ${shipmentData.vehicleNumber || ''} has finished unloading.`;
  
  for (const f of farmers) {
    await sendPush(f.uid, "Delivery Completed", detailsMsg);
  }
  await sendPush(shipmentData.transportOwnerId, "Delivery Completed", detailsMsg);
  if (shipmentData.driver?.uid) {
    await sendPush(shipmentData.driver.uid, "Delivery Completed", detailsMsg);
  }

  return { success: true };
});
