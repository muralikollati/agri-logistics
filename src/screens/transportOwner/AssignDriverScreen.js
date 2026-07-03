import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator } from "react-native";
import { assignDriver } from "../../services/shipments";
import { fetchUserProfile } from "../../services/users";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import CustomDialog from "../../components/CustomDialog";

export default function AssignDriverScreen({ route, navigation }) {
  const { shipmentId } = route.params;
  const [driverId, setDriverId] = useState("");
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

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
    const callback = dialogConfig.onConfirm;
    setDialogConfig({ visible: false, type: "info", title: "", message: "", onConfirm: null });
    if (callback) {
      callback();
    }
  };

  const handleAssign = async () => {
    if (!driverId.trim()) {
      showDialog("warning", "Input Required", "Please enter a Driver ID.");
      return;
    }
    setLoading(true);
    try {
      const driverProfile = await fetchUserProfile(driverId.trim());
      if (!driverProfile || driverProfile.role !== "driver") {
        showDialog("error", "Not Found", "No driver found with this ID in the database.");
        setLoading(false);
        return;
      }

      await assignDriver(shipmentId, {
        uid: driverProfile.uid,
        name: driverProfile.name,
        phone: driverProfile.phone
      });

      showDialog("success", "Driver Assigned", "Driver has been successfully assigned to this shipment.", () => {
        navigation.goBack();
      });
    } catch (e) {
      showDialog("error", "Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{i18n.t("transportOwner.driverIdUid")}</Text>
      <TextInput
        style={styles.input}
        value={driverId}
        onChangeText={setDriverId}
        placeholder={i18n.t("transportOwner.driverIdPlaceholder")}
        placeholderTextColor={theme.placeholder}
      />
      <TouchableOpacity
        style={[styles.btn, (!driverId || loading) && styles.disabledBtn]}
        onPress={handleAssign}
        disabled={loading || !driverId}
      >
        {loading ? (
          <ActivityIndicator color={theme.textOnPrimary} />
        ) : (
          <Text style={styles.btnText}>
            {i18n.t("transportOwner.assignDriverSubmit")}
          </Text>
        )}
      </TouchableOpacity>

      <CustomDialog
        visible={dialogConfig.visible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onClose={handleDialogClose}
      />
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: theme.background,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: theme.textSecondary,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: theme.text,
    backgroundColor: theme.inputBg,
  },
  btn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  disabledBtn: {
    backgroundColor: theme.buttonDisabled,
  },
  btnText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 16,
  },
});
