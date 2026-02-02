import React, { useState, useEffect, useRef } from "react";
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
  Modal,
  Dimensions,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Truck,
  User,
  Package,
  CheckCircle,
  MapPin,
  Navigation,
  X,
  Check,
  AlertCircle,
} from "lucide-react-native";
import { api, type Vehicle, type Driver, type Parcel } from "../utils/api";
import * as Location from "expo-location";
import { MapView, Marker, PROVIDER_DEFAULT, isMapAvailable } from "../components/MapViewWrapper";

const { width, height } = Dimensions.get("window");

interface DeliveryLocation {
  parcelId: string;
  latitude: number;
  longitude: number;
  address: string;
  order: number;
}

const TripSummaryScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<any>(null);

  const parcelIds = JSON.parse((params.parcelIds as string) || "[]");
  const totalWeight = parseFloat((params.totalWeight as string) || "0");
  const vehicleId = (params.vehicleId as string) || "";
  const driverId = (params.driverId as string) || "";

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  
  // Location selection state
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedParcelForMap, setSelectedParcelForMap] = useState<Parcel | null>(null);
  const [tempMarkerLocation, setTempMarkerLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);

  useEffect(() => {
    fetchTripDetails();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log("Error getting location:", error);
    }
  };

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
        const selectedParcels = parcelsRes.data.filter((p: Parcel) =>
          parcelIds.includes(p._id)
        );
        setParcels(selectedParcels);
      }
    } catch (error) {
      console.error("Error fetching trip details:", error);
      Alert.alert("Error", "Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  const openMapForParcel = (parcel: Parcel, index: number) => {
    setSelectedParcelForMap(parcel);
    
    // Check if location already exists for this parcel
    const existingLocation = deliveryLocations.find(loc => loc.parcelId === parcel._id);
    if (existingLocation) {
      setTempMarkerLocation({
        latitude: existingLocation.latitude,
        longitude: existingLocation.longitude,
      });
    } else {
      setTempMarkerLocation(null);
    }
    
    setShowMapModal(true);
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTempMarkerLocation({ latitude, longitude });
  };

  const confirmLocationSelection = async () => {
    if (!tempMarkerLocation || !selectedParcelForMap) return;

    try {
      // Get address from coordinates
      let addressText = "Selected Location";
      try {
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: tempMarkerLocation.latitude,
          longitude: tempMarkerLocation.longitude,
        });
        if (addressResponse.length > 0) {
          const addr = addressResponse[0];
          addressText = [addr.street, addr.city, addr.region].filter(Boolean).join(", ") || "Selected Location";
        }
      } catch (e) {
        console.log("Reverse geocode error:", e);
      }

      const newLocation: DeliveryLocation = {
        parcelId: selectedParcelForMap._id,
        latitude: tempMarkerLocation.latitude,
        longitude: tempMarkerLocation.longitude,
        address: addressText,
        order: deliveryLocations.filter(loc => loc.parcelId !== selectedParcelForMap._id).length,
      };

      // Update or add the location
      setDeliveryLocations(prev => {
        const filtered = prev.filter(loc => loc.parcelId !== selectedParcelForMap._id);
        return [...filtered, newLocation];
      });

      setShowMapModal(false);
      setSelectedParcelForMap(null);
      setTempMarkerLocation(null);
    } catch (error) {
      console.error("Error setting location:", error);
      Alert.alert("Error", "Failed to set location");
    }
  };

  const getLocationForParcel = (parcelId: string): DeliveryLocation | undefined => {
    return deliveryLocations.find(loc => loc.parcelId === parcelId);
  };

  const handleAssignTrip = async () => {
    if (!vehicleId || !driverId) {
      Alert.alert("Error", "Missing vehicle or driver information");
      return;
    }

    // Check if all parcels have locations
    const parcelsWithoutLocation = parcels.filter(p => !getLocationForParcel(p._id));
    if (parcelsWithoutLocation.length > 0) {
      Alert.alert(
        "Missing Locations",
        `Please select delivery locations for all parcels.\n\n${parcelsWithoutLocation.length} parcel(s) need locations.`,
        [{ text: "OK" }]
      );
      return;
    }

    setAssigning(true);
    try {
      // Update each parcel status to "Pending" (waiting for driver acceptance)
      for (const parcel of parcels) {
        await api.updateParcelStatus(parcel._id, "Pending");
      }

      // Create notification for the driver with delivery locations
      const tripId = `TR-${Date.now().toString().slice(-6)}-X`;
      const notificationRes = await api.createNotification({
        driverId,
        vehicleId,
        parcelIds,
        tripId,
        message: `New trip assigned with ${parcelIds.length} parcel(s). Vehicle: ${vehicle?.regNumber || 'N/A'}`,
        deliveryLocations: deliveryLocations.map((loc, index) => ({
          ...loc,
          order: index,
        })),
      });

      if (!notificationRes.ok) {
        Alert.alert("Error", "Failed to send notification to driver");
        setAssigning(false);
        return;
      }

      Alert.alert("Success", "Trip assigned successfully! Driver has been notified.\n\nParcels are now in 'Pending' status with delivery locations.", [
        {
          text: "OK",
          onPress: () => {
            router.push("/manager-dashboard");
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

        {/* Parcels Section with Location Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Parcels & Delivery Locations ({parcels.length})</Text>
          </View>
          
          <View style={styles.locationInfoBanner}>
            <MapPin size={16} color="#D97706" />
            <Text style={styles.locationInfoText}>
              Tap "Set Location" to mark delivery point on map for each parcel
            </Text>
          </View>

          <View style={styles.parcelsList}>
            {parcels.map((parcel, index) => {
              const location = getLocationForParcel(parcel._id);
              return (
                <View key={parcel._id} style={styles.parcelItem}>
                  <View style={styles.parcelContent}>
                    <View style={styles.parcelNumber}>
                      <Text style={styles.parcelNumberText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.parcelId}>
                        {parcel.trackingId || parcel._id.slice(-8)}
                      </Text>
                      {parcel.weight && (
                        <Text style={styles.parcelWeight}>
                          Weight: {parcel.weight}kg
                        </Text>
                      )}
                      <Text style={styles.recipientAddress} numberOfLines={1}>
                        To: {parcel.recipient?.name || "Unknown"}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Location Selection */}
                  <View style={styles.locationSection}>
                    {location ? (
                      <View style={styles.locationSet}>
                        <View style={styles.locationSetInfo}>
                          <MapPin size={14} color="#10B981" />
                          <Text style={styles.locationSetText} numberOfLines={1}>
                            {location.address}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.changeLocationBtn}
                          onPress={() => openMapForParcel(parcel, index)}
                        >
                          <Text style={styles.changeLocationText}>Change</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.setLocationBtn}
                        onPress={() => openMapForParcel(parcel, index)}
                      >
                        <Navigation size={16} color="#fff" />
                        <Text style={styles.setLocationText}>Set Location</Text>
                      </TouchableOpacity>
                    )}
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

        {/* Location Status */}
        <View style={styles.locationStatusSection}>
          <View style={[
            styles.locationStatusBadge,
            deliveryLocations.length === parcels.length 
              ? styles.locationStatusComplete 
              : styles.locationStatusIncomplete
          ]}>
            {deliveryLocations.length === parcels.length ? (
              <>
                <CheckCircle size={20} color="#10B981" />
                <Text style={styles.locationStatusTextComplete}>
                  All delivery locations set ({deliveryLocations.length}/{parcels.length})
                </Text>
              </>
            ) : (
              <>
                <MapPin size={20} color="#D97706" />
                <Text style={styles.locationStatusTextIncomplete}>
                  {deliveryLocations.length}/{parcels.length} locations set - Please set all locations
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Confirmation Badge */}
        <View style={[
          styles.confirmationBadge,
          deliveryLocations.length !== parcels.length && styles.confirmationBadgeWarning
        ]}>
          {deliveryLocations.length === parcels.length ? (
            <>
              <CheckCircle size={24} color="#10B981" />
              <Text style={styles.confirmationText}>
                All details are ready for assignment
              </Text>
            </>
          ) : (
            <>
              <AlertCircle size={24} color="#D97706" />
              <Text style={styles.confirmationTextWarning}>
                Set delivery locations for all parcels before assigning
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Map Modal for Location Selection */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity
              style={styles.mapModalCloseBtn}
              onPress={() => setMapModalVisible(false)}
            >
              <X size={24} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.mapModalTitleContainer}>
              <Text style={styles.mapModalTitle}>Select Delivery Location</Text>
              {selectedParcelForMap && (
                <Text style={styles.mapModalSubtitle}>
                  Parcel {(selectedParcelForMap as any).orderIndex + 1}: {selectedParcelForMap.trackingId || selectedParcelForMap._id.slice(-8)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.mapModalConfirmBtn,
                !tempSelectedLocation && styles.mapModalConfirmBtnDisabled
              ]}
              onPress={confirmLocationSelection}
              disabled={!tempSelectedLocation}
            >
              <Check size={24} color={tempSelectedLocation ? "#10B981" : "#94A3B8"} />
            </TouchableOpacity>
          </View>

          <View style={styles.mapInstructionBanner}>
            <MapPin size={16} color="#2563EB" />
            <Text style={styles.mapInstructionText}>
              Tap on the map to select delivery location
            </Text>
          </View>

          <MapView
            style={styles.fullMap}
            initialRegion={{
              latitude: tempSelectedLocation?.latitude || currentLocation?.latitude || 12.9716,
              longitude: tempSelectedLocation?.longitude || currentLocation?.longitude || 77.5946,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {tempSelectedLocation && (
              <Marker
                coordinate={{
                  latitude: tempSelectedLocation.latitude,
                  longitude: tempSelectedLocation.longitude,
                }}
                title="Delivery Location"
                description={tempSelectedLocation.address}
              >
                <View style={styles.customMarker}>
                  <MapPin size={28} color="#EF4444" fill="#EF4444" />
                </View>
              </Marker>
            )}
          </MapView>

          {tempSelectedLocation && (
            <View style={styles.selectedLocationCard}>
              <View style={styles.selectedLocationIcon}>
                <MapPin size={20} color="#10B981" />
              </View>
              <View style={styles.selectedLocationInfo}>
                <Text style={styles.selectedLocationLabel}>Selected Location</Text>
                <Text style={styles.selectedLocationAddress} numberOfLines={2}>
                  {tempSelectedLocation.address}
                </Text>
                <Text style={styles.selectedLocationCoords}>
                  {tempSelectedLocation.latitude.toFixed(6)}, {tempSelectedLocation.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

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
  parcelWeight: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  recipientAddress: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  // Location selection styles
  locationInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  locationInfoText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
  },
  locationSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  setLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  setLocationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  locationSet: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationSetInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  locationSetText: {
    fontSize: 12,
    color: "#059669",
    flex: 1,
  },
  changeLocationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
  },
  changeLocationText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  // Location status section
  locationStatusSection: {
    marginBottom: 10,
  },
  locationStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  locationStatusComplete: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  locationStatusIncomplete: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  locationStatusTextComplete: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
  },
  locationStatusTextIncomplete: {
    fontSize: 13,
    color: "#D97706",
    fontWeight: "600",
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
  confirmationBadgeWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FEF3C7",
  },
  confirmationText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
    marginLeft: 12,
  },
  confirmationTextWarning: {
    fontSize: 14,
    color: "#D97706",
    fontWeight: "600",
    marginLeft: 12,
  },
  // Map modal styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  mapModalCloseBtn: {
    padding: 4,
  },
  mapModalTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  mapModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  mapModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  mapModalConfirmBtn: {
    padding: 4,
  },
  mapModalConfirmBtnDisabled: {
    opacity: 0.5,
  },
  mapInstructionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  mapInstructionText: {
    fontSize: 13,
    color: "#1D4ED8",
  },
  fullMap: {
    flex: 1,
  },
  customMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLocationCard: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    gap: 12,
  },
  selectedLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedLocationInfo: {
    flex: 1,
  },
  selectedLocationLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  selectedLocationAddress: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
    marginTop: 4,
  },
  selectedLocationCoords: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
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
