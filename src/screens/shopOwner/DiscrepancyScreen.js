import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, useColorScheme, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from "react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { raiseDiscrepancy, subscribeToUnloadEntries } from "../../services/marketOps";
import { subscribeToShipment } from "../../services/shipments";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import CustomDialog from "../../components/CustomDialog";

export default function DiscrepancyScreen({ route, navigation }) {
  const { shipmentId, expected } = route.params;
  const { uid } = useAuthStore();
  const [actual, setActual] = useState(String(expected ?? ""));
  const [category, setCategory] = useState("shortage"); // shortage, damage, quality
  const [responsibleWorker, setResponsibleWorker] = useState(null);
  const [comments, setComments] = useState("");
  const [unloadEntries, setUnloadEntries] = useState([]);
  const [shipment, setShipment] = useState(null);
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

  const myAllocation = shipment?.shopAllocations?.find(a => a.shopOwnerId === uid);

  useEffect(() => {
    if (shipment && unloadEntries.length > 0) {
      const myAlloc = shipment.shopAllocations?.find(a => a.shopOwnerId === uid);
      if (myAlloc) {
        const sangamLoggedCount = unloadEntries
          .filter(e => e.shopId === myAlloc.shopId)
          .reduce((sum, e) => sum + e.boxCount, 0);
        setActual(String(sangamLoggedCount));
      }
    } else if (shipment) {
      // Fallback if no unload entries are loaded yet
      const myAlloc = shipment.shopAllocations?.find(a => a.shopOwnerId === uid);
      if (myAlloc) {
        setActual(String(myAlloc.boxCount));
      }
    }
  }, [shipment, unloadEntries, uid]);

  useEffect(() => {
    const unsub1 = subscribeToUnloadEntries(shipmentId, setUnloadEntries);
    const unsub2 = subscribeToShipment(shipmentId, setShipment);
    return () => {
      unsub1();
      unsub2();
    };
  }, [shipmentId]);

  const handleConfirm = async () => {
    const actualNum = parseInt(actual, 10);
    if (isNaN(actualNum) || actualNum < 0) {
      showDialog("warning", "Invalid Input", "Please enter a valid actual box count.");
      return;
    }

    setSubmitting(true);
    try {
      const { doc, updateDoc } = require("firebase/firestore");
      const { db } = require("../../firebase/config");

      if (actualNum < expected) {
        await raiseDiscrepancy(shipmentId, {
          raisedBy: uid,
          expectedCount: expected,
          actualCount: actualNum,
          category,
          responsibleWorker,
          comments: comments.trim(),
        });
        
        await updateDoc(doc(db, "shipments", shipmentId), { status: "completed" });
        
        showDialog(
          "success",
          "Discrepancy Logged",
          "A dispute ticket has been created. The Transport Owner and Sangam supervisor have been notified.",
          () => {
            navigation.navigate("SaleLogging", { shipmentId, boxCount: actualNum });
          }
        );
      } else {
        await updateDoc(doc(db, "shipments", shipmentId), { status: "completed" });
        navigation.navigate("SaleLogging", { shipmentId, boxCount: actualNum });
      }
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setSubmitting(false);
  };

  const isDiscrepancy = parseInt(actual, 10) < expected;

  // Extract unique worker IDs from the unload logs
  const workers = Array.from(new Set(unloadEntries.map(e => e.workerId)));

  if (!shipment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (shipment.status !== "unloaded" && shipment.status !== "completed") {
    return (
      <View style={styles.blockedContainer}>
        <Ionicons name="hourglass-outline" size={64} color={theme.warning} style={{ marginBottom: 16 }} />
        <Text style={styles.blockedTitle}>Waiting for Unloading</Text>
        <Text style={styles.blockedSubtitle}>
          The Sangam supervisor has not finalized unloading count for this shipment yet.
          Once marked complete, you can verify the count and proceed.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
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
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
            <Text style={styles.headerTitle}>{i18n.t("shop.discrepancy.title")}</Text>
          </View>
          <Text style={styles.subtitle}>Verify the actual quantity of boxes unloaded at your shop against the expected quantity.</Text>

          {myAllocation?.farmerAllocations && myAllocation.farmerAllocations.length > 0 ? (
            <View style={styles.farmersContainer}>
              <Text style={styles.fieldLabel}>Boxes received from each farmer</Text>
              {myAllocation.farmerAllocations.map((farmerAlloc) => (
                <View key={farmerAlloc.farmerId} style={styles.farmerRow}>
                  <View style={styles.farmerLeft}>
                    <Ionicons name="person-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.farmerName}>{farmerAlloc.farmerName}</Text>
                  </View>
                  <Text style={styles.farmerPhone}>{farmerAlloc.boxCount} Boxes</Text>
                </View>
              ))}
            </View>
          ) : (
            shipment?.farmers && shipment.farmers.length > 0 && (
              <View style={styles.farmersContainer}>
                <Text style={styles.fieldLabel}>Farmers contribution details</Text>
                {shipment.farmers.map((farmer) => (
                  <View key={farmer.uid} style={styles.farmerRow}>
                    <View style={styles.farmerLeft}>
                      <Ionicons name="person-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.farmerName}>{farmer.name}</Text>
                    </View>
                    <Text style={styles.farmerPhone}>{farmer.phone}</Text>
                  </View>
                ))}
              </View>
            )
          )}

          <View style={styles.comparisonRow}>
            <View style={styles.compareBox}>
              <Text style={styles.compareLabel}>{i18n.t("shop.discrepancy.expected")}</Text>
              <Text style={styles.expectedValue}>{expected}</Text>
            </View>
            <View style={[styles.compareBox, { borderLeftWidth: 1, borderColor: theme.border }]}>
              <Text style={styles.compareLabel}>{i18n.t("shop.discrepancy.actual")}</Text>
              <TextInput
                style={styles.actualInput}
                keyboardType="number-pad"
                value={actual}
                onChangeText={setActual}
                maxLength={4}
              />
            </View>
          </View>

          {isDiscrepancy && (
            <View style={styles.disputeContainer}>
              <View style={styles.alertBox}>
                <Ionicons name="alert-circle" size={20} color={theme.error} style={{ marginRight: 6 }} />
                <Text style={styles.alertText}>
                  Discrepancy detected! Please provide shortage details below.
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Issue Category</Text>
              <View style={styles.categoryRow}>
                {["shortage", "damage", "quality"].map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryBtn, isSelected && styles.categoryBtnSelected]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                        {cat.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Responsible Unloading Worker (Optional)</Text>
              {workers.length === 0 ? (
                <Text style={styles.noWorkersText}>No unloading workers logged on this shipment.</Text>
              ) : (
                <View style={styles.chipsContainer}>
                  {workers.map((worker) => {
                    const isSelected = responsibleWorker === worker;
                    return (
                      <TouchableOpacity
                        key={worker}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => setResponsibleWorker(isSelected ? null : worker)}
                      >
                        <Ionicons name="person-outline" size={13} color={isSelected ? "#fff" : theme.text} style={{ marginRight: 4 }} />
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          Worker #{worker}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.fieldLabel}>Comments / Details</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder="Describe the shortage/damage details..."
                placeholderTextColor={theme.placeholder}
                value={comments}
                onChangeText={setComments}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.disabledBtn]}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isDiscrepancy ? "Raise Dispute & Log" : i18n.t("common.submit")}
              </Text>
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
    padding: 16,
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  comparisonRow: {
    flexDirection: "row",
    backgroundColor: theme.background,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingVertical: 14,
    marginBottom: 20,
  },
  compareBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  expectedValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.text,
  },
  actualInput: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.primary,
    textAlign: "center",
    minWidth: 80,
    padding: 4,
  },
  disputeContainer: {
    marginBottom: 16,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.error + "10",
    borderWidth: 1,
    borderColor: theme.error + "20",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: theme.error,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  categoryBtn: {
    flex: 1,
    backgroundColor: theme.background,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  categoryBtnSelected: {
    borderColor: theme.error,
    backgroundColor: theme.error + "08",
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "bold",
    color: theme.textSecondary,
  },
  categoryTextSelected: {
    color: theme.error,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.background,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  chipSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary,
  },
  chipText: {
    fontSize: 12,
    color: theme.text,
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  noWorkersText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontStyle: "italic",
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.inputBg,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  farmersContainer: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  farmerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: theme.border + "40",
  },
  farmerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  farmerName: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  farmerPhone: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
  },
  blockedContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 8,
    textAlign: "center",
  },
  blockedSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  backBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
  },
});
