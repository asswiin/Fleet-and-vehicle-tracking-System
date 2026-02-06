import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Truck,
  User,
  Package,
  CheckCircle,
  AlertCircle,
  MapPin,
  Navigation,
} from "lucide-react-native";
import { api, type Vehicle, type Driver, type Parcel } from "../../utils/api";

interface DeliveryLocation {
  parcelId: string;
  latitude: number;
  longitude: number;
  order: number;
  locationName?: string;
}

interface StartLocation {
  latitude: number;
  longitude: number;
  address: string;
}

const TripSummaryScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const parcelIds = JSON.parse((params.parcelIds as string) || "[]");
  const totalWeight = parseFloat((params.totalWeight as string) || "0");
  const vehicleId = (params.vehicleId as string) || "";
  const driverId = (params.driverId as string) || "";
  
  // Debug logging
  console.log("Trip Summary Params:", {
    parcelIds: parcelIds.length,
    totalWeight,
    vehicleId,
    driverId,
    hasVehicleId: !!vehicleId,
    hasDriverId: !!driverId
  });
  
  // Parse delivery locations from params
  const deliveryLocations: DeliveryLocation[] = params.deliveryLocations 
    ? JSON.parse(params.deliveryLocations as string) 
    : [];
  const startLocation: StartLocation | null = params.startLocation 
    ? JSON.parse(params.startLocation as string) 
    : null;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchTripDetails();
  }, []);

  const fetchTripDetails = async () => {
    setLoading(true);
    try {
      // Fetch vehicle details
      const vehicleRes = await api.getVehicle(vehicleId);
      if (vehicleRes.ok && vehicleRes.data) {
        setVehicle(vehicleRes.data);
      }

      // Fetch driver details
      const driverRes = await api.getDriver(driverId);
      if (driverRes.ok && driverRes.data) {
        setDriver(driverRes.data);
      }

      // Fetch all parcels
      const parcelsRes = await api.getParcels();
      if (parcelsRes.ok && parcelsRes.data) {
        let selectedParcels = parcelsRes.data.filter((p: Parcel) =>
          parcelIds.includes(p._id)
        );
        
        // Merge delivery location data with parcels and sort by order
        if (deliveryLocations.length > 0) {
          selectedParcels = selectedParcels.map((parcel: Parcel) => {
            const locationData = deliveryLocations.find(loc => loc.parcelId === parcel._id);
            return {
              ...parcel,
              deliveryLocation: locationData ? {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                order: locationData.order,
              } : undefined,
            };
          });
          
          // Sort parcels by delivery order
          selectedParcels.sort((a: Parcel, b: Parcel) => {
            const orderA = a.deliveryLocation?.order || 999;
            const orderB = b.deliveryLocation?.order || 999;
            return orderA - orderB;
          });
        }
        
        setParcels(selectedParcels);
      }
    } catch (error) {
      console.error("Error fetching trip details:", error);
      Alert.alert("Error", "Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTrip = async () => {
    console.log("handleAssignTrip called with:", { vehicleId, driverId });
    
    if (!vehicleId) {
      Alert.alert("Error", "Vehicle ID is missing. Please select a vehicle.");
      return;
    }
    
    if (!driverId) {
      Alert.alert("Error", "Driver ID is missing. Please select a driver.");
      return;
    }

    setAssigning(true);
    try {
      // Update each parcel status to "Pending" and add delivery location with locationName
      for (const parcel of parcels) {
        await api.updateParcelStatus(parcel._id, "Pending");
        
        // Update parcel with delivery location including locationName if available
        if (parcel.deliveryLocation) {
          // Find the matching location from deliveryLocations to get locationName
          const locationData = deliveryLocations.find(loc => loc.parcelId === parcel._id);
          await api.updateParcel(parcel._id, {
            deliveryLocation: {
              latitude: parcel.deliveryLocation.latitude,
              longitude: parcel.deliveryLocation.longitude,
              order: parcel.deliveryLocation.order,
              locationName: locationData?.locationName || parcel.deliveryLocation.locationName,
            },
          });
        }
      }

      // Create notification for the driver with location data
      // NOTE: Vehicle and driver status will be updated to "On-trip" when driver ACCEPTS the trip
      const tripId = `TR-${Date.now().toString().slice(-6)}-X`;
      
      // Create Trip record with all details including destinations
      console.log("Creating trip with:", { tripId, driverId, vehicleId, parcelIds: parcelIds.length });
      
      const tripRes = await api.createTrip({
        tripId,
        driverId,
        vehicleId,
        parcelIds,
        startLocation: startLocation,
        deliveryDestinations: deliveryLocations.map(loc => ({
          parcelId: loc.parcelId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          locationName: loc.locationName || "Unknown Location",
          order: loc.order,
        })),
        totalWeight: totalWeight,
      });

      if (!tripRes.ok) {
        console.error("Failed to create trip record:", tripRes.error);
        Alert.alert("Error", tripRes.error || "Failed to create trip record");
        setAssigning(false);
        return;
      }

      // Create notification with locationName included
      const notificationRes = await api.createNotification({
        driverId,
        vehicleId,
        parcelIds,
        tripId,
        message: `New trip assigned with ${parcelIds.length} parcel(s). Vehicle: ${vehicle?.regNumber || 'N/A'}`,
        assignedBy: params.managerId as string, // Pass manager ID if available
        deliveryLocations: deliveryLocations.map(loc => ({
          parcelId: loc.parcelId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          order: loc.order,
          locationName: loc.locationName,
        })),
        startLocation: startLocation,
      });

      if (!notificationRes.ok) {
        Alert.alert("Error", "Failed to send notification to driver");
        setAssigning(false);
        return;
      }

      Alert.alert("Success", "Trip assigned successfully! Driver has been notified.\n\nParcels are now in 'Pending' status. When the driver accepts, status will change to 'Confirmed'.", [
        {
          text: "OK",
          onPress: () => {
            router.push("manager/manager-dashboard" as any);
          },
        },
      ]);
    } catch (error) {
      console.error("Error assigning trip:", error);
      Alert.alert("Error", "Failed to assign trip");
    } finally {
      setAssigning(false);
    }
  };


 
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Summary</Text>
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
        <Text style={styles.headerTitle}>Trip Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Vehicle Section */}
        {vehicle && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Truck size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Vehicle</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.label}>Registration</Text>
                <Text style={styles.value}>{vehicle.regNumber}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.cardRow}>
                <Text style={styles.label}>Model</Text>
                <Text style={styles.value}>{vehicle.model}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.cardRow}>
                <Text style={styles.label}>Type</Text>
                <Text style={styles.value}>{vehicle.type}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Driver Section */}
        {driver && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Driver</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{driver.name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.cardRow}>
                <Text style={styles.label}>Mobile</Text>
                <Text style={styles.value}>{driver.mobile}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.cardRow}>
                <Text style={styles.label}>License</Text>
                <Text style={styles.value}>{driver.license}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Delivery Route Section */}
        {deliveryLocations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Delivery Route ({parcels.length} stops)</Text>
            </View>
            <View style={styles.card}>
              {/* Starting Point */}
              {startLocation && (
                <>
                  <View style={styles.cardRow}>
                    <View style={styles.routeItemLeft}>
                      <View style={[styles.routeOrderBadge, { backgroundColor: '#10B981' }]}>
                        <Navigation size={12} color="#fff" />
                      </View>
                      <Text style={styles.routeLabel}>Start</Text>
                    </View>
                    <Text style={styles.routeAddress} numberOfLines={1}>
                      {startLocation.address}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                </>
              )}
              
              {/* Delivery Stops */}
              {parcels.map((parcel, index) => {
                const locationData = deliveryLocations.find(loc => loc.parcelId === parcel._id);
                return (
                <React.Fragment key={parcel._id}>
                  <View style={styles.cardRow}>
                    <View style={styles.routeItemLeft}>
                      <View style={[styles.routeOrderBadge, { backgroundColor: '#2563EB' }]}>
                        <Text style={styles.routeOrderText}>
                          {locationData?.order || index + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeLabel}>
                          {parcel.trackingId || `Stop ${index + 1}`}
                        </Text>
                        <Text style={styles.routeRecipient}>
                          {parcel.recipient?.name || 'Unknown'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.routeDestination}>
                      <MapPin size={12} color="#059669" />
                      <Text style={styles.routeDestinationText} numberOfLines={1}>
                        {locationData?.locationName || 'Location set'}
                      </Text>
                    </View>
                  </View>
                  {index < parcels.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              );})}
            </View>
          </View>
        )}

        {/* Parcels Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Parcels ({parcels.length})</Text>
          </View>
          <View style={styles.parcelsList}>
            {parcels.map((parcel, index) => {
              const locationData = deliveryLocations.find(loc => loc.parcelId === parcel._id);
              return (
              <View key={parcel._id} style={styles.parcelItem}>
                <View style={styles.parcelContent}>
                  <View style={[styles.parcelNumber, { backgroundColor: locationData ? '#2563EB' : '#64748B' }]}>
                    <Text style={styles.parcelNumberText}>
                      {locationData?.order || index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.parcelId}>
                      {parcel.trackingId || parcel._id.slice(-8)}
                    </Text>
                    {parcel.recipient?.name && (
                      <Text style={styles.parcelRecipient}>
                        To: {parcel.recipient.name}
                      </Text>
                    )}
                    {parcel.weight && (
                      <Text style={styles.parcelWeight}>
                        Weight: {parcel.weight}kg
                      </Text>
                    )}
                    {locationData && (
                      <View style={styles.locationBadge}>
                        <MapPin size={12} color="#10B981" />
                        <Text style={styles.locationBadgeText}>
                          {locationData.locationName || 'Location set'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );})}
          </View>
        </View>

        {/* Weight Summary */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.label}>Total Weight</Text>
              <Text style={styles.valueHighlight}>
                {totalWeight.toFixed(1)}kg
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <Text style={styles.label}>Vehicle Capacity</Text>
              <Text style={styles.valueHighlight}>
                {vehicle ? "Sufficient" : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Confirmation Badge */}
        <View style={styles.confirmationBadge}>
          <CheckCircle size={24} color="#10B981" />
          <Text style={styles.confirmationText}>
            All details are ready for assignment
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelButton]}
          onPress={() => router.back()}
          disabled={assigning}
        >
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.assignButton, assigning && styles.assignButtonDisabled]}
          onPress={handleAssignTrip}
          disabled={assigning}
        >
          {assigning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.assignButtonText}>Assign Trip</Text>
          )}
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
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 100 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  valueHighlight: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2563EB",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  parcelsList: {
    gap: 10,
  },
  parcelItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  parcelContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  parcelNumber: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  parcelNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  parcelId: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  parcelRecipient: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 2,
    fontWeight: "500",
  },
  parcelWeight: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationBadgeText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "500",
    marginLeft: 4,
  },
  routeItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  routeOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  routeOrderText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#fff",
  },
  routeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  routeRecipient: {
    fontSize: 11,
    color: "#64748B",
  },
  routeDestination: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginLeft: 8,
  },
  routeDestinationText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    maxWidth: 80,
  },
  routeAddress: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
    textAlign: "right",
  },
  confirmationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginTop: 10,
  },
  confirmationText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
    marginLeft: 12,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  assignButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  assignButtonDisabled: {
    opacity: 0.6,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});

export default TripSummaryScreen;

