import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../../store/useAuthStore";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";

export default function GetStartedScreen({ navigation }) {
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || "te");
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  const changeLanguage = (lng) => {
    setSelectedLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem("hasSelectedLanguage", "true");
      useAuthStore.getState().setHasSelectedLanguage(true);
    } catch (e) {
      console.error(e);
    }
    navigation.navigate("Login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        {/* Simple inline geometric graphic to represent truck/agriculture */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>🚚</Text>
        </View>
        <Text style={styles.title}>{i18n.t("getStarted.title")}</Text>
        <Text style={styles.tagline}>{i18n.t("getStarted.tagline")}</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.pickerTitle}>{i18n.t("getStarted.selectLanguage")}</Text>
        
        <View style={styles.langList}>
          <TouchableOpacity
            style={[styles.langBtn, selectedLanguage === "te" && styles.selectedLangBtn]}
            onPress={() => changeLanguage("te")}
          >
            <Text style={[styles.langText, selectedLanguage === "te" && styles.selectedLangText]}>
              తెలుగు (Telugu)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langBtn, selectedLanguage === "en" && styles.selectedLangBtn]}
            onPress={() => changeLanguage("en")}
          >
            <Text style={[styles.langText, selectedLanguage === "en" && styles.selectedLangText]}>
              English
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langBtn, selectedLanguage === "ta" && styles.selectedLangBtn]}
            onPress={() => changeLanguage("ta")}
          >
            <Text style={[styles.langText, selectedLanguage === "ta" && styles.selectedLangText]}>
              தமிழ் (Tamil)
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>{i18n.t("getStarted.continue")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.primaryDark,
    justifyContent: "space-between",
    padding: 24,
  },
  brandContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: theme.primaryLight === "#143325" ? "#bbbbbb" : "#D8F3DC",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
    textAlign: "center",
    marginBottom: 20,
  },
  langList: {
    gap: 12,
    marginBottom: 24,
  },
  langBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.inputBg,
    alignItems: "center",
  },
  selectedLangBtn: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  langText: {
    fontSize: 16,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  selectedLangText: {
    color: theme.primary,
    fontWeight: "bold",
  },
  continueBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  continueText: {
    color: theme.textOnPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
});
