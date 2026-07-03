import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { verifyPin } from "../../services/pin";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import CustomDialog from "../../components/CustomDialog";

export default function PinEntryScreen({ route, navigation }) {
  const { shipmentId } = route.params;
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  // CustomDialog state
  const [dialogConfig, setDialogConfig] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
  });

  const showDialog = (type, title, message, onConfirm = null) => {
    setDialogConfig({ visible: true, type, title, message, onConfirm });
  };

  const handleDialogClose = () => {
    setDialogConfig({ visible: false, type: "info", title: "", message: "", onConfirm: null });
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) return;
    setLoading(true);
    try {
      const result = await verifyPin(shipmentId, pin);
      if (result.success) {
        navigation.replace("UnloadEntry", { shipmentId });
      } else {
        const remaining = result.attemptsRemaining ?? 0;
        setAttemptsRemaining(remaining);
        if (remaining === 0) {
          showDialog(
            "error",
            "Account Locked",
            "Too many incorrect attempts. This shipment's allocation list has been locked for 15 minutes."
          );
        } else {
          showDialog(
            "warning",
            "Verification Failed",
            `Incorrect PIN. You have ${remaining} attempts remaining before this shipment locks.`
          );
        }
      }
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <Ionicons name="lock-closed" size={38} color={attemptsRemaining <= 2 ? theme.error : theme.primary} />
          </View>

          <Text style={styles.headerTitle}>{i18n.t("sangam.pinSecurityHeader")}</Text>
          <Text style={styles.subtitle}>
            This shipment's routing list is encrypted. Enter the 6-digit PIN provided by the driver.
          </Text>

          <Text style={styles.inputLabel}>{i18n.t("sangam.enterPin")}</Text>
          <TextInput
            style={styles.pinInput}
            keyboardType="number-pad"
            maxLength={6}
            value={pin}
            onChangeText={setPin}
            placeholder="XXXXXX"
            placeholderTextColor={theme.placeholder}
            secureTextEntry={false}
          />

          {attemptsRemaining < 5 && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={16} color={theme.error} style={{ marginRight: 6 }} />
              <Text style={styles.warningText}>
                {attemptsRemaining} attempts remaining
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, (pin.length !== 6 || loading) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={pin.length !== 6 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{i18n.t("common.submit")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomDialog
        visible={dialogConfig.visible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onClose={handleDialogClose}
        onConfirm={dialogConfig.onConfirm}
      />
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  pinInput: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: theme.text,
    backgroundColor: theme.inputBg,
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: theme.error,
    fontWeight: "600",
  },
  btn: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
