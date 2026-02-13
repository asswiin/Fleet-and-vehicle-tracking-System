

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
import { MapView, Marker, Polyline, PROVIDER_DEFAULT, isMapAvailable } from "@/components/MapViewWrapper";
import { api, type Parcel } from "../../utils/api";

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
  locationName?: string;
}

// Interface for Nominatim Search Results
interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string; // Derived manually
}

const SelectLocationScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<any>(null);

  // Get data from navigation params
  const parcelIds = JSON.parse((params.parcelIds as string) || "[]");
  const totalWeight = parseFloat((params.totalWeight as string) || "0");
  const vehicleId = (params.vehicleId as string) || "";
  const driverId = (params.driverId as string) || "";
  const parcelOrderParam = JSON.parse((params.parcelOrder as string) || "{}");

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Start Location (You can also make this dynamic if needed)
  const [startLocation, setStartLocation] = useState({
    latitude: 11.312005858164463,
    longitude: 75.95511899663478,
    address: "Warehouse / Starting Point",
  });

  // Location selection modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedParcelIndex, setSelectedParcelIndex] = useState<number | null>(null);
  const [tempSelectedCoords, setTempSelectedCoords] = useState<{ latitude: number, longitude: number, name?: string } | null>(null);

  // Search State
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Route coordinates
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeDistance, setRouteDistance] = useState<string>("0.0");
  const [routeDuration, setRouteDuration] = useState<string>("0m");

  // Default map region
  const [region, setRegion] = useState({
    latitude: 11.312005858164463,
    longitude: 75.95511899663478,
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

        const locationPoints = await generateLocationPoints(selectedParcels);
        setLocations(locationPoints);

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
    const points: LocationPoint[] = [];

    for (let i = 0; i < parcels.length; i++) {
      const parcel = parcels[i];
      let lat = parcel.deliveryLocation?.latitude;
      let lng = parcel.deliveryLocation?.longitude;
      const hasLocation = !!(lat && lng);

      if (!lat || !lng) {
        lat = 0;
        lng = 0;
      }

      const order = parcelOrderParam[parcel._id] || (i + 1);

      points.push({
        parcelId: parcel._id,
        trackingId: parcel.trackingId || `PKG-${i + 1}`,
        recipientName: parcel.recipient?.name || "Unknown",
        address: parcel.recipient?.address || "No address",
        latitude: lat,
        longitude: lng,
        order: order,
        isLocationSet: hasLocation,
      });
    }

    points.sort((a, b) => a.order - b.order);
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
      `Recipient: ${location.recipientName}\n\nDelivery Location: ${location.locationName || 'Not set'}\n\nAddress: ${location.address}`,
      [{ text: "OK" }]
    );
  };

  // --- Search Logic Start ---

  const openLocationSelector = (index: number) => {
    setSelectedParcelIndex(index);
    setModalSearchQuery("");
    setSearchResults([]); // Clear previous results
    const currentLoc = locations[index];
    if (currentLoc.isLocationSet) {
      setTempSelectedCoords({ latitude: currentLoc.latitude, longitude: currentLoc.longitude });
    } else {
      setTempSelectedCoords(null);
    }
    setShowLocationModal(true);
  };

  const handleModalSearch = (text: string) => {
    setModalSearchQuery(text);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text || text.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce: Wait 1 second after typing stops before calling API
    // This prevents "Too Many Requests" errors from the free API
    searchTimeoutRef.current = setTimeout(() => {
      performAddressSearch(text);
    }, 1000);
  };

  const performAddressSearch = async (query: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      // --- 1. Try Photon API first (usually more resilient than Nominatim) ---
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
        const photonResponse = await fetch(photonUrl, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });

        if (photonResponse.ok) {
          const photonData = await photonResponse.json();
          if (photonData.features && Array.isArray(photonData.features) && photonData.features.length > 0) {
            const mappedResults = photonData.features.map((f: any, index: number) => {
              const props = f.properties;
              const coords = f.geometry.coordinates;

              const parts = [props.name, props.city, props.state, props.country].filter(Boolean);

              return {
                place_id: index + Date.now(),
                lat: coords[1].toString(),
                lon: coords[0].toString(),
                display_name: parts.join(', '),
                name: props.name || props.city || "Search Result"
              };
            });

            setSearchResults(mappedResults);
            return;
          }
        }
      } catch (photonError) {
        console.warn("Photon search failed, falling back to Nominatim:", photonError);
      }

      // --- 2. Fallback to Nominatim ---
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`;

      const response = await fetch(nominatimUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'FleetTracker-Mobile/1.0 (Contact: support@fleettracker.local)'
        }
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("Too many search requests. Please wait a moment.");
        if (response.status === 509) throw new Error("Search service bandwidth limit reached. Please try again later or use the map.");
        throw new Error(`Location service unavailable (${response.status})`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        console.warn("Nominatim returned non-array data:", data);
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      let errorMessage = "Could not fetch location results.";

      if (error.name === 'AbortError') {
        errorMessage = "Search request timed out. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Search Error", `${errorMessage}\n\nPlease check your internet connection or select manually from the map.`);
    } finally {
      clearTimeout(timeoutId);
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    // Extract a shorter name from display_name (usually the first part)
    const shortName = item.display_name.split(',')[0];

    setTempSelectedCoords({
      latitude: lat,
      longitude: lng,
      name: shortName
    });

    // Clear search to show the map view
    setSearchResults([]);
    setModalSearchQuery("");

    // Animate map to this location
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01, // Zoom in closer for specific address
      longitudeDelta: 0.01,
    }, 1000);
  };

  // --- Search Logic End ---

  const handleMapPress = (event: any) => {
    if (showLocationModal) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setTempSelectedCoords({ latitude, longitude, name: "Custom Location" });
    }
  };

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
      locationName: tempSelectedCoords.name || `${tempSelectedCoords.latitude.toFixed(4)}, ${tempSelectedCoords.longitude.toFixed(4)}`,
    };
    setLocations(updatedLocations);
    setShowLocationModal(false);
    setSelectedParcelIndex(null);
    setTempSelectedCoords(null);
    setSearchResults([]);
    setModalSearchQuery("");

    const setLocs = updatedLocations.filter(l => l.isLocationSet);
    if (setLocs.length > 0) {
      fitMapToMarkers(setLocs);
    }
  };

  const cancelLocationSelection = () => {
    setShowLocationModal(false);
    setSelectedParcelIndex(null);
    setTempSelectedCoords(null);
    setModalSearchQuery("");
    setSearchResults([]);
  };

  const handleOptimizeRoute = () => {
    // Simple optimization based on direct distance
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

    const reordered = optimized.map((loc, idx) => ({
      ...loc,
      order: idx + 1,
    }));

    setLocations(reordered);
    Alert.alert("Route Optimized", "Delivery order has been optimized based on distance from starting point.");
  };

  const handleConfirmLocations = () => {
    const unsetCount = locations.filter(loc => !loc.isLocationSet).length;
    if (unsetCount > 0) {
      Alert.alert(
        "Missing Locations",
        `${unsetCount} parcel(s) don't have delivery locations. Please set locations for all parcels.`,
        [{ text: "OK" }]
      );
      return;
    }

    const locationData = locations.map(loc => ({
      parcelId: loc.parcelId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      order: loc.order,
      locationName: loc.locationName || "Unknown Location",
    }));

    router.push({
      pathname: "manager/trip-summary",
      params: {
        parcelIds: JSON.stringify(parcelIds),
        totalWeight: totalWeight.toString(),
        vehicleId: vehicleId,
        driverId: driverId,
        managerId: params.managerId as string,
        deliveryLocations: JSON.stringify(locationData),
        startLocation: JSON.stringify(startLocation),
      },
    } as any);
  };

  const getMarkerColor = (order: number): string => {
    const colors = ['#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D', '#16A34A', '#0D9488', '#0891B2', '#2563EB', '#7C3AED'];
    return colors[(order - 1) % colors.length];
  };

  const decodePolyline = (encoded: string): { latitude: number, longitude: number }[] => {
    const points: { latitude: number, longitude: number }[] = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  // OSRM Routing (Free)
  const fetchRoute = async (waypoints: { latitude: number, longitude: number }[]) => {
    if (waypoints.length < 2) {
      setRouteCoordinates([]);
      setRouteDistance("0.0");
      setRouteDuration("0m");
      return;
    }

    setIsLoadingRoute(true);
    try {
      const coordinateString = waypoints
        .map(p => `${p.longitude},${p.latitude}`)
        .join(';');

      const url = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=polyline`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FleetVehicleTracker/1.0'
        }
      });

      if (!response.ok) {
        console.warn(`OSRM Error: ${response.status} ${response.statusText}`);
        // Fallback to direct distance
        setRouteCoordinates(waypoints);
        calculateFallbackDistance(waypoints);
        return;
      }

      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.geometry);
        setRouteCoordinates(points);

        const km = route.distance / 1000;
        setRouteDistance(km.toFixed(1));
        setRouteDuration(formatDuration(route.duration));
      } else {
        console.warn('OSRM returned no routes or error code:', data.code);
        setRouteCoordinates(waypoints);
        calculateFallbackDistance(waypoints);
      }
    } catch (error) {
      console.error('Error fetching OSRM route:', error);
      setRouteCoordinates(waypoints);
      calculateFallbackDistance(waypoints);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateFallbackDistance = (waypoints: { latitude: number, longitude: number }[]) => {
    let totalDist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDist += calculateDistance(
        waypoints[i].latitude, waypoints[i].longitude,
        waypoints[i + 1].latitude, waypoints[i + 1].longitude
      );
    }
    setRouteDistance(totalDist.toFixed(1));
    const avgSpeed = 40;
    const seconds = (totalDist / avgSpeed) * 3600;
    setRouteDuration(formatDuration(seconds));
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  useEffect(() => {
    const setLocs = locations.filter(loc => loc.isLocationSet).sort((a, b) => a.order - b.order);
    if (setLocs.length > 0) {
      const waypoints = [
        { latitude: startLocation.latitude, longitude: startLocation.longitude },
        ...setLocs.map(loc => ({ latitude: loc.latitude, longitude: loc.longitude }))
      ];
      fetchRoute(waypoints);
    } else {
      setRouteCoordinates([]);
      setRouteDistance("0.0");
      setRouteDuration("0m");
    }
  }, [locations, startLocation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Delivery Locations</Text>
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

      <View style={styles.infoBanner}>
        <MapPin size={16} color="#2563EB" />
        <Text style={styles.infoBannerText}>
          Tap "Set" to search for an address or select from map
        </Text>
      </View>

      <View style={styles.mapContainer}>
        {isMapAvailable ? (
          <>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={region}
              showsUserLocation={false}
              showsMyLocationButton={false}
            >
              {routeCoordinates.length > 1 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#2563EB"
                  strokeWidth={4}
                  lineDashPattern={[0]}
                />
              )}

              <Marker
                coordinate={{
                  latitude: startLocation.latitude,
                  longitude: startLocation.longitude,
                }}
                title="Starting Point"
              >
                <View style={styles.startingPointMarker}>
                  <View style={styles.startingPointInner}>
                    <MapPin size={18} color="#fff" />
                  </View>
                </View>
              </Marker>

              {locations.filter(loc => loc.isLocationSet).sort((a, b) => a.order - b.order).map((location) => (
                <Marker
                  key={location.parcelId}
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title={`${location.order}. ${location.trackingId}`}
                  onPress={() => handleMarkerPress(location)}
                >
                  <View style={[styles.customMarker, { backgroundColor: getMarkerColor(location.order) }]}>
                    <Text style={styles.markerText}>{location.order}</Text>
                  </View>
                </Marker>
              ))}
            </MapView>

            {isLoadingRoute && (
              <View style={styles.routeLoadingOverlay}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.routeLoadingText}>Calculating route...</Text>
              </View>
            )}

            {locations.filter(loc => loc.isLocationSet).length > 0 && (
              <View style={styles.routeInfoOverlay}>
                <View style={styles.routeInfoCard}>
                  <View style={styles.routeDistanceContainer}>
                    <View>
                      <Text style={styles.routeDistance}>{routeDistance} km</Text>
                      <Text style={styles.routeLabel}>Total Distance</Text>
                    </View>
                    <View style={styles.routeDivider} />
                    <View>
                      <Text style={styles.routeTime}>{routeDuration}</Text>
                      <Text style={styles.routeLabel}>Est. Time</Text>
                    </View>
                  </View>
                  <Text style={styles.routeStops}>
                    📍 {locations.filter(loc => loc.isLocationSet).length} Stop{locations.filter(loc => loc.isLocationSet).length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.mapFallback}>
            <MapPin size={48} color="#94A3B8" />
            <Text style={styles.mapFallbackText}>Map not available</Text>
          </View>
        )}
      </View>

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Package size={20} color="#2563EB" />
          <Text style={styles.listTitle}>
            Parcels ({locations.filter(l => l.isLocationSet).length}/{locations.length} locations set)
          </Text>
        </View>

        <ScrollView style={styles.locationList} showsVerticalScrollIndicator={false}>
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
                  <View style={styles.locationSetRow}>
                    <MapPin size={14} color="#10B981" />
                    <Text style={styles.locationNameText} numberOfLines={1}>
                      {location.locationName || 'Location set'}
                    </Text>
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
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={cancelLocationSelection}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={cancelLocationSelection}>
              <X size={24} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.modalHeaderCenter}>
              <Text style={styles.modalTitle}>Search Location</Text>
              {selectedParcelIndex !== null && (
                <Text style={styles.modalSubtitle}>
                  {locations[selectedParcelIndex]?.trackingId}
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

          <View style={styles.searchContainer}>
            <Search size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter address (e.g. Lulu Mall, Kochi)"
              placeholderTextColor="#94A3B8"
              value={modalSearchQuery}
              onChangeText={handleModalSearch}
              autoFocus={true}
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator size="small" color="#2563EB" />}
            {(!isSearching && modalSearchQuery.length > 0) && (
              <TouchableOpacity onPress={() => {
                setModalSearchQuery("");
                setSearchResults([]);
              }}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results List */}
          {searchResults.length > 0 ? (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>Search Results</Text>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.place_id.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItemFull}
                    onPress={() => selectSearchResult(item)}
                  >
                    <View style={styles.searchResultIcon}>
                      <MapPin size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultTextMain} numberOfLines={1}>
                        {item.display_name.split(',')[0]}
                      </Text>
                      <Text style={styles.searchResultTextSub} numberOfLines={2}>
                        {item.display_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}

          <View style={styles.modalMapContainer}>
            {!isSearching && searchResults.length === 0 && (
              <View style={styles.mapInstructions}>
                <Text style={styles.mapInstructionsText}>
                  {modalSearchQuery.length > 0 && modalSearchQuery.length < 3
                    ? "Keep typing to search..."
                    : "📍 Use search or tap map to set location"}
                </Text>
              </View>
            )}

            {isMapAvailable ? (
              <MapView
                ref={mapRef}
                style={styles.modalMap}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                  latitude: tempSelectedCoords?.latitude || 11.312005858164463,
                  longitude: tempSelectedCoords?.longitude || 75.95511899663478,
                  latitudeDelta: 0.2,
                  longitudeDelta: 0.2,
                }}
                onPress={handleMapPress}
              >
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

          {tempSelectedCoords && (
            <View style={styles.selectedLocationBar}>
              <CheckCircle size={18} color="#10B981" />
              <Text style={styles.selectedLocationText}>
                {tempSelectedCoords.name || "Location Selected on Map"}
              </Text>
            </View>
          )}

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
  startingPointMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  startingPointInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  markerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  routeLoadingOverlay: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  routeLoadingText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  routeInfoOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 5,
  },
  routeInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  routeDistanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  routeDistance: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  routeTime: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  routeLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  routeDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },
  routeStops: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
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
  locationSetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: "flex-start",
  },
  locationNameText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
    maxWidth: 120,
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
    maxHeight: 200, // Limit height
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  searchResultsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#F8FAFC",
  },
  searchResultItemFull: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  searchResultTextMain: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  searchResultTextSub: {
    fontSize: 12,
    color: "#64748B",
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

