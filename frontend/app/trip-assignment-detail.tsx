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
} from "lucide-react-native";
import { api, Notification } from "../utils/api";
import { MapView, Marker, Polyline, PROVIDER_DEFAULT, isMapAvailable } from "../components/MapViewWrapper.native";

// Google Directions API Key - Replace with your actual API key
const GOOGLE_DIRECTIONS_API_KEY = "YOUR_GOOGLE_DIRECTIONS_API_KEY";

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
  
  // Route coordinates for the complete trip and individual parcel routes
  const [fullRouteCoordinates, setFullRouteCoordinates] = useState<{latitude: number, longitude: number}[]>([]);
  const [parcelRoutes, setParcelRoutes] = useState<{[parcelId: string]: {latitude: number, longitude: number}[]}>({});
  const [selectedParcelRoute, setSelectedParcelRoute] = useState<{latitude: number, longitude: number}[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  useEffect(() => {
    fetchNotificationDetails();
  }, []);

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

  // Decode Google's encoded polyline format
  const decodePolyline = (encoded: string): {latitude: number, longitude: number}[] => {
    const points: {latitude: number, longitude: number}[] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
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

  // Fetch route from source to a single destination
  const fetchRouteToDestination = async (
    origin: {latitude: number, longitude: number},
    destination: {latitude: number, longitude: number}
  ): Promise<{latitude: number, longitude: number}[]> => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_DIRECTIONS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const encodedPolyline = data.routes[0].overview_polyline.points;
        return decodePolyline(encodedPolyline);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
    
    // Fallback: return straight line
    return [origin, destination];
  };

  // Fetch the complete route through all delivery locations
  const fetchFullRoute = async (
    start: {latitude: number, longitude: number},
    waypoints: {latitude: number, longitude: number, parcelId: string}[]
  ) => {
    if (waypoints.length === 0) return;
    
    setIsLoadingRoute(true);
    try {
      // Build waypoints string for Google Directions API
      const waypointsStr = waypoints
        .slice(0, -1) // All except the last one (which is the destination)
        .map(wp => `${wp.latitude},${wp.longitude}`)
        .join('|');
      
      const destination = waypoints[waypoints.length - 1];
      
      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${destination.latitude},${destination.longitude}`;
      
      if (waypointsStr) {
        url += `&waypoints=${waypointsStr}`;
      }
      url += `&key=${GOOGLE_DIRECTIONS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const encodedPolyline = data.routes[0].overview_polyline.points;
        const decoded = decodePolyline(encodedPolyline);
        setFullRouteCoordinates(decoded);
      } else {
        // Fallback: create straight lines between points
        const fallbackRoute = [
          start,
          ...waypoints.map(wp => ({ latitude: wp.latitude, longitude: wp.longitude }))
        ];
        setFullRouteCoordinates(fallbackRoute);
      }
      
      // Also fetch individual routes for each parcel
      const routes: {[parcelId: string]: {latitude: number, longitude: number}[]} = {};
      for (const wp of waypoints) {
        const route = await fetchRouteToDestination(start, { latitude: wp.latitude, longitude: wp.longitude });
        routes[wp.parcelId] = route;
      }
      setParcelRoutes(routes);
      
    } catch (error) {
      console.error("Error fetching full route:", error);
      // Fallback route
      const fallbackRoute = [
        start,
        ...waypoints.map(wp => ({ latitude: wp.latitude, longitude: wp.longitude }))
      ];
      setFullRouteCoordinates(fallbackRoute);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Effect to fetch routes when notification loads
  useEffect(() => {
    if (notification && notification.startLocation && notification.deliveryLocations && notification.deliveryLocations.length > 0) {
      const start = {
        latitude: notification.startLocation.latitude,
        longitude: notification.startLocation.longitude,
      };
      const deliveryLocs = notification.deliveryLocations;
      const waypoints = deliveryLocs
        .filter(loc => loc.latitude && loc.longitude)
        .map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          parcelId: loc.parcelId,
        }));
      
      if (waypoints.length > 0) {
        fetchFullRoute(start, waypoints);
      }
    }
  }, [notification]);

  const handleAccept = async () => {
    if (!notification) return;

    setProcessing(true);
    try {
      const response = await api.updateNotificationStatus(notificationId, "accepted");
      if (response.ok) {
        Alert.alert(
          "Trip Accepted! ✓",
          `You have accepted this trip.\n\nVehicle: ${notification.vehicleId?.regNumber}\nParcels: ${notification.parcelIds?.length || 0}\n\n✅ Your status is now "On-trip"\n✅ Vehicle status updated to "On-trip"\n\nYou can now start your journey.`,
          [
            {
              text: "Start Trip",
              onPress: () => {
                router.push({
                  pathname: "/driver-dashboard",
                  params: { userId: driverId },
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

  // Get delivery locations from notification
  const deliveryLocations = notification.deliveryLocations || [];
  const startLocation = notification.startLocation;

  // Calculate map region to fit all markers
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
      // Default to Kerala center if no coordinates
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

  // Get location for a specific parcel
  const getParcelLocation = (parcelId: string) => {
    return deliveryLocations.find(loc => loc.parcelId === parcelId);
  };

  // Check if we have location data
  const hasLocationData = deliveryLocations.length > 0;

  // Focus map on a specific parcel location and show its route
  const focusOnParcel = (parcelId: string) => {
    const location = getParcelLocation(parcelId);
    if (location && mapRef.current) {
      setFocusedParcelId(parcelId);
      setShowFullMap(true);
      
      // Set the individual route for this parcel
      if (parcelRoutes[parcelId]) {
        setSelectedParcelRoute(parcelRoutes[parcelId]);
      } else {
        setSelectedParcelRoute([]);
      }
      
      // Fit map to show the entire route from start to this parcel
      if (startLocation && parcelRoutes[parcelId] && parcelRoutes[parcelId].length > 0) {
        mapRef.current.fitToCoordinates(parcelRoutes[parcelId], {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      } else {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }, 500);
      }
    }
  };

  // Reset map to show all markers and full route
  const resetMapView = () => {
    setFocusedParcelId(null);
    setSelectedParcelRoute([]); // Clear individual route, show full route
    if (mapRef.current) {
      mapRef.current.animateToRegion(getMapRegion(), 500);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {/* Gradient Header */}
      <View style={styles.gradientHeader}>
        {/* Top Bar */}
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

        {/* Title */}
        <Text style={styles.headerTitle}>Trip Assignment</Text>
        <Text style={styles.tripIdHeader}>ID: #{notification.tripId}</Text>
      </View>

      {/* Content Card */}
      <View style={styles.contentCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Map Section with Real Locations */}
          <View style={styles.mapSection}>
            <View style={styles.mapHeader}>
              <View style={styles.mapTitleRow}>
                <Route size={18} color="#2563EB" />
                <Text style={styles.mapTitle}>Delivery Route</Text>
                {focusedParcelId && (
                  <View style={styles.focusedBadge}>
                    <Text style={styles.focusedBadgeText}>Focused</Text>
                  </View>
                )}
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
                  
                  {/* Full Route Polyline (shown when no parcel is focused) */}
                  {fullRouteCoordinates.length > 0 && selectedParcelRoute.length === 0 && (
                    <Polyline
                      coordinates={fullRouteCoordinates}
                      strokeColor="#2563EB"
                      strokeWidth={4}
                      lineDashPattern={[0]}
                    />
                  )}
                  
                  {/* Selected Parcel Route Polyline (shown when a parcel is focused) */}
                  {selectedParcelRoute.length > 0 && (
                    <Polyline
                      coordinates={selectedParcelRoute}
                      strokeColor="#DC2626"
                      strokeWidth={5}
                      lineDashPattern={[0]}
                    />
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
                        title={`Stop ${location.order || index + 1}${location.locationName ? ` - ${location.locationName}` : ''}`}
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
            </View>

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
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, { backgroundColor: selectedParcelRoute.length > 0 ? "#DC2626" : "#2563EB" }]} />
                  <Text style={styles.legendText}>{selectedParcelRoute.length > 0 ? "Route to Stop" : "Full Route"}</Text>
                </View>
                {isLoadingRoute && (
                  <View style={styles.legendItem}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.legendText}>Loading...</Text>
                  </View>
                )}
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

          {/* Expanded Parcel List */}
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
                
                {/* Recipient Info */}
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

                {/* Delivery Location Card */}
                {parcelLocation ? (
                  <View style={[styles.locationCard, isFocused && styles.locationCardFocused]}>
                    <View style={styles.locationCardHeader}>
                      <View style={[styles.locationMarkerDot, { backgroundColor: markerColor }]} />
                      <Text style={styles.locationCardTitle}>📍 Delivery Location</Text>
                      <View style={styles.stopBadge}>
                        <Text style={styles.stopBadgeText}>Stop #{parcelLocation.order || index + 1}</Text>
                      </View>
                    </View>
                    <View style={styles.locationCardBody}>
                      {/* Location Name */}
                      {parcelLocation.locationName && (
                        <View style={styles.locationNameRow}>
                          <MapPin size={14} color="#2563EB" />
                          <Text style={styles.locationNameText}>{parcelLocation.locationName}</Text>
                        </View>
                      )}
                      <View style={styles.coordsRow}>
                        <Navigation size={12} color="#059669" />
                        <Text style={styles.coordsText}>
                          {parcelLocation.latitude.toFixed(5)}, {parcelLocation.longitude.toFixed(5)}
                        </Text>
                      </View>
                      <View style={styles.routeHintRow}>
                        <Route size={12} color="#D97706" />
                        <Text style={styles.tapHint}>
                          {isFocused ? "✓ Route shown on map" : "Tap to view route from source"}
                        </Text>
                      </View>
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
    gap: 6,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
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
  legendLine: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
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
  recipientPhone: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 4,
    marginLeft: 18,
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
  locationNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    backgroundColor: "#EFF6FF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  locationNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
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
  routeHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  tapHint: {
    fontSize: 10,
    color: "#64748B",
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
