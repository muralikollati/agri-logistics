import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, useColorScheme, ActivityIndicator, TouchableOpacity } from "react-native";
import { subscribeToShipment } from "../../services/shipments";
import { subscribeToSales } from "../../services/marketOps";
import { useAuthStore } from "../../store/useAuthStore";
import i18n from "../../i18n";
import { colors } from "../../theme/colors";
import { Ionicons } from "@expo/vector-icons";

export default function ShipmentStatusScreen({ route, navigation }) {
  const { shipmentId } = route.params;
  const { uid } = useAuthStore();
  const [shipment, setShipment] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  useEffect(() => {
    const unsub1 = subscribeToShipment(shipmentId, (data) => {
      setShipment(data);
      setLoading(false);
    });
    const unsub2 = subscribeToSales(shipmentId, setSales);
    return () => {
      unsub1();
      unsub2();
    };
  }, [shipmentId]);

  if (loading || !shipment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Calculate Farmer's dynamic stats and ledger
  let totalFarmerExpectedBoxes = 0;
  const shopContributions = [];

  // Parse allocations to identify how many boxes this farmer expected to send to each shop
  if (shipment.shopAllocations && shipment.shopAllocations.length > 0) {
    shipment.shopAllocations.forEach((shopAlloc) => {
      const myAlloc = shopAlloc.farmerAllocations?.find(f => f.farmerId === uid);
      if (myAlloc) {
        totalFarmerExpectedBoxes += myAlloc.boxCount;
        shopContributions.push({
          shopId: shopAlloc.shopId,
          shopOwnerId: shopAlloc.shopOwnerId,
          totalShopExpected: shopAlloc.boxCount,
          farmerExpected: myAlloc.boxCount,
          ratio: shopAlloc.boxCount > 0 ? myAlloc.boxCount / shopAlloc.boxCount : 0,
        });
      }
    });
  }

  // Compute live profit share from logged sales
  let grossRevenue = 0;
  const calculatedSales = sales.map((sale) => {
    // Find the contribution ratio for the shop that logged this sale
    const contribution = shopContributions.find(c => c.shopOwnerId === sale.shopOwnerId);
    const ratio = contribution ? contribution.ratio : 0;
    const farmerBoxesShare = ratio * sale.boxesSold;
    const farmerShareRevenue = farmerBoxesShare * sale.pricePerBox;
    grossRevenue += farmerShareRevenue;

    return {
      id: sale.id,
      shopId: contribution ? contribution.shopId : "Unknown Shop",
      boxesSold: farmerBoxesShare.toFixed(1),
      pricePerBox: sale.pricePerBox,
      shareRevenue: farmerShareRevenue,
      isFinal: sale.isFinal,
    };
  });

  const marketFee = grossRevenue * 0.05; // 5% market commission
  const netPayout = grossRevenue - marketFee;

  const getStatusColor = (status) => {
    switch (status) {
      case "assigned":
        return { bg: theme.primary + "15", text: theme.primary };
      case "picked_up":
        return { bg: theme.warning + "15", text: theme.warning };
      case "unloading":
        return { bg: theme.info + "15", text: theme.info };
      case "unloaded":
        return { bg: theme.success + "15", text: theme.success };
      case "completed":
        return { bg: theme.success + "20", text: theme.success };
      default:
        return { bg: theme.border, text: theme.textSecondary };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "assigned":
        return "Driver Assigned";
      case "picked_up":
        return "In Transit";
      case "unloading":
        return "Unloading";
      case "unloaded":
        return "Unloaded";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Shipment Status & Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Shipment Status</Text>
            <Text style={styles.cardSub}>ID: {shipmentId.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusColor(shipment.status)]}>
            <Text style={[styles.statusLabel, { color: getStatusColor(shipment.status).text }]}>
              {getStatusLabel(shipment.status)}
            </Text>
          </View>
        </View>

        {shipment.vehicleNumber && (
          <View style={styles.infoRow}>
            <Ionicons name="bus-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>Vehicle: {shipment.vehicleNumber}</Text>
          </View>
        )}

        {shipment.driver && (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              Driver: {shipment.driver.name} ({shipment.driver.phone})
            </Text>
          </View>
        )}
      </View>

      {/* Live Profit Ledger Projection */}
      <View style={styles.ledgerCard}>
        <View style={styles.ledgerHeader}>
          <Ionicons name="trending-up" size={20} color={theme.success} style={{ marginRight: 6 }} />
          <Text style={styles.ledgerTitle}>Live Profit Projection</Text>
        </View>

        <Text style={styles.payoutValue}>₹{netPayout.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</Text>
        <Text style={styles.payoutLabel}>Est. Net Payout (after 5% Market Fee)</Text>

        <View style={styles.ledgerDivider} />

        <View style={styles.ledgerRow}>
          <View>
            <Text style={styles.ledgerSubText}>Gross Sales Revenue</Text>
            <Text style={styles.ledgerSubVal}>₹{grossRevenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.ledgerSubText}>Market Commission</Text>
            <Text style={[styles.ledgerSubVal, { color: theme.error }]}>
              -₹{marketFee.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {/* Allocation Breakdown per Shop */}
      <Text style={styles.sectionTitle}>Your Shop Allocations</Text>
      <View style={styles.card}>
        <View style={styles.allocCardHeader}>
          <Text style={styles.allocTableHeaderText}>Shop Code</Text>
          <Text style={styles.allocTableHeaderText}>Your Contribution</Text>
          <Text style={styles.allocTableHeaderText}>Ratio Share</Text>
        </View>
        
        {shopContributions.length === 0 ? (
          <Text style={styles.noAllocText}>Allocations will be visible once driver picks up the produce.</Text>
        ) : (
          shopContributions.map((c, i) => (
            <View key={i} style={styles.allocRow}>
              <View style={styles.shopBadge}>
                <Text style={styles.shopBadgeText}>{c.shopId}</Text>
              </View>
              <Text style={styles.allocValText}>{c.farmerExpected} / {c.totalShopExpected} Boxes</Text>
              <Text style={styles.ratioText}>{(c.ratio * 100).toFixed(0)}%</Text>
            </View>
          ))
        )}
      </View>

      {/* Sales log list */}
      <Text style={styles.sectionTitle}>Logged Sales / Invoices</Text>
      {calculatedSales.length === 0 ? (
        <View style={styles.emptySalesCard}>
          <Ionicons name="receipt-outline" size={32} color={theme.textSecondary} style={{ marginBottom: 8 }} />
          <Text style={styles.emptySalesText}>Sales updates will appear here as Shop Owners log sales.</Text>
        </View>
      ) : (
        calculatedSales.map((s) => (
          <View key={s.id} style={styles.saleRowCard}>
            <View style={styles.saleRowHeader}>
              <View style={styles.saleShopContainer}>
                <Ionicons name="storefront-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={styles.saleShopTitle}>Shop {s.shopId}</Text>
              </View>
              <View style={[styles.saleBadge, { backgroundColor: s.isFinal ? theme.success + "15" : theme.warning + "15" }]}>
                <Text style={[styles.saleBadgeText, { color: s.isFinal ? theme.success : theme.warning }]}>
                  {s.isFinal ? "Final Sale" : "Partial Sale"}
                </Text>
              </View>
            </View>
            <View style={styles.saleRowBody}>
              <Text style={styles.saleRowQty}>
                {s.boxesSold} boxes @ ₹{s.pricePerBox}
              </Text>
              <Text style={styles.saleRowRevenue}>
                ₹{s.shareRevenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
  },
  cardSub: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  ledgerCard: {
    backgroundColor: theme.success + "08",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.success + "20",
    padding: 16,
    marginBottom: 20,
  },
  ledgerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  payoutValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.text,
  },
  payoutLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  ledgerDivider: {
    height: 1,
    backgroundColor: theme.success + "15",
    marginVertical: 14,
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ledgerSubText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  ledgerSubVal: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 12,
    marginTop: 8,
  },
  allocCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderColor: theme.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  allocTableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.textSecondary,
    textTransform: "uppercase",
    flex: 1,
    textAlign: "center",
  },
  allocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: theme.border + "30",
  },
  shopBadge: {
    backgroundColor: theme.primary + "10",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  shopBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.primary,
  },
  allocValText: {
    fontSize: 13,
    color: theme.text,
    flex: 1.2,
    textAlign: "center",
  },
  ratioText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
    flex: 0.8,
    textAlign: "center",
  },
  noAllocText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  emptySalesCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySalesText: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: "center",
  },
  saleRowCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 10,
  },
  saleRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: theme.border + "30",
    paddingBottom: 6,
    marginBottom: 8,
  },
  saleShopContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  saleShopTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.text,
  },
  saleBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  saleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  saleRowBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saleRowQty: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  saleRowRevenue: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.success,
  },
});
