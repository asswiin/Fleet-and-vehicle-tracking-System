import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Dimensions,
    Image,
    Platform,
    Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
    ArrowLeft,
    TriangleAlert,
    Truck,
    Wrench,
    Navigation,
    Phone,
    AlertCircle,
} from "lucide-react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";
import { MapView, Marker, Circle, PROVIDER_DEFAULT, isMapAvailable } from "@/components/MapViewWrapper";
import { Animated, Alert, ActivityIndicator } from "react-native";
import { api, Trip } from "../../utils/api";

const { width } = Dimensions.get("window");

const SOSPage = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const driverId = params.driverId as string;

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [simulatedLocation, setSimulatedLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
    const [loadingTrip, setLoadingTrip] = useState(false);
    const [sosActive, setSosActive] = useState(false);
    const [togglingSos, setTogglingSos] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;
    const mapRef = useRef<any>(null);

    const fetchActiveTrip = useCallback(async () => {
        if (!driverId) return;
        try {
            setLoadingTrip(true);
            const res = await api.getActiveTrip(driverId);
            if (res.ok && res.data) {
                setActiveTrip(res.data);
                setSosActive(!!res.data.sos);
            }
        } catch (e) {
            console.error("Error fetching active trip:", e);
        } finally {
            setLoadingTrip(false);
        }
    }, [driverId]);

    const handleSOS = async () => {
        if (!activeTrip) {
            Alert.alert("Error", "No active trip found to report SOS for.");
            return;
        }

        const newStatus = !sosActive;
        const alertTitle = newStatus ? "Send SOS?" : "Clear SOS?";
        const alertMsg = newStatus
            ? "This will alert your manager and dispatch immediate help to your current location."
            : "Are you sure you want to clear the emergency signal?";

        Alert.alert(alertTitle, alertMsg, [
            { text: "Cancel", style: "cancel" },
            {
                text: newStatus ? "SEND SOS" : "CLEAR",
                style: newStatus ? "destructive" : "default",
                onPress: async () => {
                    try {
                        setTogglingSos(true);
                        const res = await api.toggleSOS(activeTrip._id, newStatus, {
                            latitude: simulatedLocation?.latitude || location?.coords.latitude,
                            longitude: simulatedLocation?.longitude || location?.coords.longitude,
                            address: "SOS Manual Trigger"
                        });
                        if (res.ok) {
                            setSosActive(newStatus);
                            Alert.alert("Success", newStatus ? "SOS sent successfully!" : "SOS cleared.");
                        } else {
                            Alert.alert("Error", res.error || "Failed to update SOS status");
                        }
                    } catch (e) {
                        console.error("SOS toggle error:", e);
                    } finally {
                        setTogglingSos(false);
                    }
                }
            }
        ]);
    };

    const displayPos = simulatedLocation || (location ? location.coords : null);

    const centerToLocation = () => {
        if (displayPos && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: displayPos.latitude,
                longitude: displayPos.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    const [nearbyServices, setNearbyServices] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const searchNearbyServices = async (lat: number, lng: number) => {
        setIsSearching(true);
        try {
            // Using Photon (OSM-based) API for POI search near coordinates
            const url = `https://photon.komoot.io/api/?q=car+service&lat=${lat}&lon=${lng}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.features) {
                const formatted = data.features.slice(0, 5).map((f: any) => {
                    const coords = f.geometry.coordinates;
                    const props = f.properties;

                    // Simple distance calculation in km
                    const dist = calculateDistance(lat, lng, coords[1], coords[0]);

                    return {
                        id: props.osm_id || Math.random(),
                        name: props.name || "Repair Center",
                        address: [props.street, props.city].filter(Boolean).join(", ") || "Nearby Location",
                        distance: dist.toFixed(1) + " km",
                        latitude: coords[1],
                        longitude: coords[0],
                        phone: "91" + Math.floor(Math.random() * 9000000000 + 1000000000), // Mock phone
                    };
                });
                setNearbyServices(formatted);
            }
        } catch (e) {
            console.error("Discovery error:", e);
        } finally {
            setIsSearching(false);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const openDirections = (destLat: number, destLng: number) => {
        const originLat = displayPos?.latitude;
        const originLng = displayPos?.longitude;

        const url = Platform.select({
            ios: originLat
                ? `http://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}`
                : `maps:0,0?q=${destLat},${destLng}`,
            android: originLat
                ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`
                : `geo:0,0?q=${destLat},${destLng}`,
            web: originLat
                ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`
                : `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`
        });
        if (url) Linking.openURL(url);
    };

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    useEffect(() => {
        let subscription: any = null;
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);

            // Auto search when location is first found
            searchNearbyServices(loc.coords.latitude, loc.coords.longitude);

            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 10,
                    timeInterval: 5000,
                },
                (newLocation) => {
                    setLocation(newLocation);
                }
            );
        })();

        fetchActiveTrip();
        const pulse = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 2,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0.6,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );
        pulse.start();

        return () => {
            if (subscription) subscription.remove();
            pulse.stop();
        };
    }, [fetchActiveTrip]);

    // Poll for simulation location if trip is active
    useEffect(() => {
        let pollTimer: any;
        if (activeTrip && (activeTrip.status === 'in-progress' || activeTrip.status === 'accepted')) {
            const pollSimLocation = async () => {
                try {
                    const res = await api.getOngoingTrip(activeTrip._id);
                    if (res.ok && res.data && res.data.lastKnownLocation) {
                        const newLat = res.data.lastKnownLocation.latitude;
                        const newLng = res.data.lastKnownLocation.longitude;
                        setSimulatedLocation({
                            latitude: newLat,
                            longitude: newLng
                        });
                        // Also update nearby services based on simulated location
                        searchNearbyServices(newLat, newLng);
                    }
                } catch (e) {
                    // Fail silently for polling
                }
            };
            pollSimLocation();
            pollTimer = setInterval(pollSimLocation, 3000);
        }
        return () => {
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [activeTrip]);


    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Emergency SOS</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* SOS Status Banner */}
                {sosActive && (
                    <View style={styles.alertBanner}>
                        <TriangleAlert size={20} color="#fff" />
                        <Text style={styles.alertText}>EMERGENCY ALERT ACTIVE</Text>
                    </View>
                )}

                {/* Map Section */}
                <View style={[styles.mapContainer, sosActive && { borderColor: '#EF4444', borderBottomWidth: 2 }]}>
                    {isMapAvailable && displayPos ? (
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={{
                                latitude: displayPos.latitude,
                                longitude: displayPos.longitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            provider={PROVIDER_DEFAULT}
                            showsUserLocation={false}
                            showsMyLocationButton={false}
                        >
                            {/* SOS Pulse Circles - Only show if SOS is active */}
                            {sosActive && (
                                <>
                                    <Marker
                                        coordinate={{
                                            latitude: displayPos.latitude,
                                            longitude: displayPos.longitude,
                                        }}
                                        anchor={{ x: 0.5, y: 0.5 }}
                                    >
                                        <View style={styles.sosMarkerContainer}>
                                            <Animated.View
                                                style={[
                                                    styles.pulseCircle,
                                                    {
                                                        transform: [{ scale: pulseAnim }],
                                                        opacity: opacityAnim
                                                    }
                                                ]}
                                            />
                                            <View style={styles.sosMarker}>
                                                <Text style={styles.sosMarkerText}>SOS</Text>
                                            </View>
                                        </View>
                                    </Marker>
                                    <Circle
                                        center={{
                                            latitude: displayPos.latitude,
                                            longitude: displayPos.longitude,
                                        }}
                                        radius={2000}
                                        strokeColor="rgba(239, 68, 68, 0.2)"
                                        fillColor="rgba(239, 68, 68, 0.1)"
                                    />
                                </>
                            )}
                            {/* Driver Location Highlight Circle */}
                            <Circle
                                center={{
                                    latitude: displayPos.latitude,
                                    longitude: displayPos.longitude,
                                }}
                                radius={1000}
                                strokeColor="rgba(37, 99, 235, 0.4)"
                                fillColor="rgba(37, 99, 235, 0.15)"
                                strokeWidth={2}
                            />

                            {/* Driver Current Location Dot */}
                            <Marker
                                coordinate={{
                                    latitude: displayPos.latitude,
                                    longitude: displayPos.longitude,
                                }}
                                anchor={{ x: 0.5, y: 0.5 }}
                                zIndex={10}
                            >
                                <View style={styles.driverDotContainer}>
                                    <View style={styles.driverDotHalo} />
                                    <View style={styles.driverDot} />
                                    {simulatedLocation && (
                                        <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>DRIVER</Text>
                                        </View>
                                    )}
                                </View>
                            </Marker>
                        </MapView>
                    ) : (
                        <View style={styles.mapPlaceholder}>
                            <Truck size={48} color="#CBD5E1" />
                            <Text style={styles.placeholderText}>Locating vehicle...</Text>
                        </View>
                    )}

                    {/* Current Location FAB */}
                    <TouchableOpacity
                        style={styles.locationFab}
                        onPress={centerToLocation}
                        activeOpacity={0.7}
                    >
                        <Navigation size={20} color="#2563EB" />
                    </TouchableOpacity>
                </View>

                {/* Primary SOS Action Button */}
                <View style={styles.sosActionSection}>
                    <TouchableOpacity
                        style={[
                            styles.sosButton,
                            sosActive ? styles.sosButtonActive : styles.sosButtonInactive,
                            togglingSos && { opacity: 0.8 }
                        ]}
                        onPress={handleSOS}
                        disabled={togglingSos || loadingTrip}
                        activeOpacity={0.8}
                    >
                        {togglingSos ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <View style={styles.sosButtonIconContainer}>
                                    <TriangleAlert size={32} color={sosActive ? "#fff" : "#EF4444"} />
                                </View>
                                <View>
                                    <Text style={styles.sosButtonTitle}>
                                        {sosActive ? "CLEAR EMERGENCY" : "SEND SOS ALERT"}
                                    </Text>
                                    <Text style={styles.sosButtonSubtitle}>
                                        {sosActive ? "Disable emergency signal" : "Tap for immediate help"}
                                    </Text>
                                </View>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Service Centers Action Button */}
                <View style={styles.serviceSection}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Nearby Support</Text>
                            <Text style={styles.sectionSubtitle}>Select a provider to get immediate help.</Text>
                        </View>
                        {isSearching && <ActivityIndicator color="#2563EB" />}
                    </View>

                    {nearbyServices.length > 0 ? (
                        nearbyServices.map((service) => (
                            <View key={service.id} style={styles.serviceCard}>
                                <View style={styles.serviceCardContent}>
                                    <View style={styles.serviceIconContainer}>
                                        <Wrench size={20} color="#64748B" />
                                    </View>
                                    <View style={styles.serviceMainInfo}>
                                        <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
                                        <Text style={styles.serviceAddress} numberOfLines={1}>{service.address}</Text>
                                        <Text style={styles.serviceDistText}>{service.distance} away</Text>
                                    </View>
                                </View>

                                <View style={styles.serviceActionsRow}>
                                    <TouchableOpacity
                                        style={styles.actionBtnCall}
                                        onPress={() => handleCall(service.phone)}
                                    >
                                        <Phone size={16} color="#059669" />
                                        <Text style={styles.actionBtnTextCall}>Call</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.actionBtnNav}
                                        onPress={() => openDirections(service.latitude, service.longitude)}
                                    >
                                        <Navigation size={16} color="#fff" />
                                        <Text style={styles.actionBtnTextNav}>Route</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : !isSearching && (
                        <View style={styles.emptyServices}>
                            <AlertCircle size={32} color="#CBD5E1" />
                            <Text style={styles.emptyServicesText}>No service centers found nearby.</Text>
                            <TouchableOpacity
                                style={styles.retryBtn}
                                onPress={() => location && searchNearbyServices(location.coords.latitude, location.coords.longitude)}
                            >
                                <Text style={styles.retryBtnText}>Retry Search</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },

    scrollContent: { paddingBottom: 40 },

    alertBanner: {
        backgroundColor: "#EF4444",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        gap: 10,
    },
    alertText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "800",
        letterSpacing: 0.5,
    },

    mapContainer: {
        height: 350,
        position: "relative",
        backgroundColor: "#E2E8F0",
    },
    map: { ...StyleSheet.absoluteFillObject },
    mapPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
    },
    placeholderText: { color: "#64748B", fontSize: 14 },

    sosMarkerContainer: {
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    pulseCircle: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(239, 68, 68, 0.3)",
    },
    sosMarker: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#EF4444",
        borderWidth: 3,
        borderColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    sosMarkerText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "900",
    },

    locationFab: {
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },

    driverDotContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
    },
    driverDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#2563EB',
        borderWidth: 2,
        borderColor: '#fff',
    },
    driverDotHalo: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(37, 99, 235, 0.3)',
    },

    serviceSection: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 15,
        color: "#64748B",
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24,
    },
    serviceCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    serviceCardContent: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    serviceIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    serviceMainInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
    },
    serviceAddress: {
        fontSize: 13,
        color: "#64748B",
        marginTop: 2,
    },
    serviceDistText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2563EB",
        marginTop: 4,
    },
    serviceActionsRow: {
        flexDirection: "row",
        gap: 12,
    },
    actionBtnCall: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "#ECFDF5",
        borderWidth: 1,
        borderColor: "#A7F3D0",
        gap: 8,
    },
    actionBtnTextCall: {
        fontSize: 14,
        fontWeight: "700",
        color: "#065F46",
    },
    actionBtnNav: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "#2563EB",
        gap: 8,
    },
    actionBtnTextNav: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fff",
    },
    emptyServices: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        backgroundColor: "#fff",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    emptyServicesText: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 12,
        marginBottom: 16,
    },
    retryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#F1F5F9",
        borderRadius: 10,
    },
    retryBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
    },
    sosActionSection: {
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    sosButton: {
        width: '100%',
        height: 90,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        elevation: 8,
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    sosButtonInactive: {
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: "#EF4444",
    },
    sosButtonActive: {
        backgroundColor: "#EF4444",
    },
    sosButtonIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 15,
    },
    sosActiveIconContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    sosButtonTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: "#EF4444",
        letterSpacing: 1,
    },
    sosButtonSubtitle: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
    },
});

export default SOSPage;
