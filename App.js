import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import "./src/i18n"; // initializes i18next before any screen renders
import RootNavigator from "./src/navigation/RootNavigator";
import { useAuthStore } from "./src/store/useAuthStore";
import { registerForPushNotifications } from "./src/services/notifications";

export default function App() {
  const uid = useAuthStore((s) => s.uid);

  useEffect(() => {
    if (uid) registerForPushNotifications(uid);
  }, [uid]);

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}
