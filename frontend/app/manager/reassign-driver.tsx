import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, Search, User, Clock, CheckCircle, Truck, RefreshCw } from "lucide-react-native";
import { api, type Driver, type Vehicle } from "../../utils/api";

const ReassignDriverScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const notificationId = params.notificationId as string;
  const tripId = params.tripId as string;
  const declinedDriverName = params.declinedDriverName as string;
  const vehicleId = params.vehicleId as string;
  const parcelCount = params.parcelCount as string;
  const managerId = params.managerId as string;

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicleId); // Default to current vehicle
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState(false);
  const [driverSearchText, setDriverSearchText] = useState("");
  const [vehicleSearchText, setVehicleSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"driver" | "vehicle">("driver");

  const fetchAvailableData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch drivers and vehicles in parallel
      const [driversResponse, vehiclesResponse] = await Promise.all([
        api.getDrivers(),
        api.getVehicles()
      ]);

      // Process drivers
      if (driversResponse.ok && driversResponse.data) {
        const availableDrivers = driversResponse.data.filter((driver: Driver) => 
          driver.isAvailable && driver.driverStatus === "Active"
        );
        setDrivers(availableDrivers);
        setFilteredDrivers(availableDrivers);
      }

      // Process vehicles
      if (vehiclesResponse.ok && vehiclesResponse.data) {
        const availableVehicles = vehiclesResponse.data.filter((vehicle: Vehicle) => 
          vehicle.status === "Active"
        );
        setVehicles(availableVehicles);
        setFilteredVehicles(availableVehicles);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load available drivers and vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAvailableData();
    }, [fetchAvailableData])
  );

  const handleDriverSearch = useCallback((text: string) => {
    setDriverSearchText(text);
    if (!text.trim()) {
      setFilteredDrivers(drivers);
      return;
    }

    const filtered = drivers.filter(driver =>
      driver.name.toLowerCase().includes(text.toLowerCase()) ||
      driver.phone.includes(text) ||
      driver.email.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredDrivers(filtered);
  }, [drivers]);

  const handleVehicleSearch = useCallback((text: string) => {
    setVehicleSearchText(text);
    if (!text.trim()) {
      setFilteredVehicles(vehicles);
      return;
    }

    const filtered = vehicles.filter(vehicle =>
      vehicle.regNumber.toLowerCase().includes(text.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(text.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredVehicles(filtered);
  }, [vehicles]);

  const handleReassignTrip = async () => {
    if (!selectedDriver) {
      Alert.alert("Error", "Please select a driver to reassign the trip");
      return;
    }

    const selectedDriverData = filteredDrivers.find(d => d._id === selectedDriver);
    const selectedVehicleData = filteredVehicles.find(v => v._id === selectedVehicle);
    const isVehicleChanged = selectedVehicle !== vehicleId;

    let confirmMessage = `Reassign trip ${tripId}?\n\nPrevious driver: ${declinedDriverName}\nNew driver: ${selectedDriverData?.name}`;
    
    if (isVehicleChanged) {
      confirmMessage += `\n\nVehicle will be changed to: ${selectedVehicleData?.regNumber}`;
    }

    Alert.alert(
      "Confirm Reassignment",
      confirmMessage,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reassign",
          onPress: async () => {
            setReassigning(true);
            try {
              const reassignData: { newDriverId: string, newVehicleId?: string } = {
                newDriverId: selectedDriver,
              };
              
              // Only include vehicle if it's being changed
              if (isVehicleChanged) {
                reassignData.newVehicleId = selectedVehicle;
              }

              const response = await api.reassignDriver(notificationId, reassignData);

              if (response.ok) {
                Alert.alert(
                  "Success! ✓",
                  `Trip ${tripId} has been reassigned successfully!\n\nDriver: ${selectedDriverData?.name}${isVehicleChanged ? `\nVehicle: ${selectedVehicleData?.regNumber}` : ''}\n\nThe new driver will receive a notification and parcels will remain in "Pending" status until accepted.`,
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        router.replace({
                          pathname: "/manager/manager-dashboard",
                          params: { userId: managerId }
                        } as any);
                      },
                    },
                  ]
                );
              } else {
                Alert.alert("Error", "Failed to reassign driver. Please try again.");
              }
            } catch (error) {
              console.error("Error reassigning driver:", error);
              Alert.alert("Error", "Failed to reassign driver. Please try again.");
            } finally {
              setReassigning(false);
            }
          },
        },
      ]
    );
  };

  const renderVehicleItem = ({ item }: { item: Vehicle }) => {
    const isSelected = selectedVehicle === item._id;
    const isCurrentVehicle = item._id === vehicleId;

    return (
      <TouchableOpacity
        style={[
          styles.vehicleCard,
          isSelected && styles.vehicleCardSelected,
          isCurrentVehicle && styles.currentVehicleCard,
        ]}
        onPress={() => setSelectedVehicle(item._id)}
      >
        <View style={styles.vehicleHeader}>
          <View style={[styles.vehicleIcon, isSelected && styles.vehicleIconSelected]}>
            <Truck size={20} color={isSelected ? "#fff" : "#64748B"} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{item.regNumber}</Text>
            <Text style={styles.vehicleModel}>{item.model} • {item.type}</Text>
          </View>
          <View style={styles.vehicleActions}>
            {isCurrentVehicle && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>CURRENT</Text>
              </View>
            )}
            {isSelected && (
              <CheckCircle size={24} color="#10B981" />
            )}
          </View>
        </View>

        <View style={styles.vehicleDetails}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.statusText}>Available</Text>
          </View>
          
          <View style={styles.vehicleMetrics}>
            <Text style={styles.vehicleMetricText}>
              Capacity: {item.capacity || "N/A"} kg
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDriverItem = ({ item }: { item: Driver }) => {
    const isSelected = selectedDriver === item._id;

    return (
      <TouchableOpacity
        style={[
          styles.driverCard,
          isSelected && styles.driverCardSelected,
        ]}
        onPress={() => setSelectedDriver(item._id)}
      >
        <View style={styles.driverHeader}>
          <View style={[styles.driverIcon, isSelected && styles.driverIconSelected]}>
            <User size={20} color={isSelected ? "#fff" : "#64748B"} />
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{item.name}</Text>
            <Text style={styles.driverPhone}>{item.phone}</Text>
          </View>
          {isSelected && (
            <CheckCircle size={24} color="#10B981" />
          )}
        </View>

        <View style={styles.driverDetails}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.statusText}>Available</Text>
          </View>
          
          <View style={styles.driverMetrics}>
            <Text style={styles.driverMetricText}>
              License: {item.licenseNumber || "N/A"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reassign Driver</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading available drivers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reassign Driver</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Trip Info Card */}
      <View style={styles.tripInfoCard}>
        <View style={styles.tripInfoHeader}>
          <Text style={styles.tripInfoTitle}>Trip {tripId}</Text>
          <View style={styles.declinedBadge}>
            <Text style={styles.declinedBadgeText}>DRIVER DECLINED</Text>
          </View>
        </View>
        <Text style={styles.tripInfoText}>
          Previous driver: {declinedDriverName}
        </Text>
        <Text style={styles.tripInfoText}>
          Parcels: {parcelCount} • Status: Pending
        </Text>
      </View>

      {/* Tab Selection */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "driver" && styles.activeTab]}
          onPress={() => setActiveTab("driver")}
        >
          <User size={20} color={activeTab === "driver" ? "#fff" : "#64748B"} />
          <Text style={[styles.tabText, activeTab === "driver" && styles.activeTabText]}>
            Select Driver
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "vehicle" && styles.activeTab]}
          onPress={() => setActiveTab("vehicle")}
        >
          <Truck size={20} color={activeTab === "vehicle" ? "#fff" : "#64748B"} />
          <Text style={[styles.tabText, activeTab === "vehicle" && styles.activeTabText]}>
            Select Vehicle
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === "driver" ? "Search drivers by name, phone..." : "Search vehicles by registration, model..."}
          value={activeTab === "driver" ? driverSearchText : vehicleSearchText}
          onChangeText={activeTab === "driver" ? handleDriverSearch : handleVehicleSearch}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Driver Tab Content */}
      {activeTab === "driver" && (
        <>
          {filteredDrivers.length === 0 ? (
            <View style={styles.centerContainer}>
              <User size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No available drivers</Text>
              <Text style={styles.emptyText}>
                All drivers are currently busy or inactive
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  Select an available driver to reassign this trip
                </Text>
              </View>

              <FlatList
                data={filteredDrivers}
                renderItem={renderDriverItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </>
      )}

      {/* Vehicle Tab Content */}
      {activeTab === "vehicle" && (
        <>
          {filteredVehicles.length === 0 ? (
            <View style={styles.centerContainer}>
              <Truck size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No available vehicles</Text>
              <Text style={styles.emptyText}>
                All vehicles are currently in use
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  Select a vehicle for this trip (current vehicle is pre-selected)
                </Text>
              </View>

              <FlatList
                data={filteredVehicles}
                renderItem={renderVehicleItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={reassigning}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.reassignButton,
            (!selectedDriver || reassigning) && styles.reassignButtonDisabled,
          ]}
          onPress={handleReassignTrip}
          disabled={!selectedDriver || reassigning}
        >
          {reassigning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.reassignButtonText}>Reassign Trip</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  tripInfoCard: {
    backgroundColor: "#FEF2F2",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  tripInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tripInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  declinedBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  declinedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  tripInfoText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  // Tab Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#2563EB",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#fff",
  },
  instructionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  instructionText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  driverCardSelected: {
    borderColor: "#10B981",
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
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
  driverIconSelected: {
    backgroundColor: "#10B981",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  driverPhone: {
    fontSize: 14,
    color: "#6B7280",
  },
  driverDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#10B981",
  },
  driverMetrics: {
    alignItems: "flex-end",
  },
  driverMetricText: {
    fontSize: 12,
    color: "#6B7280",
  },
  // Vehicle Styles
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  vehicleCardSelected: {
    borderColor: "#10B981",
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
  },
  currentVehicleCard: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  vehicleIconSelected: {
    backgroundColor: "#10B981",
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  vehicleModel: {
    fontSize: 14,
    color: "#6B7280",
  },
  vehicleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  vehicleDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleMetrics: {
    alignItems: "flex-end",
  },
  vehicleMetricText: {
    fontSize: 12,
    color: "#6B7280",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  reassignButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#10B981",
  },
  reassignButtonDisabled: {
    opacity: 0.5,
  },
  reassignButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});

export default ReassignDriverScreen;