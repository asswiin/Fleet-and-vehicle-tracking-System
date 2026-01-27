import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, Search, User, Clock } from "lucide-react-native";
import { api, type Driver } from "../utils/api";

const AssignTripScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get parcel data from navigation params
  const parcelIds = JSON.parse((params.parcelIds as string) || "[]");
  const totalWeight = parseFloat((params.totalWeight as string) || "0");
  const vehicleId = (params.vehicleId as string) || "";

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      fetchPunchedDrivers();
    }, [])
  );

  const fetchPunchedDrivers = async () => {
    setLoading(true);
    try {
      const response = await api.getDrivers();
      if (response.ok && response.data) {
        // Handle both array directly or nested in { data: [] }
        const allDrivers = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
        console.log(`👥 Fetching all drivers: ${allDrivers.length}`);

        // Filter drivers who are Active AND isAvailable (punched in)
        const punchedDrivers = allDrivers.filter((driver: Driver) => {
          const isActive = driver.status === "Active";
          const isPunchedIn = driver.isAvailable === true;

          console.log(`🔍 Driver ${driver.name}:`);
          console.log(`   - Status: ${driver.status} (Active: ${isActive})`);
          console.log(`   - isAvailable: ${driver.isAvailable} (Punched In: ${isPunchedIn})`);

          return isActive && isPunchedIn;
        });

        console.log(`✅ Punched drivers found: ${punchedDrivers.length}`);
        setDrivers(punchedDrivers);
        setFilteredDrivers(punchedDrivers);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      Alert.alert("Error", "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredDrivers(drivers);
    } else {
      const filtered = drivers.filter(
        (d) =>
          d.name?.toLowerCase().includes(query.toLowerCase()) ||
          d.mobile?.toLowerCase().includes(query.toLowerCase()) ||
          d.email?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredDrivers(filtered);
    }
  };

  const handleNext = () => {
    if (!selectedDriver) {
      Alert.alert("No Selection", "Please select a driver for the trip");
      return;
    }

    // Navigate to the next screen or complete trip assignment
    router.push({
      pathname: "/trip-summary",
      params: {
        parcelIds: JSON.stringify(parcelIds),
        totalWeight: totalWeight.toString(),
        vehicleId: vehicleId,
        driverId: selectedDriver,
      },
    } as any);
  };

  const renderDriverItem = ({ item }: { item: Driver }) => {
    const isSelected = selectedDriver === item._id;
    // Since we filter only punched-in drivers, all drivers in the list are available
    const isPunchedIn = item.isAvailable === true;

    return (
      <View style={[styles.driverCard, isSelected && styles.driverCardSelected]}>
        <View style={styles.driverHeader}>
          <View style={styles.driverIcon}>
            <User size={24} color="#64748B" />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{item.name}</Text>
            <Text style={styles.driverDetails}>{item.mobile}</Text>
            {item.email && (
              <Text style={styles.driverEmail}>{item.email}</Text>
            )}
          </View>
        </View>

        {isPunchedIn && (
          <View style={styles.punchTimeContainer}>
            <Clock size={14} color="#10B981" />
            <Text style={styles.punchTimeText}>
              Available (Punched In)
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.selectButton,
            isSelected && styles.selectButtonSelected,
          ]}
          onPress={() => setSelectedDriver(item._id)}
        >
          <Text
            style={[
              styles.selectButtonText,
              isSelected && styles.selectButtonTextSelected,
            ]}
          >
            {isSelected ? "✓ Selected" : "Select"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Driver</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Driver</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Trip Info Card */}
      <View style={styles.tripInfoCard}>
        <View style={styles.tripInfoRow}>
          <Text style={styles.tripInfoLabel}>Vehicle ID</Text>
          <Text style={styles.tripInfoValue}>{vehicleId.slice(-6)}</Text>
        </View>
        <View style={styles.tripInfoDivider} />
        <View style={styles.tripInfoRow}>
          <Text style={styles.tripInfoLabel}>Parcels</Text>
          <Text style={styles.tripInfoValue}>{parcelIds.length}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Name, Phone, Email..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Driver List */}
      <FlatList
        data={filteredDrivers}
        keyExtractor={(item) => item._id}
        renderItem={renderDriverItem}
        scrollEnabled={true}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <User size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Available Drivers</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Try a different search"
                : "No active drivers punched in for today"}
            </Text>
          </View>
        }
      />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !selectedDriver && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedDriver}
        >
          <Text style={styles.nextButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  tripInfoCard: {
    backgroundColor: "#DBEAFE",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tripInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  tripInfoLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  tripInfoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  tripInfoDivider: {
    height: 1,
    backgroundColor: "#BFDBFE",
    marginVertical: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 8 },
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  driverCardSelected: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  driverIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  driverDetails: { fontSize: 13, color: "#64748B", marginTop: 2 },
  driverEmail: { fontSize: 12, color: "#94A3B8", marginTop: 1 },
  punchTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  punchTimeText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
    marginLeft: 6,
  },
  selectButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  selectButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  selectButtonTextSelected: {
    color: "#fff",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: "#64748B", marginTop: 4 },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  nextButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#94A3B8",
  },
  nextButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default AssignTripScreen;
