import React from "react";
import { useColorScheme } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AssignedPickupsScreen from "../screens/driver/AssignedPickupsScreen";
import PickupEntryScreen from "../screens/driver/PickupEntryScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";
import HeaderProfileButton from "../components/HeaderProfileButton";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator();

export default function DriverStack() {
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
        name="AssignedPickups"
        component={AssignedPickupsScreen}
        options={() => ({
          title: "Your pickups",
          headerRight: () => <HeaderProfileButton />,
        })}
      />
      <Stack.Screen name="PickupEntry" component={PickupEntryScreen} options={{ title: "Pickup entry" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
    </Stack.Navigator>
  );
}
