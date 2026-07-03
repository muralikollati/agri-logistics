import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, useColorScheme, ActivityIndicator, Modal } from "react-native";
import { submitPickupEntry, subscribeToShipment } from "../../services/shipments";
import { fetchUsersByRole, createManualUser } from "../../services/users";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import CustomDialog from "../../components/CustomDialog";

export default function PickupEntryScreen({ route, navigation }) {
  const { shipmentId } = route.params;
  const [shipment, setShipment] = useState(null);
  // Allocations grouped by farmerUid: { [farmerUid]: [{ shopId, shopOwnerId, boxCount, shopSearch, showDropdown }] }
  const [farmerAllocations, setFarmerAllocations] = useState({});
  const [shopOwners, setShopOwners] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");

  // Modal to add a manual Shop Owner
  const [addShopVisible, setAddShopVisible] = useState(false);
  const [currentRowIndex, setCurrentRowIndex] = useState(null);
  const [currentFarmerUid, setCurrentFarmerUid] = useState(null);
  const [newShopOwnerName, setNewShopOwnerName] = useState("");
  const [newShopOwnerPhone, setNewShopOwnerPhone] = useState("");
  const [newShopId, setNewShopId] = useState("");

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

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  useEffect(() => {
    const unsub = subscribeToShipment(shipmentId, setShipment);
    return unsub;
  }, [shipmentId]);

  useEffect(() => {
    fetchUsersByRole("shop_owner").then(setShopOwners).catch(console.error);
  }, []);

  // Initialize allocations map when shipment loads
  useEffect(() => {
    if (shipment) {
      if (shipment.vehicleNumber) {
        setVehicleNumber(shipment.vehicleNumber);
      }
      if (shipment.farmers && shipment.farmers.length > 0) {
        const initialMap = {};
        shipment.farmers.forEach((f) => {
          initialMap[f.uid] = [{ shopId: "", shopOwnerId: "", boxCount: "", shopSearch: "", showDropdown: false }];
        });
        setFarmerAllocations(initialMap);
      }
    }
  }, [shipment]);

  const addAllocationRow = (farmerUid) => {
    const prevRows = farmerAllocations[farmerUid] || [];
    setFarmerAllocations({
      ...farmerAllocations,
      [farmerUid]: [...prevRows, { shopId: "", shopOwnerId: "", boxCount: "", shopSearch: "", showDropdown: false }],
    });
  };

  const removeAllocationRow = (farmerUid, rowIndex) => {
    const prevRows = farmerAllocations[farmerUid] || [];
    if (prevRows.length > 1) {
      setFarmerAllocations({
        ...farmerAllocations,
        [farmerUid]: prevRows.filter((_, idx) => idx !== rowIndex),
      });
    }
  };

  const updateAllocation = (farmerUid, rowIndex, field, value) => {
    const prevRows = [...(farmerAllocations[farmerUid] || [])];
    if (prevRows[rowIndex]) {
      prevRows[rowIndex][field] = value;
      setFarmerAllocations({
        ...farmerAllocations,
        [farmerUid]: prevRows,
      });
    }
  };

  const handleSelectShopOwner = (farmerUid, rowIndex, owner) => {
    const prevRows = [...(farmerAllocations[farmerUid] || [])];
    if (prevRows[rowIndex]) {
      prevRows[rowIndex].shopOwnerId = owner.uid;
      prevRows[rowIndex].shopId = owner.shopId || "";
      prevRows[rowIndex].shopSearch = owner.name;
      prevRows[rowIndex].showDropdown = false;
      setFarmerAllocations({
        ...farmerAllocations,
        [farmerUid]: prevRows,
      });
    }
  };

  const openAddShopModal = (farmerUid, rowIndex) => {
    setCurrentFarmerUid(farmerUid);
    setCurrentRowIndex(rowIndex);
    setNewShopOwnerName("");
    setNewShopOwnerPhone("");
    setNewShopId("");
    setAddShopVisible(true);
  };

  const handleSaveManualShop = async () => {
    if (!newShopOwnerName.trim() || !newShopOwnerPhone.trim() || !newShopId.trim()) {
      showDialog("warning", i18n.t("driver.inputRequired"), i18n.t("driver.fillShopDetails"));
      return;
    }

    setSubmitting(true);
    try {
      const owner = await createManualUser({
        role: "shop_owner",
        name: newShopOwnerName.trim(),
        phone: newShopOwnerPhone.trim(),
        shopId: newShopId.trim().toUpperCase(),
        transportOwnerId: shipment?.transportOwnerId || null,
      });

      setShopOwners((prev) => [...prev, owner]);

      if (currentFarmerUid !== null && currentRowIndex !== null) {
        handleSelectShopOwner(currentFarmerUid, currentRowIndex, owner);
      }

      setAddShopVisible(false);
      showDialog("success", i18n.t("common.submit"), i18n.t("driver.shopRegisteredSuccess"));
    } catch (e) {
      showDialog("error", i18n.t("common.cancel"), e.message);
    }
    setSubmitting(false);
  };

  // Calculate total boxes summed across all farmers and shops
  const overallTotalBoxes = Object.values(farmerAllocations).reduce((sum, list) => {
    return sum + list.reduce((subSum, row) => subSum + (parseInt(row.boxCount, 10) || 0), 0);
  }, 0);

  const handleSubmit = async () => {
    if (!vehicleNumber.trim()) {
      showDialog("warning", i18n.t("driver.inputRequired"), i18n.t("driver.vehicleNumberAlert"));
      return;
    }
    if (overallTotalBoxes <= 0) {
      showDialog("warning", i18n.t("driver.invalidInput"), i18n.t("driver.allocateAtLeastOneBox"));
      return;
    }

    const shopMap = {};

    // Group the driver's farmer-first allocations into shop-headed payloads for Firestore compatibility
    for (const [farmerUid, list] of Object.entries(farmerAllocations)) {
      const farmer = shipment.farmers.find((f) => f.uid === farmerUid);

      for (const row of list) {
        if (!row.shopId.trim() || !row.shopOwnerId.trim()) {
          showDialog("warning", i18n.t("driver.inputRequired"), i18n.t("driver.assignShopAndCode"));
          return;
        }

        const qty = parseInt(row.boxCount, 10) || 0;
        if (qty <= 0) {
          showDialog("warning", i18n.t("driver.quantityRequired"), i18n.t("driver.allocateBoxPerEntry"));
          return;
        }

        const key = row.shopOwnerId;
        if (!shopMap[key]) {
          shopMap[key] = {
            shopId: row.shopId.trim().toUpperCase(),
            shopOwnerId: row.shopOwnerId,
            boxCount: 0,
            farmerAllocations: [],
          };
        }

        shopMap[key].boxCount += qty;
        shopMap[key].farmerAllocations.push({
          farmerId: farmerUid,
          farmerName: farmer ? farmer.name : "Unknown Farmer",
          boxCount: qty,
        });
      }
    }

    const finalShopAllocations = Object.values(shopMap);

    setSubmitting(true);
    try {
      await submitPickupEntry(shipmentId, {
        boxCount: overallTotalBoxes,
        shopAllocations: finalShopAllocations,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
      });
    } catch (e) {
      showDialog("error", i18n.t("driver.invalidInput"), e.message);
    }
    setSubmitting(false);
  };

  if (shipment?.pin) {
    return (
      <View style={styles.pinContainer}>
        <View style={styles.pinCard}>
          <Ionicons name="shield-checkmark" size={60} color={theme.success} style={{ alignSelf: "center", marginBottom: 16 }} />
          <Text style={styles.pinLabel}>{i18n.t("driver.pinGenerated", { pin: "" })}</Text>
          <Text style={styles.pin}>{shipment.pin}</Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={styles.note}>{i18n.t("driver.sharePinNote")}</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>{i18n.t("driver.done")}</Text>
          </TouchableOpacity>
        </View>
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
        <View style={styles.formContainer}>
          {/* Read-only dynamically auto-summed count display */}
          <Text style={styles.label}>{i18n.t("driver.totalShipmentVolume")}</Text>
          <View style={styles.totalVolumeCard}>
            <Ionicons name="cube" size={28} color={theme.primary} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.totalCountValue}>{overallTotalBoxes} {i18n.t("driver.boxes")}</Text>
              <Text style={styles.totalCountSub}>{i18n.t("driver.autoSummedNote")}</Text>
            </View>
          </View>

          {/* Editable Vehicle Number Input */}
          <Text style={styles.label}>{i18n.t("driver.vehicleNumberRequired")}</Text>
          <TextInput
            style={[styles.allocInput, { marginBottom: 20 }]}
            placeholder={i18n.t("driver.vehiclePlaceholder")}
            placeholderTextColor={theme.placeholder}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            autoCapitalize="characters"
          />

          {/* Loop over each Farmer on this shipment */}
          {shipment?.farmers && shipment.farmers.length > 0 ? (
            shipment.farmers.map((farmer) => {
              const rows = farmerAllocations[farmer.uid] || [];
              const farmerTotal = rows.reduce((sum, r) => sum + (parseInt(r.boxCount, 10) || 0), 0);

              return (
                <View key={farmer.uid} style={styles.farmerAllocationCard}>
                  <View style={styles.farmerCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.farmerNameTitle}>{farmer.name}</Text>
                      <Text style={styles.farmerPhoneSub}>{farmer.phone}</Text>
                    </View>
                    <View style={styles.farmerHeaderActions}>
                      <View style={styles.farmerTotalBadge}>
                        <Text style={styles.farmerTotalBadgeText}>{farmerTotal} {i18n.t("driver.boxes")}</Text>
                      </View>
                      <TouchableOpacity style={styles.addShopBtn} onPress={() => addAllocationRow(farmer.uid)}>
                        <Ionicons name="add" size={14} color={theme.primary} style={{ marginRight: 2 }} />
                        <Text style={styles.addShopBtnText}>{i18n.t("driver.addShop")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Loop over each shop row for this specific farmer */}
                  {rows.map((item, rowIndex) => {
                    const filteredShops = shopOwners.filter(
                      (o) =>
                        o.name.toLowerCase().includes(item.shopSearch.toLowerCase()) ||
                        o.phone.includes(item.shopSearch)
                    );

                    return (
                      <View key={rowIndex} style={styles.shopAllocationRow}>
                        <View style={styles.shopRowHeader}>
                          <Text style={styles.shopIndex}>{i18n.t("driver.shopEntry", { index: rowIndex + 1 })}</Text>
                          {rows.length > 1 && (
                            <TouchableOpacity onPress={() => removeAllocationRow(farmer.uid, rowIndex)}>
                              <Ionicons name="trash-outline" size={16} color={theme.error} />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Shop Owner search dropdown */}
                        <Text style={styles.fieldLabel}>{i18n.t("driver.shopOwnerName")}</Text>
                        <View style={styles.dropdownInputRow}>
                          <TextInput
                            style={[styles.allocInput, { flex: 1 }]}
                            placeholder={i18n.t("driver.searchShopOwner")}
                            placeholderTextColor={theme.placeholder}
                            value={item.shopSearch}
                            onChangeText={(v) => {
                              updateAllocation(farmer.uid, rowIndex, "shopSearch", v);
                              updateAllocation(farmer.uid, rowIndex, "showDropdown", true);
                            }}
                            onFocus={() => updateAllocation(farmer.uid, rowIndex, "showDropdown", true)}
                          />
                          <TouchableOpacity
                            style={styles.plusBtn}
                            onPress={() => openAddShopModal(farmer.uid, rowIndex)}
                          >
                            <Text style={styles.plusBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Search list options */}
                        {item.showDropdown && (
                          <View style={styles.dropdownList}>
                            {filteredShops.length === 0 ? (
                              <View style={styles.dropdownItem}>
                                <Text style={styles.noResultsText}>{i18n.t("driver.noShopOwnersFound")}</Text>
                              </View>
                            ) : (
                              filteredShops.map((owner) => (
                                <TouchableOpacity
                                  key={owner.uid}
                                  style={styles.dropdownItem}
                                  onPress={() => handleSelectShopOwner(farmer.uid, rowIndex, owner)}
                                >
                                  <Text style={styles.dropdownItemTitle}>{owner.name}</Text>
                                  <Text style={styles.dropdownItemSub}>{owner.phone} | {i18n.t("driver.shopCode")}: {owner.shopId || "N/A"}</Text>
                                </TouchableOpacity>
                              ))
                            )}
                          </View>
                        )}

                        {/* Shop Code and boxes count */}
                        <View style={styles.fieldsContainer}>
                          <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>{i18n.t("driver.shopCode")}</Text>
                            <TextInput
                              style={styles.allocInput}
                              placeholder="e.g. KKR"
                              placeholderTextColor={theme.placeholder}
                              value={item.shopId}
                              onChangeText={(v) => updateAllocation(farmer.uid, rowIndex, "shopId", v)}
                              autoCapitalize="characters"
                            />
                          </View>
                          <View style={[styles.fieldWrapper, { flex: 0.6 }]}>
                            <Text style={styles.fieldLabel}>{i18n.t("driver.boxes")}</Text>
                            <TextInput
                              style={styles.allocInput}
                              placeholder="Qty"
                              placeholderTextColor={theme.placeholder}
                              keyboardType="number-pad"
                              value={item.boxCount}
                              onChangeText={(v) => updateAllocation(farmer.uid, rowIndex, "boxCount", v)}
                            />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })
          ) : (
            <ActivityIndicator size="small" color={theme.primary} />
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (overallTotalBoxes <= 0 || !vehicleNumber.trim() || submitting) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={overallTotalBoxes <= 0 || !vehicleNumber.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{i18n.t("common.submit")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Manual Shop Modal */}
      <Modal visible={addShopVisible} animationType="none" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{i18n.t("driver.addNewShopTitle")}</Text>

            <Text style={styles.modalLabel}>{i18n.t("driver.shopOwnerNameLabel")}</Text>
            <TextInput
              style={styles.modalInput}
              value={newShopOwnerName}
              onChangeText={setNewShopOwnerName}
              placeholder={i18n.t("driver.enterFullName")}
              placeholderTextColor={theme.placeholder}
            />

            <Text style={styles.modalLabel}>{i18n.t("driver.phoneNumber")}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="phone-pad"
              maxLength={10}
              value={newShopOwnerPhone}
              onChangeText={setNewShopOwnerPhone}
              placeholder={i18n.t("driver.phonePlaceholder")}
              placeholderTextColor={theme.placeholder}
            />

            <Text style={styles.modalLabel}>{i18n.t("driver.shopIdLabel")}</Text>
            <TextInput
              style={styles.modalInput}
              value={newShopId}
              onChangeText={setNewShopId}
              placeholder="e.g. KKR"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}
                onPress={() => setAddShopVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>{i18n.t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveManualShop}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>{i18n.t("driver.saveAndSelect")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CustomDialog */}
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
  },
  formContainer: {
    marginBottom: 30,
    padding: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 6,
  },
  totalVolumeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary + "10",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.primary + "20",
    padding: 16,
    marginBottom: 20,
  },
  totalCountValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.primary,
  },
  totalCountSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  farmerAllocationCard: {
    backgroundColor: theme.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 16,
  },
  farmerCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderColor: theme.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  farmerHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  farmerTotalBadge: {
    backgroundColor: theme.primary + "15",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  farmerTotalBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.primary,
  },
  farmerNameTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
  },
  farmerPhoneSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 1,
  },
  addShopBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.primary + "40",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  addShopBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.primary,
    marginLeft: 3,
  },
  shopAllocationRow: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 12,
  },
  shopRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: theme.border + "30",
    paddingBottom: 6,
    marginBottom: 8,
  },
  shopIndex: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
  },
  dropdownInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  plusBtnText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  dropdownList: {
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    marginBottom: 12,
    maxHeight: 120,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
  },
  dropdownItemSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  noResultsText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
  },
  fieldsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  fieldWrapper: {
    flex: 1,
  },
  allocInput: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  pinContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pinCard: {
    width: "100%",
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  pinLabel: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  pin: {
    fontSize: 42,
    fontWeight: "bold",
    color: theme.primary,
    letterSpacing: 10,
    textAlign: "center",
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary + "08",
    borderWidth: 1,
    borderColor: theme.primary + "15",
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  note: {
    flex: 1,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  backBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.inputBg,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
