import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

const verifyPinFn = httpsCallable(functions, "verifyPin");

// Called from the Sangam app. The actual PIN comparison happens server-side
// in Cloud Functions (functions/src/verifyPin.js) — the correct value is
// never sent to this client, only a success/fail + attempts-remaining result.
export async function verifyPin(shipmentId, enteredPin) {
  const result = await verifyPinFn({ shipmentId, enteredPin });
  return result.data; // { success: boolean, attemptsRemaining?: number }
}

const checkVehicleArrivalFn = httpsCallable(functions, "checkVehicleArrival");

export async function checkVehicleArrival(vehicleNumber) {
  const result = await checkVehicleArrivalFn({ vehicleNumber });
  return result.data; // { found: boolean, shipmentId?: string }
}

const completeUnloadingFn = httpsCallable(functions, "completeUnloading");

export async function completeUnloading(shipmentId) {
  const result = await completeUnloadingFn({ shipmentId });
  return result.data; // { success: boolean }
}
