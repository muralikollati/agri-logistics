import React from "react";
import { useColorScheme } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RaiseRequestScreen from "../screens/transportOwner/RaiseRequestScreen";
import AssignDriverScreen from "../screens/transportOwner/AssignDriverScreen";
import FleetOverviewScreen from "../screens/transportOwner/FleetOverviewScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";
import { colors } from "../theme/colors";
import HeaderProfileButton from "../components/HeaderProfileButton";

const Stack = createNativeStackNavigator();

export default function TransportOwnerStack() {
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
        name="FleetOverview"
        component={FleetOverviewScreen}
        options={() => ({
          title: "Requests",
          headerRight: () => <HeaderProfileButton />,
        })}
      />
      <Stack.Screen name="RaiseRequest" component={RaiseRequestScreen} options={{ title: "New request" }} />
      <Stack.Screen name="AssignDriver" component={AssignDriverScreen} options={{ title: "Assign driver" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
    </Stack.Navigator>
  );
}
