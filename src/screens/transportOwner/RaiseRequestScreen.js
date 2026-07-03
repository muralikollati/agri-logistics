import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { requestPickup, updateShipment } from "../../services/shipments";
import { fetchUsersByRole, createManualUser } from "../../services/users";
import { useAuthStore } from "../../store/useAuthStore";
import { colors } from "../../theme/colors";
import i18n from "../../i18n";
import CustomDialog from "../../components/CustomDialog";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../firebase/config";

export default function RaiseRequestScreen({ navigation, route }) {
  const shipmentId = route.params?.shipmentId;
  const { uid } = useAuthStore();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  const farmerBlurRef = useRef(null);
  const driverBlurRef = useRef(null);
  const vehicleBlurRef = useRef(null);

  useEffect(() => {
    return () => {
      if (farmerBlurRef.current) clearTimeout(farmerBlurRef.current);
      if (driverBlurRef.current) clearTimeout(driverBlurRef.current);
      if (vehicleBlurRef.current) clearTimeout(vehicleBlurRef.current);
    };
  }, []);

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

  // Data lists
  const [farmers, setFarmers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [raising, setRaising] = useState(false);

  // Selected values
  const [selectedFarmers, setSelectedFarmers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Search input texts
  const [farmerSearch, setFarmerSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  // Dropdown visibility states
  const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  // Modal manual inputs visibility
  const [addFarmerVisible, setAddFarmerVisible] = useState(false);
  const [addDriverVisible, setAddDriverVisible] = useState(false);
  const [addVehicleVisible, setAddVehicleVisible] = useState(false);

  // Manual form inputs
  const [newFarmerName, setNewFarmerName] = useState("");
  const [newFarmerPhone, setNewFarmerPhone] = useState("");
  const [newFarmerAddress, setNewFarmerAddress] = useState("");

  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverVehicle, setNewDriverVehicle] = useState("");

  const [newVehicleNumber, setNewVehicleNumber] = useState("");

  // Load all initial users
  const loadData = async () => {
    try {
      const farmersList = await fetchUsersByRole("farmer");
      const driversList = await fetchUsersByRole("driver");

      // Extract unique vehicle numbers from drivers
      const uniqueVehicles = Array.from(
        new Set(driversList.map((d) => d.vehicleNumber).filter(Boolean))
      );

      setFarmers(farmersList);
      setDrivers(driversList);
      setVehicles(uniqueVehicles);

      if (shipmentId) {
        const { doc, getDoc } = require("firebase/firestore");
        const docRef = doc(db, "shipments", shipmentId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.farmers) setSelectedFarmers(data.farmers);
          if (data.driver) {
            setSelectedDriver(data.driver);
            setDriverSearch(data.driver.name);
          }
          if (data.vehicleNumber) {
            setSelectedVehicle(data.vehicleNumber);
            setVehicleSearch(data.vehicleNumber);
          }
        }
      }
    } catch (e) {
      console.error(e);
      showDialog("error", "Error", "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (shipmentId) {
      navigation.setOptions({ title: "Edit request" });
    }
  }, [shipmentId]);

  // Filter lists based on search
  const filteredFarmers = farmers.filter((f) =>
    (f.name || "").toLowerCase().includes(farmerSearch.toLowerCase()) ||
    (f.phone || "").includes(farmerSearch)
  );

  const filteredDrivers = drivers.filter((d) =>
    (d.name || "").toLowerCase().includes(driverSearch.toLowerCase()) ||
    (d.phone || "").includes(driverSearch)
  );

  const filteredVehicles = vehicles.filter((v) =>
    v.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  // Toggle selection for farmers
  const handleSelectFarmer = (farmer) => {
    if (!selectedFarmers.some((f) => f.uid === farmer.uid)) {
      setSelectedFarmers([...selectedFarmers, farmer]);
    }
    setFarmerSearch("");
    setShowFarmerDropdown(false);
  };

  const handleRemoveFarmer = (uid) => {
    setSelectedFarmers(selectedFarmers.filter((f) => f.uid !== uid));
  };

  // Create Manual Farmer
  const handleAddFarmer = async () => {
    if (!newFarmerName.trim() || newFarmerPhone.length !== 10) {
      showDialog("warning", "Invalid Input", "Please enter a name and a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    try {
      const newFarmer = await createManualUser({
        role: "farmer",
        name: newFarmerName,
        phone: `+91${newFarmerPhone}`,
        address: newFarmerAddress,
        transportOwnerId: uid,
      });
      setFarmers((prev) => [...prev, newFarmer]);
      setSelectedFarmers((prev) => [...prev, newFarmer]);
      setAddFarmerVisible(false);
      // Reset forms
      setNewFarmerName("");
      setNewFarmerPhone("");
      setNewFarmerAddress("");
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setLoading(false);
  };

  // Create Manual Driver
  const handleAddDriver = async () => {
    if (!newDriverName.trim() || newDriverPhone.length !== 10) {
      showDialog("warning", "Invalid Input", "Please enter a name and a valid 10-digit phone number.");
      return;
    }
    setLoading(true);
    try {
      const newDriver = await createManualUser({
        role: "driver",
        name: newDriverName,
        phone: `+91${newDriverPhone}`,
        vehicleNumber: newDriverVehicle || null,
        transportOwnerId: uid,
      });
      setDrivers((prev) => [...prev, newDriver]);
      setSelectedDriver(newDriver);
      setDriverSearch(newDriver.name);
      if (newDriverVehicle) {
        setVehicles((prev) => Array.from(new Set([...prev, newDriverVehicle])));
        setSelectedVehicle(newDriverVehicle);
        setVehicleSearch(newDriverVehicle);
      }
      setAddDriverVisible(false);
      // Reset forms
      setNewDriverName("");
      setNewDriverPhone("");
      setNewDriverVehicle("");
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setLoading(false);
  };

  // Add Manual Vehicle
  const handleAddVehicle = () => {
    if (!newVehicleNumber.trim()) {
      showDialog("warning", "Invalid Input", "Please enter a vehicle number.");
      return;
    }
    const normalized = newVehicleNumber.trim().toUpperCase();
    setVehicles((prev) => Array.from(new Set([...prev, normalized])));
    setSelectedVehicle(normalized);
    setVehicleSearch(normalized);
    setAddVehicleVisible(false);
    setNewVehicleNumber("");
  };

  // Raise Shipment Request
  const handleRaiseRequest = async () => {
    if (selectedFarmers.length === 0) {
      showDialog("warning", "Selection Required", "Please select at least one Farmer to continue.");
      return;
    }
    if (!selectedDriver) {
      showDialog("warning", "Selection Required", "Please select a Driver to continue.");
      return;
    }
    setRaising(true);
    try {
      const payload = {
        farmers: selectedFarmers.map((f) => ({
          uid: f.uid,
          name: f.name,
          phone: f.phone,
          address: f.address || "",
        })),
        transportOwnerId: uid,
        createdBy: "transport_owner",
        driver: {
          uid: selectedDriver.uid,
          name: selectedDriver.name,
          phone: selectedDriver.phone,
        },
        vehicleNumber: selectedVehicle || vehicleSearch.trim() || null,
        // If driver assigned, status is assigned, otherwise requested.
        status: selectedDriver.uid ? "assigned" : "requested",
        assignedAt: selectedDriver.uid ? new Date() : null,
      };

      if (shipmentId) {
        await updateShipment(shipmentId, payload);
        showDialog("success", "Request Updated Successfully", "The pickup request has been updated.", () => {
          navigation.goBack();
        });
      } else {
        await requestPickup(payload);
        showDialog("success", "Request Raised Successfully", "The pickup request has been saved.", () => {
          navigation.goBack();
        });
      }
    } catch (e) {
      showDialog("error", "Error", e.message);
    }
    setRaising(false);
  };

  if (loading && farmers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Elegant Page Header Banner */}
          <View style={styles.headerCard}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="paper-plane" size={32} color={theme.textOnPrimary} />
            </View>
            <Text style={styles.headerTitle}>
              {shipmentId ? "Edit Pickup Request" : i18n.t("transportOwner.raiseRequestTitle")}
            </Text>
            <Text style={styles.headerSubtitle}>
              {shipmentId
                ? "Update the details for this pickup request below"
                : "Follow the steps below to dispatch a new pickup request"
              }
            </Text>
          </View>

          {/* STEP 1: FARMER SELECTION */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, selectedFarmers.length > 0 && styles.stepBadgeDone]}>
                {selectedFarmers.length > 0 ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.stepBadgeText}>1</Text>
                )}
              </View>
              <Text style={styles.stepTitle}>{i18n.t("transportOwner.farmersMultiSelect")}</Text>
            </View>

            <View style={styles.dropdownInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={farmerSearch}
                onChangeText={(txt) => {
                  setFarmerSearch(txt);
                  setShowFarmerDropdown(true);
                }}
                placeholder={i18n.t("transportOwner.farmerSearchPlaceholder")}
                placeholderTextColor={theme.placeholder}
                onFocus={() => {
                  if (farmerBlurRef.current) clearTimeout(farmerBlurRef.current);
                  setShowFarmerDropdown(true);
                }}
                onBlur={() => {
                  farmerBlurRef.current = setTimeout(() => {
                    setShowFarmerDropdown(false);
                  }, 200);
                }}
              />
              <TouchableOpacity style={styles.plusBtn} onPress={() => setAddFarmerVisible(true)}>
                <Ionicons name="add" size={24} color={theme.textOnPrimary} />
              </TouchableOpacity>
            </View>

            {showFarmerDropdown && (
              <View style={styles.dropdownList}>
                {filteredFarmers.length === 0 ? (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.noResultsText}>No Farmers found</Text>
                  </View>
                ) : (
                  filteredFarmers.map((item) => (
                    <TouchableOpacity
                      key={item.uid}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectFarmer(item)}
                    >
                      <Text style={styles.dropdownItemTitle}>{item.name}</Text>
                      <Text style={styles.dropdownItemSub}>{item.phone}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Selected Farmers Chips */}
            {selectedFarmers.length > 0 && (
              <View style={styles.chipsRow}>
                {selectedFarmers.map((f) => (
                  <View key={f.uid} style={styles.chip}>
                    <Text style={styles.chipText}>{f.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveFarmer(f.uid)} style={styles.chipRemove}>
                      <Text style={styles.chipRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Auto-populated Farmer details list */}
            {selectedFarmers.length > 0 && (
              <View style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                  <Ionicons name="people-outline" size={18} color={theme.primary} />
                  <Text style={styles.detailsTitle}>{i18n.t("transportOwner.farmerDetails")}</Text>
                </View>
                {selectedFarmers.map((f, idx) => (
                  <View key={f.uid} style={[styles.detailRow, idx < selectedFarmers.length - 1 && styles.detailRowBorder]}>
                    <Text style={styles.detailsTextName}>{f.name}</Text>
                    <Text style={styles.detailsTextPhone}>{f.phone}</Text>
                    {f.address ? (
                      <Text style={styles.detailsTextAddr}>{f.address}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* STEP 2: DRIVER ASSIGNMENT */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, selectedDriver && styles.stepBadgeDone]}>
                {selectedDriver ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.stepBadgeText}>2</Text>
                )}
              </View>
              <Text style={styles.stepTitle}>{i18n.t("transportOwner.driverLabel")}</Text>
            </View>

            <View style={styles.dropdownInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={driverSearch}
                onChangeText={(txt) => {
                  setDriverSearch(txt);
                  setShowDriverDropdown(true);
                  if (selectedDriver && selectedDriver.name !== txt) {
                    setSelectedDriver(null);
                  }
                }}
                placeholder={i18n.t("transportOwner.driverSearchPlaceholder")}
                placeholderTextColor={theme.placeholder}
                onFocus={() => {
                  if (driverBlurRef.current) clearTimeout(driverBlurRef.current);
                  setShowDriverDropdown(true);
                }}
                onBlur={() => {
                  driverBlurRef.current = setTimeout(() => {
                    setShowDriverDropdown(false);
                  }, 200);
                }}
              />
              <TouchableOpacity style={styles.plusBtn} onPress={() => setAddDriverVisible(true)}>
                <Ionicons name="add" size={24} color={theme.textOnPrimary} />
              </TouchableOpacity>
            </View>

            {showDriverDropdown && (
              <View style={styles.dropdownList}>
                {filteredDrivers.length === 0 ? (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.noResultsText}>No Drivers found</Text>
                  </View>
                ) : (
                  filteredDrivers.map((item) => (
                    <TouchableOpacity
                      key={item.uid}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedDriver(item);
                        setDriverSearch(item.name);
                        setShowDriverDropdown(false);
                        if (item.vehicleNumber) {
                          setSelectedVehicle(item.vehicleNumber);
                          setVehicleSearch(item.vehicleNumber);
                        }
                      }}
                    >
                      <Text style={styles.dropdownItemTitle}>{item.name}</Text>
                      <Text style={styles.dropdownItemSub}>
                        {item.phone} {item.vehicleNumber ? `| ${item.vehicleNumber}` : ""}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Auto-populated Driver details */}
            {selectedDriver && (
              <View style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                  <Ionicons name="person-outline" size={18} color={theme.primary} />
                  <Text style={styles.detailsTitle}>{i18n.t("transportOwner.driverDetails")}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailsTextName}>{selectedDriver.name}</Text>
                  <Text style={styles.detailsTextPhone}>{selectedDriver.phone}</Text>
                  {selectedDriver.vehicleNumber ? (
                    <Text style={styles.detailsTextAddr}>Vehicle: {selectedDriver.vehicleNumber}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          {/* STEP 3: VEHICLE DETAILS */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, (selectedVehicle || vehicleSearch.trim()) && styles.stepBadgeDone]}>
                {(selectedVehicle || vehicleSearch.trim()) ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.stepBadgeText}>3</Text>
                )}
              </View>
              <Text style={styles.stepTitle}>{i18n.t("transportOwner.vehicleLabel")} ({i18n.t("common.optional") || "Optional"})</Text>
            </View>

            <View style={styles.dropdownInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={vehicleSearch}
                onChangeText={(txt) => {
                  setVehicleSearch(txt);
                  setShowVehicleDropdown(true);
                  if (selectedVehicle && selectedVehicle !== txt) {
                    setSelectedVehicle(null);
                  }
                }}
                placeholder={i18n.t("transportOwner.vehicleSearchPlaceholder")}
                placeholderTextColor={theme.placeholder}
                onFocus={() => {
                  if (vehicleBlurRef.current) clearTimeout(vehicleBlurRef.current);
                  setShowVehicleDropdown(true);
                }}
                onBlur={() => {
                  vehicleBlurRef.current = setTimeout(() => {
                    setShowVehicleDropdown(false);
                  }, 200);
                }}
              />
              <TouchableOpacity style={styles.plusBtn} onPress={() => setAddVehicleVisible(true)}>
                <Ionicons name="add" size={24} color={theme.textOnPrimary} />
              </TouchableOpacity>
            </View>

            {showVehicleDropdown && (
              <View style={styles.dropdownList}>
                {filteredVehicles.length === 0 ? (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.noResultsText}>No Vehicles found</Text>
                  </View>
                ) : (
                  filteredVehicles.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedVehicle(item);
                        setVehicleSearch(item);
                        setShowVehicleDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemTitle}>{item}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Auto-populated Vehicle Details */}
            {selectedVehicle && (
              <View style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                  <Ionicons name="bus-outline" size={18} color={theme.primary} />
                  <Text style={styles.detailsTitle}>{i18n.t("transportOwner.vehicleDetails")}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailsTextName}>No: {selectedVehicle}</Text>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (raising || selectedFarmers.length === 0 || !selectedDriver) && styles.disabledBtn]}
            onPress={handleRaiseRequest}
            disabled={raising || selectedFarmers.length === 0 || !selectedDriver}
          >
            {raising ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {shipmentId ? "Update Request" : i18n.t("transportOwner.submitRequest")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* MODAL 1: Add Farmer Manual */}
        <Modal visible={addFarmerVisible} animationType="none" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>{i18n.t("transportOwner.addFarmerTitle")}</Text>

              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder={i18n.t("transportOwner.fullName")}
                placeholderTextColor={theme.placeholder}
                value={newFarmerName}
                onChangeText={setNewFarmerName}
              />

              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder={i18n.t("transportOwner.phone10Digit")}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor={theme.placeholder}
                value={newFarmerPhone}
                onChangeText={setNewFarmerPhone}
              />

              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder={i18n.t("transportOwner.addressLocation")}
                placeholderTextColor={theme.placeholder}
                value={newFarmerAddress}
                onChangeText={setNewFarmerAddress}
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.buttonSecondary }]}
                  onPress={() => setAddFarmerVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { color: theme.text }]}>{i18n.t("transportOwner.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  onPress={handleAddFarmer}
                >
                  <Text style={[styles.modalBtnText, { color: theme.textOnPrimary }]}>{i18n.t("transportOwner.save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 2: Add Driver Manual */}
        <Modal visible={addDriverVisible} animationType="none" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>{i18n.t("transportOwner.addDriverTitle")}</Text>

              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder={i18n.t("transportOwner.fullName")}
                placeholderTextColor={theme.placeholder}
                value={newDriverName}
                onChangeText={setNewDriverName}
              />

              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder={i18n.t("transportOwner.phone10Digit")}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor={theme.placeholder}
                value={newDriverPhone}
                onChangeText={setNewDriverPhone}
              />

              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder={i18n.t("transportOwner.assignedVehicleOptional")}
                placeholderTextColor={theme.placeholder}
                value={newDriverVehicle}
                onChangeText={setNewDriverVehicle}
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.buttonSecondary }]}
                  onPress={() => setAddDriverVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { color: theme.text }]}>{i18n.t("transportOwner.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  onPress={handleAddDriver}
                >
                  <Text style={[styles.modalBtnText, { color: theme.textOnPrimary }]}>{i18n.t("transportOwner.save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 3: Add Vehicle Manual */}
        <Modal visible={addVehicleVisible} animationType="none" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>{i18n.t("transportOwner.addVehicleTitle")}</Text>

              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder={i18n.t("transportOwner.vehicleNumPlaceholder")}
                placeholderTextColor={theme.placeholder}
                value={newVehicleNumber}
                onChangeText={setNewVehicleNumber}
                autoCapitalize="characters"
              />

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.buttonSecondary }]}
                  onPress={() => setAddVehicleVisible(false)}
                >
                  <Text style={[styles.modalBtnText, { color: theme.text }]}>{i18n.t("transportOwner.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                  onPress={handleAddVehicle}
                >
                  <Text style={[styles.modalBtnText, { color: theme.textOnPrimary }]}>{i18n.t("transportOwner.save")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <CustomDialog
        visible={dialogConfig.visible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onClose={handleDialogClose}
      />
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  headerCard: {
    backgroundColor: theme.primary,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  headerIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.textOnPrimary,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
  },
  stepCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.inputBg,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeDone: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.textSecondary,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
  },
  dropdownInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.inputBg,
  },
  plusBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  dropdownList: {
    backgroundColor: theme.cardBackground,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  dropdownItemSub: {
    fontSize: 11,
    color: theme.textLight,
    marginTop: 2,
  },
  noResultsText: {
    fontSize: 13,
    color: theme.textLight,
    textAlign: "center",
  },
  detailsCard: {
    backgroundColor: theme.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.primary,
  },
  detailRow: {
    paddingVertical: 4,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45, 106, 79, 0.1)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  detailsTextName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
  },
  detailsTextPhone: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 1,
  },
  detailsTextAddr: {
    fontSize: 12,
    color: theme.textLight,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    color: theme.textOnPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  chipRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipRemoveText: {
    color: theme.textOnPrimary,
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 14,
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    color: theme.textOnPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledBtn: {
    backgroundColor: theme.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    width: "88%",
    backgroundColor: theme.cardBackground,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.text,
    marginBottom: 20,
    textAlign: "center",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
});
