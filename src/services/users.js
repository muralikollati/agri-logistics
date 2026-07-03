import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() };
}

// Used by Transport Owner during onboarding to create Farmer/Driver accounts,
// or by an admin setting roles directly.
export async function createUserProfile(uid, { role, phone, name, language = "te" }) {
  await setDoc(doc(db, "users", uid), {
    role,
    phone,
    name,
    language,
    vehicleNumber: null,
    shopId: null,
    fcmToken: null,
    createdAt: new Date(),
  });
}

export async function updateFcmToken(uid, token) {
  await updateDoc(doc(db, "users", uid), { fcmToken: token });
}

export async function updateLanguage(uid, language) {
  await updateDoc(doc(db, "users", uid), { language });
}

export async function fetchUsersByRole(role) {
  const { collection, query, where, getDocs } = require("firebase/firestore");
  const q = query(collection(db, "users"), where("role", "==", role));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function createManualUser({ role, name, phone, address = "", vehicleNumber = null, shopId = null, transportOwnerId = null }) {
  const { collection, addDoc } = require("firebase/firestore");
  const docRef = await addDoc(collection(db, "users"), {
    role,
    name,
    phone,
    address,
    vehicleNumber,
    shopId,
    transportOwnerId,
    language: "te",
    createdAt: new Date(),
  });
  return { uid: docRef.id, role, name, phone, address, vehicleNumber, shopId, transportOwnerId };
}
