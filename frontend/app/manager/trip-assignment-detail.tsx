


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
  Linking,
  Image,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Truck,
  Package,
  MapPin,
  CheckCircle,
  X,
  HelpCircle,
  Clock,
  Navigation,
  Route,
  Eye,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react-native";
import { api, Notification } from "../../utils/api";
import { MapView, Marker, Polyline, PROVIDER_DEFAULT, isMapAvailable } from "@/components/MapViewWrapper";

const { width, height } = Dimensions.get("window");

// Color palette for markers
const MARKER_COLORS = [
  "#2563EB", "#DC2626", "#059669", "#D97706", "#7C3AED",
  "#DB2777", "#0891B2", "#4F46E5", "#EA580C", "#16A34A"
];

const TripAssignmentDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const notificationId = params.notificationId as string;
  const driverId = params.driverId as string;
  const mapRef = useRef<any>(null);

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [expandedParcels, setExpandedParcels] = useState(true);
  const [focusedParcelId, setFocusedParcelId] = useState<string | null>(null);

  // Route State
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);
  const [routeDistance, setRouteDistance] = useState<string>("0.0");
  const [routeDuration, setRouteDuration] = useState<string>("0m");
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    fetchNotificationDetails();
  }, []);

  // Calculate route when notification data is loaded
  useEffect(() => {
    if (notification && notification.startLocation && notification.deliveryLocations) {
      calculateRoute();
    }
  }, [notification]);

  const fetchNotificationDetails = async () => {
    setLoading(true);
    try {
      const response = await api.getNotification(notificationId);
      if (response.ok && response.data) {
        setNotification(response.data);
        // Mark as read
        await api.markNotificationAsRead(notificationId);
      } else {
        Alert.alert("Error", "Failed to load trip details");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching notification:", error);
      Alert.alert("Error", "Failed to load trip details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

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
    if (!notification || !notification.startLocation) return;

    // 1. Prepare Waypoints (Start -> Stop 1 -> Stop 2 ...)
    // Ensure delivery locations are sorted by order
    const sortedLocations = [...(notification.deliveryLocations || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

    const waypoints = [
      { latitude: notification.startLocation.latitude, longitude: notification.startLocation.longitude },
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
        // Fallback: Straight lines
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

  const handleAccept = async () => {
    if (!notification) return;

    setProcessing(true);
    try {
      const response = await api.updateNotificationStatus(notificationId, "accepted");
      if (response.ok) {
        Alert.alert(
          "Trip Accepted! ✓",
          `You have accepted this trip.\n\nVehicle: ${notification.vehicleId?.regNumber}\nParcels: ${notification.parcelIds?.length || 0}\n\nWould you like to view trip details and start the journey?`,
          [
            {
              text: "Later",
              style: "cancel",
              onPress: () => {
                router.replace({
                  pathname: "/driver/driver-dashboard",
                  params: { userId: driverId },
                } as any);
              },
            },
            {
              text: "View Trip",
              onPress: () => {
                router.replace({
                  pathname: "/driver/active-trip",
                  params: { driverId: driverId },
                } as any);
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", "Failed to accept trip");
      }
    } catch (error) {
      console.error("Error accepting trip:", error);
      Alert.alert("Error", "Failed to accept trip");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Trip",
      "Are you sure you want to decline this trip assignment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              const response = await api.updateNotificationStatus(notificationId, "declined");
              if (response.ok) {
                Alert.alert("Trip Declined", "The trip has been declined.", [
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                Alert.alert("Error", "Failed to decline trip");
              }
            } catch (error) {
              console.error("Error declining trip:", error);
              Alert.alert("Error", "Failed to decline trip");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Trip details not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalWeight = notification.parcelIds?.reduce((sum, p) => {
    const weight = parseFloat(String(p.weight)) || 0;
    return sum + weight;
  }, 0) || 0;

  const isAlreadyProcessed = notification.status !== "pending";

  const openGoogleMaps = async () => {
    if (!notification?.startLocation || !notification?.deliveryLocations) {
      Alert.alert("Error", "Route information not available");
      return;
    }

    try {
      // Build waypoints from delivery locations
      const sortedLocations = [...notification.deliveryLocations].sort((a, b) => (a.order || 0) - (b.order || 0));

      const origin = `${notification.startLocation.latitude},${notification.startLocation.longitude}`;
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

  const deliveryLocations = notification.deliveryLocations || [];
  const startLocation = notification.startLocation;

  const getMapRegion = () => {
    const allCoords: { latitude: number; longitude: number }[] = [];

    if (startLocation?.latitude && startLocation?.longitude) {
      allCoords.push({ latitude: startLocation.latitude, longitude: startLocation.longitude });
    }

    deliveryLocations.forEach((loc: any) => {
      if (loc.latitude && loc.longitude) {
        allCoords.push({ latitude: loc.latitude, longitude: loc.longitude });
      }
    });

    if (allCoords.length === 0) {
      return {
        latitude: 10.8505,
        longitude: 76.2711,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      };
    }

    const latitudes = allCoords.map(c => c.latitude);
    const longitudes = allCoords.map(c => c.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const latDelta = Math.max(0.05, (maxLat - minLat) * 1.5);
    const lngDelta = Math.max(0.05, (maxLng - minLng) * 1.5);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const getParcelLocation = (parcelId: string) => {
    return deliveryLocations.find((loc: any) => {
      const locParcelId = typeof loc.parcelId === 'object'
        ? (loc.parcelId as any)._id || (loc.parcelId as any).toString()
        : loc.parcelId;
      return locParcelId === parcelId || String(locParcelId) === String(parcelId);
    });
  };

  const hasLocationData = deliveryLocations.length > 0;

  const focusOnParcel = (parcelId: string) => {
    const location = getParcelLocation(parcelId);
    if (location && mapRef.current) {
      setFocusedParcelId(parcelId);
      setShowFullMap(true);
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const resetMapView = () => {
    setFocusedParcelId(null);
    if (mapRef.current) {
      mapRef.current.animateToRegion(getMapRegion(), 500);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Modern Professional Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Trip Assignment</Text>
          <Text style={styles.tripIdHeader}>TRIP ID: #{notification.tripId}</Text>
        </View>
        <View style={[styles.statusBadge, notification.status === "pending" ? { backgroundColor: "#2563EB" } : { backgroundColor: "#64748B" }]}>
          <Text style={styles.statusBadgeText}>
            {notification.status === "pending" ? "NEW TRIP" : notification.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Map Section - The Mission Control View */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
              <Route size={20} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>Optimized Route</Text>
          </View>

          {hasLocationData && (
            <View style={styles.mapActions}>
              <TouchableOpacity
                style={styles.googleMapsBtn}
                onPress={openGoogleMaps}
              >
                <ExternalLink size={14} color="#fff" />
                <Text style={styles.googleMapsBtnText}>Open In Google Maps</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.mapContainer, showFullMap && styles.mapContainerExpanded]}>
            {hasLocationData && isMapAvailable ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={getMapRegion()}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                {routeCoordinates.length > 1 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#2563EB"
                    strokeWidth={4}
                  />
                )}

                {startLocation?.latitude && startLocation?.longitude && (
                  <Marker
                    coordinate={{
                      latitude: startLocation.latitude,
                      longitude: startLocation.longitude,
                    }}
                  >
                    <View style={styles.startMarker}>
                      <Navigation size={14} color="#fff" />
                    </View>
                  </Marker>
                )}

                {deliveryLocations.map((location: any, index: number) => {
                  const isFocused = focusedParcelId === location.parcelId;
                  return (
                    <Marker
                      key={location.parcelId || index}
                      coordinate={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }}
                    >
                      <View style={[
                        styles.deliveryMarker,
                        { backgroundColor: MARKER_COLORS[index % MARKER_COLORS.length] },
                        isFocused && styles.focusedMarker
                      ]}>
                        <Text style={[styles.markerText, isFocused && styles.focusedMarkerText]}>
                          {location.order || index + 1}
                        </Text>
                      </View>
                    </Marker>
                  );
                })}
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Package size={48} color="#CBD5E1" />
                <Text style={styles.noLocationText}>Route visualization loading...</Text>
              </View>
            )}

            {hasLocationData && routeDistance !== "0.0" && (
              <View style={styles.routeStatsOverlay}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{routeDistance} km</Text>
                  <Text style={styles.statLabel}>DISTANCE</Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{routeDuration}</Text>
                  <Text style={styles.statLabel}>EST. TIME</Text>
                </View>
                <View style={styles.vDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{deliveryLocations.length}</Text>
                  <Text style={styles.statLabel}>STOPS</Text>
                </View>
              </View>
            )}

            {isRouting && (
              <View style={styles.routingLoader}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.routingText}>Routing...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Assigned Assets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#F1F5F9" }]}>
              <Truck size={20} color="#334155" />
            </View>
            <Text style={styles.sectionTitle}>Assigned Logistics</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={styles.vehicleImageContainer}>
                {notification.vehicleId?.profilePhoto ? (
                  <Image source={{ uri: notification.vehicleId.profilePhoto }} style={styles.vehicleImage} />
                ) : (
                  <View style={styles.fallbackVehicleIcon}>
                    <Truck size={24} color="#64748B" />
                  </View>
                )}
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>VEHICLE REGISTRATION</Text>
                <Text style={styles.detailValue}>
                  {notification.vehicleId?.regNumber || "N/A"}
                </Text>
                <Text style={styles.detailSubtext}>
                  {notification.vehicleId?.model} • {notification.vehicleId?.type}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7", marginRight: 12, width: 44, height: 44 }]}>
                <Package size={20} color="#D97706" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>CARGO SUMMARY</Text>
                <Text style={styles.detailValue}>
                  {notification.parcelIds?.length || 0} Parcels Total
                </Text>
                <Text style={styles.detailSubtext}>
                  Cumulative Weight: {totalWeight.toFixed(1)} kg
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Parcel Inventory Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#F1F5F9" }]}>
              <Package size={20} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>Delivery Sequence</Text>
            <TouchableOpacity
              onPress={() => setExpandedParcels(!expandedParcels)}
              style={styles.expandToggle}
            >
              {expandedParcels ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
            </TouchableOpacity>
          </View>

          {expandedParcels && notification.parcelIds?.map((parcel, index) => {
            const parcelLocation = getParcelLocation(parcel._id);
            const markerColor = MARKER_COLORS[index % MARKER_COLORS.length];
            const isFocused = focusedParcelId === parcel._id;

            return (
              <TouchableOpacity
                key={parcel._id}
                style={[
                  styles.parcelCard,
                  isFocused && styles.parcelCardFocused
                ]}
                onPress={() => parcelLocation && focusOnParcel(parcel._id)}
                activeOpacity={0.8}
              >
                <View style={styles.parcelMainInfo}>
                  <View style={[styles.parcelNumberBadge, { backgroundColor: markerColor }]}>
                    <Text style={styles.parcelNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.parcelTextContainer}>
                    <Text style={styles.parcelTrackingId}>{parcel.trackingId}</Text>
                    <Text style={styles.parcelWeightText}>{parcel.weight}kg • {parcel.recipient?.name}</Text>
                  </View>
                  {parcelLocation && <MapPin size={18} color="#10B981" />}
                </View>

                {parcelLocation && (
                  <View style={styles.parcelLocationDetail}>
                    <Text style={styles.locationTitle}>DESTINATION</Text>
                    <Text style={styles.locationName} numberOfLines={1}>
                      {parcelLocation.locationName || "Location details provided"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Premium Action Footer */}
      <View style={styles.footer}>
        {!isAlreadyProcessed ? (
          <>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              disabled={processing}
            >
              <X size={20} color="#EF4444" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.acceptButtonText}>ACCEPT & START</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={[
            styles.processedBanner,
            notification.status === "accepted" ? styles.acceptedBanner : styles.declinedBanner
          ]}>
            <Text style={styles.processedText}>
              MISSION {notification.status === "accepted" ? "ACCEPTED ✓" : "DECLINED"}
            </Text>
          </View>
        )}
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
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  tripIdHeader: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
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
  mapActions: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  googleMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EA4335",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#EA4335",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleMapsBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
  mapContainer: {
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2FF",
    backgroundColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  mapContainerExpanded: {
    height: height * 0.4,
  },
  map: {
    flex: 1,
  },
  startMarker: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  deliveryMarker: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  markerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  focusedMarker: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 4,
    borderColor: "#FCD34D",
  },
  focusedMarkerText: {
    fontSize: 14,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noLocationText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
  routeStatsOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    flexDirection: "row",
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  vDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  routingLoader: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2,
  },
  routingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
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
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  vehicleImageContainer: {
    marginRight: 16,
  },
  vehicleImage: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  fallbackVehicleIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1E293B",
    marginTop: 2,
  },
  detailSubtext: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  expandToggle: {
    padding: 4,
  },
  parcelCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  parcelCardFocused: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  parcelMainInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  parcelNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  parcelNumberText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
  },
  parcelTextContainer: {
    flex: 1,
  },
  parcelTrackingId: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  parcelWeightText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  parcelLocationDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  locationTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  locationName: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 20,
  },
  declineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#FEE2E2",
    borderRadius: 20,
    paddingVertical: 16,
    gap: 8,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EF4444",
  },
  acceptButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 24,
    paddingVertical: 18,
    gap: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.8,
  },
  processedBanner: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptedBanner: {
    backgroundColor: "#DCFCE7",
  },
  declinedBanner: {
    backgroundColor: "#FEE2E2",
  },
  processedText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1,
  },
});

export default TripAssignmentDetailScreen;

