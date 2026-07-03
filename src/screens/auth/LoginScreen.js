import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, useColorScheme } from "react-native";
import { signInWithPhoneNumber, signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { fetchUserProfile } from "../../services/users";
import { useAuthStore } from "../../store/useAuthStore";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  const setUser = useAuthStore((s) => s.setUser);

  const sendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
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
      const fetchedProfile = await fetchUserProfile(result.user.uid);
      if (!fetchedProfile) {
        Alert.alert("No Profile Found", "This phone number is not registered. Please sign up first.");
        await signOut(auth);
      } else {
        setUser(fetchedProfile);
        i18n.changeLanguage(fetchedProfile.language || "te");
      }
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
            <Text style={styles.header}>{i18n.t("login.signIn")}</Text>
            <Text style={styles.subLabel}>{i18n.t("login.title")}</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              placeholder="9xxxxxxxxx"
              placeholderTextColor={theme.placeholder}
            />

            <TouchableOpacity
              style={[styles.continueBtn, (loading || phone.length !== 10) && styles.disabledBtn]}
              onPress={sendOtp}
              disabled={loading || phone.length !== 10}
            >
              <Text style={styles.continueText}>{i18n.t("common.submit")}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.linkContainer}>
              <Text style={styles.linkText}>{i18n.t("login.signUpLink")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.header}>{i18n.t("login.verifyCode")}</Text>
            <Text style={styles.subLabel}>{i18n.t("login.otpTitle")}</Text>
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
              <Text style={styles.linkText}>{i18n.t("login.backToPhone")}</Text>
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
