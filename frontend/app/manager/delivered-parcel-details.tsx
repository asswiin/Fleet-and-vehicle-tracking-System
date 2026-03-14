import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
    ArrowLeft,
    Package,
    Calendar,
    Clock,
    User,
    Car,
    MapPin,
    CheckCircle,
    Hash,
    Info,
    Truck,
    FileText,
    Weight,
    Tag,
    ShoppingBag,
} from "lucide-react-native";
import { api, type DeliveredParcel, type Trip } from "../../utils/api";

const { width } = Dimensions.get("window");

const DeliveredParcelDetailsScreen = () => {
    const router = useRouter();
    const { historyId, notificationId } = useLocalSearchParams();
    const [history, setHistory] = useState<DeliveredParcel | null>(null);
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    const markRead = useCallback(async () => {
        if (notificationId) {
            try {
                await api.markNotificationAsRead(notificationId as string);
            } catch (err) {
                console.error("Error marking as read:", err);
            }
        }
    }, [notificationId]);

    const fetchDetails = useCallback(async () => {
        try {
            const response = await api.getAllHistory();
            if (response.ok && response.data) {
                const item = response.data.find((h: DeliveredParcel) => h._id === historyId);
                if (item) {
                    setHistory(item);
                    // Fetch trip details
                    const tripRes = await api.getTrip(item.tripId);
                    if (tripRes.ok && tripRes.data) {
                        setTrip(tripRes.data);
                    }
                    // Mark as read after opening
                    markRead();
                }
            }
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setLoading(false);
        }
    }, [historyId, markRead]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Not available";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    const formatTime = (dateString?: string) => {
        if (!dateString) return "Not available";
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Parcel Details</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Fetching details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!history) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Error</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centerContainer}>
                    <Info size={48} color="#EF4444" />
                    <Text style={styles.errorText}>Details not found.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.title}>Delivery Summary</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusIconBg}>
                        <CheckCircle size={32} color="#059669" />
                    </View>
                    <Text style={styles.statusTitle}>Successfully Delivered</Text>
                    <Text style={styles.statusSubtitle}>
                        Delivered on {formatDate(history.reachedTime)} at {formatTime(history.reachedTime)}
                    </Text>
                </View>

                {/* Delivery Timeline Section */}
                <Text style={styles.sectionLabel}>Delivery Timeline</Text>
                <View style={styles.infoSection}>
                    <View style={styles.timelineItem}>
                        <View style={styles.timelinePoint} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Assigned Date & Time</Text>
                            <Text style={styles.timelineValue}>
                                {trip?.assignedAt ? `${formatDate(trip.assignedAt)} • ${formatTime(trip.assignedAt)}` : "N/A"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.timelineConnector} />

                    <View style={styles.timelineItem}>
                        <View style={styles.timelinePoint} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Accepted Date & Time</Text>
                            <Text style={styles.timelineValue}>
                                {trip?.acceptedAt ? `${formatDate(trip.acceptedAt)} • ${formatTime(trip.acceptedAt)}` : "N/A"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.timelineConnector} />

                    <View style={styles.timelineItem}>
                        <View style={styles.timelinePoint} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Journey Started Date & Time</Text>
                            <Text style={styles.timelineValue}>
                                {trip?.startedAt ? `${formatDate(trip.startedAt)} • ${formatTime(trip.startedAt)}` : "N/A"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.timelineConnector} />

                    <View style={styles.timelineItem}>
                        <View style={[styles.timelinePoint, { backgroundColor: "#059669" }]} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Delivered Date & Time</Text>
                            <Text style={styles.timelineValue}>
                                {history.reachedTime ? `${formatDate(history.reachedTime)} • ${formatTime(history.reachedTime)}` : "N/A"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Resources Section */}
                <Text style={styles.sectionLabel}>Assigned Resources</Text>
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <User size={18} color="#64748B" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Driver</Text>
                            <Text style={styles.infoValueText}>{history.driver?.name || "Unknown"}</Text>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <Truck size={18} color="#64748B" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Vehicle</Text>
                            <Text style={styles.infoValueText}>
                                {history.vehicle?.regNumber || "N/A"} ({history.vehicle?.model || "Standard"})
                            </Text>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <Hash size={18} color="#64748B" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Trip ID</Text>
                            <Text style={styles.infoValueText}>{history.tripId}</Text>
                        </View>
                    </View>
                </View>

                {history.notes && (
                    <>
                        <Text style={styles.sectionLabel}>Notes</Text>
                        <View style={styles.infoSection}>
                            <Text style={styles.notesText}>{history.notes}</Text>
                        </View>
                    </>
                )}

                {/* MOVE PARCEL & SENDER/RECEIVER DETAILS TO LAST */}
                <Text style={styles.sectionLabel}>Parcel Information</Text>
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Hash size={18} color="#2563EB" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Tracking ID</Text>
                            <Text style={[styles.infoValueText, { color: "#2563EB" }]}>{history.trackId}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Tag size={18} color="#64748B" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Parcel Type</Text>
                            <Text style={styles.infoValueText}>{history.parcelDetails?.type || "Standard"}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Weight size={18} color="#64748B" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Parcel Weight</Text>
                            <Text style={styles.infoValueText}>{history.parcelDetails?.weight || 0} kg</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <MapPin size={18} color="#64748B" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Final Delivery Destination</Text>
                            <Text style={styles.infoValueText}>
                                {history.deliveryLocation?.locationName || history.recipient?.address || "No address provided"}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionLabel}>Sender & Recipient Details</Text>
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <User size={18} color="#64748B" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Sender</Text>
                            <Text style={styles.infoValueText}>{history.sender?.name || "N/A"}</Text>
                            <Text style={styles.infoSubText}>{history.sender?.phone || ""}</Text>
                            <View style={styles.addressRow}>
                                <MapPin size={12} color="#64748B" />
                                <Text style={styles.addressText}>{history.sender?.address || "No address provided"}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <User size={18} color="#64748B" />
                        <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabelText}>Recipient</Text>
                            <Text style={styles.infoValueText}>{history.recipient?.name || "N/A"}</Text>
                            <Text style={styles.infoSubText}>{history.recipient?.phone || ""}</Text>
                            <View style={styles.addressRow}>
                                <MapPin size={12} color="#64748B" />
                                <Text style={styles.addressText}>{history.recipient?.address || history.deliveryLocation?.locationName || "No address provided"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F1F5F9" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: "#F8FAFC",
    },
    title: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
    scrollContent: { padding: 16 },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
    loadingText: { marginTop: 12, color: "#64748B", fontSize: 14, fontWeight: "500" },
    errorText: { marginTop: 12, color: "#EF4444", fontSize: 16, fontWeight: "600" },
    statusCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#059669",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    statusIconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#D1FAE5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    statusTitle: { fontSize: 22, fontWeight: "900", color: "#065F46", marginBottom: 6 },
    statusSubtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "900",
        color: "#64748B",
        textTransform: "uppercase",
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: 1,
    },
    infoSection: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    infoTextContainer: { flex: 1 },
    infoLabelText: { fontSize: 12, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
    infoValueText: { fontSize: 16, color: "#1E293B", fontWeight: "800", marginTop: 2 },
    infoSubText: { fontSize: 14, color: "#64748B", marginTop: 2, fontWeight: "500" },
    timelineItem: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    timelinePoint: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#3B82F6", marginTop: 4, borderWidth: 3, borderColor: "#DBEAFE" },
    timelineContent: { flex: 1 },
    timelineLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase" },
    timelineValue: { fontSize: 15, color: "#1E293B", fontWeight: "800", marginTop: 2 },
    timelineConnector: { width: 2, height: 24, backgroundColor: "#E2E8F0", marginLeft: 6 },
    notesText: { fontSize: 15, color: "#475569", lineHeight: 24, fontStyle: "italic" },
    addressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        backgroundColor: "#F1F5F9",
        padding: 12,
        borderRadius: 12,
    },
    addressText: {
        fontSize: 14,
        color: "#334155",
        flex: 1,
        lineHeight: 20,
        fontWeight: "500",
    },
    divider: {
        height: 1,
        backgroundColor: "#F1F5F9",
        marginVertical: 4,
    },
});

export default DeliveredParcelDetailsScreen;
