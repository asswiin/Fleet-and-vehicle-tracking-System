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
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    TriangleAlert,
    Phone,
    Truck,
    Wrench,
    Fuel,
    Navigation,
    MapPin,
    Bell,
} from "lucide-react-native";
import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import { MapView, Marker, Circle, PROVIDER_DEFAULT, isMapAvailable } from "@/components/MapViewWrapper";
import { Animated } from "react-native";

const { width } = Dimensions.get("window");

const SOSPage = () => {
    const router = useRouter();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        })();

        // SOS Pulse Animation
        Animated.loop(
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
        ).start();
    }, []);

    const serviceCenters = [
        {
            id: 1,
            name: "Service Center 1",
            distance: "-- km",
            status: "Open Now",
            statusColor: "#10B981",
            icon: <Wrench size={24} color="#64748B" />,
            phone: "1234567890",
            isOpen: true,
        },
        {
            id: 2,
            name: "Service Center 2",
            distance: "-- km",
            status: "24/7 Service",
            statusColor: "#10B981",
            icon: <Truck size={24} color="#64748B" />,
            phone: "0987654321",
            isOpen: true,
        },
        {
            id: 3,
            name: "Service Center 4",
            distance: "-- km",
            status: "Closed",
            statusColor: "#EF4444",
            icon: <Fuel size={24} color="#64748B" />,
            phone: "1122334455",
            isOpen: false,
        },
    ];

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

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

                {/* Breakdown Banner */}
                <View style={styles.alertBanner}>
                    <TriangleAlert size={20} color="#fff" />
                    <Text style={styles.alertText}>VEHICLE BREAKDOWN REPORTED</Text>
                </View>

                {/* Map Section */}
                <View style={styles.mapContainer}>
                    {isMapAvailable && location ? (
                        <MapView
                            style={styles.map}
                            initialRegion={{
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            provider={PROVIDER_DEFAULT}
                        >
                            <Marker
                                coordinate={{
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                }}
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
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                }}
                                radius={2000}
                                strokeColor="rgba(239, 68, 68, 0.2)"
                                fillColor="rgba(239, 68, 68, 0.1)"
                            />
                        </MapView>
                    ) : (
                        <View style={styles.mapPlaceholder}>
                            <Truck size={48} color="#CBD5E1" />
                            <Text style={styles.placeholderText}>Locating vehicle...</Text>
                        </View>
                    )}

                    {/* Current Location FAB */}
                    <TouchableOpacity style={styles.locationFab}>
                        <Navigation size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                {/* Service Centers List */}
                <View style={styles.serviceSection}>
                    <Text style={styles.sectionTitle}>Nearby Service Centers</Text>
                    <Text style={styles.sectionSubtitle}>Select a provider to dispatch help immediately.</Text>

                    {serviceCenters.map((center) => (
                        <View key={center.id} style={styles.serviceCard}>
                            <View style={styles.serviceIconContainer}>
                                {center.icon}
                            </View>
                            <View style={styles.serviceInfo}>
                                <Text style={styles.serviceName}>{center.name}</Text>
                                <View style={styles.serviceMeta}>
                                    <Text style={styles.serviceDistance}>{center.distance}</Text>
                                    <Text style={styles.bullet}> • </Text>
                                    <Text style={[styles.serviceStatus, { color: center.statusColor }]}>{center.status}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.callButton, !center.isOpen && styles.callButtonDisabled]}
                                onPress={() => center.isOpen && handleCall(center.phone)}
                                disabled={!center.isOpen}
                            >
                                <Text style={[styles.callButtonText, !center.isOpen && styles.callButtonTextDisabled]}>CALL</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
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
    serviceCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    serviceIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    serviceInfo: { flex: 1 },
    serviceName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 4,
    },
    serviceMeta: {
        flexDirection: "row",
        alignItems: "center",
    },
    serviceDistance: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "500",
    },
    bullet: { color: "#94A3B8" },
    serviceStatus: {
        fontSize: 13,
        fontWeight: "600",
    },
    callButton: {
        backgroundColor: "#10B981",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    callButtonDisabled: {
        backgroundColor: "#F1F5F9",
    },
    callButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    callButtonTextDisabled: {
        color: "#94A3B8",
    },
});

export default SOSPage;
