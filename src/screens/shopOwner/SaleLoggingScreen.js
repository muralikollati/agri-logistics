import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity, useColorScheme, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from "react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { logSale } from "../../services/marketOps";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import CustomDialog from "../../components/CustomDialog";

export default function SaleLoggingScreen({ route, navigation }) {
  const { shipmentId, boxCount } = route.params;
  const { uid } = useAuthStore();
  const [boxesSold, setBoxesSold] = useState(boxCount ?? 0);
  const [maxBoxes, setMaxBoxes] = useState(boxCount ?? 0);
  const [pricePerBox, setPricePerBox] = useState("");
  const [isFinal, setIsFinal] = useState(true);
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
    const { collection, query, where, getDocs, limit } = require("firebase/firestore");
    const { db } = require("../../firebase/config");
    
    const q = query(
      collection(db, "shipments", shipmentId, "discrepancies"),
      where("raisedBy", "==", uid),
      limit(1)
    );
    
    getDocs(q).then((snap) => {
      if (!snap.empty) {
        const discData = snap.docs[0].data();
        setBoxesSold(discData.actualCount);
        setMaxBoxes(discData.actualCount);
      } else {
        const { doc, getDoc } = require("firebase/firestore");
        getDoc(doc(db, "shipments", shipmentId)).then((shipSnap) => {
          if (shipSnap.exists()) {
            const shipData = shipSnap.data();
            const myAlloc = shipData.shopAllocations?.find(a => a.shopOwnerId === uid);
            if (myAlloc) {
              setBoxesSold(myAlloc.boxCount);
              setMaxBoxes(myAlloc.boxCount);
            }
          }
        });
      }
    }).catch(console.error);
  }, [shipmentId, uid]);

  const handleSubmit = async () => {
    const priceNum = parseFloat(pricePerBox);
    if (boxesSold <= 0 || boxesSold > maxBoxes) {
      showDialog("warning", "Invalid Quantity", `Please sell between 1 and ${maxBoxes} boxes.`);
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      showDialog("warning", "Invalid Price", "Please enter a valid price per box.");
      return;
    }

    setSubmitting(true);
    try {
      await logSale(shipmentId, {
        shopOwnerId: uid,
        boxesSold,
        pricePerBox: priceNum,
        isFinal,
      });
      showDialog(
        "success",
        "Sale Logged Successfully",
        isFinal ? "Farmer has been notified with the closing price." : "Partial sale recorded.",
        () => {
          navigation.popToTop();
        }
      );
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setSubmitting(false);
  };

  // Live profit projections (Gross sales, 5% market fee, 95% Farmer net profit)
  const priceVal = parseFloat(pricePerBox) || 0;
  const grossRevenue = boxesSold * priceVal;
  const marketFee = grossRevenue * 0.05;
  const farmerNetProfit = grossRevenue - marketFee;

  const progressPercent = maxBoxes > 0 ? (boxesSold / maxBoxes) * 100 : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name="cash-outline" size={24} color={theme.primary} />
            <Text style={styles.headerTitle}>{i18n.t("shop.logSale")}</Text>
          </View>
          <Text style={styles.subtitle}>Enter the sales details below. We'll update the farmer's live profits and send them a completion receipt.</Text>

          {/* Progress Bar & Inventory Count */}
          <Text style={styles.fieldLabel}>Inventory Sold Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>{boxesSold} of {maxBoxes} boxes sold</Text>
              <Text style={styles.progressPercent}>{progressPercent.toFixed(0)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Interactive Stepper for boxes count */}
          <Text style={styles.fieldLabel}>{i18n.t("shop.boxesSold")}</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setBoxesSold(prev => Math.max(1, prev - 1))}
            >
              <Ionicons name="remove" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{boxesSold}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setBoxesSold(prev => Math.min(maxBoxes, prev + 1))}
            >
              <Ionicons name="add" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Price per box */}
          <Text style={styles.fieldLabel}>{i18n.t("shop.pricePerBox")} (₹)</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={pricePerBox}
              onChangeText={setPricePerBox}
              placeholder="e.g. 450"
              placeholderTextColor={theme.placeholder}
            />
          </View>

          {/* Switch Final Sale */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Final Closing Sale</Text>
              <Text style={styles.switchSubtitle}>Triggers farmer payout invoice and closes shipment.</Text>
            </View>
            <Switch
              value={isFinal}
              onValueChange={setIsFinal}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={Platform.OS === "android" ? theme.surface : ""}
            />
          </View>

          {/* Live Projections Chart Board */}
          <View style={styles.projectionCard}>
            <Text style={styles.projectionTitle}>Live Revenue Projection</Text>
            
            <View style={styles.projectionRow}>
              <Text style={styles.projectionLabel}>Gross Sales Revenue</Text>
              <Text style={styles.projectionValue}>₹{grossRevenue.toLocaleString()}</Text>
            </View>
            <View style={styles.projectionRow}>
              <Text style={styles.projectionLabel}>Est. Market Commission (5%)</Text>
              <Text style={[styles.projectionValue, { color: theme.error }]}>-₹{marketFee.toLocaleString()}</Text>
            </View>
            
            <View style={[styles.projectionRow, styles.netRow]}>
              <Text style={styles.netLabel}>Farmer Live Net Profit</Text>
              <Text style={styles.netValue}>₹{farmerNetProfit.toLocaleString()}</Text>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!pricePerBox || submitting) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!pricePerBox || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{i18n.t("common.submit")}</Text>
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
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  progressContainer: {
    backgroundColor: theme.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.primary,
    borderRadius: 4,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 8,
    backgroundColor: theme.inputBg,
    marginBottom: 16,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.inputBg,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.background,
    marginBottom: 20,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
  },
  switchSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  projectionCard: {
    backgroundColor: theme.primary + "06",
    borderWidth: 1.5,
    borderColor: theme.primary + "15",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  projectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.primary,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  projectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  projectionLabel: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  projectionValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  netRow: {
    borderTopWidth: 1,
    borderColor: theme.primary + "20",
    marginTop: 8,
    paddingTop: 10,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
  },
  netValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.primary,
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
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
