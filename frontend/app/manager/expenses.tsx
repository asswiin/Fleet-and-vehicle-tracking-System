import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StatusBar,
    RefreshControl,
    TextInput,
    Alert,
    Modal,
    Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import {
    ChevronLeft,
    DollarSign,
    Calendar,
    IndianRupee,
    Plus,
    Trash2,
    AlertCircle,
    Hash,
    CheckCircle2,
} from "lucide-react-native";
import { api } from "../../utils/api";

const { width } = Dimensions.get("window");
const CATEGORIES = ["Fuel", "Toll", "Maintenance", "Food", "Other"];

const ExpensesScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{
        userId?: string;
        userName?: string;
    }>();

    const [expenses, setExpenses] = useState<any[]>([]);
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const [formData, setFormData] = useState({
        tripId: "",
        reportedBy: params.userName || "Manager",
        reporterRole: "Manager",
    });

    const [amounts, setAmounts] = useState<{ [key: string]: string }>({
        Fuel: "",
        Toll: "",
        Maintenance: "",
        Food: "",
        Other: "",
    });

    const fetchExpenses = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.getExpenses();
            if (res.ok && Array.isArray(res.data)) {
                // Filter only completed trip expenses for this view
                const list = res.data.filter((e: any) => e.tripId?.status?.toLowerCase() === "completed");
                setExpenses(list);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchTrips = useCallback(async () => {
        try {
            const res = await api.getAllTrips();
            if (res.ok && Array.isArray(res.data)) {
                const completed = res.data.filter(
                    (t: any) => t.status?.toLowerCase() === "completed"
                );
                setTrips(completed);
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchExpenses();
            fetchTrips();
        }, [fetchExpenses, fetchTrips])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchExpenses(true);
        fetchTrips();
    };

    const handleAddExpense = async () => {
        if (!formData.tripId) {
            Alert.alert("Error", "Please select a trip first");
            return;
        }

        const payload: any = {
            ...formData,
            fuel: parseFloat(amounts.Fuel) || 0,
            toll: parseFloat(amounts.Toll) || 0,
            maintenance: parseFloat(amounts.Maintenance) || 0,
            food: parseFloat(amounts.Food) || 0,
            other: parseFloat(amounts.Other) || 0,
        };

        const total = payload.fuel + payload.toll + payload.maintenance + payload.food + payload.other;
        if (total === 0) {
            Alert.alert("Error", "Please enter at least one amount");
            return;
        }

        payload.totalAmount = total;

        setLoading(true);
        try {
            const res = await api.createExpense(payload);
            if (res.ok) {
                Alert.alert("Success", "Expenses recorded successfully");
                setModalVisible(false);
                setAmounts({ Fuel: "", Toll: "", Maintenance: "", Food: "", Other: "" });
                setFormData({ ...formData, tripId: "" });
                setTrips(prev => prev.filter(t => t._id !== formData.tripId));
                fetchExpenses(true);
            } else {
                Alert.alert("Error", res.error || "Failed to record expenses");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to contact server");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExpense = (id: string) => {
        Alert.alert("Delete Audit", "Delete this financial audit? This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete Record",
                style: "destructive",
                onPress: async () => {
                    try {
                        const res = await api.deleteExpense(id);
                        if (res.ok) fetchExpenses(true);
                    } catch (e) {
                        console.error(e);
                    }
                },
            },
        ]);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const totalStats = useMemo(() => {
        const total = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const avg = expenses.length > 0 ? total / expenses.length : 0;
        const highest = expenses.reduce((max, e) => Math.max(max, e.totalAmount || 0), 0);
        return { total, avg, highest };
    }, [expenses]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
                        <ChevronLeft size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>Financial Audit</Text>
                        <Text style={styles.headerSubtitle}>Trip Expense Management</Text>
                    </View>
                    <TouchableOpacity style={styles.headerAddBtn} onPress={() => setModalVisible(true)}>
                        <Plus size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Stats Dashboard */}
                    {!loading && expenses.length > 0 && (
                        <View style={styles.statsContainer}>
                            <View style={styles.primaryStat}>
                                <Text style={styles.statLabel}>Total Operating Cost</Text>
                                <Text style={styles.statMainValue}>₹{totalStats.total.toLocaleString()}</Text>
                            </View>
                            <View style={styles.secondaryStatsRow}>
                                <View style={styles.statCard}>
                                    <Text style={styles.statCardLabel}>AVG / TRIP</Text>
                                    <Text style={styles.statCardValue}>₹{Math.round(totalStats.avg).toLocaleString()}</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statCardLabel}>MAX SINGLE</Text>
                                    <Text style={styles.statCardValue}>₹{totalStats.highest.toLocaleString()}</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statCardLabel}>RECORDS</Text>
                                    <Text style={styles.statCardValue}>{expenses.length}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <Text style={styles.sectionHeader}>Individual Audits</Text>

                    {loading ? (
                        <View style={styles.centerBox}>
                            <ActivityIndicator size="large" color="#4F46E5" />
                            <Text style={styles.activityText}>Compiling financial data...</Text>
                        </View>
                    ) : expenses.length === 0 ? (
                        <View style={styles.centerBox}>
                            <View style={styles.emptyIconBox}>
                                <AlertCircle size={40} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyTitle}>Clear Audit Log</Text>
                            <Text style={styles.emptySubtitle}>No financial records from completed trips yet. Click the + button to record new expenses.</Text>
                        </View>
                    ) : (
                        expenses.map((expense) => (
                            <View key={expense._id} style={styles.expenseCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.tripBadge}>
                                        <Hash size={12} color="#4F46E5" />
                                        <Text style={styles.tripBadgeText}>{expense.tripId?.tripId || "TRIP"}</Text>
                                    </View>
                                    <Text style={styles.cardDate}>{formatDate(expense.date)}</Text>
                                </View>

                                <View style={styles.cardMain}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.totalLabel}>Total Consolidated Amount</Text>
                                        <Text style={styles.totalValue}>₹{expense.totalAmount.toLocaleString()}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteExpense(expense._id)}
                                    >
                                        <Trash2 size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.itemsGrid}>
                                    {expense.fuel > 0 && <ExpenseItem label="Fuel" value={expense.fuel} color="#3B82F6" />}
                                    {expense.toll > 0 && <ExpenseItem label="Toll" value={expense.toll} color="#8B5CF6" />}
                                    {expense.maintenance > 0 && <ExpenseItem label="Maintenance" value={expense.maintenance} color="#F59E0B" />}
                                    {expense.food > 0 && <ExpenseItem label="Food" value={expense.food} color="#10B981" />}
                                    {expense.other > 0 && <ExpenseItem label="Other" value={expense.other} color="#64748B" />}
                                </View>

                                <View style={styles.cardFooter}>
                                    <View style={styles.reporterInfo}>
                                        <Text style={styles.footerLabel}>REPORTED BY</Text>
                                        <Text style={styles.footerValue}>{expense.reportedBy}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.viewDetailsBtn}>
                                        <Text style={styles.viewDetailsText}>Audit Details</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* Modern Bottom Sheet Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalIndicator} />
                            <View style={styles.modalHeaderRow}>
                                <Text style={styles.modalTitle}>Record New Expense</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseCircle}>
                                    <Plus size={20} color="#64748B" style={{ transform: [{ rotate: '45deg' }] }} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.inputLabel}>Select Completed Trip</Text>
                                <View style={styles.tripSelector}>
                                    {trips.length === 0 ? (
                                        <View style={styles.noTripsBox}>
                                            <AlertCircle size={20} color="#94A3B8" />
                                            <Text style={styles.noTripsText}>No completed trips available for auditing</Text>
                                        </View>
                                    ) : (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                            {trips.map((item) => (
                                                <TouchableOpacity
                                                    key={item._id}
                                                    style={[
                                                        styles.tripChip,
                                                        formData.tripId === item._id && styles.tripChipActive,
                                                    ]}
                                                    onPress={() => setFormData({ ...formData, tripId: item._id })}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.tripChipText,
                                                            formData.tripId === item._id && styles.tripChipTextActive,
                                                        ]}
                                                    >
                                                        #{item.tripId}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>

                                <Text style={styles.inputLabel}>Enter Amounts (₹)</Text>
                                <View style={styles.formGrid}>
                                    {CATEGORIES.map((cat) => (
                                        <View key={cat} style={styles.formColumn}>
                                            <Text style={styles.gridLabel}>{cat}</Text>
                                            <View style={styles.gridInputWrapper}>
                                                <IndianRupee size={12} color="#94A3B8" />
                                                <TextInput
                                                    style={styles.gridInput}
                                                    placeholder="0.00"
                                                    keyboardType="numeric"
                                                    value={amounts[cat]}
                                                    onChangeText={(text) => setAmounts({ ...amounts, [cat]: text })}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity 
                                    style={[styles.submitButton, loading && { opacity: 0.7 }]} 
                                    onPress={handleAddExpense}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={20} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.submitButtonText}>Commit to Ledger</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
};

const ExpenseItem = ({ label, value, color }: any) => (
    <View style={styles.itemBubble}>
        <View style={[styles.itemDot, { backgroundColor: color }]} />
        <Text style={styles.itemLabel}>{label}:</Text>
        <Text style={styles.itemValue}>₹{value.toLocaleString()}</Text>
    </View>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#fff" },
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    
    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    headerIconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F8FAFC", justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 11, fontWeight: "600", color: "#64748B", textTransform: 'uppercase', letterSpacing: 0.5 },
    headerAddBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#4F46E5", justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },

    scrollContainer: { padding: 20, paddingBottom: 100 },
    
    // Stats Section
    statsContainer: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 10,
    },
    primaryStat: { alignItems: 'center', marginBottom: 20 },
    statLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    statMainValue: { fontSize: 32, fontWeight: "900", color: "#0F172A" },
    secondaryStatsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: "#F8FAFC", padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: "#F1F5F9" },
    statCardLabel: { fontSize: 9, fontWeight: "800", color: "#94A3B8", marginBottom: 2 },
    statCardValue: { fontSize: 13, fontWeight: "700", color: "#1E293B" },

    sectionHeader: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginBottom: 16 },

    // Expense Card
    expenseCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    tripBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    tripBadgeText: { fontSize: 12, fontWeight: "700", color: "#4F46E5" },
    cardDate: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
    
    cardMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    totalLabel: { fontSize: 12, color: "#64748B", fontWeight: "600", marginBottom: 2 },
    totalValue: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
    deleteBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FEF2F2", justifyContent: 'center', alignItems: 'center' },

    itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
    itemBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#F8FAFC", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: "#F1F5F9" },
    itemDot: { width: 6, height: 6, borderRadius: 3 },
    itemLabel: { fontSize: 11, fontWeight: "600", color: "#64748B" },
    itemValue: { fontSize: 11, fontWeight: "800", color: "#1E293B" },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reporterInfo: { flex: 1 },
    footerLabel: { fontSize: 9, fontWeight: "800", color: "#CBD5E1", letterSpacing: 0.5 },
    footerValue: { fontSize: 13, fontWeight: "700", color: "#64748B" },
    viewDetailsBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#F8FAFC", borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0" },
    viewDetailsText: { fontSize: 12, fontWeight: "700", color: "#475569" },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, maxHeight: "90%" },
    modalIndicator: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
    modalCloseCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", justifyContent: 'center', alignItems: 'center' },
    
    inputLabel: { fontSize: 12, fontWeight: "800", color: "#1E293B", textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    tripSelector: { marginBottom: 24 },
    noTripsBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: "#F8FAFC", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#F1F5F9" },
    noTripsText: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
    tripChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
    tripChipActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
    tripChipText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
    tripChipTextActive: { color: "#fff" },

    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    formColumn: { width: (width - 60) / 2, backgroundColor: "#F8FAFC", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#F1F5F9" },
    gridLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8", textTransform: 'uppercase', marginBottom: 6 },
    gridInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    gridInput: { flex: 1, fontSize: 16, fontWeight: "800", color: "#0F172A", padding: 0 },

    submitButton: { backgroundColor: "#4F46E5", paddingVertical: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
    submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

    // Misc
    centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    activityText: { marginTop: 12, fontSize: 14, color: "#94A3B8", fontWeight: "600" },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#fff", justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: "#64748B", textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});

export default ExpensesScreen;
