import React from "react";
import { useColorScheme } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SangamDashboardScreen from "../screens/sangam/SangamDashboardScreen";
import TruckArrivalScreen from "../screens/sangam/TruckArrivalScreen";
import PinEntryScreen from "../screens/sangam/PinEntryScreen";
import UnloadEntryScreen from "../screens/sangam/UnloadEntryScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";
import HeaderProfileButton from "../components/HeaderProfileButton";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator();

export default function SangamStack() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: true,
        headerStyle: {
          backgroundColor: theme.primary,
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="SangamDashboard"
        component={SangamDashboardScreen}
        options={() => ({
          title: "Sangam Supervisor",
          headerRight: () => <HeaderProfileButton />,
        })}
      />
      <Stack.Screen name="TruckArrival" component={TruckArrivalScreen} options={{ title: "Verify Truck" }} />
      <Stack.Screen name="PinEntry" component={PinEntryScreen} options={{ title: "Verify PIN" }} />
      <Stack.Screen name="UnloadEntry" component={UnloadEntryScreen} options={{ title: "Log Unload" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
    </Stack.Navigator>
  );
}
