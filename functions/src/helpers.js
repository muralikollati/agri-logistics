const admin = require("firebase-admin");
const db = admin.firestore();

async function getFcmToken(uid) {
  if (!uid) return null;
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data().fcmToken : null;
}

async function sendPush(uid, title, body) {
  const token = await getFcmToken(uid);
  if (!token) return; // user offline or hasn't registered a token yet
  try {
    await admin.messaging().send({ token, notification: { title, body } });
  } catch (e) {
    console.error(`Failed to send push to ${uid}:`, e.message);
  }
}

module.exports = { db, getFcmToken, sendPush };
