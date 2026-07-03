import React from "react";
import { useColorScheme } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RequestPickupScreen from "../screens/farmer/RequestPickupScreen";
import ShipmentStatusScreen from "../screens/farmer/ShipmentStatusScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";
import HeaderProfileButton from "../components/HeaderProfileButton";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator();

export default function FarmerStack() {
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
        name="RequestPickup"
        component={RequestPickupScreen}
        options={() => ({
          title: "Home",
          headerRight: () => <HeaderProfileButton />,
        })}
      />
      <Stack.Screen name="ShipmentStatus" component={ShipmentStatusScreen} options={{ title: "Shipment" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
    </Stack.Navigator>
  );
}
