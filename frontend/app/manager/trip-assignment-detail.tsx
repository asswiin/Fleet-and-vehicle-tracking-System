


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
          `You have accepted this trip.\n\nVehicle: ${notification.vehicleId?.regNumber}\nParcels: ${notification.parcelIds?.length || 0}\n\n✅ Your status is now "Accepted"\n✅ Vehicle status: "Trip Confirmed"\n✅ Parcels status: "Confirmed"\n\nWould you like to view trip details and start the journey?`,
          [
            {
              text: "Later",
              style: "cancel",
              onPress: () => {
                router.push({
                  pathname: "/driver/driver-dashboard",
                  params: { userId: driverId },
                } as any);
              },
            },
            {
              text: "View Trip",
              onPress: () => {
                router.push({
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

    deliveryLocations.forEach((loc) => {
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
    return deliveryLocations.find(loc => {
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {/* Gradient Header */}
      <View style={styles.gradientHeader}>
        <SafeAreaView>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.priorityBadge}>
              <Clock size={14} color="#fff" />
              <Text style={styles.priorityText}>
                {notification.status === "pending" ? "NEW TRIP" : notification.status.toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity style={styles.helpButton}>
              <HelpCircle size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <Text style={styles.headerTitle}>Trip Assignment</Text>
        <Text style={styles.tripIdHeader}>ID: #{notification.tripId}</Text>
      </View>

      {/* Content Card */}
      <View style={styles.contentCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Map Section */}
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <View style={styles.mapTitleRow}>
                <Route size={18} color="#2563EB" />
                <View>
                  <Text style={styles.mapTitle}>Delivery Route</Text>
                  {routeDistance !== "0.0" && (
                    <Text style={styles.routeStats}>
                      {routeDistance} km • {routeDuration}
                    </Text>
                  )}
                </View>
              </View>
              {hasLocationData && (
                <View style={styles.mapActions}>
                  {focusedParcelId && (
                    <TouchableOpacity
                      style={styles.resetMapBtn}
                      onPress={resetMapView}
                    >
                      <Text style={styles.resetMapText}>Show All</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.googleMapsBtn}
                    onPress={openGoogleMaps}
                  >
                    <ExternalLink size={14} color="#fff" />
                    <Text style={styles.googleMapsBtnText}>Google Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.expandMapBtn}
                    onPress={() => setShowFullMap(!showFullMap)}
                  >
                    <Eye size={14} color="#2563EB" />
                    <Text style={styles.expandMapText}>
                      {showFullMap ? "Collapse" : "Expand"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={[styles.mapContainer, showFullMap && styles.mapContainerExpanded]}>
              {hasLocationData && isMapAvailable ? (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={PROVIDER_DEFAULT}
                  initialRegion={getMapRegion()}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                >
                  {/* Route Polyline */}
                  {routeCoordinates.length > 1 && (
                    <Polyline
                      coordinates={routeCoordinates}
                      strokeColor="#2563EB"
                      strokeWidth={4}
                      lineDashPattern={[0]}
                    />
                  )}

                  {/* Start Location Marker */}
                  {startLocation?.latitude && startLocation?.longitude && (
                    <Marker
                      coordinate={{
                        latitude: startLocation.latitude,
                        longitude: startLocation.longitude,
                      }}
                      title="Starting Point"
                      description="Trip starts here"
                    >
                      <View style={styles.startMarker}>
                        <Navigation size={14} color="#fff" />
                      </View>
                    </Marker>
                  )}

                  {/* Delivery Location Markers */}
                  {deliveryLocations.map((location, index) => {
                    const parcel = notification.parcelIds?.find(p => p._id === location.parcelId);
                    const isFocused = focusedParcelId === location.parcelId;
                    return (
                      <Marker
                        key={location.parcelId || index}
                        coordinate={{
                          latitude: location.latitude,
                          longitude: location.longitude,
                        }}
                        title={`Stop ${location.order || index + 1}`}
                        description={parcel?.recipient?.name || `Delivery ${index + 1}`}
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
                  <View style={styles.mapRoute}>
                    <View style={styles.startPoint} />
                    <View style={styles.routeLine} />
                    <View style={styles.endPoint} />
                  </View>
                  <Text style={styles.noLocationText}>
                    {hasLocationData ? "Map not available" : "Route will be shown here"}
                  </Text>
                </View>
              )}

              {isRouting && (
                <View style={styles.routingLoader}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.routingText}>Calculating path...</Text>
                </View>
              )}
            </View>

            {/* Route Info Card - Distance & Time */}
            {hasLocationData && routeDistance !== "0.0" && (
              <View style={styles.routeInfoCard}>
                <View style={styles.routeInfoRow}>
                  <View style={styles.routeInfoItem}>
                    <Text style={styles.routeInfoValue}>{routeDistance} km</Text>
                    <Text style={styles.routeInfoLabel}>Total Distance</Text>
                  </View>
                  <View style={styles.routeInfoDivider} />
                  <View style={styles.routeInfoItem}>
                    <Text style={styles.routeInfoValue}>~{routeDuration}</Text>
                    <Text style={styles.routeInfoLabel}>Est. Time</Text>
                  </View>
                </View>
                <View style={styles.routeInfoFooter}>
                  <Text style={styles.routeInfoStops}>
                    📍 {deliveryLocations.length} Stop{deliveryLocations.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Map Legend */}
            {hasLocationData && (
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                  <Text style={styles.legendText}>Start</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#2563EB" }]} />
                  <Text style={styles.legendText}>Stops ({deliveryLocations.length})</Text>
                </View>
              </View>
            )}
          </View>

          {/* Vehicle Required */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: "#F3E8FF" }]}>
              <Truck size={20} color="#9333EA" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>ASSIGNED VEHICLE</Text>
              <Text style={styles.detailValue}>
                {notification.vehicleId?.regNumber || "Vehicle"}
              </Text>
              <Text style={styles.detailSubtext}>
                {notification.vehicleId?.model} • {notification.vehicleId?.type}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Parcels Section */}
          <TouchableOpacity
            style={styles.parcelSectionHeader}
            onPress={() => setExpandedParcels(!expandedParcels)}
          >
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: "#FEF3C7" }]}>
                <Package size={20} color="#D97706" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>PARCELS TO DELIVER</Text>
                <Text style={styles.detailValue}>
                  {notification.parcelIds?.length || 0} Parcel(s) • {totalWeight.toFixed(1)}kg
                </Text>
              </View>
              {expandedParcels ? (
                <ChevronUp size={20} color="#64748B" />
              ) : (
                <ChevronDown size={20} color="#64748B" />
              )}
            </View>
          </TouchableOpacity>

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
                activeOpacity={parcelLocation ? 0.7 : 1}
              >
                <View style={styles.parcelHeader}>
                  <View style={[styles.parcelNumber, { backgroundColor: markerColor }]}>
                    <Text style={styles.parcelNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.parcelInfo}>
                    <Text style={styles.parcelTracking}>{parcel.trackingId}</Text>
                    <Text style={styles.parcelWeight}>{parcel.weight} kg</Text>
                  </View>
                </View>

                <View style={styles.recipientSection}>
                  <View style={styles.recipientRow}>
                    <MapPin size={14} color="#64748B" />
                    <Text style={styles.recipientName}>
                      {parcel.recipient?.name || "Unknown Recipient"}
                    </Text>
                  </View>
                  {parcel.recipient?.address && (
                    <Text style={styles.recipientAddress}>{parcel.recipient.address}</Text>
                  )}
                </View>

                {parcelLocation ? (
                  <View style={[styles.locationCard, isFocused && styles.locationCardFocused]}>
                    <View style={styles.locationCardHeader}>
                      <View style={[styles.locationMarkerDot, { backgroundColor: markerColor }]} />
                      <Text style={styles.locationCardTitle}>📍 Delivery Destination</Text>
                      <View style={styles.stopBadge}>
                        <Text style={styles.stopBadgeText}>Stop #{parcelLocation.order || index + 1}</Text>
                      </View>
                    </View>
                    <View style={styles.locationCardBody}>
                      {parcelLocation.locationName && (
                        <View style={styles.destinationNameRow}>
                          <MapPin size={16} color="#2563EB" />
                          <Text style={styles.destinationNameText}>
                            {parcelLocation.locationName}
                          </Text>
                        </View>
                      )}
                      <View style={styles.coordsRow}>
                        <Navigation size={12} color="#059669" />
                        <Text style={styles.coordsText}>
                          {parcelLocation.latitude.toFixed(5)}, {parcelLocation.longitude.toFixed(5)}
                        </Text>
                      </View>
                      <Text style={styles.tapHint}>
                        {isFocused ? "✓ Showing on map" : "Tap to view on map"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noLocationCard}>
                    <MapPin size={14} color="#DC2626" />
                    <Text style={styles.noLocationText2}>No location assigned</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom Buttons */}
      {!isAlreadyProcessed ? (
        <View style={styles.bottomButtons}>
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

          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            disabled={processing}
          >
            <X size={20} color="#64748B" />
            <Text style={styles.declineButtonText}>DECLINE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomButtons}>
          <View style={[
            styles.statusBanner,
            notification.status === "accepted" ? styles.acceptedBanner : styles.declinedBanner
          ]}>
            <Text style={styles.statusBannerText}>
              Trip {notification.status === "accepted" ? "Accepted ✓" : "Declined"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
  },

  // Gradient Header
  gradientHeader: {
    paddingBottom: 60,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: "#667eea",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  priorityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  helpButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginTop: 8,
  },
  tripIdHeader: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 8,
  },

  // Content Card
  contentCard: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -40,
    marginHorizontal: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },

  // Map Section
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
  routeStats: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  expandMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    gap: 4,
  },
  expandMapText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
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
    height: 160,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  mapContainerExpanded: {
    height: height * 0.35,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapRoute: {
    flexDirection: "row",
    alignItems: "center",
    width: "60%",
  },
  startPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#2563EB",
    marginHorizontal: 8,
    borderStyle: "dashed",
  },
  endPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  noLocationText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 10,
  },
  startMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  deliveryMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  routeInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
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
  routeInfoFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  routeInfoStops: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  mapLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    paddingVertical: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
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

  // Detail Rows
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailSubtext: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Parcel Section
  parcelSectionHeader: {
    marginTop: 4,
  },
  parcelCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  parcelHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  parcelNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  parcelNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  parcelInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  parcelTracking: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  parcelWeight: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recipientSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recipientName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  recipientAddress: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginLeft: 18,
    lineHeight: 16,
  },
  // Map Actions
  mapActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resetMapBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
  },
  resetMapText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
  },
  focusedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  focusedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#16A34A",
  },
  focusedMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#FCD34D",
  },
  focusedMarkerText: {
    fontSize: 14,
  },

  // Parcel Card Enhanced
  parcelCardFocused: {
    borderColor: "#2563EB",
    borderWidth: 2,
    backgroundColor: "#EFF6FF",
  },

  // Location Card
  locationCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  locationCardFocused: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },
  locationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  locationMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  locationCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    flex: 1,
  },
  stopBadge: {
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stopBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  locationCardBody: {
    marginTop: 4,
  },
  destinationNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  destinationNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E40AF",
    flex: 1,
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coordsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    fontFamily: "monospace",
  },
  tapHint: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
    fontStyle: "italic",
  },
  noLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  noLocationText2: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
  },

  // Bottom Buttons
  bottomButtons: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#fff",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  declineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  declineButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "700",
  },

  // Status Banner
  statusBanner: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  acceptedBanner: {
    backgroundColor: "#D1FAE5",
  },
  declinedBanner: {
    backgroundColor: "#FEE2E2",
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
});

export default TripAssignmentDetailScreen;

