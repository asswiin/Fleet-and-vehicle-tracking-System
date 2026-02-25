import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Calendar, Package, MapPin, Truck, ChevronRight, Clock } from "lucide-react-native";
import { api, DeliveredParcel } from "../../utils/api";

const { width } = Dimensions.get("window");

const TripHistoryScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ driverId?: string; role?: string }>();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            let res;
            if (params.driverId) {
                console.log("Fetching history for driver:", params.driverId);
                res = await api.getDriverHistory(params.driverId);
            } else {
                console.log("Fetching all history");
                res = await api.getAllHistory();
            }

            if (res.ok && Array.isArray(res.data)) {
                console.log(`Received ${res.data.length} history items`);
                // Group by tripObjectId or tripId
                const groupedMap: Record<string, any> = {};

                (res.data as DeliveredParcel[]).forEach(item => {
                    const key = item.tripObjectId || item.tripId;
                    if (!key) return; // Skip items without a valid trip link

                    if (!groupedMap[key]) {
                        groupedMap[key] = {
                            id: key,
                            tripId: item.tripId,
                            reachedTime: item.reachedTime,
                            driver: item.driver,
                            vehicle: item.vehicle,
                            parcels: [],
                            totalWeight: 0,
                            totalAmount: 0,
                            notes: item.notes
                        };
                    }
                    groupedMap[key].parcels.push(item);
                    groupedMap[key].totalWeight += (item.parcelDetails?.weight || 0);
                    groupedMap[key].totalAmount += (item.parcelDetails?.amount || 0);

                    // Keep the latest reachedTime
                    if (new Date(item.reachedTime) > new Date(groupedMap[key].reachedTime)) {
                        groupedMap[key].reachedTime = item.reachedTime;
                    }
                });

                const sortedData = Object.values(groupedMap).sort((a, b) =>
                    new Date(b.reachedTime).getTime() - new Date(a.reachedTime).getTime()
                );
                setHistory(sortedData);
            } else if (!res.ok) {
                console.error("Fetch history failed:", res.error);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [params.driverId]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchHistory();
    }, [params.driverId]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderHistoryItem = ({ item }: { item: any }) => {
        const isExpanded = expandedId === item.id;
        const parcelCount = item.parcels.length;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>TRIP #{item.tripId}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.reachedTime)}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.row}>
                        <Package size={20} color="#6366F1" />
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Total Parcels</Text>
                            <Text style={styles.infoValue}>{parcelCount} {parcelCount > 1 ? 'Parcels' : 'Parcel'}</Text>
                        </View>
                        <View style={[styles.infoCol, { alignItems: 'flex-end' }]}>
                            <Text style={styles.infoLabel}>Total Weight</Text>
                            <Text style={styles.infoValue}>{item.totalWeight.toFixed(1)} Kg</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <MapPin size={20} color="#EF4444" />
                        <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>Primary Destination</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>
                                {item.parcels[0]?.deliveryLocation?.locationName || item.parcels[0]?.recipient?.name}
                            </Text>
                            <Text style={styles.addressText} numberOfLines={1}>{item.parcels[0]?.recipient?.address}</Text>
                            {parcelCount > 1 && (
                                <Text style={styles.moreStopsText}>+ {parcelCount - 1} more destination(s)</Text>
                            )}
                        </View>
                        <ChevronRight
                            size={18}
                            color="#94A3B8"
                            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }], marginTop: 10 }}
                        />
                    </View>

                    {isExpanded && (
                        <View style={styles.expandedContent}>
                            <View style={styles.divider} />

                            {/* Trip Info Aggregate */}
                            <View style={styles.detailSection}>
                                <Text style={styles.sectionTitle}>Vehicle Details</Text>
                                <View style={styles.row}>
                                    <Truck size={20} color="#3B82F6" />
                                    <View style={styles.infoCol}>
                                        <Text style={styles.infoLabel}>Vehicle</Text>
                                        <Text style={styles.infoValue}>{item.vehicle?.regNumber}</Text>
                                        <Text style={styles.addressText}>{item.vehicle?.model} • {item.vehicle?.type}</Text>
                                    </View>
                                </View>
                            </View>

                            {params.role === 'manager' || params.role === 'admin' ? (
                                <View style={[styles.row, { marginTop: 12 }]}>
                                    <Clock size={20} color="#F59E0B" />
                                    <View style={styles.infoCol}>
                                        <Text style={styles.infoLabel}>Driver</Text>
                                        <Text style={styles.infoValue}>{item.driver?.name}</Text>
                                    </View>
                                </View>
                            ) : null}

                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>Delivered Parcels</Text>

                            {item.parcels.map((p: any, idx: number) => (
                                <View key={p._id} style={styles.parcelDetailItem}>
                                    <View style={styles.parcelDetailHeader}>
                                        <Text style={styles.parcelTrackId}>{p.trackId}</Text>
                                        <View style={styles.miniStatus}>
                                            <Text style={styles.miniStatusText}>DELIVERED</Text>
                                        </View>
                                    </View>
                                    <View style={styles.parcelDetailRow}>
                                        <View style={styles.pInfoItem}>
                                            <Text style={styles.pInfoLabel}>To:</Text>
                                            <Text style={styles.pInfoValue} numberOfLines={1}>{p.recipient?.name}</Text>
                                        </View>
                                        <View style={styles.pInfoItem}>
                                            <Text style={styles.pInfoLabel}>Weight:</Text>
                                            <Text style={styles.pInfoValue}>{p.parcelDetails?.weight} Kg</Text>
                                        </View>
                                        <View style={styles.pInfoItem}>
                                            <Text style={styles.pInfoLabel}>Type:</Text>
                                            <Text style={styles.pInfoValue}>{p.parcelDetails?.type}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.pAddress}>{p.recipient?.address}</Text>
                                    {idx < parcelCount - 1 && <View style={styles.miniDivider} />}
                                </View>
                            ))}

                            {item.notes ? (
                                <View style={styles.notesContainer}>
                                    <Text style={styles.notesLabel}>Driver Notes:</Text>
                                    <Text style={styles.notesText}>{item.notes}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ChevronLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Delivery History</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    renderItem={renderHistoryItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Clock size={60} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No History Found</Text>
                            <Text style={styles.emptySubtitle}>Completed trips will appear here.</Text>
                        </View>
                    }
                />
            )}
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { padding: 16, paddingBottom: 40 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    badge: {
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
    dateText: { fontSize: 13, color: "#64748B", fontWeight: "500" },
    cardBody: { gap: 12 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    infoCol: { flex: 1 },
    infoLabel: { fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
    infoValue: { fontSize: 14, color: "#1E293B", fontWeight: "600" },
    addressText: { fontSize: 12, color: "#64748B", marginTop: 2 },
    divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },
    notesContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: "#CBD5E1",
    },
    notesLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", marginBottom: 4 },
    notesText: { fontSize: 13, color: "#334155", fontStyle: "italic" },
    emptyContainer: {
        flex: 1,
        height: 400,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#475569", marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: "#94A3B8", marginTop: 4 },
    expandedContent: {
        marginTop: 4,
    },
    detailSection: {
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 10,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    moreStopsText: {
        fontSize: 11,
        color: "#2563EB",
        fontWeight: "700",
        marginTop: 4,
        fontStyle: "italic",
    },
    parcelDetailItem: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    parcelDetailHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    parcelTrackId: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1E293B",
    },
    miniStatus: {
        backgroundColor: "#DCFCE7",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniStatusText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#166534",
    },
    parcelDetailRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 6,
    },
    pInfoItem: {
        flex: 1,
    },
    pInfoLabel: {
        fontSize: 10,
        color: "#94A3B8",
        fontWeight: "600",
    },
    pInfoValue: {
        fontSize: 12,
        color: "#1E293B",
        fontWeight: "700",
    },
    pAddress: {
        fontSize: 11,
        color: "#64748B",
        marginTop: 2,
    },
    miniDivider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginTop: 10,
    },
});

export default TripHistoryScreen;
