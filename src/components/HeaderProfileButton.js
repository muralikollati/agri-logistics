import React from "react";
import { TouchableOpacity, Text, StyleSheet, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../store/useAuthStore";
import { colors } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";

export default function HeaderProfileButton() {
  const navigation = useNavigation();
  const { name } = useAuthStore();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];

  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .map((n) => n.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("Profile")}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          backgroundColor: "rgba(255, 255, 255, 0.18)",
          borderColor: "rgba(255, 255, 255, 0.4)",
        },
      ]}
    >
      {initials ? (
        <Text style={[styles.initialsText, { color: "#ffffff" }]}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={16} color="#ffffff" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  initialsText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});
