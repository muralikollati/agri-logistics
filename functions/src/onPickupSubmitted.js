const functions = require("firebase-functions");
const { sendPush } = require("./helpers");

// Fires when the Driver submits box count + shop-wise allocation.
// Generates the 6-digit PIN server-side (never client-side, so it can't be
// predicted or tampered with) and fans out notifications:
//   - Farmer & Transport Owner: full detail
//   - Each Shop Owner: only their own allocation (never the full breakdown)
exports.onPickupSubmitted = functions.firestore
  .document("shipments/{shipmentId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "picked_up" && after.status === "picked_up") {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      await change.after.ref.update({
        pin,
        pinAttempts: 0,
        pinLockedUntil: null,
        pinVerifiedBy: null,
      });

      const fullDetail = after.shopAllocations
        .map((a) => `${a.boxCount} boxes to ${a.shopId}`)
        .join(", ");

      const farmers = after.farmers || [];
      for (const f of farmers) {
        await sendPush(f.uid, "Pickup complete", `${after.boxCount} boxes: ${fullDetail}`);
      }
      if (after.farmerId && farmers.length === 0) {
        await sendPush(after.farmerId, "Pickup complete", `${after.boxCount} boxes: ${fullDetail}`);
      }
      await sendPush(after.transportOwnerId, "Pickup complete", `${after.boxCount} boxes: ${fullDetail}`);

      for (const alloc of after.shopAllocations) {
        await sendPush(alloc.shopOwnerId, "Incoming delivery", `${alloc.boxCount} boxes expected for your shop`);
      }
    }
  });
