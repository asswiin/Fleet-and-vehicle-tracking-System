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
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, Search, User, Clock, CheckCircle } from "lucide-react-native";
import { api, type Driver } from "../../utils/api";

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
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState(false);
  const [searchText, setSearchText] = useState("");

  const fetchAvailableDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getDrivers();
      if (response.ok && response.data) {
        // Filter for drivers who are available and currently punched in
        const availableDrivers = response.data.filter((driver: Driver) => 
          driver.isAvailable && 
          driver.driverStatus === "available"
        );
        setDrivers(availableDrivers);
        setFilteredDrivers(availableDrivers);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      Alert.alert("Error", "Failed to load available drivers");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAvailableDrivers();
    }, [fetchAvailableDrivers])
  );

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setFilteredDrivers(drivers);
      return;
    }

    const filtered = drivers.filter(driver =>
      driver.name.toLowerCase().includes(text.toLowerCase()) ||
      driver.email?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredDrivers(filtered);
  }, [drivers]);

  const handleReassignTrip = async () => {
    if (!selectedDriver) {
      Alert.alert("Error", "Please select a driver to reassign the trip");
      return;
    }

    Alert.alert(
      "Confirm Reassignment",
      `Reassign trip ${tripId} to selected driver?\n\nPrevious driver: ${declinedDriverName}\nNew driver: ${filteredDrivers.find(d => d._id === selectedDriver)?.name}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reassign",
          onPress: async () => {
            setReassigning(true);
            try {
              const response = await api.reassignDriver(notificationId, {
                newDriverId: selectedDriver,
                vehicleId: vehicleId,
              });

              if (response.ok) {
                Alert.alert(
                  "Success! ✓",
                  `Trip ${tripId} has been reassigned successfully!\n\nThe new driver will receive a notification and parcels will remain in "Pending" status until accepted.`,
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Navigate back to manager dashboard
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
            <Text style={styles.driverPhone}>{item.email}</Text>
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
              ID: {item._id.slice(-6) || "N/A"}
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drivers by name, phone..."
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
      </View>

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