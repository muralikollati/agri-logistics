import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, ActivityIndicator, Animated, useWindowDimensions } from "react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { requestPickup, subscribeToFarmerShipments } from "../../services/shipments";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import CustomDialog from "../../components/CustomDialog";

export default function RequestPickupScreen({ navigation }) {
  const { uid, name, phone, address, transportOwnerId } = useAuthStore();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

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

  const { width: windowWidth } = useWindowDimensions();
  const tabWidth = (windowWidth - 32 - 8) / 3;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Sync initial slide indicator position
  useEffect(() => {
    slideAnim.setValue(0);
  }, []);

  useEffect(() => {
    const unsub = subscribeToFarmerShipments(uid, (data) => {
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

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      const ownerId = transportOwnerId || "REPLACE_WITH_LINKED_TRANSPORT_OWNER_ID";
      await requestPickup({
        farmers: [{
          uid,
          name: name || "Farmer",
          phone: phone || "",
          address: address || ""
        }],
        transportOwnerId: ownerId,
        createdBy: "farmer",
      });
      showDialog("success", i18n.t("common.submit"), i18n.t("farmer.waitingForDriver"));
    } catch (e) {
      showDialog("error", i18n.t("common.cancel"), e.message);
    }
    setSubmitting(false);
  };

  // Filter shipments based on tab
  const getFilteredShipments = () => {
    switch (activeTab) {
      case "active":
        return shipments.filter(s => s.status !== "completed");
      case "completed":
        return shipments.filter(s => s.status === "completed");
      default:
        return shipments;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "assigned":
        return { bg: theme.statusAssignedBg, text: theme.statusAssignedText };
      case "picked_up":
        return { bg: theme.statusPickedUpBg, text: theme.statusPickedUpText };
      case "unloading":
        return { bg: theme.statusUnloadingBg, text: theme.statusUnloadingText };
      case "unloaded":
      case "completed":
        return { bg: theme.statusCompletedBg, text: theme.statusCompletedText };
      default:
        return { bg: theme.statusRequestedBg, text: theme.statusRequestedText };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "assigned":
        return i18n.t("status.assigned");
      case "picked_up":
        return i18n.t("status.picked_up");
      case "unloading":
        return i18n.t("status.unloading");
      case "unloaded":
      case "completed":
        return i18n.t("status.completed");
      default:
        return i18n.t("status.requested");
    }
  };

  const getCardStatusStyle = (status) => {
    switch (status) {
      case "completed":
      case "unloaded":
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

  const getTabLabel = (tab) => {
    switch (tab) {
      case "active": return i18n.t("farmer.tabActive");
      case "completed": return i18n.t("farmer.tabCompleted");
      default: return i18n.t("farmer.tabAll");
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTextContainer}>
        <Text style={styles.welcomeText}>Hello,</Text>
        <Text style={styles.farmerName}>{name || "Farmer"}</Text>
      </View>
      {address ? (
        <View style={styles.compactAddress}>
          <Ionicons name="location-outline" size={13} color={theme.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.compactAddressText} numberOfLines={1}>
            {address}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderStats = () => {
    const activeCount = shipments.filter(s => s.status !== "completed").length;
    const completedCount = shipments.filter(s => s.status === "completed").length;
    const totalCount = shipments.length;

    return (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, getStatCardStyle("active")]}>
          <Text style={[styles.statVal, { color: theme.statusAssignedText }]}>{activeCount}</Text>
          <Text style={styles.statLbl}>{i18n.t("farmer.tabActive")}</Text>
        </View>
        <View style={[styles.statCard, getStatCardStyle("completed")]}>
          <Text style={[styles.statVal, { color: theme.primary }]}>{completedCount}</Text>
          <Text style={styles.statLbl}>{i18n.t("farmer.tabCompleted")}</Text>
        </View>
        <View style={[styles.statCard, getStatCardStyle("total")]}>
          <Text style={styles.statVal}>{totalCount}</Text>
          <Text style={styles.statLbl}>{i18n.t("farmer.tabAll")}</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    let msg = "";
    let iconName = "clipboard-outline";
    let iconColor = theme.textLight;

    switch (activeTab) {
      case "active":
        msg = i18n.t("farmer.noActiveShipments");
        iconName = "bus-outline";
        break;
      case "completed":
        msg = i18n.t("farmer.noCompletedShipments");
        iconName = "checkmark-circle-outline";
        iconColor = theme.primary;
        break;
      default:
        msg = i18n.t("farmer.noShipmentsFound");
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
      {renderHeader()}
      {renderStats()}

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

      <FlatList
        data={getFilteredShipments()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={getFilteredShipments().length === 0 ? { flexGrow: 1 } : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => {
          const statusColors = getStatusColor(item.status);
          const myBoxes = item.shopAllocations
            ?.flatMap(a => a.farmerAllocations || [])
            ?.filter(f => f.farmerId === uid)
            ?.reduce((sum, f) => sum + f.boxCount, 0) || item.boxCount || 0;

          return (
            <TouchableOpacity
              style={[styles.shipmentCard, getCardStatusStyle(item.status)]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("ShipmentStatus", { shipmentId: item.id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.deliveryTitleRow}>
                  <Ionicons name="cube-outline" size={18} color={theme.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.boxCountTitle}>
                    {myBoxes > 0 ? `${myBoxes} Boxes` : "Pending Count"}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusLabelText, { color: statusColors.text }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {item.vehicleNumber && (
                  <View style={styles.infoRow}>
                    <Ionicons name="bus-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.infoText}>Truck: {item.vehicleNumber}</Text>
                  </View>
                )}
                {item.driver && (
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.infoText}>Driver: {item.driver.name}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.actionText}>Track Delivery ➔</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Action Button (FAB) for "My Produce is Ready" */}
      <TouchableOpacity
        style={[styles.fab, submitting && styles.disabledBtn]}
        onPress={handleRequest}
        activeOpacity={0.8}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={theme.textOnPrimary} />
        ) : (
          <>
            <Ionicons name="add" size={24} color={theme.textOnPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.fabText}>{i18n.t("farmer.produceReady")}</Text>
          </>
        )}
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
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  farmerName: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text,
  },
  compactAddress: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  compactAddressText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.text,
    maxWidth: 150,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statVal: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
  },
  statLbl: {
    fontSize: 11,
    color: theme.textSecondary,
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
  disabledBtn: {
    opacity: 0.6,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  deliveryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  boxCountTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusLabelText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingTop: 12,
    alignItems: "flex-end",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.primary,
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
});
