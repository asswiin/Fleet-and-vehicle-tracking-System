import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Dimensions,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
    ArrowLeft,
    Truck,
    Package,
    MapPin,
    Calendar,
    Weight,
    Navigation as NavIcon,
} from "lucide-react-native";
import { api, type Parcel, type Trip } from "../utils/api";
import { MapView, Marker, Polyline, isMapAvailable } from "@/components/MapViewWrapper";

const { width } = Dimensions.get("window");

const TrackParcelScreen = () => {
    const router = useRouter();
    const { trackingId } = useLocalSearchParams<{ trackingId: string }>();
    const mapRef = useRef<any>(null);

    const [parcel, setParcel] = useState<Parcel | null>(null);
    const [ongoingTrip, setOngoingTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);

    const fetchParcelAndTracking = async () => {
        if (!trackingId) {
            setError("No tracking ID provided");
            setLoading(false);
            return;
        }

        try {
            const response = await api.getParcelByTrackingId(trackingId);
            if (response.ok && response.data) {
                const parcelData = response.data;
                setParcel(parcelData);

                // If parcel has a tripId and is In Transit, fetch its live location
                if (parcelData.tripId && parcelData.status === "In Transit") {
                    const ongoingRes = await api.getOngoingTrip(parcelData.tripId);
                    if (ongoingRes.ok && ongoingRes.data) {
                        setOngoingTrip(ongoingRes.data);
                    }
                }
            } else {
                setError(response.error || "Parcel not found");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to fetch tracking data");
        } finally {
            setLoading(false);
        }
    };

    // Poll for updates every 10 seconds
    useEffect(() => {
        fetchParcelAndTracking();
        const interval = setInterval(fetchParcelAndTracking, 10000);
        return () => clearInterval(interval);
    }, [trackingId]);

    // Calculate route when parcel/trip data is available
    useEffect(() => {
        if (parcel && parcel.deliveryLocation && ongoingTrip?.lastKnownLocation) {
            calculateRoute();
        }
    }, [parcel, ongoingTrip]);

    const calculateRoute = async () => {
        if (!parcel?.deliveryLocation || !ongoingTrip?.lastKnownLocation) return;

        try {
            const start = `${ongoingTrip.lastKnownLocation.longitude},${ongoingTrip.lastKnownLocation.latitude}`;
            const end = `${parcel.deliveryLocation.longitude},${parcel.deliveryLocation.latitude}`;
            const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=polyline`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.code === 'Ok' && data.routes?.[0]) {
                const points = decodePolyline(data.routes[0].geometry);
                setRouteCoordinates(points);
            }
        } catch (e) {
            console.error("OSRM error:", e);
        }
    };

    const decodePolyline = (encoded: string): { latitude: number, longitude: number }[] => {
        const points: { latitude: number, longitude: number }[] = [];
        let index = 0, lat = 0, lng = 0;
        while (index < encoded.length) {
            let b, shift = 0, result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat;
            shift = 0; result = 0;
            do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng;
            points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
        }
        return points;
    };

    const renderStatus = (status?: string) => {
        let bgColor = '#EFF6FF';
        let textColor = '#1D4ED8';

        switch (status) {
            case 'In Transit': bgColor = '#FEF3C7'; textColor = '#D97706'; break;
            case 'Delivered': bgColor = '#ECFDF3'; textColor = '#15803D'; break;
            case 'Booked': bgColor = '#F1F5F9'; textColor = '#475569'; break;
            default: bgColor = '#EFF6FF'; textColor = '#1D4ED8';
        }

        return (
            <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
                <Text style={[styles.statusText, { color: textColor }]}>{status?.toUpperCase() || "PENDING"}</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 100 }} />
                <Text style={styles.loadingText}>Fetching live tracking...</Text>
            </SafeAreaView>
        );
    }

    if (error || !parcel) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tracking</Text>
                </View>
                <View style={styles.errorContainer}>
                    <Package size={64} color="#CBD5E1" />
                    <Text style={styles.errorTitle}>Parcel Not Found</Text>
                    <Text style={styles.errorSubtitle}>{error || "The tracking ID provided is invalid or has expired."}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchParcelAndTracking}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Live Tracking</Text>
                {renderStatus(parcel.status)}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Map Section */}
                <View style={styles.mapWrapper}>
                    {isMapAvailable ? (
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={{
                                latitude: ongoingTrip?.lastKnownLocation?.latitude || parcel.deliveryLocation?.latitude || 10.0,
                                longitude: ongoingTrip?.lastKnownLocation?.longitude || parcel.deliveryLocation?.longitude || 76.0,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                        >
                            {/* Destination Marker */}
                            {parcel.deliveryLocation?.latitude != null && parcel.deliveryLocation?.longitude != null && (
                                <Marker
                                    coordinate={{
                                        latitude: parcel.deliveryLocation.latitude,
                                        longitude: parcel.deliveryLocation.longitude
                                    }}
                                    title="Delivery Point"
                                    pinColor="#EF4444"
                                />
                            )}

                            {/* Driver Live Marker */}
                            {ongoingTrip?.lastKnownLocation?.latitude != null && ongoingTrip?.lastKnownLocation?.longitude != null && (
                                <Marker
                                    coordinate={{
                                        latitude: ongoingTrip.lastKnownLocation.latitude as number,
                                        longitude: ongoingTrip.lastKnownLocation.longitude as number
                                    }}
                                    title="Vehicle Location"
                                >
                                    <View style={styles.liveMarker}>
                                        <Truck size={24} color="#fff" />
                                    </View>
                                </Marker>
                            )}

                            {routeCoordinates.length > 0 && (
                                <Polyline coordinates={routeCoordinates} strokeColor="#2563EB" strokeWidth={4} />
                            )}
                        </MapView>
                    ) : (
                        <View style={styles.map}>
                            {Platform.OS === 'web' ? (
                                <iframe
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(ongoingTrip?.lastKnownLocation?.longitude || parcel.deliveryLocation?.longitude || 76.0) - 0.02},${(ongoingTrip?.lastKnownLocation?.latitude || parcel.deliveryLocation?.latitude || 10.0) - 0.02},${(ongoingTrip?.lastKnownLocation?.longitude || parcel.deliveryLocation?.longitude || 76.0) + 0.02},${(ongoingTrip?.lastKnownLocation?.latitude || parcel.deliveryLocation?.latitude || 10.0) + 0.02}&layer=mapnik&marker=${ongoingTrip?.lastKnownLocation?.latitude || parcel.deliveryLocation?.latitude || 10.0},${ongoingTrip?.lastKnownLocation?.longitude || parcel.deliveryLocation?.longitude || 76.0}`}
                                />
                            ) : (
                                <View style={styles.noMap}>
                                    <MapPin size={40} color="#94A3B8" />
                                    <Text style={styles.noMapText}>Map view unavailable</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                <View style={styles.cardContainer}>
                    {/* Main Info Card */}
                    <View style={styles.infoCard}>
                        <View style={styles.cardHeader}>
                            <Package size={22} color="#2563EB" />
                            <Text style={styles.cardTitle}>Parcel Details</Text>
                            <Text style={styles.trackingId}>#{parcel.trackingId}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.detailsGrid}>
                            <View style={styles.detailItem}>
                                <Calendar size={18} color="#64748B" />
                                <View>
                                    <Text style={styles.detailLabel}>Booked On</Text>
                                    <Text style={styles.detailValue}>{new Date(parcel.date!).toLocaleDateString()}</Text>
                                </View>
                            </View>
                            <View style={styles.detailItem}>
                                <Weight size={18} color="#64748B" />
                                <View>
                                    <Text style={styles.detailLabel}>Weight</Text>
                                    <Text style={styles.detailValue}>{parcel.weight} KG</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Delivery Destination */}
                    <View style={styles.sectionHeader}>
                        <NavIcon size={18} color="#1E293B" />
                        <Text style={styles.sectionTitle}>Delivery Destination</Text>
                    </View>
                    <View style={styles.addressCard}>
                        <MapPin size={24} color="#EF4444" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addressName}>{parcel.recipient?.name}</Text>
                            <Text style={styles.addressText}>{parcel.recipient?.address}</Text>
                        </View>
                    </View>

                    {/* Driver Component (If Active) */}
                    {parcel.status === "In Transit" && ongoingTrip && (
                        <View style={styles.liveAlert}>
                            <View style={styles.pulseContainer}>
                                <View style={styles.pulse} />
                            </View>
                            <Text style={styles.liveAlertText}>Driver is currently en route to your location.</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
    backBtn: { padding: 4, marginRight: 12 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", flex: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: "800" },
    loadingText: { textAlign: "center", marginTop: 12, color: "#64748B", fontWeight: "500" },
    mapWrapper: { height: 400, position: 'relative' },
    map: { flex: 1 },
    noMap: { flex: 1, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
    noMapText: { marginTop: 8, color: "#94A3B8" },
    liveMarker: {
        backgroundColor: "#2563EB",
        padding: 8,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5
    },
    cardContainer: { padding: 20 },
    infoCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, marginBottom: 24, borderWidth: 1, borderColor: "#F1F5F9" },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", flex: 1 },
    trackingId: { fontSize: 14, fontWeight: "600", color: "#2563EB" },
    divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 16 },
    detailsGrid: { flexDirection: "row", justifyContent: "space-between" },
    detailItem: { flexDirection: "row", gap: 10, alignItems: "center" },
    detailLabel: { fontSize: 11, color: "#64748B", fontWeight: "600", textTransform: "uppercase" },
    detailValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
    addressCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderColor: "#F1F5F9" },
    addressName: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
    addressText: { fontSize: 13, color: "#64748B", lineHeight: 18 },
    liveAlert: { marginTop: 24, backgroundColor: "#EFF6FF", padding: 16, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 12 },
    liveAlertText: { fontSize: 14, color: "#1E40AF", fontWeight: "600", flex: 1 },
    pulseContainer: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    errorTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B", marginTop: 24 },
    errorSubtitle: { fontSize: 15, color: "#64748B", textAlign: "center", marginTop: 12, lineHeight: 22 },
    retryBtn: { marginTop: 30, backgroundColor: "#2563EB", paddingHorizontal: 30, paddingVertical: 14, borderRadius: 12 },
    retryText: { color: "#fff", fontWeight: "700", fontSize: 16 }
});

export default TrackParcelScreen;
