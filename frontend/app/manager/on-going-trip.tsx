import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    StatusBar,
    Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ArrowLeft, Truck, MessageSquare, Navigation, User as UserIcon, AlertTriangle } from "lucide-react-native";
import { api, type Trip } from "../../utils/api";

const OnGoingTripScreen = () => {
    const router = useRouter();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const fetchActiveTrips = useCallback(async () => {
        try {
            const response = await api.getOngoingTrips();
            if (response.ok && response.data) {
                // Map from OngoingTrip wrapper to actual Trip data
                const active = response.data.map((item: any) => item.trip).filter(Boolean);
                setTrips(active);
            }
        } catch (error) {
            console.error("Error fetching active trips:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchActiveTrips();
        }, [fetchActiveTrips])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchActiveTrips();
    }, [fetchActiveTrips]);

    const calculateProgress = (trip: Trip) => {
        if (!trip.parcelIds || trip.parcelIds.length === 0) return 0;
        const delivered = trip.parcelIds.filter(p => p.status === "delivered" || p.status === "Completed").length;
        return (delivered / trip.parcelIds.length) * 100;
    };

    const renderTripItem = ({ item }: { item: Trip }) => {
        const progress = calculateProgress(item);

        return (
            <TouchableOpacity
                style={styles.tripCard}
                onPress={() => router.push({
                    pathname: "/manager/track-trip",
                    params: { tripId: item._id }
                } as any)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.vehicleInfo}>
                        <View style={styles.iconCircle}>
                            <Truck size={20} color="#2563EB" />
                        </View>
                        <View>
                            <Text style={styles.regNumber}>{item.vehicleId?.regNumber || "Unknown"}</Text>
                            <View style={styles.driverRow}>
                                <UserIcon size={12} color="#6B7280" />
                                <Text style={styles.driverName}>{item.driverId?.name || "Unassigned"}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'accepted' ? '#FEF3C7' : '#EFF6FF' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'accepted' ? '#92400E' : '#2563EB' }]}>
                            {item.status === 'accepted' ? 'ACCEPTED' : 'IN TRANSIT'}
                        </Text>
                    </View>
                </View>

                {item.sos && (
                    <Animated.View style={[styles.sosBadge, { transform: [{ scale: pulseAnim }] }]}>
                        <AlertTriangle size={14} color="#fff" />
                        <Text style={styles.sosBadgeText}>SOS EMERGENCY REPORTED</Text>
                    </Animated.View>
                )}

                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressTime}>Trip ID: {item.tripId}</Text>
                        <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                        <View style={[styles.progressKnob, { left: `${progress}%` }]} />
                    </View>
                </View>

                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.messageBtn}>
                        <MessageSquare size={18} color="#374151" />
                        <Text style={styles.actionBtnText}>Message Driver</Text>
                    </TouchableOpacity>
                    <View style={styles.trackLink}>
                        <Text style={styles.trackLinkText}>View Live Map</Text>
                        <Navigation size={14} color="#2563EB" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>On Going Trips</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : trips.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Truck size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No active trips at the moment</Text>
                </View>
            ) : (
                <FlatList
                    data={trips}
                    renderItem={renderTripItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    listContainer: {
        padding: 16,
    },
    tripCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    vehicleInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    regNumber: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    driverRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
        gap: 4,
    },
    driverName: {
        fontSize: 13,
        color: "#6B7280",
    },
    statusBadge: {
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#2563EB",
    },
    progressSection: {
        marginBottom: 20,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    progressTime: {
        fontSize: 12,
        color: "#6B7280",
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1F2937",
    },
    progressBarBg: {
        height: 6,
        backgroundColor: "#F3F4F6",
        borderRadius: 3,
        position: "relative",
        overflow: "visible",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#2563EB",
        borderRadius: 3,
    },
    progressKnob: {
        position: "absolute",
        top: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#2563EB",
        borderWidth: 2,
        borderColor: "#fff",
        marginLeft: -5,
    },
    cardActions: {
        flexDirection: "row",
        gap: 12,
    },
    messageBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        gap: 8,
    },
    trackLink: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 6,
    },
    trackLinkText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#2563EB",
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
    },
    sosBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EF4444",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 16,
        gap: 8,
    },
    sosBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
});

export default OnGoingTripScreen;
