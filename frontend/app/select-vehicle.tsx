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
import { ArrowLeft, Search, Truck, Shield } from "lucide-react-native";
import { api, type Vehicle } from "../utils/api";

const SelectVehicleScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get parcel data from navigation params
  const parcelIds = JSON.parse((params.parcelIds as string) || "[]");
  const totalWeight = parseFloat((params.totalWeight as string) || "0");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [])
  );

  const getVehicleCapacity = (vehicle: Vehicle): number => {
    // First check database capacity field for actual vehicle capacity
    if (vehicle.capacity) {
      const capacityNum = parseFloat(vehicle.capacity);
      if (!isNaN(capacityNum) && capacityNum > 0) {
        console.log(`Vehicle ${vehicle.regNumber}: Using database capacity = ${capacityNum}kg`);
        return capacityNum;
      }
    }
    // Fall back to type-based default capacity
    const defaultCapacity = getDefaultCapacity(vehicle.type);
    console.log(`Vehicle ${vehicle.regNumber}: Using default capacity for type '${vehicle.type}' = ${defaultCapacity}kg`);
    return defaultCapacity;
  };

  const getDefaultCapacity = (type: string): number => {
    switch (type?.toLowerCase()) {
      case "van":
        return 1000; // 1000kg for vans
      case "box truck":
        return 3000; // 3000kg for box trucks
      case "truck":
        return 5000; // 5000kg for trucks
      default:
        return 600; // Default capacity
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await api.getVehicles();
      if (response.ok && response.data) {
        console.log(`🚛 Fetching vehicles for total parcel weight: ${totalWeight}kg`);
        console.log(`📋 Total vehicles from database: ${response.data.length}`);
        
        // Filter vehicles that are Active and have capacity GREATER THAN total weight
        const availableVehicles = response.data.filter((v: Vehicle) => {
          const isActive = v.status === "Active";
          const vehicleCapacity = getVehicleCapacity(v);
          const hasEnoughCapacity = vehicleCapacity > totalWeight; // STRICT GREATER THAN (not >=)
          
          console.log(`🔍 Vehicle ${v.regNumber}:`);
          console.log(`   - Status: ${v.status} (Active: ${isActive})`);
          console.log(`   - Database capacity: ${v.capacity || "not set"}`);
          console.log(`   - Calculated capacity: ${vehicleCapacity}kg`);
          console.log(`   - Required capacity: >${totalWeight}kg`);
          console.log(`   - Suitable: ${hasEnoughCapacity}`);
          
          return isActive && hasEnoughCapacity;
        });
        
        console.log(`✅ Suitable vehicles found: ${availableVehicles.length}`);
        setVehicles(availableVehicles);
        setFilteredVehicles(availableVehicles);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      Alert.alert("Error", "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredVehicles(vehicles);
    } else {
      const filtered = vehicles.filter(
        (v) =>
          v.regNumber?.toLowerCase().includes(query.toLowerCase()) ||
          v.model?.toLowerCase().includes(query.toLowerCase()) ||
          v.type?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredVehicles(filtered);
    }
  };



  const getBestMatch = (): string | null => {
    if (filteredVehicles.length === 0) return null;
    
    // Find vehicle with capacity that's closest to but greater than total weight
    let bestVehicle = null;
    let minExcessCapacity = Infinity;

    for (const vehicle of filteredVehicles) {
      const capacity = getVehicleCapacity(vehicle);
      if (capacity >= totalWeight) {
        const excessCapacity = capacity - totalWeight;
        if (excessCapacity < minExcessCapacity) {
          minExcessCapacity = excessCapacity;
          bestVehicle = vehicle;
        }
      }
    }

    return bestVehicle?._id || filteredVehicles[0]?._id;
  };

  const handleNext = () => {
    if (!selectedVehicle) {
      Alert.alert("No Selection", "Please select a vehicle for the trip");
      return;
    }

    // Navigate to next screen (driver selection or trip creation)
    router.push({
      pathname: "/assign-trip", // You'll need to create this screen next
      params: { 
        parcelIds: JSON.stringify(parcelIds), 
        totalWeight: totalWeight.toString(),
        vehicleId: selectedVehicle
      },
    } as any);
  };

  const renderVehicleItem = ({ item }: { item: Vehicle }) => {
    const isSelected = selectedVehicle === item._id;
    const capacity = getVehicleCapacity(item);
    const bestMatch = getBestMatch();
    const isBestMatch = item._id === bestMatch;
    const remainingSpace = capacity - totalWeight;

    return (
      <View style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}>
        {isBestMatch && (
          <View style={styles.bestMatchBadge}>
            <Text style={styles.bestMatchText}>BEST MATCH</Text>
          </View>
        )}
        
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleIcon}>
            <Truck size={24} color="#64748B" />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{item.regNumber}</Text>
            <Text style={styles.vehicleDetails}>{item.model} • {item.type}</Text>
            <Text style={styles.vehicleCapacity}>Max Capacity: {capacity}kg</Text>
          </View>
        </View>

        <View style={styles.capacityBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Load</Text>
            <Text style={styles.breakdownValue}>{totalWeight.toFixed(1)}kg</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Available Space</Text>
            <Text style={styles.breakdownValueAvailable}>{remainingSpace.toFixed(1)}kg</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isSelected && styles.selectButtonSelected
          ]}
          onPress={() => setSelectedVehicle(item._id)}
        >
          <Text style={[
            styles.selectButtonText,
            isSelected && styles.selectButtonTextSelected
          ]}>
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
          <Text style={styles.headerTitle}>Select Vehicle</Text>
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
        <Text style={styles.headerTitle}>Select Vehicle</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Trip Load Info */}
      <View style={styles.tripLoadCard}>
        <Shield size={20} color="#2563EB" />
        <View style={styles.tripLoadInfo}>
          <Text style={styles.tripLoadTitle}>Trip Load: {totalWeight.toFixed(1)}kg</Text>
          <Text style={styles.tripLoadSubtitle}>Showing vehicles with capacity {'>'} {totalWeight.toFixed(1)}kg</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Reg No, Truck Type..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Vehicle List */}
      <FlatList
        data={filteredVehicles}
        keyExtractor={(item) => item._id}
        renderItem={renderVehicleItem}
        scrollEnabled={true}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Truck size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Suitable Vehicles</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? "Try a different search" : `No active vehicles with capacity > ${totalWeight.toFixed(1)}kg available`}
            </Text>
          </View>
        }
      />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !selectedVehicle && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!selectedVehicle}
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
  tripLoadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  tripLoadInfo: { marginLeft: 12 },
  tripLoadTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  tripLoadSubtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
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
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  vehicleCardSelected: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  bestMatchBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestMatchText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  vehicleDetails: { fontSize: 14, color: "#64748B", marginTop: 2 },
  vehicleCapacity: { fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 4 },
  capacityBreakdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  breakdownItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F59E0B",
  },
  breakdownValueAvailable: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
  },
  breakdownDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#D1D5DB",
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

export default SelectVehicleScreen;