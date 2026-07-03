import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, useColorScheme, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from "react-native";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useAuthStore } from "../../store/useAuthStore";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import CustomDialog from "../../components/CustomDialog";

export default function ProfileScreen() {
  const user = useAuthStore();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [address, setAddress] = useState(user.address || "");
  const [selectedLang, setSelectedLang] = useState(user.language || "te");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [dialogConfig, setDialogConfig] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showDialog = (type, title, message) => {
    setDialogConfig({ visible: true, type, title, message });
  };

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      await AsyncStorage.removeItem("hasSelectedLanguage");
      clearUser();
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setSigningOut(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showDialog("warning", "Input Required", "Name cannot be left blank.");
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: name.trim(),
        address: address.trim(),
        language: selectedLang,
      });

      // Update global auth store state
      setUser({
        ...user,
        name: name.trim(),
        address: address.trim(),
        language: selectedLang,
      });

      // Reactively apply locale changes
      await i18n.changeLanguage(selectedLang);
      setIsEditing(false);
      showDialog("success", "Success", "Profile updated successfully.");
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setName(user.name || "");
    setAddress(user.address || "");
    setSelectedLang(user.language || "te");
    setIsEditing(false);
  };

  const getRoleLabel = (r) => {
    const rolesMap = {
      farmer: "Farmer",
      transport_owner: "Transport Owner",
      driver: "Driver",
      sangam: "Sangam Supervisor",
      shop_owner: "Shop Owner",
    };
    return rolesMap[r] || r;
  };

  const getLanguageLabel = (l) => {
    const langMap = {
      te: "తెలుగు (Telugu)",
      en: "English",
      ta: "தமிழ் (Tamil)",
    };
    return langMap[l] || l;
  };

  const languages = [
    { code: "te", label: "తెలుగు" },
    { code: "en", label: "English" },
    { code: "ta", label: "தமிழ்" },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Avatar Profile Card */}
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "U"}</Text>
          </View>
          <Text style={styles.profileName}>{name || "User"}</Text>
          <Text style={styles.profileRole}>{getRoleLabel(user.role)}</Text>
        </View>

        {!isEditing ? (
          /* READ-ONLY VIEW */
          <View style={styles.detailsContainer}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="person-outline" size={18} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoLabel}>{i18n.t("profile.name")}</Text>
              </View>
              <Text style={styles.infoValue}>{user.name || "N/A"}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="call-outline" size={18} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoLabel}>{i18n.t("profile.phone")}</Text>
              </View>
              <Text style={styles.infoValue}>{user.phone || "N/A"}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="location-outline" size={18} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoLabel}>{i18n.t("profile.address")}</Text>
              </View>
              <Text style={[styles.infoValue, { flex: 1, textAlign: "right", marginLeft: 16 }]} numberOfLines={2}>
                {user.address || "No address set"}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Ionicons name="language-outline" size={18} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoLabel}>{i18n.t("profile.language")}</Text>
              </View>
              <Text style={styles.infoValue}>{getLanguageLabel(user.language)}</Text>
            </View>

            {/* Edit Trigger Button */}
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
              <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.editBtnText}>{i18n.t("profile.editBtn")}</Text>
            </TouchableOpacity>

            {/* Sign Out Button */}
            <TouchableOpacity
              style={[styles.signOutBtn, signingOut && styles.disabledBtn]}
              onPress={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.signOutText}>{i18n.t("profile.signOut")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* EDITABLE FORM VIEW */
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>{i18n.t("profile.editTitle")}</Text>

            {/* Full Name */}
            <Text style={styles.fieldLabel}>{i18n.t("profile.name")}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor={theme.placeholder}
              />
            </View>

            {/* Address */}
            <Text style={styles.fieldLabel}>{i18n.t("profile.address")}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter village, district, or shop address"
                placeholderTextColor={theme.placeholder}
                multiline
              />
            </View>

            {/* Language Switch */}
            <Text style={styles.fieldLabel}>{i18n.t("profile.language")}</Text>
            <View style={styles.langSelectorRow}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langChip,
                    selectedLang === lang.code && styles.langChipActive,
                  ]}
                  onPress={() => setSelectedLang(lang.code)}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      selectedLang === lang.code && styles.langChipTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>{i18n.t("profile.cancelBtn")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{i18n.t("profile.saveBtn")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <CustomDialog
        visible={dialogConfig.visible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onClose={() => setDialogConfig({ ...dialogConfig, visible: false })}
      />
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.primary + "30",
  },
  avatarText: {
    fontSize: 30,
    color: theme.primary,
    fontWeight: "bold",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailsContainer: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: theme.text,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: theme.border + "40",
  },
  editBtn: {
    backgroundColor: theme.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  editBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  formContainer: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    backgroundColor: theme.background,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    padding: 0,
  },
  langSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  langChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  langChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textSecondary,
  },
  langChipTextActive: {
    color: "#fff",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  signOutBtn: {
    backgroundColor: theme.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: theme.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    marginBottom: 10,
  },
  signOutText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
