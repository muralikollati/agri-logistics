const functions = require("firebase-functions");
const { db, sendPush } = require("./helpers");

// Fires when a Shop Owner logs a sale under shipments/{id}/sales.
// Only fires the Farmer/Transport Owner/Driver notification when isFinal
// is true — partial sales during the day don't spam notifications, only
// the day's closing entry does (per the "Payment Settlement Timing"
// decision in the architecture doc).
exports.onSaleLogged = functions.firestore
  .document("shipments/{shipmentId}/sales/{saleId}")
  .onCreate(async (snap, context) => {
    const sale = snap.data();
    if (!sale.isFinal) return null;

    const shipmentSnap = await db.collection("shipments").doc(context.params.shipmentId).get();
    if (!shipmentSnap.exists) return null;
    const shipment = shipmentSnap.data();

    const message = `${sale.boxesSold} boxes sold @ ₹${sale.pricePerBox} = ₹${sale.totalAmount}`;

    const farmers = shipment.farmers || [];
    for (const f of farmers) {
      await sendPush(f.uid, "Sale closed", message);
    }
    if (shipment.farmerId && farmers.length === 0) {
      await sendPush(shipment.farmerId, "Sale closed", message);
    }

    const driverUid = (shipment.driver && shipment.driver.uid) || shipment.driverId;
    if (driverUid) {
      await sendPush(driverUid, "Sale closed", message);
    }
    
    await sendPush(shipment.transportOwnerId, "Sale closed", message);

    return null;
  });
