import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, StyleSheet, useColorScheme, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, useWindowDimensions } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuthStore } from "../../store/useAuthStore";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";

export default function InboundForecastScreen({ navigation }) {
  const { uid, name } = useAuthStore();
  const [shipments, setShipments] = useState([]);
  const [activeTab, setActiveTab] = useState("expected"); // expected, completed, all
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  const { width: windowWidth } = useWindowDimensions();
  const tabWidth = (windowWidth - 32 - 8) / 3;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Sync initial slide indicator position
  useEffect(() => {
    slideAnim.setValue(0);
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "shipments"),
      where("shopOwnerIds", "array-contains", uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort most recent first
      data.sort((a, b) => {
        const t1 = a.requestedAt?.seconds || 0;
        const t2 = b.requestedAt?.seconds || 0;
        return t2 - t1;
      });
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

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "picked_up":
        return { bg: theme.statusPickedUpBg, text: theme.statusPickedUpText };
      case "unloading":
        return { bg: theme.statusUnloadingBg, text: theme.statusUnloadingText };
      case "completed":
        return { bg: theme.statusCompletedBg, text: theme.statusCompletedText };
      default:
        return { bg: theme.statusRequestedBg, text: theme.statusRequestedText };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "picked_up":
        return i18n.t("driver.inTransit");
      case "unloading":
        return i18n.t("driver.unloading");
      case "completed":
        return i18n.t("driver.completed");
      default:
        return i18n.t("status.requested");
    }
  };

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
      case "expected":
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
      case "expected": return i18n.t("shop.tabExpected");
      case "completed": return i18n.t("shop.tabCompleted");
      default: return i18n.t("shop.tabAll");
    }
  };

  // Stats
  const expectedCount = shipments.filter(s => s.status !== "completed").length;
  const completedCount = shipments.filter(s => s.status === "completed").length;
  const totalCount = shipments.length;

  // Filtered shipments logic
  const getFilteredShipments = () => {
    switch (activeTab) {
      case "expected":
        return shipments.filter(s => s.status !== "completed");
      case "completed":
        return shipments.filter(s => s.status === "completed");
      default:
        return shipments;
    }
  };

  const renderEmptyState = () => {
    let msg = "";
    let iconName = "clipboard-outline";
    let iconColor = theme.textLight;

    switch (activeTab) {
      case "expected":
        msg = i18n.t("shop.noExpectedDeliveries");
        iconName = "bus-outline";
        break;
      case "completed":
        msg = i18n.t("shop.noCompletedDeliveries");
        iconName = "checkmark-circle-outline";
        iconColor = theme.primary;
        break;
      default:
        msg = i18n.t("shop.noDeliveriesFound");
        iconName = "folder-open-outline";
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={iconName} size={64} color={iconColor} style={{ marginBottom: 16 }} />
        <Text style={styles.emptyText}>{msg}</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTextContainer}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.ownerName}>{name || "Shop Owner"}</Text>
      </View>
      <View style={styles.compactBadge}>
        <Ionicons name="storefront-outline" size={13} color={theme.primary} style={{ marginRight: 4 }} />
        <Text style={styles.compactBadgeText}>Active Shop</Text>
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, getStatCardStyle("expected")]}>
        <Text style={[styles.statVal, { color: theme.statusAssignedText }]}>{expectedCount}</Text>
        <Text style={styles.statLbl}>{i18n.t("shop.tabExpected")}</Text>
      </View>
      <View style={[styles.statCard, getStatCardStyle("completed")]}>
        <Text style={[styles.statVal, { color: theme.primary }]}>{completedCount}</Text>
        <Text style={styles.statLbl}>{i18n.t("shop.tabCompleted")}</Text>
      </View>
      <View style={[styles.statCard, getStatCardStyle("total")]}>
        <Text style={styles.statVal}>{totalCount}</Text>
        <Text style={styles.statLbl}>{i18n.t("shop.tabAll")}</Text>
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

      {/* Animated Sliding Tabs */}
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
        {["expected", "completed", "all"].map((tab, index) => (
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} />
        }
        contentContainerStyle={getFilteredShipments().length === 0 ? { flexGrow: 1 } : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => {
          const myAllocation = item.shopAllocations?.find((a) => a.shopOwnerId === uid);
          const statusColors = getStatusColor(item.status);

          const handlePress = () => {
            if (item.status === "completed") {
              navigation.navigate("SaleLogging", { shipmentId: item.id, boxCount: myAllocation?.boxCount });
            } else {
              navigation.navigate("Discrepancy", { shipmentId: item.id, expected: myAllocation?.boxCount });
            }
          };

          return (
            <TouchableOpacity
              style={[styles.shipmentCard, getCardStatusStyle(item.status)]}
              activeOpacity={0.8}
              onPress={handlePress}
            >
              <View style={styles.cardHeader}>
                <View style={styles.deliveryTitleRow}>
                  <Ionicons name="cube-outline" size={18} color={theme.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.boxCountTitle}>
                    {i18n.t("shop.expectedBoxes", { count: myAllocation?.boxCount ?? 0 })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusLabelText, { color: statusColors.text }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {item.farmers && item.farmers.length > 0 && (
                  <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      Farmer(s): {item.farmers.map(f => f.name).join(", ")}
                    </Text>
                  </View>
                )}
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
                <Text style={styles.actionText}>
                  {item.status === "completed" ? "Proceed to Billing ➔" : "Verify Delivery ➔"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
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
  header: {
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
  ownerName: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text,
  },
  compactBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  compactBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.text,
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
    paddingBottom: 24,
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
