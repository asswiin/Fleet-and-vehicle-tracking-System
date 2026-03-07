import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Package,
    Calendar,
    Clock,
    User,
    Car,
    MapPin,
    CheckCircle,
    ChevronRight,
} from "lucide-react-native";
import { api, type DeliveredParcel } from "../../utils/api";

const { width } = Dimensions.get("window");

const DeliveredParcelsScreen = () => {
    const router = useRouter();
    const [history, setHistory] = useState<DeliveredParcel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await api.getAllHistory();
            if (response.ok && response.data) {
                setHistory(response.data);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useState(() => {
        fetchHistory();
    });

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchHistory();
    }, [fetchHistory]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (dateString?: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const renderHistoryCard = (item: DeliveredParcel) => (
        <TouchableOpacity
            key={item._id}
            style={styles.card}
            onPress={() => router.push({
                pathname: "/manager/delivered-parcel-details",
                params: { historyId: item._id }
            } as any)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.tripIdContainer}>
                    <Text style={styles.tripIdLabel}>TRIP ID</Text>
                    <Text style={styles.tripIdValue}>{item.tripId}</Text>
                </View>
                <View style={styles.statusBadge}>
                    <CheckCircle size={12} color="#059669" />
                    <Text style={styles.statusText}>DELIVERED</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardBody}>
                <View style={styles.resourceRow}>
                    <View style={styles.resourceItem}>
                        <View style={styles.iconBgBlue}>
                            <Car size={16} color="#2563EB" />
                        </View>
                        <View>
                            <Text style={styles.resourceLabel}>Vehicle</Text>
                            <Text style={styles.resourceValue}>{item.vehicle?.regNumber || "N/A"}</Text>
                        </View>
                    </View>
                    <View style={styles.resourceItem}>
                        <View style={styles.iconBgPurple}>
                            <User size={16} color="#9333EA" />
                        </View>
                        <View>
                            <Text style={styles.resourceLabel}>Driver</Text>
                            <Text style={styles.resourceValue}>{item.driver?.name || "N/A"}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Package size={14} color="#64748B" />
                        <Text style={styles.infoText}>Track ID: {item.trackId}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <MapPin size={14} color="#64748B" />
                        <Text style={styles.infoText} numberOfLines={1}>
                            To: {item.deliveryLocation?.locationName || item.recipient?.address || "N/A"}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Clock size={14} color="#64748B" />
                        <Text style={styles.infoText}>{item.parcelDetails?.type || "Standard"} • {item.parcelDetails?.weight || 0}kg</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Calendar size={14} color="#64748B" />
                        <Text style={styles.infoText}>{formatDate(item.reachedTime)}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.viewDetailsText}>View Full Details</Text>
                <ChevronRight size={16} color="#2563EB" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.title}>Delivered Parcels</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
                }
            >
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={styles.loadingText}>Loading history...</Text>
                    </View>
                ) : history.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Package size={64} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>No Delivered Parcels</Text>
                        <Text style={styles.emptySubtitle}>Successfully delivered parcels will appear here.</Text>
                    </View>
                ) : (
                    history.map(renderHistoryCard)
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: { padding: 4 },
    title: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
    scrollContent: { padding: 16, paddingBottom: 40 },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
    loadingText: { marginTop: 12, color: "#64748B", fontSize: 14 },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#475569", marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: "#94A3B8", textAlign: "center", marginTop: 8, paddingHorizontal: 40 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    tripIdContainer: { flexDirection: "column" },
    tripIdLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8" },
    tripIdValue: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ECFDF5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    statusText: { color: "#059669", fontSize: 10, fontWeight: "800" },
    divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 16 },
    cardBody: { gap: 16 },
    resourceRow: { flexDirection: "row", justifyContent: "space-between" },
    resourceItem: { flexDirection: "row", alignItems: "center", gap: 10 },
    iconBgBlue: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
    iconBgPurple: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#F5F3FF", justifyContent: "center", alignItems: "center" },
    resourceLabel: { fontSize: 10, color: "#64748B", fontWeight: "600" },
    resourceValue: { fontSize: 13, fontWeight: "700", color: "#334155" },
    infoGrid: { gap: 8 },
    infoItem: { flexDirection: "row", alignItems: "center", gap: 8 },
    infoText: { fontSize: 13, color: "#475569", fontWeight: "500" },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    viewDetailsText: { fontSize: 13, color: "#2563EB", fontWeight: "700" },
});

export default DeliveredParcelsScreen;
