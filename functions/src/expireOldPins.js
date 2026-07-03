const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { db } = require("./helpers");

// Runs hourly. Shipments picked up more than 24h ago and still in
// "picked_up" status (never made it to market/unloading) have their PIN
// nulled out and status marked expired — produce is perishable, so a
// shipment that's been sitting for a day is stale by definition.
exports.expireOldPins = functions.pubsub.schedule("every 60 minutes").onRun(async () => {
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  const stale = await db
    .collection("shipments")
    .where("pickedUpAt", "<", cutoff)
    .where("status", "==", "picked_up")
    .get();

  if (stale.empty) return null;

  const batch = db.batch();
  stale.forEach((doc) => batch.update(doc.ref, { pin: null, status: "expired" }));
  await batch.commit();

  console.log(`Expired ${stale.size} stale shipment PIN(s)`);
  return null;
});
