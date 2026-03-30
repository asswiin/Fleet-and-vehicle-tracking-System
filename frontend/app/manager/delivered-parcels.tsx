import React, { useState, useCallback, useMemo } from "react";
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
    StatusBar,
    TextInput,
    Modal,
    Platform,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
    ChevronLeft,
    Package,
    Calendar,
    Clock,
    User,
    Car,
    MapPin,
    CheckCircle2,
    Search,
    Filter,
    ArrowUpRight,
    TrendingUp,
    ShieldCheck,
} from "lucide-react-native";
import { api, type DeliveredParcel } from "../../utils/api";

const { width } = Dimensions.get("window");

const DeliveredParcelsScreen = () => {
    const router = useRouter();
    const [history, setHistory] = useState<DeliveredParcel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());

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

    const filteredHistory = useMemo(() => {
        let filtered = history;

        // Search Query Filter
        if (searchQuery) {
            filtered = filtered.filter(item => 
                item.trackId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.tripId?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Date Filter
        if (selectedDate) {
            const searchDateStr = selectedDate.toISOString().split('T')[0];
            filtered = filtered.filter(item => {
                if (!item.reachedTime) return false;
                const recordDateStr = new Date(item.reachedTime).toISOString().split('T')[0];
                return recordDateStr === searchDateStr;
            });
        }

        return filtered;
    }, [history, searchQuery, selectedDate]);

    const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (date) {
                setSelectedDate(date);
            }
        } else if (date) {
            setTempDate(date);
        }
    };

    const confirmIOSDate = () => {
        setSelectedDate(tempDate);
        setShowDatePicker(false);
    };

    const stats = useMemo(() => {
        const total = filteredHistory.length;
        const totalWeight = filteredHistory.reduce((sum, item) => sum + (item.parcelDetails?.weight || 0), 0);
        return { total, avgWeight: total > 0 ? (totalWeight / total).toFixed(1) : 0 };
    }, [filteredHistory]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
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
            activeOpacity={0.9}
        >
            <View style={styles.cardTop}>
                <View style={styles.idSection}>
                    <View style={styles.packageIconBox}>
                        <Package size={20} color="#4F46E5" />
                    </View>
                    <View>
                        <Text style={styles.trackIdLabel}>TRACKING ID</Text>
                        <Text style={styles.trackIdValue}>{item.trackId || "N/A"}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
                    <CheckCircle2 size={12} color="#10B981" />
                    <Text style={[styles.statusText, { color: '#10B981' }]}>SUCCESS</Text>
                </View>
            </View>

            <View style={styles.tripContext}>
                <Text style={styles.tripText}>Linked to Trip #{item.tripId}</Text>
                <Text style={styles.dateText}>{formatDate(item.reachedTime)}</Text>
            </View>

            <View style={styles.resourceGrid}>
                <View style={styles.resourceCard}>
                    <User size={14} color="#64748B" />
                    <Text style={styles.resourceName} numberOfLines={1}>{item.driver?.name || "Driver"}</Text>
                </View>
                <View style={styles.resourceCard}>
                    <Car size={14} color="#64748B" />
                    <Text style={styles.resourceName}>{item.vehicle?.regNumber || "Vehicle"}</Text>
                </View>
            </View>

            <View style={styles.locationContainer}>
                <MapPin size={14} color="#64748B" />
                <Text style={styles.locationText} numberOfLines={1}>
                    {item.deliveryLocation?.locationName || item.recipient?.address || "Delivery Location"}
                </Text>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.weightBadge}>
                    <TrendingUp size={12} color="#6366F1" />
                    <Text style={styles.weightText}>{item.parcelDetails?.weight || 0}kg Payload</Text>
                </View>
                <View style={styles.auditAction}>
                    <Text style={styles.auditText}>View Audit</Text>
                    <ArrowUpRight size={14} color="#4F46E5" />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <ChevronLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Delivery Archives</Text>
                    <Text style={styles.headerSubtitle}>Compliance & History</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                stickyHeaderIndices={[1]}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
                }
            >
                {/* Stats Section */}
                {!loading && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statVal}>{stats.total}</Text>
                            <Text style={styles.statLab}>Delivered</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statVal}>100%</Text>
                            <Text style={styles.statLab}>Success Rate</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statVal}>{stats.avgWeight}kg</Text>
                            <Text style={styles.statLab}>Avg Weight</Text>
                        </View>
                    </View>
                )}

                {/* Search & Filter Bar */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchRow}>
                        <View style={styles.searchContainer}>
                            <Search size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Find by Track ID or Trip..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#94A3B8"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <Clock size={16} color="#94A3B8" style={{ transform: [{ rotate: '45deg' }] }} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity 
                            style={[styles.filterBtn, selectedDate && styles.filterBtnActive]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Calendar size={20} color={selectedDate ? "#fff" : "#4F46E5"} />
                        </TouchableOpacity>
                    </View>

                    {selectedDate && (
                        <View style={styles.activeFiltersRow}>
                            <View style={styles.filterChip}>
                                <Calendar size={12} color="#4F46E5" />
                                <Text style={styles.filterChipText}>{formatDate(selectedDate.toISOString())}</Text>
                                <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.chipClose}>
                                    <Text style={styles.chipCloseText}>×</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {showDatePicker && Platform.OS === 'ios' && (
                    <Modal visible={showDatePicker} transparent animationType="fade">
                        <View style={styles.modalOverlay}>
                            <View style={styles.datePickerContainer}>
                                <View style={styles.datePickerHeader}>
                                    <Text style={styles.datePickerTitle}>Select Delivery Date</Text>
                                </View>
                                <DateTimePicker
                                    value={tempDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    maximumDate={new Date()}
                                />
                                <View style={styles.datePickerFooter}>
                                    <TouchableOpacity style={styles.cancelLink} onPress={() => setShowDatePicker(false)}>
                                        <Text style={styles.cancelLinkText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.confirmBtn} onPress={confirmIOSDate}>
                                        <Text style={styles.confirmBtnText}>Show Records</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}

                {showDatePicker && Platform.OS === 'android' && (
                    <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                    />
                )}

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingText}>Synthesizing delivery records...</Text>
                    </View>
                ) : filteredHistory.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <ShieldCheck size={40} color="#94A3B8" />
                        </View>
                        <Text style={styles.emptyTitle}>Archive Clear</Text>
                        <Text style={styles.emptySubtitle}>No records match your search criteria or are available in the system.</Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        <Text style={styles.listTitle}>Delivered Consignments</Text>
                        {filteredHistory.map(renderHistoryCard)}
                    </View>
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
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    headerBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F8FAFC", justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 11, fontWeight: "700", color: "#64748B", textTransform: 'uppercase', letterSpacing: 0.5 },
    
    scrollContent: { paddingBottom: 40 },
    statsContainer: { flexDirection: 'row', backgroundColor: '#fff', margin: 20, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 20, elevation: 8 },
    statBox: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
    statLab: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 },
    verticalDivider: { width: 1, backgroundColor: '#F1F5F9', height: '60%', alignSelf: 'center' },

    searchWrapper: { backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 12 },
    searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
    searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B' },
    filterBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', borderStyle: 'solid' },
    filterBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    
    activeFiltersRow: { flexDirection: 'row', marginTop: 12 },
    filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, gap: 6, borderWidth: 1, borderColor: '#E0E7FF' },
    filterChipText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
    chipClose: { marginLeft: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
    chipCloseText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: -2 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
    datePickerContainer: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    datePickerHeader: { marginBottom: 16, alignItems: 'center' },
    datePickerTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
    datePickerFooter: { flexDirection: 'row', marginTop: 20, gap: 12 },
    cancelLink: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center' },
    cancelLinkText: { fontSize: 16, fontWeight: '700', color: '#64748B' },
    confirmBtn: { flex: 2, height: 56, backgroundColor: '#4F46E5', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    confirmBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    listContainer: { paddingHorizontal: 20, marginTop: 10 },
    listTitle: { fontSize: 16, fontWeight: "900", color: "#1E293B", marginBottom: 16, letterSpacing: -0.2 },

    card: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    idSection: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    packageIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    trackIdLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
    trackIdValue: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6 },
    statusText: { fontSize: 10, fontWeight: "900" },

    tripContext: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    tripText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    dateText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

    resourceGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    resourceCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    resourceName: { fontSize: 12, fontWeight: '700', color: '#475569' },

    locationContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
    locationText: { fontSize: 13, color: '#64748B', fontWeight: '600', flex: 1 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
    weightBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    weightText: { fontSize: 11, fontWeight: '800', color: '#4F46E5' },
    auditAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    auditText: { fontSize: 13, fontWeight: '800', color: '#4F46E5' },

    centerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    loadingText: { marginTop: 12, color: "#94A3B8", fontSize: 14, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    emptyTitle: { fontSize: 20, fontWeight: "900", color: "#1E293B" },
    emptySubtitle: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8, paddingHorizontal: 40, lineHeight: 22 },
});

export default DeliveredParcelsScreen;
