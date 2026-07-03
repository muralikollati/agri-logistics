const functions = require("firebase-functions");
const { sendPush } = require("./helpers");

// Fires the moment a Transport Owner assigns a driver to a request.
// Both Farmer and Driver get an informational push — no confirmation
// required from either, per the confirmed architecture.
exports.onDriverAssigned = functions.firestore
  .document("shipments/{shipmentId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "assigned" && after.status === "assigned") {
      const farmers = after.farmers || [];
      for (const f of farmers) {
        await sendPush(f.uid, "Driver assigned", "A driver is on the way to collect your produce.");
      }
      if (after.farmerId && farmers.length === 0) {
        await sendPush(after.farmerId, "Driver assigned", "A driver is on the way to collect your produce.");
      }
      
      const driverUid = (after.driver && after.driver.uid) || after.driverId;
      if (driverUid) {
        await sendPush(driverUid, "New pickup assigned", "You have a new pickup — check your assigned pickups.");
      }
    }
  });
