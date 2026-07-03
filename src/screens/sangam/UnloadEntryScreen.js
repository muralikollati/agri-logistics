import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { subscribeToShipment } from "../../services/shipments";
import { logUnloadEntry, subscribeToUnloadEntries } from "../../services/marketOps";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { completeUnloading } from "../../services/pin";
import CustomDialog from "../../components/CustomDialog";

export default function UnloadEntryScreen({ route, navigation }) {
  const { shipmentId } = route.params;
  const [shipment, setShipment] = useState(null);
  const [entries, setEntries] = useState([]);
  const [workerId, setWorkerId] = useState("");
  const [selectedShop, setSelectedShop] = useState(null);
  const [boxCount, setBoxCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    const unsub1 = subscribeToShipment(shipmentId, setShipment);
    const unsub2 = subscribeToUnloadEntries(shipmentId, setEntries);
    return () => {
      unsub1();
      unsub2();
    };
  }, [shipmentId]);

  const handleLogEntry = async () => {
    const boxesNum = parseInt(boxCount, 10);
    if (isNaN(boxesNum) || boxesNum <= 0) {
      showDialog("warning", "Invalid Input", "Please enter a valid box count.");
      return;
    }

    const targetShopAlloc = shipment.shopAllocations.find(a => a.shopId === selectedShop);
    
    // Calculate total already logged boxes for this shop
    const loggedForShop = entries
      .filter(e => e.shopId === selectedShop)
      .reduce((sum, e) => sum + e.boxCount, 0);

    const remainingAlloc = targetShopAlloc ? targetShopAlloc.boxCount - loggedForShop : 0;

    if (boxesNum > remainingAlloc) {
      showDialog(
        "warning",
        "Limit Exceeded",
        `Cannot unload ${boxesNum} boxes. Only ${remainingAlloc} of ${targetShopAlloc ? targetShopAlloc.boxCount : 0} expected boxes remain for Shop ${selectedShop}.`
      );
      return;
    }

    const finalWorkerId = workerId.trim() || `W-${Math.floor(1000 + Math.random() * 9000).toString()}`;

    setSubmitting(true);
    try {
      await logUnloadEntry(shipmentId, {
        workerId: finalWorkerId,
        shopId: selectedShop,
        boxCount: boxesNum,
      });
      setWorkerId("");
      setBoxCount("");
      setSelectedShop(null);
      showDialog("success", "Success", "Unload entry logged successfully.");
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setSubmitting(false);
  };

  const handleCompleteUnloading = async () => {
    showDialog(
      "confirm",
      "Confirm Completion",
      "Are you sure you want to finalize the unloading process and mark the delivery as completed?",
      async () => {
        setSubmitting(true);
        try {
          await completeUnloading(shipmentId);
          showDialog("success", "Success", "Shipment marked as unloaded.", () => {
            navigation.navigate("SangamDashboard");
          });
        } catch (e) {
          showDialog("error", "Error", e.message);
        }
        setSubmitting(false);
      }
    );
  };

  if (!shipment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="unlock" size={20} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>{i18n.t("sangam.unlockedAllocations")}</Text>
          </View>

          <View style={styles.shopsContainer}>
            {shipment.shopAllocations && shipment.shopAllocations.map((item) => {
              const isSelected = selectedShop === item.shopId;
              return (
                <TouchableOpacity
                  key={item.shopId}
                  activeOpacity={0.8}
                  style={[styles.shopCard, isSelected && styles.shopCardSelected]}
                  onPress={() => setSelectedShop(item.shopId)}
                >
                  <View style={styles.shopCardHeader}>
                    <Text style={[styles.shopName, isSelected && styles.shopNameSelected]}>
                      Shop {item.shopId}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    )}
                  </View>
                  <Text style={[styles.shopCount, isSelected && styles.shopCountSelected]}>
                    {i18n.t("shop.expectedBoxes", { count: item.boxCount })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedShop ? (
            <View style={styles.entryForm}>
              <View style={styles.formTitleRow}>
                <Ionicons name="create-outline" size={16} color={theme.primary} />
                <Text style={styles.formTitle}>
                  {i18n.t("sangam.logUnload")} — Shop {selectedShop}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>{i18n.t("sangam.enterWorkerId")}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={workerId}
                  onChangeText={setWorkerId}
                  placeholder={i18n.t("sangam.workerIdPlaceholder")}
                  placeholderTextColor={theme.placeholder}
                />
              </View>

              <Text style={styles.fieldLabel}>{i18n.t("sangam.boxesForShop")}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="cube-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={boxCount}
                  onChangeText={setBoxCount}
                  placeholder="e.g. 10"
                  placeholderTextColor={theme.placeholder}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (!workerId.trim() || !boxCount || submitting) && styles.disabledBtn]}
                onPress={handleLogEntry}
                disabled={!workerId.trim() || !boxCount || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{i18n.t("sangam.logEntryBtn")}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectPromptBox}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.selectPromptText}>{i18n.t("sangam.selectShopPrompt")}</Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-circle-outline" size={22} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>{i18n.t("sangam.loggedEntries")}</Text>
          </View>

          {entries.length === 0 ? (
            <Text style={styles.noEntriesText}>{i18n.t("sangam.noLoggedEntries")}</Text>
          ) : (
            entries.map((item) => (
              <View key={item.id} style={styles.logRow}>
                <View style={styles.logLeft}>
                  <Ionicons name="checkmark-done" size={16} color={theme.success} style={{ marginRight: 8 }} />
                  <Text style={styles.logText}>
                    Worker <Text style={styles.boldText}>#{item.workerId}</Text> routed boxes to <Text style={styles.boldText}>Shop {item.shopId}</Text>
                  </Text>
                </View>
                <Text style={styles.logBoxesBadge}>{item.boxCount} boxes</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.completeBtn}
          onPress={handleCompleteUnloading}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.completeBtnText}>Complete Unloading</Text>
            </>
          )}
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: theme.border + "50",
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
  },
  shopsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  shopCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.background,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
  },
  shopCardSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + "05",
  },
  shopCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  shopName: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
  },
  shopNameSelected: {
    color: theme.primary,
  },
  shopCount: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  shopCountSelected: {
    color: theme.primary,
    fontWeight: "500",
  },
  selectPromptBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: theme.border + "30",
    borderRadius: 10,
    marginTop: 8,
  },
  selectPromptText: {
    fontSize: 13,
    color: theme.textSecondary,
    flex: 1,
  },
  entryForm: {
    backgroundColor: theme.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginTop: 8,
  },
  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
    marginLeft: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.surface,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  noEntriesText: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: "center",
    paddingVertical: 16,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: theme.border + "40",
  },
  logLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  logText: {
    fontSize: 13,
    color: theme.text,
    flex: 1,
  },
  boldText: {
    fontWeight: "bold",
  },
  logBoxesBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.primary,
    backgroundColor: theme.primary + "10",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  completeBtn: {
    flexDirection: "row",
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
  },
});
