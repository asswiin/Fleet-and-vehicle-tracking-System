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

const ActiveTripPage = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const driverId = params.driverId as string;

  const [loading, setLoading] = useState(true);
  const [startingJourney, setStartingJourney] = useState(false);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  // Route State
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);
  const [routeDistance, setRouteDistance] = useState<string>("0.0");
  const [routeDuration, setRouteDuration] = useState<string>("0m");
  const [isRouting, setIsRouting] = useState(false);
  const [driverLocation, setDriverLocation] = useState<Location.LocationObject | null>(null);

  // useEffect to watch location if trip is in-progress
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
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
    };

    if (activeTrip && activeTrip.status === 'in-progress') {
      startWatching();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [activeTrip?.status, activeTrip?._id]);

  // Fetch active trip data
  const fetchActiveTrip = async () => {
    if (!driverId) {
      setError("Driver ID not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.getActiveTrip(driverId);

      if (response.ok && response.data) {
        setActiveTrip(response.data);
      } else {
        setError("No active trip found. Please accept a trip assignment first.");
      }
    } catch (err) {
      console.error("Error fetching active trip:", err);
      setError("Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActiveTrip();
    }, [driverId])
  );

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

  const calculateRoute = async () => {
    if (!activeTrip || !activeTrip.startLocation) return;

    // Prepare Waypoints (Start -> Stop 1 -> Stop 2 ...)
    // Ensure delivery locations are sorted by order
    const sortedLocations = [...(activeTrip.deliveryDestinations || [])].sort((a, b) => a.order - b.order);

    const waypoints = [
      { latitude: activeTrip.startLocation.latitude, longitude: activeTrip.startLocation.longitude },
      ...sortedLocations.map(loc => ({ latitude: loc.latitude, longitude: loc.longitude }))
    ];

    if (waypoints.length < 2) return;

    setIsRouting(true);
    try {
      const coordinateString = waypoints
        .map(p => `${p.longitude},${p.latitude}`)
        .join(';');

      const url = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=polyline`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.geometry);
        setRouteCoordinates(points);

        const km = route.distance / 1000;
        setRouteDistance(km.toFixed(1));
        setRouteDuration(formatDuration(route.duration));
      } else {
        // Fallback: Use waypoints directly
        setRouteCoordinates(waypoints);
      }
    } catch (error) {
      console.error('Error fetching OSRM route:', error);
      setRouteCoordinates(waypoints);
    } finally {
      setIsRouting(false);
    }
  };

  // --- End Routing Logic ---

  const openGoogleMaps = async () => {
    if (!activeTrip?.startLocation || !activeTrip?.deliveryDestinations) {
      Alert.alert("Error", "Route information not available");
      return;
    }

    try {
      // Build waypoints from delivery locations
      const sortedLocations = [...activeTrip.deliveryDestinations].sort((a, b) => a.order - b.order);

      const origin = `${activeTrip.startLocation.latitude},${activeTrip.startLocation.longitude}`;
      const destination = `${sortedLocations[sortedLocations.length - 1].latitude},${sortedLocations[sortedLocations.length - 1].longitude}`;

      // Build waypoints string (exclude last location since it's the destination)
      const waypointsArray = sortedLocations.slice(0, -1).map(loc => `${loc.latitude},${loc.longitude}`);
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
                  [{ text: "OK" }]
                );
                // Refresh the trip data
                fetchActiveTrip();
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
  const isInProgress = activeTrip.status === "in-progress";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(activeTrip.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {activeTrip.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Estimated Distance & Time (always visible) */}
      {routeDistance !== "0.0" && (
        <View style={styles.routeInfoCard}>
          <View style={styles.routeInfoRow}>
            <View style={styles.routeInfoItem}>
              <Text style={styles.routeInfoValue}>{routeDistance}</Text>
              <Text style={styles.routeInfoLabel}>KM</Text>
            </View>
            <View style={styles.routeInfoDivider} />
            <View style={styles.routeInfoItem}>
              <Text style={styles.routeInfoValue}>{routeDuration}</Text>
              <Text style={styles.routeInfoLabel}>Est. Time</Text>
            </View>
            <View style={styles.routeInfoDivider} />
            <View style={styles.routeInfoItem}>
              <Text style={styles.routeInfoValue}>{destinations.length}</Text>
              <Text style={styles.routeInfoLabel}>Stops</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Section */}
        {isMapAvailable && mapRegion && (
          <View style={styles.mapSection}>
            {/* Map Header with Google Maps Button */}
            <View style={styles.mapHeader}>
              <View style={styles.mapTitleRow}>
                <MapIcon size={18} color="#1E293B" />
                <Text style={styles.mapTitle}>Route Map</Text>
              </View>
              <TouchableOpacity
                style={styles.googleMapsBtn}
                onPress={openGoogleMaps}
              >
                <MapIcon size={16} color="#fff" />
                <Text style={styles.googleMapsBtnText}>Google Maps</Text>
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
                {/* Start Location Marker */}
                {activeTrip.startLocation?.latitude && activeTrip.startLocation?.longitude && (
                  <Marker
                    coordinate={{
                      latitude: activeTrip.startLocation.latitude,
                      longitude: activeTrip.startLocation.longitude,
                    }}
                    title="Start Location"
                    description={activeTrip.startLocation.address || "Pickup Point"}
                    pinColor="#2563EB"
                  />
                )}

                {/* Delivery Destination Markers */}
                {destinations.map((dest, index) => (
                  <Marker
                    key={dest.parcelId || index}
                    coordinate={{
                      latitude: dest.latitude,
                      longitude: dest.longitude,
                    }}
                    title={`Stop ${dest.order}: ${dest.locationName}`}
                    description={`Delivery ${index + 1}`}
                    pinColor={dest.deliveryStatus === "delivered" ? "#10B981" : "#EF4444"}
                  />
                ))}

                {/* Driver Current Location Marker */}
                {driverLocation && (
                  <Marker
                    coordinate={{
                      latitude: driverLocation.coords.latitude,
                      longitude: driverLocation.coords.longitude,
                    }}
                    title="Your Location"
                  >
                    <View style={styles.driverMarker}>
                      <Truck size={20} color="#fff" />
                    </View>
                  </Marker>
                )}

                {/* Actual Route Polyline from OSRM */}
                {routeCoordinates.length > 1 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#2563EB"
                    strokeWidth={4}
                  />
                )}

                {/* Routing Loader */}
                {isRouting && (
                  <View style={styles.routingLoader}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.routingText}>Calculating route...</Text>
                  </View>
                )}
              </MapView>
            </View>

            {/* Route Info Card */}
            {routeDistance !== "0.0" && (
              <View style={styles.routeInfoCard}>
                <View style={styles.routeInfoRow}>
                  <View style={styles.routeInfoItem}>
                    <Text style={styles.routeInfoValue}>{routeDistance}</Text>
                    <Text style={styles.routeInfoLabel}>KM</Text>
                  </View>
                  <View style={styles.routeInfoDivider} />
                  <View style={styles.routeInfoItem}>
                    <Text style={styles.routeInfoValue}>{routeDuration}</Text>
                    <Text style={styles.routeInfoLabel}>Est. Time</Text>
                  </View>
                  <View style={styles.routeInfoDivider} />
                  <View style={styles.routeInfoItem}>
                    <Text style={styles.routeInfoValue}>{destinations.length}</Text>
                    <Text style={styles.routeInfoLabel}>Stops</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Trip ID Card */}
        <View style={styles.tripIdCard}>
          <View style={styles.tripIdRow}>
            <Text style={styles.tripIdLabel}>Trip ID</Text>
            <Text style={styles.tripIdValue}>{activeTrip.tripId}</Text>
          </View>
          <View style={styles.tripIdRow}>
            <Clock size={16} color="#64748B" />
            <Text style={styles.tripIdDate}>
              Assigned: {formatDate(activeTrip.assignedAt)}
            </Text>
          </View>
          {activeTrip.startedAt && (
            <View style={styles.tripIdRow}>
              <Play size={16} color="#10B981" />
              <Text style={[styles.tripIdDate, { color: "#10B981" }]}>
                Started: {formatDate(activeTrip.startedAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Vehicle Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
              <Truck size={20} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Reg Number</Text>
              <Text style={styles.detailValue}>{vehicle?.regNumber || "N/A"}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Model</Text>
              <Text style={styles.detailValue}>{vehicle?.model || "N/A"}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{vehicle?.type || "N/A"}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Capacity</Text>
              <Text style={styles.detailValue}>{vehicle?.capacity || "N/A"} kg</Text>
            </View>
          </View>
        </View>

        {/* Parcels Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Package size={20} color="#D97706" />
            </View>
            <Text style={styles.sectionTitle}>
              Parcels ({parcels.length})
            </Text>
            <View style={styles.weightBadge}>
              <Weight size={14} color="#fff" />
              <Text style={styles.weightText}>
                {activeTrip.totalWeight || 0} kg
              </Text>
            </View>
          </View>

          {parcels.map((parcel, index) => (
            <View key={parcel._id} style={styles.parcelCard}>
              <View style={styles.parcelHeader}>
                <Text style={styles.parcelTrackingId}>
                  {parcel.trackingId}
                </Text>
                <View
                  style={[
                    styles.parcelStatusBadge,
                    {
                      backgroundColor:
                        parcel.status === "In Transit"
                          ? "#10B981"
                          : parcel.status === "Delivered"
                            ? "#3B82F6"
                            : "#F59E0B",
                    },
                  ]}
                >
                  <Text style={styles.parcelStatusText}>{parcel.status}</Text>
                </View>
              </View>
              <View style={styles.parcelDetails}>
                <View style={styles.parcelRow}>
                  <User size={14} color="#64748B" />
                  <Text style={styles.parcelDetailText}>
                    {parcel.recipient?.name || "Unknown"}
                  </Text>
                </View>
                <View style={styles.parcelRow}>
                  <MapPin size={14} color="#64748B" />
                  <Text style={styles.parcelDetailText} numberOfLines={2}>
                    {parcel.recipient?.address || "No address"}
                  </Text>
                </View>
                <View style={styles.parcelRow}>
                  <Weight size={14} color="#64748B" />
                  <Text style={styles.parcelDetailText}>
                    {parcel.weight} kg
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Destinations */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Navigation size={20} color="#16A34A" />
            </View>
            <Text style={styles.sectionTitle}>Delivery Route</Text>
          </View>

          {/* Start Location */}
          {activeTrip.startLocation?.address && (
            <View style={styles.routeItem}>
              <View style={[styles.routeMarker, { backgroundColor: "#2563EB" }]}>
                <Text style={styles.routeMarkerText}>S</Text>
              </View>
              <View style={styles.routeDetails}>
                <Text style={styles.routeLabel}>Start Point</Text>
                <Text style={styles.routeAddress}>
                  {activeTrip.startLocation.address}
                </Text>
              </View>
            </View>
          )}

          {/* Delivery Stops */}
          {[...destinations]
            .sort((a, b) => a.order - b.order)
            .map((dest, index) => (
              <View key={dest.parcelId || index} style={styles.routeItem}>
                <View
                  style={[
                    styles.routeMarker,
                    {
                      backgroundColor:
                        dest.deliveryStatus === "delivered"
                          ? "#10B981"
                          : "#EF4444",
                    },
                  ]}
                >
                  <Text style={styles.routeMarkerText}>{dest.order}</Text>
                </View>
                <View style={styles.routeDetails}>
                  <View style={styles.routeHeader}>
                    <Text style={styles.routeLabel}>{dest.locationName}</Text>
                    {dest.deliveryStatus === "delivered" && (
                      <CheckCircle size={16} color="#10B981" />
                    )}
                  </View>
                  <Text style={styles.routeStatus}>
                    Status: {dest.deliveryStatus}
                  </Text>
                  {dest.deliveredAt && (
                    <Text style={styles.routeTime}>
                      Delivered: {formatDate(dest.deliveredAt)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Start Journey Button (only show if trip is accepted, not started) */}
      {activeTrip.status === "accepted" && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[
              styles.startButton,
              startingJourney && styles.startButtonDisabled,
            ]}
            onPress={handleStartJourney}
            disabled={startingJourney}
          >
            {startingJourney ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Play size={24} color="#fff" fill="#fff" />
                <Text style={styles.startButtonText}>Start Journey</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* In Progress Banner */}
      {isInProgress && (
        <View style={styles.inProgressBanner}>
          <Truck size={20} color="#fff" />
          <Text style={styles.inProgressText}>Trip in Progress</Text>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  alertsButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  alertsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  mapSection: {
    marginBottom: 16,
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  mapTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  googleMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EA4335",
    borderRadius: 8,
    gap: 6,
  },
  googleMapsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  map: {
    flex: 1,
  },
  routingLoader: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  routingText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
  },
  routeInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  routeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeInfoItem: {
    flex: 1,
    alignItems: "center",
  },
  routeInfoValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  routeInfoLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 4,
  },
  routeInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  tripIdCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tripIdRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  tripIdLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  tripIdValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
  tripIdDate: {
    fontSize: 13,
    color: "#64748B",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  weightBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  weightText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  detailItem: {
    width: "45%",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  parcelCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  parcelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  parcelTrackingId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  parcelStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  parcelStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  parcelDetails: {
    gap: 8,
  },
  parcelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  parcelDetailText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingLeft: 4,
  },
  routeMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  routeMarkerText: {
    fontSize: 14,
    fontWeight: "700",
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
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  routeAddress: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  routeStatus: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textTransform: "capitalize",
  },
  routeTime: {
    fontSize: 11,
    color: "#10B981",
    marginTop: 2,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  inProgressBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    gap: 10,
  },
  inProgressText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  driverMarker: {
    backgroundColor: "#2563EB",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default ActiveTripPage;

