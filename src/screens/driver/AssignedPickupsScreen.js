import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useAuthStore } from "../../store/useAuthStore";
import { subscribeToAllDriverShipments } from "../../services/shipments";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";

const TABS = ["assigned", "inTransit", "history"];

export default function AssignedPickupsScreen({ navigation }) {
  const { uid, name } = useAuthStore();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("assigned");

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  const { width: windowWidth } = useWindowDimensions();
  const tabWidth = (windowWidth - 32 - 8) / 3;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideAnim.setValue(0);
  }, []);

  useEffect(() => {
    const unsub = subscribeToAllDriverShipments(uid, (data) => {
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

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  // --- Stats ---
  const assignedCount = shipments.filter((s) => s.status === "assigned").length;
  const inTransitCount = shipments.filter((s) =>
    ["picked_up", "unloading"].includes(s.status)
  ).length;
  const completedCount = shipments.filter(
    (s) => s.status === "completed"
  ).length;

  // --- Tab filtering ---
  const getFilteredShipments = () => {
    switch (activeTab) {
      case "assigned":
        return shipments.filter((s) => s.status === "assigned");
      case "inTransit":
        return shipments.filter((s) =>
          ["picked_up", "unloading"].includes(s.status)
        );
      case "history":
        return shipments.filter((s) => s.status === "completed");
      default:
        return shipments;
    }
  };

  // --- Status helpers ---
  const getStatusColor = (status) => {
    switch (status) {
      case "assigned":
        return { bg: theme.statusAssignedBg, text: theme.statusAssignedText };
      case "picked_up":
        return { bg: theme.statusPickedUpBg, text: theme.statusPickedUpText };
      case "unloading":
        return {
          bg: theme.statusUnloadingBg,
          text: theme.statusUnloadingText,
        };
      case "completed":
        return {
          bg: theme.statusCompletedBg,
          text: theme.statusCompletedText,
        };
      default:
        return { bg: theme.border, text: theme.textSecondary };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "assigned":
        return i18n.t("driver.assigned");
      case "picked_up":
        return i18n.t("driver.inTransit");
      case "unloading":
        return i18n.t("driver.unloading");
      case "completed":
        return i18n.t("driver.completed");
      default:
        return status;
    }
  };

  const getCardBorderStyle = (status) => {
    switch (status) {
      case "completed":
        return {
          borderLeftWidth: 5,
          borderLeftColor: theme.statusCompletedText,
        };
      case "assigned":
        return {
          borderLeftWidth: 5,
          borderLeftColor: theme.statusAssignedText,
        };
      case "picked_up":
        return {
          borderLeftWidth: 5,
          borderLeftColor: theme.statusPickedUpText,
        };
      case "unloading":
        return {
          borderLeftWidth: 5,
          borderLeftColor: theme.statusUnloadingText,
        };
      default:
        return {
          borderLeftWidth: 5,
          borderLeftColor: theme.statusRequestedText,
        };
    }
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case "assigned":
        return i18n.t("driver.tabAssigned");
      case "inTransit":
        return i18n.t("driver.tabInTransit");
      case "history":
        return i18n.t("driver.tabHistory");
      default:
        return tab;
    }
  };

  const renderEmptyState = () => {
    let msg = "";
    let iconName = "clipboard-outline";
    let iconColor = theme.textLight;

    switch (activeTab) {
      case "assigned":
        msg = i18n.t("driver.noAssignedShipments");
        iconName = "time-outline";
        iconColor = theme.statusAssignedText;
        break;
      case "inTransit":
        msg = i18n.t("driver.noInTransitShipments");
        iconName = "bus-outline";
        iconColor = theme.statusPickedUpText;
        break;
      case "history":
        msg = i18n.t("driver.noCompletedShipments");
        iconName = "checkmark-circle-outline";
        iconColor = theme.statusCompletedText;
        break;
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={iconName}
          size={64}
          color={iconColor}
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.emptyText}>{msg}</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.welcomeText}>Hello,</Text>
        <Text style={styles.driverName}>
          {name || i18n.t("signUp.role.driver")}
        </Text>
      </View>
      <View style={styles.statusIndicator}>
        <View style={styles.greenDot} />
        <Text style={styles.statusText}>{i18n.t("driver.onDuty")}</Text>
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: theme.statActiveBg, borderColor: theme.statActiveBorder, borderWidth: 1 }]}>
        <Text style={[styles.statNumber, { color: theme.statusAssignedText }]}>
          {assignedCount}
        </Text>
        <Text style={styles.statLabel}>{i18n.t("driver.assigned")}</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: theme.statusPickedUpBg, borderColor: theme.statusPickedUpText + "30", borderWidth: 1 }]}>
        <Text style={[styles.statNumber, { color: theme.statusPickedUpText }]}>
          {inTransitCount}
        </Text>
        <Text style={styles.statLabel}>{i18n.t("driver.inTransit")}</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: theme.statCompletedBg, borderColor: theme.statCompletedBorder, borderWidth: 1 }]}>
        <Text style={[styles.statNumber, { color: theme.statusCompletedText }]}>
          {completedCount}
        </Text>
        <Text style={styles.statLabel}>{i18n.t("driver.completed")}</Text>
      </View>
    </View>
  );

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

      {/* Animated Sliding Tab Bar */}
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
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab, index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {getTabLabel(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Shipment Cards */}
      <FlatList
        data={getFilteredShipments()}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
          />
        }
        contentContainerStyle={
          getFilteredShipments().length === 0
            ? { flexGrow: 1 }
            : styles.listContainer
        }
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => {
          const statusColors = getStatusColor(item.status);
          const firstFarmer = item.farmers && item.farmers[0];
          const isCompleted = item.status === "completed";

          return (
            <TouchableOpacity
              style={[styles.card, getCardBorderStyle(item.status)]}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("PickupEntry", {
                  shipmentId: item.id,
                  status: item.status,
                })
              }
              disabled={isCompleted}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.routeRow}>
                  <Ionicons
                    name="location-sharp"
                    size={18}
                    color={theme.primary}
                  />
                  <Text style={styles.routeText}>
                    {firstFarmer?.address ? firstFarmer.address : "Farm"} ➡️{" "}
                    {i18n.t("driver.routeTo")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColors.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusLabelText,
                      { color: statusColors.text },
                    ]}
                  >
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                <Text style={styles.label}>
                  {i18n.t("transportOwner.farmers")}:
                </Text>
                {item.farmers &&
                  item.farmers.map((farmer, index) => (
                    <View key={index} style={styles.farmerRow}>
                      <View style={styles.farmerInfo}>
                        <Ionicons
                          name="person-outline"
                          size={15}
                          color={theme.textSecondary}
                        />
                        <Text style={styles.farmerNameText}>
                          {farmer.name}
                        </Text>
                      </View>
                      {!isCompleted && (
                        <TouchableOpacity
                          style={styles.callButton}
                          onPress={() => handleCall(farmer.phone)}
                        >
                          <Ionicons
                            name="call"
                            size={13}
                            color={theme.primary}
                          />
                          <Text style={styles.callText}>
                            {i18n.t("driver.callFarmer")}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                <Text style={styles.label}>
                  {i18n.t("transportOwner.shops")}:
                </Text>
                {item.shopAllocations &&
                  item.shopAllocations.map((shop, index) => (
                    <View key={index} style={styles.farmerRow}>
                      <View style={styles.farmerInfo}>
                        <Ionicons
                          name="person-outline"
                          size={15}
                          color={theme.textSecondary}
                        />
                        <Text style={styles.farmerNameText}>
                          {shop?.shopId}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.callButton}
                      >
                        <Ionicons
                          name="cube-outline"
                          size={13}
                          color={theme.primary}
                        />
                        <Text style={styles.callText}>
                          {shop?.boxCount}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}



                {item.vehicleNumber ? (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: theme.primaryLight, padding: 10, borderRadius: 10 }}>
                    <View style={styles.detailBox}>
                      <Ionicons
                        name="bus-outline"
                        size={16}
                        color={theme.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.detailText}>
                        Vehicle: {item.vehicleNumber}
                      </Text>
                    </View>


                    <View style={styles.detailBox}>
                      <Ionicons
                        name="cube-outline"
                        size={16}
                        color={theme.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.detailText}>
                        {item.boxCount} boxes
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Show PIN for completed / picked_up */}
                {/* {item.pin && (
                  <View style={styles.pinContainer}>
                    <Text style={styles.pinLabel}>PIN</Text>
                    <View style={styles.pinBadge}>
                      <Text style={styles.pinText}>{item.pin}</Text>
                    </View>
                  </View>
                )} */}
              </View>

              {/* Card Footer */}
              {!isCompleted && (
                <View style={styles.cardFooter}>
                  <Text style={styles.actionText}>
                    {i18n.t("driver.pickupStatus")} ➔
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      marginTop: 8,
      paddingHorizontal: 16,
    },
    welcomeText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    driverName: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.text,
    },
    statusIndicator: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    greenDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.success,
      marginRight: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.text,
    },

    /* Stats Row */
    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
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
    statNumber: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.primary,
    },
    statLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 4,
      textAlign: "center",
    },

    /* Tab Bar — same design as FleetOverviewScreen */
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

    /* List */
    listContainer: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 24,
    },
    card: {
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
      borderBottomColor: theme.border,
      paddingBottom: 12,
      marginBottom: 12,
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 8,
    },
    routeText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      marginLeft: 6,
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
      marginBottom: 12,
    },
    label: {
      fontSize: 11,
      color: theme.textSecondary,
      textTransform: "uppercase",
    },
    farmerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
    },
    farmerInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    farmerNameText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
      marginLeft: 6,
    },
    callButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.primary + "30",
    },
    callText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.primary,
      marginLeft: 4,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderColor: theme.border + "50",
    },
    detailBox: {
      flexDirection: "row",
      alignItems: "center",
      // marginTop: 8,
      // paddingTop: 8,
      // borderTopWidth: 1,
      // borderColor: theme.border + "50",
    },
    detailText: {
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
    cardFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    actionText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.primary,
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
