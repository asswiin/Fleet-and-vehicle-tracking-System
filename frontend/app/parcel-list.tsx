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
  TextInput,
  FlatList,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Package, ArrowLeft, Plus, MapPin, User, Search, Truck, UserCheck } from "lucide-react-native";
import { api, type Parcel } from "../utils/api";

const FILTER_TABS = ["All", "Booked", "Pending", "Confirmed", "In Transit", "Delivered"];

// Helper to get driver name from populated or string
const getDriverName = (driver: Parcel['assignedDriver']) => {
  if (!driver) return null;
  if (typeof driver === 'string') return null;
  return driver.name;
};

// Helper to get vehicle reg number from populated or string
const getVehicleRegNumber = (vehicle: Parcel['assignedVehicle']) => {
  if (!vehicle) return null;
  if (typeof vehicle === 'string') return null;
  return vehicle.regNumber;
};

interface StatusStyle {
  bg: string;
  text: string;
  borderColor: string;
  label: string;
}

const ParcelListScreen = () => {
  const router = useRouter();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");

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

  // Filter Logic
  const filteredParcels = parcels.filter(parcel => {
    const matchesSearch = 
      (parcel.trackingId?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
      (parcel.sender?.name?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
      (parcel.recipient?.name?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
      (parcel.recipient?.address?.toLowerCase() || "").includes(searchText.toLowerCase());
    
    let statusMatch = true;
    if (selectedTab !== "All") {
      const currentStatus = parcel.status || "Booked";
      statusMatch = currentStatus === selectedTab;
    }

    return matchesSearch && statusMatch;
  });

  // Get counts for tabs
  const getStatusCount = (status: string) => {
    if (status === "All") return parcels.length;
    return parcels.filter(p => (p.status || "Booked") === status).length;
  };

  // Helper for Status Badge Styles
  const getStatusStyles = (status?: string): StatusStyle => {
    const label = status || "Booked";
    
    switch(label) {
      case 'Booked': 
        return { bg: '#EFF6FF', text: '#1D4ED8', borderColor: '#DBEAFE', label: 'Booked' };
      case 'Pending': 
        return { bg: '#FFF7ED', text: '#C2410C', borderColor: '#FFEDD5', label: 'Pending' };
      case 'Confirmed': 
        return { bg: '#F0FDF4', text: '#166534', borderColor: '#DCFCE7', label: 'Confirmed' };
      case 'Assigned': 
        return { bg: '#F3E8FF', text: '#7C3AED', borderColor: '#DDD6FE', label: 'Assigned' };
      case 'In Transit': 
        return { bg: '#FEF3C7', text: '#D97706', borderColor: '#FDE68A', label: 'In Transit' };
      case 'Delivered': 
        return { bg: '#ECFDF3', text: '#15803D', borderColor: '#BBF7D0', label: 'Delivered' };
      case 'Cancelled': 
        return { bg: '#FEE2E2', text: '#DC2626', borderColor: '#FECACA', label: 'Cancelled' };
      default: 
        return { bg: '#F1F5F9', text: '#475569', borderColor: '#E2E8F0', label: label };
    }
  };

  const renderStatus = (status?: string) => {
    const statusStyle = getStatusStyles(status);
    
    return (
      <View style={[
        styles.statusBadge, 
        { backgroundColor: statusStyle.bg, borderColor: statusStyle.borderColor }
      ]}>
        <Text style={[styles.statusText, { color: statusStyle.text }]}>
          {statusStyle.label}
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

        {item.tripId && (
          <View style={styles.tripInfoBanner}>
            <Text style={styles.tripInfoText}>🚚 Trip: {item.tripId}</Text>
          </View>
        )}

        {/* Show Driver, Vehicle and Destination for non-Booked parcels */}
        {item.status && item.status !== "Booked" && (getDriverName(item.assignedDriver) || getVehicleRegNumber(item.assignedVehicle) || item.recipient?.address) && (
          <View style={styles.assignmentInfo}>
            {getDriverName(item.assignedDriver) && (
              <View style={styles.assignmentRow}>
                <UserCheck size={12} color="#16A34A" />
                <Text style={styles.assignmentText}>Driver: {getDriverName(item.assignedDriver)}</Text>
              </View>
            )}
            {getVehicleRegNumber(item.assignedVehicle) && (
              <View style={styles.assignmentRow}>
                <Truck size={12} color="#2563EB" />
                <Text style={styles.assignmentText}>Vehicle: {getVehicleRegNumber(item.assignedVehicle)}</Text>
              </View>
            )}
            {item.recipient?.address && (
              <View style={styles.assignmentRow}>
                <MapPin size={12} color="#D97706" />
                <Text style={styles.assignmentText} numberOfLines={1}>To: {item.recipient.address}</Text>
              </View>
            )}
          </View>
        )}
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

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by tracking ID, sender, recipient..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsContainer}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = selectedTab === tab;
            const count = getStatusCount(tab);
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredParcels}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => renderParcelCard(item)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadParcels} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading && parcels.length === 0 ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyState}>
              <Package size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {selectedTab === "All" ? "No parcels yet" : `No ${selectedTab.toLowerCase()} parcels`}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedTab === "All" ? "Tap + to add a new consignment." : "Try selecting a different filter."}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
      />

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
  searchWrapper: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: "#fff" 
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },
  tabsWrapper: { 
    paddingVertical: 8, 
    backgroundColor: "#fff", 
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabsContainer: { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  activeTab: { backgroundColor: "#2563EB" },
  tabText: { color: "#64748B", fontSize: 13, fontWeight: "600" },
  activeTabText: { color: "#fff" },
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
  tripInfoBanner: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  tripInfoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
  },
  assignmentInfo: {
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 6,
  },
  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  assignmentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
    flex: 1,
  },
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
