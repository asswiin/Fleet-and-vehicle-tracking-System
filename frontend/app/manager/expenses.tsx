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
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import {
    ChevronLeft,
    DollarSign,
    Calendar,
    IndianRupee,
    Plus,
    Trash2,
    AlertCircle,
    Hash,
    Filter,
} from "lucide-react-native";
import { api } from "../../utils/api";

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
                setExpenses(res.data);
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
            Alert.alert("Error", "Please select a trip");
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
                Alert.alert("Success", "Expenses saved successfully");
                setModalVisible(false);
                setAmounts({
                    Fuel: "",
                    Toll: "",
                    Maintenance: "",
                    Food: "",
                    Other: "",
                });
                setFormData({
                    ...formData,
                    tripId: "",
                });
                fetchExpenses(true);
            } else {
                Alert.alert("Error", res.error || "Failed to save expenses");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to save expenses");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExpense = (id: string) => {
        Alert.alert("Delete Expense", "Are you sure you want to delete this expense record?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        const res = await api.deleteExpense(id);
                        if (res.ok) {
                            fetchExpenses(true);
                        }
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

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={28} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Trip Expenses</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <Plus size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#2563EB" />
                            <Text style={styles.loadingText}>Loading expenses...</Text>
                        </View>
                    ) : expenses.filter(e => e.tripId?.status === "completed").length === 0 ? (
                        <View style={styles.centerContainer}>
                            <DollarSign size={48} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Completed Trip Expenses</Text>
                            <Text style={styles.emptySubtitle}>Only expenses from completed trips are shown here.</Text>
                        </View>
                    ) : (
                        expenses
                            .filter((e) => e.tripId?.status === "completed")
                            .map((expense) => (
                            <View key={expense._id} style={styles.expenseCard}>
                                <View style={styles.expenseMain}>
                                    <View style={styles.expenseHeader}>
                                        <View style={styles.categoryBadge}>
                                            <Text style={styles.categoryText}>Consolidated</Text>
                                        </View>
                                        <Text style={styles.expenseAmount}>₹{expense.totalAmount.toLocaleString()}</Text>
                                    </View>

                                    {/* Breakdown Grid */}
                                    <View style={styles.breakdownGrid}>
                                        {expense.fuel > 0 && <Text style={styles.breakdownText}>Fuel: ₹{expense.fuel}</Text>}
                                        {expense.toll > 0 && <Text style={styles.breakdownText}>Toll: ₹{expense.toll}</Text>}
                                        {expense.maintenance > 0 && <Text style={styles.breakdownText}>Maint: ₹{expense.maintenance}</Text>}
                                        {expense.food > 0 && <Text style={styles.breakdownText}>Food: ₹{expense.food}</Text>}
                                        {expense.other > 0 && <Text style={styles.breakdownText}>Other: ₹{expense.other}</Text>}
                                    </View>

                                    <View style={styles.expenseDetails}>
                                        <View style={styles.detailItem}>
                                            <Hash size={14} color="#64748B" />
                                            <Text style={styles.detailText}>Trip: {expense.tripId?.tripId || "N/A"}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Calendar size={14} color="#64748B" />
                                            <Text style={styles.detailText}>{formatDate(expense.date)}</Text>
                                        </View>
                                    </View>


                                    <View style={styles.expenseFooter}>
                                        <Text style={styles.reporterText}>By {expense.reportedBy}</Text>
                                        <TouchableOpacity onPress={() => handleDeleteExpense(expense._id)}>
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* Add Expense Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add New Expense</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text style={styles.closeBtn}>Close</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalForm}>
                                <Text style={styles.label}>Select Trip *</Text>
                                <View style={styles.tripSelector}>
                                    {trips.length === 0 ? (
                                        <Text style={styles.noTripsText}>No completed trips found</Text>
                                    ) : (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {trips.map((item) => (
                                                <TouchableOpacity
                                                    key={item._id}
                                                    style={[
                                                        styles.tripOption,
                                                        formData.tripId === item._id && styles.tripOptionActive,
                                                    ]}
                                                    onPress={() => setFormData({ ...formData, tripId: item._id })}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.tripOptionText,
                                                            formData.tripId === item._id && styles.tripOptionTextActive,
                                                        ]}
                                                    >
                                                        {item.tripId}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>

                                <Text style={styles.label}>Expenses (₹)</Text>
                                <View style={styles.expenseGrid}>
                                    {CATEGORIES.map((cat) => (
                                        <View key={cat} style={styles.expenseColumn}>
                                            <Text style={styles.columnLabel}>{cat}</Text>
                                            <TextInput
                                                style={styles.columnInput}
                                                placeholder="0.00"
                                                keyboardType="numeric"
                                                value={amounts[cat]}
                                                onChangeText={(text) => setAmounts({ ...amounts, [cat]: text })}
                                            />
                                        </View>
                                    ))}
                                </View>


                                <TouchableOpacity style={styles.submitBtn} onPress={handleAddExpense}>
                                    <Text style={styles.submitBtnText}>Save Expense</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#2563EB",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    content: { padding: 20 },

    // Card
    expenseCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 2,
        overflow: "hidden",
    },
    expenseMain: { padding: 16 },
    expenseHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    categoryBadge: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#475569",
        textTransform: "uppercase",
    },
    expenseAmount: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0F172A",
    },
    expenseDetails: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 10,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    detailText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748B",
    },
    expenseFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        paddingTop: 12,
    },
    breakdownGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
        marginBottom: 12,
    },
    breakdownText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    reporterText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#94A3B8",
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: "85%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
    closeBtn: { fontSize: 16, fontWeight: "600", color: "#2563EB" },
    modalForm: {},
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 16,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: "#0F172A",
    },
    tripSelector: { marginBottom: 4 },
    tripOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: "#F1F5F9",
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    tripOptionActive: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    tripOptionText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
    tripOptionTextActive: { color: "#fff" },
    noTripsText: { fontSize: 13, color: "#94A3B8", fontStyle: "italic" },
    expenseGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 4,
    },
    expenseColumn: {
        width: "47%",
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 10,
    },
    columnLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#64748B",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    columnInput: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        padding: 0,
    },
    submitBtn: {
        backgroundColor: "#2563EB",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 24,
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

    // Center
    centerContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 100,
    },
    loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: "#94A3B8", marginTop: 6, textAlign: "center" },
});

export default ExpensesScreen;
