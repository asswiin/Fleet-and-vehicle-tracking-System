import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
    ArrowLeft,
    Truck,
    Package,
    MapPin,
    Navigation as NavIcon,
    User,
    Clock,
    Weight,
    Layers,
    Tag,
} from "lucide-react-native";
import { api, type Trip } from "../../utils/api";
import { MapView, Marker, Polyline, isMapAvailable } from "@/components/MapViewWrapper";

const { width, height } = Dimensions.get("window");

const TrackTripScreen = () => {
    const router = useRouter();
    const { tripId } = useLocalSearchParams<{ tripId: string }>();
    const mapRef = useRef<any>(null);

    const [trip, setTrip] = useState<Trip | null>(null);
    const [ongoingTrip, setOngoingTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);
    const [distance, setDistance] = useState<string>("0.0");
    const [duration, setDuration] = useState<string>("0m");
    const [rawDistance, setRawDistance] = useState<number>(0);
    const [rawDuration, setRawDuration] = useState<number>(0);

    const fetchTripDetails = async () => {
        if (!tripId) return;
        try {
            // Initial fetch of trip basic details if not already loaded
            if (!trip) {
                const response = await api.getTrip(tripId);
                if (response.ok && response.data) {
                    setTrip(response.data);
                }
            }

            // Fetch live tracking data
            const ongoingRes = await api.getOngoingTrip(tripId);
            if (ongoingRes.ok && ongoingRes.data) {
                setOngoingTrip(ongoingRes.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTripDetails();
            const interval = setInterval(fetchTripDetails, 10000); // Poll every 10 seconds
            return () => clearInterval(interval);
        }, [tripId, trip])
    );

    useEffect(() => {
        if (trip) {
            calculateRoute();
        }
    }, [trip]);

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

    const calculateRoute = async () => {
        if (!trip || !trip.startLocation || !trip.deliveryDestinations) return;
        const sortedDests = [...trip.deliveryDestinations].sort((a, b) => a.order - b.order);
        const waypoints = [
            { latitude: trip.startLocation.latitude, longitude: trip.startLocation.longitude },
            ...sortedDests.map(d => ({ latitude: d.latitude, longitude: d.longitude }))
        ];

        if (waypoints.length < 2) return;

        try {
            const coords = waypoints.map(p => `${p.longitude},${p.latitude}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.code === 'Ok' && data.routes?.[0]) {
                const route = data.routes[0];
                setRouteCoordinates(decodePolyline(route.geometry));

                const distKm = route.distance / 1000;
                const durMin = route.duration / 60;

                setRawDistance(distKm);
                setRawDuration(durMin);

                setDistance(distKm.toFixed(1));
                const totalMinutes = Math.floor(durMin);
                setDuration(totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`);
            }
        } catch (e) {
            console.error("OSRM error:", e);
            setRouteCoordinates(waypoints);
        }
    };

    const getMapRegion = () => {
        if (!trip) return null;
        const coords = [
            { latitude: trip.startLocation!.latitude, longitude: trip.startLocation!.longitude },
            ...trip.deliveryDestinations.map(d => ({ latitude: d.latitude, longitude: d.longitude }))
        ];
        const lats = coords.map(c => c.latitude);
        const lngs = coords.map(c => c.longitude);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        return {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
            longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
        };
    };

    if (loading || !trip) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 50 }} />
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
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
                </View>
            </View>

            {trip.sos && (
                <View style={{ backgroundColor: '#EF4444', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>🚨 SOS EMERGENCY REPORTED</Text>
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Map Section */}
                <View style={styles.mapWrapper}>
                    {isMapAvailable ? (
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={getMapRegion()!}
                        >
                            <Marker
                                coordinate={{ latitude: trip.startLocation!.latitude, longitude: trip.startLocation!.longitude }}
                                title="Start"
                                pinColor="#10B981"
                            />
                            {trip.deliveryDestinations.map((d, i) => (
                                <Marker
                                    key={i}
                                    coordinate={{ latitude: d.latitude, longitude: d.longitude }}
                                    title={`Stop ${d.order}`}
                                    pinColor={d.deliveryStatus === 'delivered' ? '#10B981' : '#EF4444'}
                                />
                            ))}
                            {ongoingTrip?.lastKnownLocation?.latitude && (
                                <Marker
                                    coordinate={{
                                        latitude: ongoingTrip.lastKnownLocation.latitude,
                                        longitude: ongoingTrip.lastKnownLocation.longitude
                                    }}
                                    title="Vehicle Location"
                                >
                                    <View style={styles.liveMarker}>
                                        <Truck size={20} color="#fff" />
                                    </View>
                                </Marker>
                            )}
                            {routeCoordinates.length > 0 && (
                                <Polyline coordinates={routeCoordinates} strokeColor="#2563EB" strokeWidth={4} />
                            )}
                        </MapView>
                    ) : (
                        <View style={styles.noMap}>
                            <MapPin size={40} color="#94A3B8" />
                            <Text style={styles.noMapText}>Map view unavailable</Text>
                        </View>
                    )}

                    <View style={styles.routeStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {(() => {
                                    const progress = ongoingTrip?.progress || 0;
                                    const remaining = rawDistance * (1 - progress / 100);
                                    return remaining.toFixed(1);
                                })()}
                            </Text>
                            <Text style={styles.statLabel}>KM LEFT</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {(() => {
                                    const progress = ongoingTrip?.progress || 0;
                                    const remainingMin = Math.max(0, Math.floor(rawDuration * (1 - progress / 100)));
                                    return remainingMin >= 60
                                        ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m`
                                        : `${remainingMin}m`;
                                })()}
                            </Text>
                            <Text style={styles.statLabel}>EST. LEFT</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{trip.parcelIds.length}</Text>
                            <Text style={styles.statLabel}>STOPS</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Trip Card */}
                    <View style={styles.infoCard}>
                        <View style={styles.cardHeader}>
                            <Truck size={20} color="#2563EB" />
                            <Text style={styles.cardTitle}>Trip #{trip.tripId}</Text>
                        </View>

                        <View style={styles.resourceRow}>
                            <View style={styles.resourceItem}>
                                <User size={16} color="#64748B" />
                                <View>
                                    <Text style={styles.resLabel}>Driver</Text>
                                    <Text style={styles.resValue}>{trip.driverId?.name}</Text>
                                </View>
                            </View>
                            <View style={styles.resourceItem}>
                                <Layers size={16} color="#64748B" />
                                <View>
                                    <Text style={styles.resLabel}>Vehicle</Text>
                                    <Text style={styles.resValue}>{trip.vehicleId?.regNumber}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Progress Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Delivery Progress</Text>
                        {trip.deliveryDestinations.sort((a, b) => a.order - b.order).map((dest, idx) => (
                            <View key={idx} style={styles.destItem}>
                                <View style={[styles.stepCircle, { backgroundColor: dest.deliveryStatus === 'delivered' ? '#10B981' : '#E5E7EB' }]}>
                                    <Text style={styles.stepNum}>{dest.order}</Text>
                                </View>
                                <View style={styles.destInfo}>
                                    <View style={styles.destHeader}>
                                        <Text style={styles.destName}>{dest.locationName}</Text>
                                        {trip.parcelIds.find(p => p._id === dest.parcelId)?.type && (
                                            <View style={styles.miniTypeBadge}>
                                                <Text style={styles.miniTypeText}>{trip.parcelIds.find(p => p._id === dest.parcelId)?.type}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.destStatus, { color: dest.deliveryStatus === 'delivered' ? '#10B981' : '#F59E0B' }]}>
                                        {dest.deliveryStatus.toUpperCase()}
                                    </Text>
                                </View>
                                {dest.deliveredAt && (
                                    <Text style={styles.timeText}>{new Date(dest.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Parcels Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Parcels In This Trip ({trip.parcelIds.length})</Text>
                        {trip.parcelIds.map((parcel, idx) => (
                            <View key={parcel._id || idx} style={styles.parcelCard}>
                                <View style={styles.parcelHeader}>
                                    <Package size={18} color="#2563EB" />
                                    <Text style={styles.parcelTrackingId}>{parcel.trackingId}</Text>
                                    <View style={[styles.miniStatus, { backgroundColor: parcel.status === 'delivered' ? '#DCFCE7' : '#FEF3C7' }]}>
                                        <Text style={[styles.miniStatusText, { color: parcel.status === 'delivered' ? '#16A34A' : '#D97706' }]}>
                                            {parcel.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.parcelBody}>
                                    <View style={styles.parcelInfoLine}>
                                        <User size={14} color="#64748B" />
                                        <Text style={styles.parcelInfoText}>
                                            <Text style={{ fontWeight: '700' }}>To: </Text>
                                            {parcel.recipient?.name || "N/A"}
                                        </Text>
                                    </View>
                                    <View style={styles.parcelInfoLine}>
                                        <MapPin size={14} color="#64748B" />
                                        <Text style={styles.parcelInfoText} numberOfLines={2}>
                                            <Text style={{ fontWeight: '700' }}>Address: </Text>
                                            {parcel.recipient?.address || "N/A"}
                                        </Text>
                                    </View>
                                    <View style={styles.parcelFooter}>
                                        <View style={styles.footerItem}>
                                            <Tag size={12} color="#64748B" />
                                            <Text style={styles.footerText}>{parcel.type || "General"}</Text>
                                        </View>
                                        <View style={styles.footerItem}>
                                            <Weight size={12} color="#64748B" />
                                            <Text style={styles.footerText}>{parcel.weight} kg</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
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
    statusBadge: { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
    mapWrapper: { height: 350, position: 'relative' },
    map: { flex: 1 },
    noMap: { flex: 1, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
    noMapText: { marginTop: 8, color: "#94A3B8" },
    routeStats: { position: "absolute", bottom: 20, left: 20, right: 20, backgroundColor: "#fff", borderRadius: 16, flexDirection: "row", padding: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    statItem: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
    statLabel: { fontSize: 10, color: "#64748B", fontWeight: "600", marginTop: 2 },
    vDivider: { width: 1, backgroundColor: "#E2E8F0", marginHorizontal: 10 },
    content: { padding: 20 },
    infoCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E2E8F0" },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
    resourceRow: { flexDirection: "row", justifyContent: "space-between" },
    resourceItem: { flexDirection: "row", alignItems: "center", gap: 8 },
    resLabel: { fontSize: 11, color: "#64748B" },
    resValue: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
    section: { marginTop: 10 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
    destItem: { flexDirection: "row", alignItems: "center", marginBottom: 16, backgroundColor: "#fff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#F1F5F9" },
    stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 12 },
    stepNum: { color: "#fff", fontSize: 12, fontWeight: "700" },
    destInfo: { flex: 1 },
    destName: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
    destHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    miniTypeBadge: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    miniTypeText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#64748B",
        textTransform: "capitalize",
    },
    destStatus: { fontSize: 11, fontWeight: "700", marginTop: 2 },
    timeText: { fontSize: 12, color: "#64748B" },
    liveMarker: {
        backgroundColor: "#2563EB",
        padding: 6,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        elevation: 3
    },
    parcelCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOpacity: 0.02,
        shadowRadius: 5,
        elevation: 1
    },
    parcelHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9"
    },
    parcelTrackingId: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2563EB",
        flex: 1
    },
    miniStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    miniStatusText: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase"
    },
    parcelBody: {
        gap: 8
    },
    parcelInfoLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8
    },
    parcelInfoText: {
        fontSize: 13,
        color: "#475569",
        flex: 1
    },
    parcelFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9"
    },
    footerItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4
    },
    footerText: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600"
    }
});

export default TrackTripScreen;
