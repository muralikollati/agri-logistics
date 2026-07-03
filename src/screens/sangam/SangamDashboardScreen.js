import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, StyleSheet, useColorScheme, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, useWindowDimensions } from "react-native";
import { subscribeToSangamShipments } from "../../services/marketOps";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";

export default function SangamDashboardScreen({ navigation }) {
  const [shipments, setShipments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

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
    const unsub = subscribeToSangamShipments((data) => {
      // Sort most recent first
      const sorted = [...data].sort((a, b) => {
        const t1 = a.requestedAt?.seconds || 0;
        const t2 = b.requestedAt?.seconds || 0;
        return t2 - t1;
      });
      setShipments(sorted);
      setLoading(false);
    });
    return unsub;
  }, []);

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
        return { bg: theme.border, text: theme.textSecondary };
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
        return status;
    }
  };

  const getCardStatusStyle = (status) => {
    switch (status) {
      case "completed":
        return { borderLeftWidth: 5, borderLeftColor: theme.statusCompletedText };
      case "picked_up":
        return { borderLeftWidth: 5, borderLeftColor: theme.statusPickedUpText };
      case "unloading":
        return { borderLeftWidth: 5, borderLeftColor: theme.statusUnloadingText };
      default:
        return { borderLeftWidth: 5, borderLeftColor: theme.border };
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
      case "active": return i18n.t("sangam.tabActive");
      case "completed": return i18n.t("sangam.tabCompleted");
      default: return i18n.t("sangam.tabAll");
    }
  };

  // Stats
  const activeCount = shipments.filter(s => s.status === "unloading").length;
  const completedCount = shipments.filter(s => s.status === "completed").length;
  const totalCount = shipments.length;

  // Filter logic
  const getFilteredShipments = () => {
    switch (activeTab) {
      case "active":
        return shipments.filter(s => s.status === "unloading");
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
      case "active":
        msg = i18n.t("sangam.noActiveShipments");
        iconName = "bus-outline";
        break;
      case "completed":
        msg = i18n.t("sangam.noCompletedShipments");
        iconName = "checkmark-circle-outline";
        iconColor = theme.primary;
        break;
      default:
        msg = i18n.t("sangam.noShipmentsFound");
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
      <Text style={styles.title}>{i18n.t("sangam.title")}</Text>
      <Text style={styles.subtitle}>Track arriving vehicles, verify security PINs, and log box unload counts.</Text>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, getStatCardStyle("active")]}>
        <Text style={[styles.statVal, { color: theme.statusAssignedText }]}>{activeCount}</Text>
        <Text style={styles.statLbl}>{i18n.t("sangam.tabActive")}</Text>
      </View>
      <View style={[styles.statCard, getStatCardStyle("completed")]}>
        <Text style={[styles.statVal, { color: theme.primary }]}>{completedCount}</Text>
        <Text style={styles.statLbl}>{i18n.t("sangam.tabCompleted")}</Text>
      </View>
      <View style={[styles.statCard, getStatCardStyle("total")]}>
        <Text style={styles.statVal}>{totalCount}</Text>
        <Text style={styles.statLbl}>{i18n.t("sangam.tabAll")}</Text>
      </View>
    </View>
  );

  const renderShipmentCard = ({ item }) => {
    const statusColors = getStatusColor(item.status);
    const isInTransit = item.status === "picked_up";
    const isCompleted = item.status === "completed";

    const handlePressCard = () => {
      if (item.status === "picked_up") {
        navigation.navigate("PinEntry", { shipmentId: item.id });
      } else if (item.status === "unloading") {
        navigation.navigate("UnloadEntry", { shipmentId: item.id });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.card, getCardStatusStyle(item.status)]}
        activeOpacity={0.85}
        onPress={handlePressCard}
        disabled={isCompleted}
      >
        <View style={styles.cardHeader}>
          <View style={styles.vehicleRow}>
            <Ionicons name="bus-outline" size={20} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={styles.vehicleNumber}>{item.vehicleNumber || "Unknown Truck"}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Driver Details (Always visible) */}
          {item.driver && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.infoText}>
                {item.driver.name} ({item.driver.phone})
              </Text>
            </View>
          )}

          {/* If it is picked_up (in transit), hide farmers and box counts */}
          {!isInTransit && (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.farmers ? item.farmers.map(f => f.name).join(", ") : "Unknown Farmers"}
                </Text>
              </View>
              {item.boxCount && (
                <View style={styles.infoRow}>
                  <Ionicons name="cube-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={styles.boxText}>{item.boxCount} boxes loaded</Text>
                </View>
              )}
            </>
          )}
        </View>

        {!isCompleted && (
          <View style={styles.cardFooter}>
            <Text style={styles.actionLink}>
              {item.status === "picked_up" ? "Verify Pin ➔" : "Log Unload ➔"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
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
        renderItem={renderShipmentCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.primary]} />
        }
        contentContainerStyle={[styles.listContainer, getFilteredShipments().length === 0 && { flexGrow: 1 }]}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Floating verify truck button on bottom right */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("TruckArrival")}
      >
        <Ionicons name="scan-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.fabText}>{i18n.t("sangam.verifyTruck")}</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
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
    borderColor: theme.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: {
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
    flex: 1,
  },
  boxText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  actionLink: {
    fontSize: 13,
    fontWeight: "700",
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
