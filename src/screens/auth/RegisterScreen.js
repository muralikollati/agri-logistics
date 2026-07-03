import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, useColorScheme } from "react-native";
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../firebase/config";
import { fetchUserProfile, createUserProfile } from "../../services/users";
import { useAuthStore } from "../../store/useAuthStore";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(null); // Defaults to none (null)
  const [language, setLanguage] = useState(i18n.language || "te"); // Maps Get Started

  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  const setUser = useAuthStore((s) => s.setUser);

  // Update language state and trigger dynamic on-the-fly translation
  const handleLanguageChange = (lng) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const sendOtp = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (phone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }
    if (!role) {
      Alert.alert("Selection Required", "Please select your role before continuing.");
      return;
    }
    setLoading(true);
    try {
      const mockVerifier = {
        type: 'recaptcha',
        verify: () => Promise.resolve('mock-token'),
        reset: () => { },
        _reset: () => { },
      };
      const result = await signInWithPhoneNumber(auth, `+91${phone}`, mockVerifier);
      setConfirmation(result);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const result = await confirmation.confirm(otp);

      // Seed profile document in Firestore
      await createUserProfile(result.user.uid, {
        role,
        phone: `+91${phone}`,
        name,
        language,
      });

      const profile = await fetchUserProfile(result.user.uid);
      setUser(profile);
      i18n.changeLanguage(language);
    } catch (e) {
      Alert.alert("Verification Failed", e.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {!confirmation ? (
          <>
            <Text style={styles.header}>{i18n.t("signUp.title")}</Text>

            <Text style={styles.subLabel}>{i18n.t("signUp.name")}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={i18n.t("signUp.namePlaceholder")}
              placeholderTextColor={theme.placeholder}
            />

            <Text style={styles.subLabel}>{i18n.t("signUp.phone")}</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              placeholder="9xxxxxxxxx"
              placeholderTextColor={theme.placeholder}
            />

            <Text style={styles.subLabel}>{i18n.t("signUp.selectLanguage")}</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, language === "te" && styles.selectedBtn]}
                onPress={() => handleLanguageChange("te")}
              >
                <Text style={[styles.selectorBtnText, language === "te" && styles.selectedBtnText]}>తెలుగు</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, language === "en" && styles.selectedBtn]}
                onPress={() => handleLanguageChange("en")}
              >
                <Text style={[styles.selectorBtnText, language === "en" && styles.selectedBtnText]}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, language === "ta" && styles.selectedBtn]}
                onPress={() => handleLanguageChange("ta")}
              >
                <Text style={[styles.selectorBtnText, language === "ta" && styles.selectedBtnText]}>தமிழ்</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subLabel}>{i18n.t("signUp.selectRole")}</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, role === "farmer" && styles.selectedBtn]}
                onPress={() => setRole("farmer")}
              >
                <Text style={[styles.selectorBtnText, role === "farmer" && styles.selectedBtnText]}>
                  {i18n.t("signUp.role.farmer")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, role === "transport_owner" && styles.selectedBtn]}
                onPress={() => setRole("transport_owner")}
              >
                <Text style={[styles.selectorBtnText, role === "transport_owner" && styles.selectedBtnText]}>
                  {i18n.t("signUp.role.transport_owner")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, role === "driver" && styles.selectedBtn]}
                onPress={() => setRole("driver")}
              >
                <Text style={[styles.selectorBtnText, role === "driver" && styles.selectedBtnText]}>
                  {i18n.t("signUp.role.driver")}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorBtn, role === "sangam" && styles.selectedBtn]}
                onPress={() => setRole("sangam")}
              >
                <Text style={[styles.selectorBtnText, role === "sangam" && styles.selectedBtnText]}>
                  {i18n.t("signUp.role.sangam")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorBtn, role === "shop_owner" && styles.selectedBtn]}
                onPress={() => setRole("shop_owner")}
              >
                <Text style={[styles.selectorBtnText, role === "shop_owner" && styles.selectedBtnText]}>
                  {i18n.t("signUp.role.shop_owner")}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.continueBtn, (loading || phone.length !== 10 || !name.trim() || !role) && styles.disabledBtn]}
              onPress={sendOtp}
              disabled={loading || phone.length !== 10 || !name.trim() || !role}
            >
              <Text style={styles.continueText}>{i18n.t("signUp.continue")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkContainer}>
              <Text style={styles.linkText}>{i18n.t("signUp.alreadyHaveAccount")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.header}>Verify Phone</Text>
            <Text style={[styles.label, { textAlign: "center", marginBottom: 20 }]}>{i18n.t("login.otpTitle")}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              placeholder="xxxxxx"
              placeholderTextColor={theme.placeholder}
            />

            <TouchableOpacity
              style={[styles.continueBtn, (loading || otp.length !== 6) && styles.disabledBtn]}
              onPress={verifyOtp}
              disabled={loading || otp.length !== 6}
            >
              <Text style={styles.continueText}>{i18n.t("common.submit")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setConfirmation(null)} style={[styles.linkContainer, { marginTop: 20 }]}>
              <Text style={styles.linkText}>Back to details</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: "center", backgroundColor: theme.background },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 24, color: theme.primaryDark === "#2D6A4F" ? theme.primary : theme.primaryDark, textAlign: "center" },
  label: { fontSize: 16, color: theme.textSecondary },
  subLabel: { fontSize: 14, fontWeight: "600", color: theme.textSecondary, marginTop: 14, marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.inputBg,
    marginBottom: 8,
  },
  selectorRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  selectorBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.inputBg,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  selectedBtn: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  selectorBtnText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  selectedBtnText: {
    color: theme.primary,
    fontWeight: "bold",
  },
  continueBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  disabledBtn: {
    backgroundColor: theme.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueText: {
    color: theme.textOnPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  linkContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  linkText: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: "600",
  },
});
