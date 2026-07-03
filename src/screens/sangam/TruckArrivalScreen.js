import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { checkVehicleArrival } from "../../services/pin";
import CustomDialog from "../../components/CustomDialog";

export default function TruckArrivalScreen({ navigation }) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleVerify = async () => {
    if (!vehicleNumber.trim()) {
      showDialog("warning", "Input Required", "Please enter a vehicle number.");
      return;
    }
    setLoading(true);
    try {
      const result = await checkVehicleArrival(vehicleNumber.trim().toUpperCase());
      if (result.found) {
        navigation.navigate("PinEntry", { shipmentId: result.shipmentId });
      } else {
        showDialog(
          "warning",
          "No Shipment Found",
          "There is no active, in-transit shipment matching this vehicle number. Please check the number and try again."
        );
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
            <Ionicons name="bus" size={40} color={theme.primary} />
          </View>

          <Text style={styles.headerTitle}>{i18n.t("sangam.verifyTruck")}</Text>
          <Text style={styles.subtitle}>Enter the truck's vehicle number to unlock shop allocations.</Text>

          <Text style={styles.inputLabel}>{i18n.t("sangam.enterVehicle")}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="card-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder={i18n.t("sangam.vehiclePlaceholder")}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, (!vehicleNumber.trim() || loading) && styles.disabledBtn]}
            onPress={handleVerify}
            disabled={!vehicleNumber.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{i18n.t("getStarted.continue")}</Text>
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
    marginBottom: 8,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.inputBg,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.text,
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
