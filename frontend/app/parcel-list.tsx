import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Package, ArrowLeft, Plus, MapPin, User } from "lucide-react-native";
import { api, type Parcel } from "../utils/api";

const ParcelListScreen = () => {
  const router = useRouter();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadParcels = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await api.getParcels();
    if (response.ok && response.data) {
      setParcels(response.data);
    } else {
      setError(response.error || "Failed to load parcels");
      setParcels([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadParcels();
    }, [loadParcels])
  );

  const renderStatus = (status?: string) => {
    const label = status || "Pending";
    const isDelivered = label === "Delivered";
    const isInTransit = label === "In Transit";
    
    return (
      <View style={[
        styles.statusBadge, 
        isDelivered && styles.statusDelivered,
        isInTransit && styles.statusInTransit
      ]}>
        <Text style={[
          styles.statusText, 
          isDelivered && styles.statusTextDelivered,
          isInTransit && styles.statusTextInTransit
        ]}>
          {label}
        </Text>
      </View>
    );
  };

  const handleParcelPress = (parcelId: string) => {
    router.push({ pathname: "parcel-details", params: { parcelId } } as any);
  };

  const renderParcelCard = (item: Parcel) => {
    return (
      <TouchableOpacity 
        key={item._id} 
        style={styles.card}
        onPress={() => handleParcelPress(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Package size={18} color="#2563EB" />
            <Text style={styles.cardTitle}>{item.trackingId || "Tracking ID pending"}</Text>
          </View>
          {renderStatus(item.status)}
        </View>

        <View style={styles.infoRow}> 
          <User size={14} color="#64748B" />
          <Text style={styles.infoLabel}>From:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.sender?.name || "Unknown"}</Text>
        </View>

        <View style={styles.infoRow}> 
          <MapPin size={14} color="#64748B" />
          <Text style={styles.infoLabel}>To:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{item.recipient?.name || "Unknown"}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.weight ? `${item.weight} kg` : "--"} • {item.type || "Parcel"}</Text>
          <Text style={styles.dateText}>{item.date ? new Date(item.date).toLocaleDateString() : "--"}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parcels</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadParcels} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && parcels.length === 0 ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error && parcels.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No parcels yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add a new consignment.</Text>
          </View>
        ) : (
          parcels.map(renderParcelCard)
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("add-parcel" as any)}
        activeOpacity={0.9}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  content: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 12 
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  infoRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 6,
    gap: 6
  },
  infoLabel: { fontSize: 13, color: "#64748B", fontWeight: "600", minWidth: 40 },
  infoValue: { fontSize: 13, color: "#0F172A", fontWeight: "700", flex: 1 },
  metaRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  metaText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  dateText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  statusText: { color: "#1D4ED8", fontSize: 11, fontWeight: "700" },
  statusDelivered: { backgroundColor: "#ECFDF3", borderColor: "#BBF7D0" },
  statusTextDelivered: { color: "#15803D" },
  statusInTransit: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  statusTextInTransit: { color: "#D97706" },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { color: "#B91C1C", fontWeight: "600", fontSize: 13 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: "#475569", marginTop: 4 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});

export default ParcelListScreen;
