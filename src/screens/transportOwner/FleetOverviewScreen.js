import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Animated, useWindowDimensions } from "react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { subscribeToOwnerShipments, deleteShipment } from "../../services/shipments";
import { colors } from "../../theme/colors";
import i18n from "../../i18n";
import { Ionicons } from "@expo/vector-icons";
import CustomDialog from "../../components/CustomDialog";

export default function FleetOverviewScreen({ navigation }) {
  const { uid } = useAuthStore();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // default is 'active'
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
    setDialogConfig({ visible: false, type: "info", title: "", message: "", onConfirm: null });
  };

  const confirmDelete = (shipmentId) => {
    showDialog(
      "confirm",
      "Delete Request",
      "Are you sure you want to delete this pickup request? This action cannot be undone.",
      async () => {
        handleDialogClose();
        try {
          await deleteShipment(shipmentId);
          setTimeout(() => {
            showDialog("success", "Deleted Successfully", "The pickup request has been deleted.");
          }, 400);
        } catch (e) {
          showDialog("error", "Error", e.message);
        }
      }
    );
  };

  const { width: windowWidth } = useWindowDimensions();
  const tabWidth = (windowWidth - 32 - 8) / 3;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Sync initial slide indicator position (index 0 for 'active')
  useEffect(() => {
    slideAnim.setValue(0);
  }, []);

  const getCardStatusStyle = (status) => {
    switch (status) {
      case "completed":
        return { borderLeftWidth: 5, borderLeftColor: theme.statusCompletedText };
      case "assigned":
        return { borderLeftWidth: 5, borderLeftColor: theme.statusAssignedText };
      case "picked_up":
        return { borderLeftWidth: 5, borderLeftColor: theme.statusPickedUpText };
      case "unloading":
        return { borderLeftWidth: 5, borderLeftColor: theme.statusUnloadingText };
      default:
        return { borderLeftWidth: 5, borderLeftColor: theme.statusRequestedText };
    }
  };

  const getStatCardStyle = (type) => {
    switch (type) {
      case "active":
        return {
          backgroundColor: theme.statActiveBg,
          borderColor: theme.statActiveBorder,
          borderWidth: 1,
        };
      case "completed":
        return {
          backgroundColor: theme.statCompletedBg,
          borderColor: theme.statCompletedBorder,
          borderWidth: 1,
        };
      default: // total
        return {
          backgroundColor: theme.statTotalBg,
          borderColor: theme.statTotalBorder,
          borderWidth: 1,
        };
    }
  };

  useEffect(() => {
    const unsub = subscribeToOwnerShipments(uid, (data) => {
      setShipments(data);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const handleTabPress = (tab, index) => {
    setActiveTab(tab);
    Animated.spring(slideAnim, {
      toValue: index * tabWidth,
      useNativeDriver: true,
      tension: 45,
      friction: 8,
    }).start();
  };

  // Statistics calculation
  const pendingCount = shipments.filter((s) => s.status === "requested").length;
  const activeCount = shipments.filter((s) => ["assigned", "picked_up", "unloading"].includes(s.status)).length;
  const completedCount = shipments.filter((s) => s.status === "completed").length;
  const totalCount = shipments.length;

  // Filter shipments based on tab
  const getFilteredShipments = () => {
    switch (activeTab) {
      case "active":
        return shipments.filter((s) => ["assigned", "picked_up", "unloading"].includes(s.status));
      case "completed":
        return shipments.filter((s) => s.status === "completed");
      default:
        return shipments;
    }
  };

  const getStatusBadge = (status) => {
    let bg = theme.buttonSecondary;
    let textCol = theme.text;
    let label = i18n.t(`status.${status}`) || status;

    switch (status) {
      case "requested":
        bg = theme.statusRequestedBg;
        textCol = theme.statusRequestedText;
        break;
      case "assigned":
        bg = theme.statusAssignedBg;
        textCol = theme.statusAssignedText;
        break;
      case "picked_up":
        bg = theme.statusPickedUpBg;
        textCol = theme.statusPickedUpText;
        break;
      case "unloading":
        bg = theme.statusUnloadingBg;
        textCol = theme.statusUnloadingText;
        break;
      case "completed":
        bg = theme.statusCompletedBg;
        textCol = theme.statusCompletedText;
        break;
    }

    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color: textCol }]}>{label}</Text>
      </View>
    );
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case "all": return i18n.t("transportOwner.tabAll");
      case "active": return i18n.t("transportOwner.tabActive");
      case "completed": return i18n.t("transportOwner.tabHistory");
      default: return tab;
    }
  };

  const renderEmptyState = () => {
    let msg = "";
    let iconName = "clipboard-outline";
    let iconColor = theme.textLight;

    switch (activeTab) {
      case "active":
        msg = i18n.t("transportOwner.noActiveShipments");
        iconName = "bus-outline";
        break;
      case "completed":
        msg = i18n.t("transportOwner.noCompletedShipments");
        iconName = "checkmark-circle-outline";
        iconColor = theme.primary;
        break;
      default:
        msg = i18n.t("transportOwner.noShipmentsFound");
        iconName = "folder-open-outline";
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={iconName} size={64} color={iconColor} style={{ marginBottom: 16 }} />
        <Text style={styles.emptyText}>{msg}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Overview Stats Dashboard Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, getStatCardStyle("active")]}>
          <Text style={[styles.statVal, { color: theme.statusAssignedText }]}>{activeCount}</Text>
          <Text style={styles.statLbl}>{i18n.t("transportOwner.inTransit")}</Text>
        </View>
        <View style={[styles.statCard, getStatCardStyle("completed")]}>
          <Text style={[styles.statVal, { color: theme.primary }]}>{completedCount}</Text>
          <Text style={styles.statLbl}>{i18n.t("transportOwner.delivered")}</Text>
        </View>
        <View style={[styles.statCard, getStatCardStyle("total")]}>
          <Text style={styles.statVal}>{totalCount}</Text>
          <Text style={styles.statLbl}>{i18n.t("transportOwner.totalTrips")}</Text>
        </View>
      </View>

      {/* Navigation Filter Tabs */}
      <View style={styles.tabBar}>
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              width: tabWidth,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
        {["active", "completed", "all"].map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab, index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {getTabLabel(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction Shipment Cards */}
      <FlatList
        data={getFilteredShipments()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => (
          <View style={[styles.shipmentCard, getCardStatusStyle(item.status)]}>
            <View style={styles.cardHeader}>
              <Text style={styles.shipmentIdText}>ID: {item.id.slice(-6).toUpperCase()}</Text>
              {getStatusBadge(item.status)}
            </View>

            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="people-outline" size={18} color={theme.textLight} style={{ marginRight: 6 }} />
                  <Text style={styles.infoLabel}>{i18n.t("transportOwner.farmers")}</Text>
                </View>
                <View style={{ alignItems: "flex-end", flex: 1, marginLeft: 16 }}>
                  {item.farmers && item.farmers.length > 0 ? (
                    item.farmers.map((f) => (
                      <Text key={f.uid} style={styles.infoValue}>{f.name} ({f.phone})</Text>
                    ))
                  ) : (
                    <Text style={styles.infoValue}>{item.farmerId || "N/A"}</Text>
                  )}
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="person-outline" size={16} color={theme.textLight} style={{ marginRight: 6 }} />
                  <Text style={styles.infoLabel}>{i18n.t("transportOwner.driver")}</Text>
                </View>
                <Text style={styles.infoValue}>
                  {item.driver ? `${item.driver.name} (${item.driver.phone})` : (item.driverId || i18n.t("transportOwner.unassigned"))}
                </Text>
              </View>
              {item.vehicleNumber && (
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Ionicons name="bus-outline" size={16} color={theme.textLight} style={{ marginRight: 6 }} />
                    <Text style={styles.infoLabel}>{i18n.t("transportOwner.vehicleLabel") || "Vehicle"}</Text>
                  </View>
                  <Text style={styles.infoValue}>{item.vehicleNumber}</Text>
                </View>
              )}
              {item.boxCount && (
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelContainer}>
                    <Ionicons name="cube-outline" size={16} color={theme.textLight} style={{ marginRight: 6 }} />
                    <Text style={styles.infoLabel}>{i18n.t("transportOwner.totalBoxes")}</Text>
                  </View>
                  <Text style={styles.infoValue}>{item.boxCount} {i18n.t("transportOwner.totalBoxes")}</Text>
                </View>
              )}
              {item.pin && ["picked_up", "unloading"].includes(item.status) && (
                <View style={styles.pinContainer}>
                  <Text style={styles.pinLabel}>{i18n.t("transportOwner.pinBackup")}:</Text>
                  <View style={styles.pinBadge}>
                    <Text style={styles.pinText}>{item.pin}</Text>
                  </View>
                </View>
              )}
            </View>

            {(item.status === "requested" || item.status === "assigned") && (
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={[styles.smallActionBtn, styles.editBtn]}
                  onPress={() => navigation.navigate("RaiseRequest", { shipmentId: item.id })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={15} color={theme.primary} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallActionBtn, styles.deleteBtn]}
                  onPress={() => confirmDelete(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={15} color={theme.error} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>

                {item.status === "requested" && (
                  <TouchableOpacity
                    style={[styles.smallActionBtn, styles.assignBtn]}
                    onPress={() => navigation.navigate("AssignDriver", { shipmentId: item.id })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="car-outline" size={15} color={theme.textOnPrimary} />
                    <Text style={styles.assignBtnText}>Assign</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("RaiseRequest")}
      >
        <Text style={styles.fabText}>+ {i18n.t("transportOwner.raiseRequestTitle")}</Text>
      </TouchableOpacity>

      <CustomDialog
        visible={dialogConfig.visible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onClose={handleDialogClose}
        onConfirm={dialogConfig.onConfirm}
      />
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statVal: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.text,
  },
  statLbl: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.textLight,
    marginTop: 4,
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    position: "relative",
    backgroundColor: theme.inputBg,
    borderRadius: 24,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
    height: 48,
    alignItems: "center",
  },
  slidingIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 20,
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabItem: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.textLight,
  },
  activeTabText: {
    color: theme.textOnPrimary,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 90,
  },
  shipmentCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: theme.background === "#121212" ? 1 : 0,
    borderColor: theme.border,
  },
  infoLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  shipmentIdText: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 13,
    color: theme.textLight,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.primaryLight,
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  pinLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.primary,
  },
  pinBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pinText: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.textOnPrimary,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  smallActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  editBtn: {
    backgroundColor: theme.primaryLight,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  editBtnText: {
    color: theme.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 71, 111, 0.1)",
    borderWidth: 1,
    borderColor: theme.error,
  },
  deleteBtnText: {
    color: theme.error,
    fontWeight: "700",
    fontSize: 12,
  },
  assignBtn: {
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  assignBtnText: {
    color: theme.textOnPrimary,
    fontWeight: "700",
    fontSize: 12,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 40,
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  fabText: {
    color: theme.textOnPrimary,
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: theme.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
});
