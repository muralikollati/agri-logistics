import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, useColorScheme } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebase/config";
import { fetchUserProfile } from "../services/users";
import { useAuthStore } from "../store/useAuthStore";
import GetStartedScreen from "../screens/auth/GetStartedScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import FarmerStack from "./FarmerStack";
import TransportOwnerStack from "./TransportOwnerStack";
import DriverStack from "./DriverStack";
import SangamStack from "./SangamStack";
import ShopOwnerStack from "./ShopOwnerStack";
import i18n from "../i18n";
import { colors } from "../theme/colors";

const AuthStack = createNativeStackNavigator();

function UnauthenticatedStack() {
  const hasSelectedLanguage = useAuthStore((s) => s.hasSelectedLanguage);
  return (
    <AuthStack.Navigator
      initialRouteName={hasSelectedLanguage ? "Login" : "GetStarted"}
      screenOptions={{ headerShown: false }}
    >
      <AuthStack.Screen name="GetStarted" component={GetStartedScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const [initializing, setInitializing] = useState(true);
  const uid = useAuthStore((s) => s.uid);
  const role = useAuthStore((s) => s.role);
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];

  useEffect(() => {
    let unsubAuth;
    const runStartupChecks = async () => {
      // Check if language was selected previously
      try {
        const langSelected = await AsyncStorage.getItem("hasSelectedLanguage");
        if (langSelected === "true") {
          useAuthStore.getState().setHasSelectedLanguage(true);
        }
      } catch (e) {
        console.error(e);
      }

      // Check auth state
      unsubAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const profile = await fetchUserProfile(user.uid);
            if (profile) {
              useAuthStore.getState().setUser(profile);
              i18n.changeLanguage(profile.language || "te");
              
              // If they have a profile, they definitely selected a language
              await AsyncStorage.setItem("hasSelectedLanguage", "true");
              useAuthStore.getState().setHasSelectedLanguage(true);
            } else {
              useAuthStore.getState().clearUser();
            }
          } catch (e) {
            console.error("Error loading user profile", e);
            useAuthStore.getState().clearUser();
          }
        } else {
          useAuthStore.getState().clearUser();
        }
        setInitializing(false);
      });
    };

    runStartupChecks();

    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.primaryDark }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!uid) {
    return (
      <NavigationContainer>
        <UnauthenticatedStack />
      </NavigationContainer>
    );
  }

  const StackByRole = {
    farmer: FarmerStack,
    transport_owner: TransportOwnerStack,
    driver: DriverStack,
    sangam: SangamStack,
    shop_owner: ShopOwnerStack,
  };

  const Stack = StackByRole[role];

  return (
    <NavigationContainer>
      {Stack ? <Stack /> : null}
    </NavigationContainer>
  );
}
