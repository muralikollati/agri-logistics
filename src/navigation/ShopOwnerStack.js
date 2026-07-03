import React from "react";
import { useColorScheme } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InboundForecastScreen from "../screens/shopOwner/InboundForecastScreen";
import DiscrepancyScreen from "../screens/shopOwner/DiscrepancyScreen";
import SaleLoggingScreen from "../screens/shopOwner/SaleLoggingScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";
import HeaderProfileButton from "../components/HeaderProfileButton";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator();

export default function ShopOwnerStack() {
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
        name="InboundForecast"
        component={InboundForecastScreen}
        options={() => ({
          title: "Inbound",
          headerRight: () => <HeaderProfileButton />,
        })}
      />
      <Stack.Screen name="Discrepancy" component={DiscrepancyScreen} options={{ title: "Check delivery" }} />
      <Stack.Screen name="SaleLogging" component={SaleLoggingScreen} options={{ title: "Log sale" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
    </Stack.Navigator>
  );
}
