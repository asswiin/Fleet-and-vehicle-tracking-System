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
  Dimensions,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Package,
  CheckCircle,
  Search,
  Route,
  X,
  Target,
  Edit3,
  Check,
} from "lucide-react-native";
import { MapView, Marker, PROVIDER_DEFAULT, isMapAvailable } from "../components/MapViewWrapper.native";
import { api, type Parcel } from "../utils/api";

const { width, height } = Dimensions.get("window");

interface LocationPoint {
  parcelId: string;
  trackingId: string;
  recipientName: string;
  address: string;
  latitude: number;
  longitude: number;
  order: number;
  isLocationSet: boolean;
}

// Predefined locations for search (Kerala, India region)
const PREDEFINED_LOCATIONS = [
  { name: "Kochi", city: "Kochi", latitude: 9.9312, longitude: 76.2673 },
  { name: "Thiruvananthapuram", city: "Thiruvananthapuram", latitude: 8.5241, longitude: 76.9366 },
  { name: "Kozhikode (Calicut)", city: "Kozhikode", latitude: 11.2588, longitude: 75.7804 },
  { name: "Thrissur", city: "Thrissur", latitude: 10.5276, longitude: 76.2144 },
  { name: "Kollam", city: "Kollam", latitude: 8.8932, longitude: 76.6141 },
  { name: "Palakkad", city: "Palakkad", latitude: 10.7867, longitude: 76.6548 },
  { name: "Alappuzha (Alleppey)", city: "Alappuzha", latitude: 9.4981, longitude: 76.3388 },
  { name: "Kannur", city: "Kannur", latitude: 11.8745, longitude: 75.3704 },
  { name: "Kottayam", city: "Kottayam", latitude: 9.5916, longitude: 76.5222 },
  { name: "Malappuram", city: "Malappuram", latitude: 11.0510, longitude: 76.0711 },
  { name: "Ernakulam", city: "Ernakulam", latitude: 9.9816, longitude: 76.2999 },
  { name: "Pathanamthitta", city: "Pathanamthitta", latitude: 9.2648, longitude: 76.7870 },
  { name: "Idukki", city: "Idukki", latitude: 9.8494, longitude: 76.9710 },
  { name: "Wayanad", city: "Wayanad", latitude: 11.6854, longitude: 76.1320 },
  { name: "Kasaragod", city: "Kasaragod", latitude: 12.4996, longitude: 74.9869 },
  { name: "Fort Kochi", city: "Kochi", latitude: 9.9639, longitude: 76.2426 },
  { name: "Munnar", city: "Idukki", latitude: 10.0889, longitude: 77.0595 },
  { name: "Thekkady", city: "Idukki", latitude: 9.6037, longitude: 77.1620 },
  { name: "Varkala", city: "Thiruvananthapuram", latitude: 8.7379, longitude: 76.7163 },
  { name: "Guruvayur", city: "Thrissur", latitude: 10.5946, longitude: 76.0369 },
];

const SelectLocationScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<any>(null);

  // Get data from navigation params
  const parcelIds = JSON.parse((params.parcelIds as string) || "[]");
  const totalWeight = parseFloat((params.totalWeight as string) || "0");
  const vehicleId = (params.vehicleId as string) || "";
  const driverId = (params.driverId as string) || "";

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [startLocation, setStartLocation] = useState({
    latitude: 10.8505,  // Default: Kerala, India
    longitude: 76.2711,
    address: "Warehouse / Starting Point",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLocations, setFilteredLocations] = useState(PREDEFINED_LOCATIONS);
  
  // Location selection modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedParcelIndex, setSelectedParcelIndex] = useState<number | null>(null);
  const [tempSelectedCoords, setTempSelectedCoords] = useState<{latitude: number, longitude: number, name?: string} | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  // Default map region (Kerala, India)
  const [region, setRegion] = useState({
    latitude: 10.8505,
    longitude: 76.2711,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  useEffect(() => {
    fetchParcelDetails();
  }, []);

  const fetchParcelDetails = async () => {
    setLoading(true);
    try {
      const response = await api.getParcels();
      if (response.ok && response.data) {
        const selectedParcels = response.data.filter((p: Parcel) =>
          parcelIds.includes(p._id)
        );
        setParcels(selectedParcels);
        
        // Generate location points from parcels
        const locationPoints = await generateLocationPoints(selectedParcels);
        setLocations(locationPoints);
        
        // Fit map to show all markers
        if (locationPoints.length > 0) {
          fitMapToMarkers(locationPoints);
        }
      }
    } catch (error) {
      console.error("Error fetching parcels:", error);
      Alert.alert("Error", "Failed to load parcel details");
    } finally {
      setLoading(false);
    }
  };

  const generateLocationPoints = async (parcels: Parcel[]): Promise<LocationPoint[]> => {
    // Generate location points based on parcel addresses
    // Manager will set locations manually via search/map
    const points: LocationPoint[] = [];
    
    for (let i = 0; i < parcels.length; i++) {
      const parcel = parcels[i];
      
      // Check if parcel already has coordinates
      let lat = parcel.deliveryLocation?.latitude;
      let lng = parcel.deliveryLocation?.longitude;
      const hasLocation = !!(lat && lng);
      
      if (!lat || !lng) {
        lat = 0;
        lng = 0;
      }
      
      points.push({
        parcelId: parcel._id,
        trackingId: parcel.trackingId || `PKG-${i + 1}`,
        recipientName: parcel.recipient?.name || "Unknown",
        address: parcel.recipient?.address || "No address",
        latitude: lat,
        longitude: lng,
        order: i + 1,
        isLocationSet: hasLocation,
      });
    }
    
    return points;
  };

  const fitMapToMarkers = (points: LocationPoint[]) => {
    if (mapRef.current && points.length > 0) {
      const coordinates = [
        { latitude: startLocation.latitude, longitude: startLocation.longitude },
        ...points.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
      ];
      
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
          animated: true,
        });
      }, 500);
    }
  };

  const handleMarkerPress = (location: LocationPoint) => {
    Alert.alert(
      `📦 ${location.trackingId}`,
      `Recipient: ${location.recipientName}\n\nAddress: ${location.address}`,
      [{ text: "OK" }]
    );
  };

  // Open location selection modal for a parcel
  const openLocationSelector = (index: number) => {
    setSelectedParcelIndex(index);
    setModalSearchQuery("");
    setFilteredLocations(PREDEFINED_LOCATIONS);
    const currentLoc = locations[index];
    if (currentLoc.isLocationSet) {
      setTempSelectedCoords({ latitude: currentLoc.latitude, longitude: currentLoc.longitude });
    } else {
      setTempSelectedCoords(null);
    }
    setShowLocationModal(true);
  };

  // Handle search in modal
  const handleModalSearch = (query: string) => {
    setModalSearchQuery(query);
    if (!query.trim()) {
      setFilteredLocations(PREDEFINED_LOCATIONS);
    } else {
      const filtered = PREDEFINED_LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.city.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  };

  // Select a predefined location from search
  const selectSearchLocation = (loc: typeof PREDEFINED_LOCATIONS[0]) => {
    setTempSelectedCoords({ 
      latitude: loc.latitude, 
      longitude: loc.longitude,
      name: loc.name 
    });
    // Animate map to selected location
    mapRef.current?.animateToRegion({
      latitude: loc.latitude,
      longitude: loc.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 500);
  };

  // Handle map press to select custom location
  const handleMapPress = (event: any) => {
    if (showLocationModal) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setTempSelectedCoords({ latitude, longitude, name: "Custom Location" });
    }
  };

  // Confirm location selection for a parcel
  const confirmLocationSelection = () => {
    if (selectedParcelIndex === null || !tempSelectedCoords) {
      Alert.alert("No Location", "Please select a location from search or tap on the map");
      return;
    }

    const updatedLocations = [...locations];
    updatedLocations[selectedParcelIndex] = {
      ...updatedLocations[selectedParcelIndex],
      latitude: tempSelectedCoords.latitude,
      longitude: tempSelectedCoords.longitude,
      isLocationSet: true,
    };
    setLocations(updatedLocations);
    setShowLocationModal(false);
    setSelectedParcelIndex(null);
    setTempSelectedCoords(null);

    // Fit map to show all set locations
    const setLocs = updatedLocations.filter(l => l.isLocationSet);
    if (setLocs.length > 0) {
      fitMapToMarkers(setLocs);
    }
  };

  // Cancel location selection
  const cancelLocationSelection = () => {
    setShowLocationModal(false);
    setSelectedParcelIndex(null);
    setTempSelectedCoords(null);
    setModalSearchQuery("");
  };

  const handleOptimizeRoute = () => {
    // Simple route optimization - sort by distance from starting point
    // In production, use a proper routing API like Google Directions
    const optimized = [...locations].sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.latitude - startLocation.latitude, 2) +
        Math.pow(a.longitude - startLocation.longitude, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.latitude - startLocation.latitude, 2) +
        Math.pow(b.longitude - startLocation.longitude, 2)
      );
      return distA - distB;
    });
    
    // Update order numbers
    const reordered = optimized.map((loc, idx) => ({
      ...loc,
      order: idx + 1,
    }));
    
    setLocations(reordered);
    Alert.alert("Route Optimized", "Delivery order has been optimized based on distance from starting point.");
  };

  const handleConfirmLocations = () => {
    // Check if all parcels have locations set
    const unsetCount = locations.filter(loc => !loc.isLocationSet).length;
    if (unsetCount > 0) {
      Alert.alert(
        "Missing Locations",
        `${unsetCount} parcel(s) don't have delivery locations. Please set locations for all parcels.`,
        [{ text: "OK" }]
      );
      return;
    }

    // Pass location data to trip summary
    const locationData = locations.map(loc => ({
      parcelId: loc.parcelId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      order: loc.order,
    }));

    router.push({
      pathname: "/trip-summary",
      params: {
        parcelIds: JSON.stringify(parcelIds),
        totalWeight: totalWeight.toString(),
        vehicleId: vehicleId,
        driverId: driverId,
        deliveryLocations: JSON.stringify(locationData),
        startLocation: JSON.stringify(startLocation),
      },
    } as any);
  };

  const updateLocationOrder = (parcelId: string, newOrder: number) => {
    const updated = locations.map(loc => {
      if (loc.parcelId === parcelId) {
        return { ...loc, order: newOrder };
      }
      return loc;
    });
    
    // Re-sort by order
    updated.sort((a, b) => a.order - b.order);
    setLocations(updated);
  };

  const getMarkerColor = (order: number): string => {
    const colors = ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D', '#16A34A', '#0D9488', '#0891B2', '#2563EB', '#7C3AED'];
    return colors[(order - 1) % colors.length];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Delivery Locations</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading parcel locations...</Text>
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
        <Text style={styles.headerTitle}>Set Delivery Locations</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <MapPin size={16} color="#2563EB" />
        <Text style={styles.infoBannerText}>
          Tap "Set Location" for each parcel to search and select delivery point
        </Text>
      </View>

      {/* Map View - Shows all set locations */}
      <View style={styles.mapContainer}>
        {isMapAvailable ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {/* Starting Point Marker */}
            <Marker
              coordinate={{
                latitude: startLocation.latitude,
                longitude: startLocation.longitude,
              }}
              title="Starting Point"
              description="Warehouse / Pickup Location"
              pinColor="#10B981"
            />

            {/* Delivery Location Markers - Only show set locations */}
            {locations.filter(loc => loc.isLocationSet).map((location) => (
              <Marker
                key={location.parcelId}
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title={`${location.order}. ${location.trackingId}`}
                description={`${location.recipientName}`}
                onPress={() => handleMarkerPress(location)}
              >
                <View style={[styles.customMarker, { backgroundColor: getMarkerColor(location.order) }]}>
                  <Text style={styles.markerText}>{location.order}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.mapFallback}>
            <MapPin size={48} color="#94A3B8" />
            <Text style={styles.mapFallbackText}>Map not available</Text>
          </View>
        )}
      </View>

      {/* Parcel List with Set Location buttons */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Package size={20} color="#2563EB" />
          <Text style={styles.listTitle}>
            Parcels ({locations.filter(l => l.isLocationSet).length}/{locations.length} locations set)
          </Text>
        </View>
        
        <ScrollView 
          style={styles.locationList}
          showsVerticalScrollIndicator={false}
        >
          {/* Starting Point */}
          <View style={[styles.locationItem, styles.startingPoint]}>
            <View style={[styles.orderBadge, { backgroundColor: '#10B981' }]}>
              <Navigation size={14} color="#fff" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>Starting Point</Text>
              <Text style={styles.locationAddress}>{startLocation.address}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Check size={14} color="#10B981" />
            </View>
          </View>

          {/* Parcel Delivery Locations */}
          {locations.map((location, index) => (
            <View 
              key={location.parcelId} 
              style={[
                styles.locationItem,
                !location.isLocationSet && styles.locationNotSet
              ]}
            >
              <View style={[
                styles.orderBadge, 
                { backgroundColor: location.isLocationSet ? getMarkerColor(location.order) : '#94A3B8' }
              ]}>
                <Text style={styles.orderText}>{location.order}</Text>
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>{location.trackingId}</Text>
                <Text style={styles.recipientName}>{location.recipientName}</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {location.address}
                </Text>
                {location.isLocationSet ? (
                  <View style={styles.statusRow}>
                    <MapPin size={12} color="#10B981" />
                    <Text style={styles.statusText}>Location set ✓</Text>
                  </View>
                ) : (
                  <View style={styles.statusRow}>
                    <MapPin size={12} color="#EF4444" />
                    <Text style={[styles.statusText, { color: '#EF4444' }]}>Not set</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity 
                style={[
                  styles.setLocationBtn,
                  location.isLocationSet && styles.editLocationBtn
                ]}
                onPress={() => openLocationSelector(index)}
              >
                {location.isLocationSet ? (
                  <Edit3 size={16} color="#2563EB" />
                ) : (
                  <Target size={16} color="#fff" />
                )}
                <Text style={[
                  styles.setLocationText,
                  location.isLocationSet && styles.editLocationText
                ]}>
                  {location.isLocationSet ? "Edit" : "Set"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.optimizeButton,
            locations.filter(l => l.isLocationSet).length < 2 && styles.buttonDisabled
          ]}
          onPress={handleOptimizeRoute}
          disabled={locations.filter(l => l.isLocationSet).length < 2}
        >
          <Route size={18} color={locations.filter(l => l.isLocationSet).length < 2 ? "#94A3B8" : "#2563EB"} />
          <Text style={[
            styles.optimizeButtonText,
            locations.filter(l => l.isLocationSet).length < 2 && styles.buttonTextDisabled
          ]}>Optimize</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            locations.some(l => !l.isLocationSet) && styles.confirmButtonDisabled
          ]}
          onPress={handleConfirmLocations}
        >
          <CheckCircle size={18} color="#fff" />
          <Text style={styles.confirmButtonText}>Confirm & Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={cancelLocationSelection}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={cancelLocationSelection}>
              <X size={24} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.modalHeaderCenter}>
              <Text style={styles.modalTitle}>Select Location</Text>
              {selectedParcelIndex !== null && (
                <Text style={styles.modalSubtitle}>
                  {locations[selectedParcelIndex]?.trackingId} - {locations[selectedParcelIndex]?.recipientName}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              onPress={confirmLocationSelection}
              disabled={!tempSelectedCoords}
            >
              <Check size={24} color={tempSelectedCoords ? "#10B981" : "#94A3B8"} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location (e.g., Kochi, Thrissur...)"
              placeholderTextColor="#94A3B8"
              value={modalSearchQuery}
              onChangeText={handleModalSearch}
              autoFocus={true}
            />
            {modalSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleModalSearch("")}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results */}
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>
              {modalSearchQuery ? `Results for "${modalSearchQuery}"` : "Popular Locations"}
            </Text>
            <FlatList
              data={filteredLocations}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              horizontal={false}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              style={styles.searchResultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.searchResultItem,
                    tempSelectedCoords?.latitude === item.latitude && 
                    tempSelectedCoords?.longitude === item.longitude && 
                    styles.searchResultItemSelected
                  ]}
                  onPress={() => selectSearchLocation(item)}
                >
                  <MapPin size={16} color={
                    tempSelectedCoords?.latitude === item.latitude && 
                    tempSelectedCoords?.longitude === item.longitude 
                      ? "#fff" : "#2563EB"
                  } />
                  <Text style={[
                    styles.searchResultText,
                    tempSelectedCoords?.latitude === item.latitude && 
                    tempSelectedCoords?.longitude === item.longitude && 
                    styles.searchResultTextSelected
                  ]} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyResultsText}>No locations found</Text>
                </View>
              }
            />
          </View>

          {/* Map for custom location selection */}
          <View style={styles.modalMapContainer}>
            <View style={styles.mapInstructions}>
              <Text style={styles.mapInstructionsText}>
                📍 Or tap on map to select custom location
              </Text>
            </View>
            {isMapAvailable ? (
              <MapView
                ref={mapRef}
                style={styles.modalMap}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                  latitude: tempSelectedCoords?.latitude || startLocation.latitude,
                  longitude: tempSelectedCoords?.longitude || startLocation.longitude,
                  latitudeDelta: 0.2,
                  longitudeDelta: 0.2,
                }}
                onPress={handleMapPress}
              >
                {/* Selected Location Marker */}
                {tempSelectedCoords && (
                  <Marker
                    coordinate={{
                      latitude: tempSelectedCoords.latitude,
                      longitude: tempSelectedCoords.longitude,
                    }}
                    title="Selected Location"
                  >
                    <View style={styles.selectedMarker}>
                      <MapPin size={20} color="#fff" />
                    </View>
                  </Marker>
                )}
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <MapPin size={48} color="#94A3B8" />
                <Text style={styles.mapFallbackText}>Map not available</Text>
              </View>
            )}
          </View>

          {/* Selected Location Display */}
          {tempSelectedCoords && (
            <View style={styles.selectedLocationBar}>
              <CheckCircle size={18} color="#10B981" />
              <Text style={styles.selectedLocationText}>
                {tempSelectedCoords.name || `${tempSelectedCoords.latitude.toFixed(4)}, ${tempSelectedCoords.longitude.toFixed(4)}`}
              </Text>
            </View>
          )}

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={cancelLocationSelection}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                !tempSelectedCoords && styles.modalConfirmBtnDisabled
              ]}
              onPress={confirmLocationSelection}
              disabled={!tempSelectedCoords}
            >
              <Check size={18} color="#fff" />
              <Text style={styles.modalConfirmText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" 
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 13,
    color: "#2563EB",
    flex: 1,
  },
  mapContainer: {
    height: height * 0.25,
    backgroundColor: "#E2E8F0",
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  mapFallbackText: {
    marginTop: 8,
    fontSize: 14,
    color: "#94A3B8",
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    paddingTop: 16,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
  },
  locationList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationNotSet: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  startingPoint: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orderText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  recipientName: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "500",
    marginTop: 2,
  },
  locationAddress: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "500",
  },
  statusBadge: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
  },
  setLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    gap: 4,
  },
  editLocationBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#2563EB",
  },
  setLocationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  editLocationText: {
    color: "#2563EB",
  },
  viewButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },
  optimizeButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#2563EB",
    gap: 6,
  },
  optimizeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  buttonDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#94A3B8",
  },
  buttonTextDisabled: {
    color: "#94A3B8",
  },
  confirmButton: {
    flex: 1.5,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    gap: 6,
  },
  confirmButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalHeaderCenter: {
    flex: 1,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    padding: 0,
  },
  searchResultsContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
    maxHeight: 140,
  },
  searchResultsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  searchResultsList: {
    flexGrow: 0,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    margin: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 6,
  },
  searchResultItemSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  searchResultText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
    flex: 1,
  },
  searchResultTextSelected: {
    color: "#fff",
  },
  emptyResults: {
    padding: 20,
    alignItems: "center",
  },
  emptyResultsText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  modalMapContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  mapInstructions: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapInstructionsText: {
    fontSize: 13,
    color: "#fff",
    textAlign: "center",
  },
  modalMap: {
    flex: 1,
  },
  selectedMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedLocationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  selectedLocationText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  modalConfirmBtn: {
    flex: 1.5,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#10B981",
    gap: 6,
  },
  modalConfirmBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export default SelectLocationScreen;
