import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Truck,
  Package,
  MapPin,
  Navigation,
  User,
  Phone,
  Weight,
  Calendar,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  MapIcon,
} from "lucide-react-native";
import { useState, useCallback, useRef, useEffect } from "react";
import { api, Trip } from "../../utils/api";
import { MapView, Marker, Polyline, PROVIDER_DEFAULT, isMapAvailable } from "@/components/MapViewWrapper";
import * as Location from "expo-location";

const { width, height } = Dimensions.get("window");

// Color palette for markers
const MARKER_COLORS = [
  "#2563EB", "#DC2626", "#059669", "#D97706", "#7C3AED",
  "#DB2777", "#0891B2", "#4F46E5", "#EA580C", "#16A34A"
];

const ActiveTripPage = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const driverId = params.driverId as string;

  const [loading, setLoading] = useState(true);
  const [startingJourney, setStartingJourney] = useState(false);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  // Route State
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);
  const [distance, setDistance] = useState<string>("0.0");
  const [duration, setDuration] = useState<string>("0m");
  const [isRouting, setIsRouting] = useState(false);
  const [driverLocation, setDriverLocation] = useState<Location.LocationObject | null>(null);
  const [liveLocation, setLiveLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [ongoingTrip, setOngoingTrip] = useState<any>(null);
  const [rawDistance, setRawDistance] = useState<number>(0);
  const [rawDuration, setRawDuration] = useState<number>(0);

  // useEffect to watch location if trip is in-progress
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn("Location permission not granted");
          return;
        }

        // Check if location services are enabled
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          console.warn("Location services are disabled");
          setError("Location services are disabled. Please enable GPS.");
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 30000, // 30 seconds
            distanceInterval: 50, // 50 meters
          },
          (location) => {
            setDriverLocation(location);
            if (activeTrip && activeTrip.status === 'in-progress') {
              api.updateTripLocation(activeTrip._id, {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              });
            }
          }
        );
      } catch (err: any) {
        console.error("Error starting location watch:", err);
        if (err.message.includes("location services are disabled") || err.message.includes("unavailable")) {
          setError("Current location is unavailable. Make sure that location services are enabled.");
        }
      }
    };

    if (activeTrip && (activeTrip.status === 'in-progress' || activeTrip.status === 'returning')) {
      startWatching();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [activeTrip?.status, activeTrip?._id]);

  // Fetch active trip data
  const fetchActiveTrip = async (silent = false) => {
    if (!driverId) {
      setError("Driver ID not found");
      if (!silent) setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await api.getActiveTrip(driverId);

      if (response.ok && response.data) {
        setActiveTrip(response.data);
      } else {
        setError("No active trip found. Please accept a trip assignment first.");
      }
    } catch (err) {
      console.error("Error fetching active trip:", err);
      if (!silent) setError("Failed to load trip details");
    } finally {
      if (!silent) setLoading(false);
    }
  };



  useFocusEffect(
    useCallback(() => {
      fetchActiveTrip();
    }, [driverId])
  );

  // Separate effect for polling live location once trip is loaded
  useEffect(() => {
    if (!activeTrip?._id) return;

    const idToUse = activeTrip._id || activeTrip.tripId;

    const syncSimulation = async () => {
      try {
        const ongoingRes = await api.getOngoingTrip(idToUse);
        if (ongoingRes.ok && ongoingRes.data) {
          setOngoingTrip(ongoingRes.data);
          // NOTE: We do NOT use ongoingRes.data.totalDistance here to keep 'Remaining' stats
          if (ongoingRes.data.lastKnownLocation) {
            setLiveLocation({
              latitude: ongoingRes.data.lastKnownLocation.latitude,
              longitude: ongoingRes.data.lastKnownLocation.longitude
            });
          }
        }
      } catch (e) {
        console.warn("Sim sync failed", e);
      }
    };

    syncSimulation();
    const interval = setInterval(syncSimulation, 3000);
    return () => clearInterval(interval);
  }, [activeTrip?._id, activeTrip?.tripId]);

  // --- OSRM Routing Logic ---

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

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Calculate OSRM route for the FULL trip (mirroring track-trip.tsx for consistency)
  const calculateFullRoute = useCallback(async () => {
    if (!activeTrip || !activeTrip.startLocation || !activeTrip.deliveryDestinations) return;

    const sortedDests = [...activeTrip.deliveryDestinations].sort((a, b) => a.order - b.order);
    const waypoints = [
      { latitude: activeTrip.startLocation.latitude, longitude: activeTrip.startLocation.longitude },
      ...sortedDests.map(d => ({ latitude: d.latitude, longitude: d.longitude }))
    ];

    if (waypoints.length < 2) return;

    setIsRouting(true);
    try {
      const coordinateString = waypoints.map(p => `${p.longitude},${p.latitude}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=polyline`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteCoordinates(decodePolyline(route.geometry));

        const distKm = route.distance / 1000;
        const durMin = route.duration / 60;

        setRawDistance(distKm);
        setRawDuration(durMin);
      } else {
        setRouteCoordinates(waypoints);
      }
    } catch (error) {
      console.error('Error fetching OSRM route:', error);
      setRouteCoordinates(waypoints);
    } finally {
      setIsRouting(false);
    }
  }, [activeTrip]);

  // Recalculate route ONLY when the trip itself changes (Total duration/distance is fixed)
  useEffect(() => {
    calculateFullRoute();
  }, [activeTrip?._id, calculateFullRoute]);

  // --- End Routing Logic ---

  const openGoogleMaps = async () => {
    if (!activeTrip?.startLocation || !activeTrip?.deliveryDestinations) {
      Alert.alert("Error", "Route information not available");
      return;
    }

    try {
      // 1. Determine starting point for routing:
      // Priority: Live Simulation -> Last Delivered Stop -> Driver GPS -> Warehouse
      const sortedDests = [...activeTrip.deliveryDestinations].sort((a, b) => a.order - b.order);
      const lastDelivered = [...sortedDests].reverse().find(d => d.deliveryStatus === 'delivered');
      const remainingLocations = sortedDests.filter(d => d.deliveryStatus !== 'delivered');

      if (remainingLocations.length === 0) {
        Alert.alert("Trip Completed", "All parcels have been delivered!");
        return;
      }

      let currentLat = activeTrip.startLocation.latitude;
      let currentLng = activeTrip.startLocation.longitude;

      if (liveLocation) {
        currentLat = liveLocation.latitude;
        currentLng = liveLocation.longitude;
      } else if (lastDelivered) {
        currentLat = lastDelivered.latitude;
        currentLng = lastDelivered.longitude;
      } else if (driverLocation) {
        currentLat = driverLocation.coords.latitude;
        currentLng = driverLocation.coords.longitude;
      }

      const origin = `${currentLat},${currentLng}`;
      const destination = `${remainingLocations[remainingLocations.length - 1].latitude},${remainingLocations[remainingLocations.length - 1].longitude}`;

      // 3. Build waypoints string (exclude last location since it's the destination)
      const waypointsArray = remainingLocations.slice(0, -1).map(loc => `${loc.latitude},${loc.longitude}`);
      const waypoints = waypointsArray.length > 0 ? `&waypoints=${waypointsArray.join('|')}` : '';

      // Construct Google Maps URL
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}`;

      // Check if URL can be opened
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback: Try to open Google Maps app directly
        const mapsUrl = `geo:${origin}`;
        await Linking.openURL(mapsUrl);
      }
    } catch (error) {
      console.error("Error opening Google Maps:", error);
      Alert.alert("Error", "Could not open Google Maps");
    }
  };

  // Handle start journey
  const handleStartJourney = async () => {
    if (!activeTrip) return;

    Alert.alert(
      "Start Journey",
      "Are you sure you want to start this trip? This will update the status of all parcels, vehicle, and your driver status to 'On Trip'.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Journey",
          style: "default",
          onPress: async () => {
            try {
              setStartingJourney(true);
              const response = await api.startJourney(activeTrip._id);

              if (response.ok) {
                Alert.alert(
                  "Journey Started! 🚀",
                  "Your trip has begun. Drive safely!",
                  [{
                    text: "OK",
                    onPress: () => router.replace({
                      pathname: "/driver/driver-dashboard",
                      params: { userId: driverId }
                    } as any)
                  }]
                );
                // Refresh the trip data silently
                fetchActiveTrip(true);
              } else {
                Alert.alert("Error", response.error || "Failed to start journey");
              }
            } catch (err) {
              console.error("Error starting journey:", err);
              Alert.alert("Error", "Something went wrong. Please try again.");
            } finally {
              setStartingJourney(false);
            }
          },
        },
      ]
    );
  };

  // Handle parcel delivery
  const handleDeliver = async (parcelId: string) => {
    if (!activeTrip) return;

    Alert.alert(
      "Confirm Delivery",
      "Are you sure you want to mark this parcel as delivered?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delivered",
          style: "default",
          onPress: async () => {
            try {
              setDeliveryLoading(parcelId);
              const response = await api.updateDeliveryStatus(
                activeTrip._id,
                parcelId,
                "delivered"
              );

              if (response.ok) {
                Alert.alert("Success", "Parcel marked as delivered!");

                // If the entire trip is now in "returning" state (all parcels delivered), navigate back to dashboard
                if (response.data && response.data.status === "returning") {
                  router.replace({
                    pathname: "/driver/driver-dashboard",
                    params: { userId: driverId }
                  } as any);
                } else if (response.data && response.data.status === "completed") {
                  router.replace({
                    pathname: "/shared/trip-history",
                    params: { driverId: driverId, role: 'driver' }
                  } as any);
                } else {
                  fetchActiveTrip(true); // Refresh data for remaining parcels silently
                }
              } else {
                Alert.alert("Error", response.error || "Failed to update status");
              }
            } finally {
              setDeliveryLoading(null);
            }
          },
        },
      ]
    );
  };

  // Calculate map region to fit all markers
  const getMapRegion = () => {
    if (!activeTrip) return null;

    const coords: { latitude: number; longitude: number }[] = [];

    // Add start location
    if (activeTrip.startLocation?.latitude && activeTrip.startLocation?.longitude) {
      coords.push({
        latitude: activeTrip.startLocation.latitude,
        longitude: activeTrip.startLocation.longitude,
      });
    }

    // Add delivery destinations
    activeTrip.deliveryDestinations?.forEach((dest) => {
      if (dest.latitude && dest.longitude) {
        coords.push({
          latitude: dest.latitude,
          longitude: dest.longitude,
        });
      }
    });

    if (coords.length === 0) {
      // Default to India if no coords
      return {
        latitude: 10.8505,
        longitude: 76.2711,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    const latitudes = coords.map((c) => c.latitude);
    const longitudes = coords.map((c) => c.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max((maxLat - minLat) * 1.5, 0.05);
    const deltaLng = Math.max((maxLng - minLng) * 1.5, 0.05);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    };
  };

  // Get route coordinates for polyline
  const getRouteCoords = () => {
    if (!activeTrip) return [];

    const coords: { latitude: number; longitude: number }[] = [];

    // Add start location
    if (activeTrip.startLocation?.latitude && activeTrip.startLocation?.longitude) {
      coords.push({
        latitude: activeTrip.startLocation.latitude,
        longitude: activeTrip.startLocation.longitude,
      });
    }

    // Add delivery destinations sorted by order
    const sortedDestinations = [...(activeTrip.deliveryDestinations || [])].sort(
      (a, b) => a.order - b.order
    );

    sortedDestinations.forEach((dest) => {
      if (dest.latitude && dest.longitude) {
        coords.push({
          latitude: dest.latitude,
          longitude: dest.longitude,
        });
      }
    });

    return coords;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "#F59E0B";
      case "in-progress":
        return "#10B981";
      case "pending":
        return "#6B7280";
      case "completed":
        return "#3B82F6";
      case "returning":
        return "#0891B2";
      default:
        return "#6B7280";
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !activeTrip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active Trip</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>No Active Trip</Text>
          <Text style={styles.errorText}>
            {error || "You don't have any active trip at the moment."}
          </Text>
          <TouchableOpacity
            style={styles.alertsButton}
            onPress={() => router.push({
              pathname: "/driver/trip-notifications",
              params: { driverId }
            } as any)}
          >
            <Text style={styles.alertsButtonText}>View Trip Alerts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const vehicle = activeTrip.vehicleId;
  const parcels = activeTrip.parcelIds || [];
  const destinations = activeTrip.deliveryDestinations || [];
  const mapRegion = getMapRegion();
  const routeCoords = getRouteCoords();
  const isInProgress = activeTrip.status === "in-progress" || activeTrip.status === "returning";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color="#1E293B" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Trip</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(activeTrip.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {activeTrip.status?.toUpperCase() || "PENDING"}
          </Text>
        </View>
      </View>



      {/* Destination Reached Banner */}
      {(() => {
        if (!isInProgress || !liveLocation) return null;
        const reachedIdx = destinations.findIndex(d => {
          if (d.deliveryStatus === 'delivered') return false;
          const dist = Math.sqrt(Math.pow(liveLocation.latitude - d.latitude, 2) + Math.pow(liveLocation.longitude - d.longitude, 2));
          return dist < 0.002;
        });
        if (reachedIdx === -1) return null;
        const reached = destinations[reachedIdx];
        return (
          <View style={styles.destReachedBanner}>
            <View style={styles.bannerIconContainer}>
              <CheckCircle size={28} color="#fff" strokeWidth={2.5} />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.destReachedTitle}>Arrived!</Text>
              <Text style={styles.destReachedText}>You've reached {reached.locationName}. Finalize parcel handover.</Text>
            </View>
          </View>
        );
      })()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Section */}
        {isMapAvailable && mapRegion && (
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <View style={styles.mapTitleRow}>
                <View style={[styles.iconCircle, { backgroundColor: "#EEF2FF", width: 32, height: 32, marginRight: 8 }]}>
                  <MapPin size={16} color="#4F46E5" />
                </View>
                <Text style={styles.mapTitle}>Live Navigation</Text>
              </View>
              <TouchableOpacity
                style={styles.googleMapsBtn}
                onPress={openGoogleMaps}
              >
                <Navigation size={14} color="#fff" />
                <Text style={styles.googleMapsBtnText}>Open Maps</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={mapRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {/* Start Marker */}
                {activeTrip.startLocation?.latitude && activeTrip.startLocation?.longitude && (
                  <Marker
                    key={`start-marker-${activeTrip._id}`}
                    coordinate={{
                      latitude: activeTrip.startLocation.latitude,
                      longitude: activeTrip.startLocation.longitude,
                    }}
                  >
                    <View style={styles.startMarker}>
                      <Navigation size={14} color="#fff" fill="#fff" />
                    </View>
                  </Marker>
                )}

                {/* Delivery Markers */}
                {destinations.map((dest, index) => (
                  <Marker
                    key={`dest-marker-${dest.parcelId || index}-${index}`}
                    coordinate={{
                      latitude: dest.latitude,
                      longitude: dest.longitude,
                    }}
                  >
                    <View style={[
                      styles.deliveryMarker,
                      { backgroundColor: MARKER_COLORS[index % MARKER_COLORS.length] }
                    ]}>
                      <Text style={styles.markerText}>{dest.order}</Text>
                    </View>
                  </Marker>
                ))}

                {/* Driver/Live Markers */}
                {liveLocation && (
                  <Marker coordinate={liveLocation}>
                    <View style={styles.liveMarker}>
                      <Truck size={18} color="#fff" />
                    </View>
                  </Marker>
                )}

                {/* Route Polyline */}
                {routeCoordinates.length > 1 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#2563EB"
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
              </MapView>

              {/* Stats Overlay */}
              <View style={styles.routeStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {(() => {
                      const prog = ongoingTrip?.progress || 0;
                      return (rawDistance * (1 - prog / 100)).toFixed(1);
                    })()}
                  </Text>
                  <Text style={styles.statLabel}>KM LEFT</Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {(() => {
                      const prog = ongoingTrip?.progress || 0;
                      const remMin = Math.max(0, Math.floor(rawDuration * (1 - prog / 100)));
                      return remMin >= 60 ? `${Math.floor(remMin / 60)}h ${remMin % 60}m` : `${remMin}m`;
                    })()}
                  </Text>
                  <Text style={styles.statLabel}>EST. TIME</Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {destinations.filter(d => d.deliveryStatus !== 'delivered').length}
                  </Text>
                  <Text style={styles.statLabel}>STOPS</Text>
                </View>
              </View>

              {isRouting && (
                <View style={styles.routingLoader}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.routingText}>Refining route...</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Trip Summary Card */}
        <View style={styles.tripIdCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#F1F5F9" }]}>
              <Package size={20} color="#334155" />
            </View>
            <View>
              <Text style={styles.tripIdLabel}>TRIP RECAP</Text>
              <Text style={styles.tripIdValue}>#{activeTrip.tripId}</Text>
            </View>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>ASSIGNED</Text>
              <Text style={styles.detailValue}>{formatDate(activeTrip.assignedAt).split(',')[0]}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>LOAD</Text>
              <Text style={styles.detailValue}>{activeTrip.totalWeight || 0} kg</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
              <Truck size={20} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>Fleet Information</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>REGISTRATION</Text>
              <Text style={styles.detailValue}>{vehicle?.regNumber || "N/A"}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>VEHICLE MODEL</Text>
              <Text style={styles.detailValue}>{vehicle?.model || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Parcels Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Package size={20} color="#D97706" />
            </View>
            <Text style={styles.sectionTitle}>Parcel Inventory ({parcels.length})</Text>
          </View>

          {parcels.map((parcel) => (
            <View key={parcel._id} style={styles.parcelCard}>
              <View style={styles.parcelHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.parcelTrackingId}>{parcel.trackingId}</Text>
                  <View style={[
                    styles.parcelStatusBadge,
                    { backgroundColor: parcel.status === "Delivered" ? "#3B82F6" : parcel.status === "In Transit" ? "#10B981" : "#F59E0B" }
                  ]}>
                    <Text style={styles.parcelStatusText}>{parcel.status}</Text>
                  </View>
                </View>

                {isInProgress && parcel.status !== "Delivered" && (
                  <TouchableOpacity
                    style={[
                      styles.deliverBtn,
                      (() => {
                        const dest = destinations.find(d => d.parcelId === parcel._id);
                        if (!dest || !liveLocation) return false;
                        const dist = Math.sqrt(Math.pow(liveLocation.latitude - dest.latitude, 2) + Math.pow(liveLocation.longitude - dest.longitude, 2));
                        return dist < 0.002;
                      })() && styles.deliverBtnActive
                    ]}
                    onPress={() => handleDeliver(parcel._id)}
                    disabled={deliveryLoading !== null}
                  >
                    {deliveryLoading === parcel._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
                    )}
                    <Text style={styles.deliverBtnText}>Deliver</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.parcelDetails}>
                <View style={styles.parcelRow}>
                  <View style={{ width: 24, alignItems: "center" }}>
                    <User size={14} color="#94A3B8" />
                  </View>
                  <Text style={styles.parcelDetailText}>{parcel.recipient?.name || "Anonymous"}</Text>
                </View>
                <View style={styles.parcelRow}>
                  <View style={{ width: 24, alignItems: "center" }}>
                    <MapPin size={14} color="#94A3B8" />
                  </View>
                  <Text style={styles.parcelDetailText} numberOfLines={1}>{parcel.recipient?.address}</Text>
                </View>
                <View style={styles.parcelRow}>
                  <View style={{ width: 24, alignItems: "center" }}>
                    <Weight size={14} color="#94A3B8" />
                  </View>
                  <Text style={styles.parcelDetailText}>{parcel.weight} kg • {parcel.type}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Route Details Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Navigation size={20} color="#10B981" />
            </View>
            <Text style={styles.sectionTitle}>Delivery Timeline</Text>
          </View>

          {activeTrip.startLocation?.address && (
            <View style={styles.routeItem}>
              <View style={[styles.routeMarker, { backgroundColor: "#334155" }]}>
                <Truck size={16} color="#fff" />
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Distribution Hub</Text>
                <Text style={styles.routeAddress}>{activeTrip.startLocation.address}</Text>
              </View>
            </View>
          )}

          {[...destinations]
            .sort((a, b) => a.order - b.order)
            .map((dest, idx) => (
              <View key={dest.parcelId || idx} style={styles.routeItem}>
                <View style={[
                  styles.routeMarker,
                  { backgroundColor: dest.deliveryStatus === "delivered" ? "#3B82F6" : "#E2E8F0" }
                ]}>
                  {dest.deliveryStatus === "delivered" ? (
                    <CheckCircle size={16} color="#fff" strokeWidth={2.5} />
                  ) : (
                    <Text style={[styles.routeMarkerText, { color: "#64748B" }]}>{dest.order}</Text>
                  )}
                </View>
                <View style={styles.routeDetails}>
                  <Text style={[styles.routeLabel, dest.deliveryStatus === "delivered" && { color: "#94A3B8" }]}>
                    {dest.locationName}
                  </Text>
                  <Text style={styles.routeAddress}>Stop #{dest.order} • Delivery Point</Text>
                  {dest.deliveredAt && (
                    <Text style={styles.routeTime}>Handed over at {formatDate(dest.deliveredAt).split(',')[1]}</Text>
                  )}
                </View>
              </View>
            ))}
        </View>
      </ScrollView>

      {/* Primary Actions */}
      {activeTrip.status === "accepted" && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[styles.startButton, startingJourney && styles.startButtonDisabled]}
            onPress={handleStartJourney}
            disabled={startingJourney}
          >
            {startingJourney ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Play size={20} color="#fff" fill="#fff" />
                <Text style={styles.startButtonText}>Start Journey</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Cleaner slate background
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
  backButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A", // Darker slate for premium feel
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F8FAFC",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 20,
    letterSpacing: -0.5,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 32,
    lineHeight: 24,
  },
  alertsButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  alertsButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140, // More space for bottom button
  },
  mapSection: {
    marginBottom: 24,
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  mapTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  googleMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#EF4444", // Brighter Google red
    borderRadius: 12,
    gap: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleMapsBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  mapContainer: {
    height: 300,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
    borderWidth: 1,
    borderColor: "#EEF2FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  map: {
    flex: 1,
  },
  routingLoader: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.98)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
    gap: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  routingText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "800",
  },
  routeStats: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)", // Slightly transparent
    borderRadius: 24,
    flexDirection: "row",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  vDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  tripIdCard: {
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  tripIdRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  tripIdLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tripIdValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2563EB",
    letterSpacing: -0.5,
  },
  tripIdDate: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
    flex: 1,
    letterSpacing: -0.5,
  },
  weightBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  weightText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  detailItem: {
    width: "47.2%",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
  },
  parcelCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  parcelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  parcelTrackingId: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  parcelStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  parcelStatusText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  deliverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#94A3B8',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  deliverBtnActive: {
    backgroundColor: '#10B981',
    shadowColor: "#10B981",
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  deliverBtnText: {
    color: '#fff',
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  parcelDetails: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 20,
  },
  parcelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  parcelDetailText: {
    fontSize: 14,
    color: "#475569",
    flex: 1,
    fontWeight: "600",
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 32,
    paddingLeft: 4,
  },
  routeMarker: {
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  routeMarkerText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },
  routeDetails: {
    flex: 1,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeLabel: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  routeAddress: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    lineHeight: 22,
    fontWeight: "600",
  },
  routeStatus: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeTime: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 6,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  destReachedBanner: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 24,
    borderRadius: 28,
    alignItems: 'center',
    gap: 20,
    elevation: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  bannerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  destReachedTitle: {
    color: '#fff',
    fontWeight: "900",
    fontSize: 22,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  destReachedText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 25,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981", // Emerald green for premium start
    paddingVertical: 20,
    borderRadius: 24,
    gap: 14,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  startButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
    borderColor: "transparent",
  },
  startButtonText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  liveMarker: {
    backgroundColor: "#2563EB",
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  driverMarker: {
    backgroundColor: "#F59E0B",
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startMarker: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  deliveryMarker: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    elevation: 5,
  },
  markerText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
  },
});

export default ActiveTripPage;

