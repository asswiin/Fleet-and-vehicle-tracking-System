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
  Platform,
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
    if (!vehicleId || !driverId) {
      Alert.alert("Error", "Missing vehicle or driver information");
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
        assignedBy: params.managerId as string,
      });

      if (!tripRes.ok) {
        console.error("Failed to create trip record");
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

      Alert.alert("Success", "Trip assigned successfully!.", [
        {
          text: "OK",
          onPress: () => {
            router.replace({
              pathname: "manager/manager-dashboard",
              params: { userId: params.managerId as string }
            } as any);
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
              <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
                <Truck size={20} color="#2563EB" />
              </View>
              <Text style={styles.sectionTitle}>Fleet Vehicle</Text>
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
              <View style={[styles.iconCircle, { backgroundColor: "#F1F5F9" }]}>
                <User size={20} color="#334155" />
              </View>
              <Text style={styles.sectionTitle}>Assigned Driver</Text>
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
              <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
                <MapPin size={20} color="#10B981" />
              </View>
              <Text style={styles.sectionTitle}>Delivery Timeline ({parcels.length} stops)</Text>
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
                );
              })}
            </View>
          </View>
        )}

        {/* Parcels Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Package size={20} color="#D97706" />
            </View>
            <Text style={styles.sectionTitle}>Consignment Inventory ({parcels.length})</Text>
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
              );
            })}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },
  valueHighlight: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2563EB",
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  routeItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  routeOrderBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  routeOrderText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
  },
  routeLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  routeRecipient: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  routeDestination: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  routeDestinationText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "800",
  },
  routeAddress: {
    fontSize: 13,
    color: "#64748B",
    flex: 1,
    textAlign: "right",
    fontWeight: "600",
  },
  parcelsList: {
    gap: 12,
  },
  parcelItem: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  parcelContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  parcelNumber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 1,
  },
  parcelNumberText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
  },
  parcelId: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  parcelRecipient: {
    fontSize: 13,
    color: "#2563EB",
    marginTop: 4,
    fontWeight: "700",
  },
  parcelWeight: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  locationBadgeText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "800",
    marginLeft: 6,
  },
  confirmationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginTop: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  confirmationText: {
    fontSize: 15,
    color: "#059669",
    fontWeight: "800",
    marginLeft: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 25,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  assignButton: {
    flex: 2,
    backgroundColor: "#10B981",
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  assignButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
    borderColor: "transparent",
  },
  assignButtonText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});

export default TripSummaryScreen;

