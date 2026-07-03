import messaging from "@react-native-firebase/messaging";
import { updateFcmToken } from "./users";

export async function registerForPushNotifications(uid) {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) return;

  const token = await messaging().getToken();
  await updateFcmToken(uid, token);

  messaging().onTokenRefresh(async (newToken) => {
    await updateFcmToken(uid, newToken);
  });
}

export function onForegroundNotification(callback) {
  return messaging().onMessage(callback);
}
