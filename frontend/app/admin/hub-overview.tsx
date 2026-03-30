import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
    Image,
    Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import {
    ChevronLeft,
    Bell,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Briefcase,
    ChevronDown,
    LayoutGrid,
    CalendarDays,
    Settings2,
    X,
    TrendingUp,
    TrendingDown,
    Activity,
    Wallet,
} from "lucide-react-native";
import { api } from "../../utils/api";

const { width } = Dimensions.get("window");

type TimeFilter = "This Month" | "Last Month" | "YTD" | "Custom";

const HubOverview = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("This Month");

    const [parcels, setParcels] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [tripExpenses, setTripExpenses] = useState<any[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const fetchData = async () => {
        try {
            setLoading(true);
            const [historyRes, servicesRes, tripExpensesRes] = await Promise.all([
                api.getAllHistory(), // Use delivered history for revenue
                api.getAllVehicleServices(),
                api.getExpenses(),
            ]);

            if (historyRes.ok) {
                const allParcels = historyRes.data || [];
                console.log("📦 Parcels fetched:", allParcels.length, allParcels);
                setParcels(Array.isArray(allParcels) ? allParcels : []);
            }
            if (servicesRes.ok) {
                const allServices = servicesRes.data || [];
                console.log("🔧 Services fetched:", allServices.length, allServices);
                setServices(Array.isArray(allServices) ? allServices : []);
            }
            if (tripExpensesRes.ok) {
                const allExpenses = tripExpensesRes.data || [];
                console.log("💰 Expenses fetched:", allExpenses.length, allExpenses);
                setTripExpenses(Array.isArray(allExpenses) ? allExpenses : []);
            }
        } catch (error) {
            console.error("Error fetching hub data:", error);
            // Set empty arrays on error
            setParcels([]);
            setServices([]);
            setTripExpenses([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    // Filter Data based on TimeFilter
    const filteredStats = useMemo(() => {
        const getNumericAmount = (...values: any[]) => {
            for (const value of values) {
                const parsed = Number(value);
                if (!isNaN(parsed)) return parsed;
            }
            return 0;
        };

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Deduplicate parcels to fix "Inaccurate March" (Duplicate history entries)
        // We use a Map to keep only one entry per trip-parcel combination
        const uniqueParcels = Array.from(new Map(parcels.map(p => [`${p.tripId}-${p.trackId}`, p])).values());

        let filteredParcels = uniqueParcels;
        let filteredServices = services;
        let filteredExpenses = tripExpenses;

        if (timeFilter === "This Month") {
            filteredParcels = uniqueParcels.filter((p) => {
                const d = new Date(p.reachedTime);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            filteredServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            filteredExpenses = tripExpenses.filter((e) => {
                const d = new Date(e.date || e.createdAt);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
        } else if (timeFilter === "Last Month") {
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            filteredParcels = uniqueParcels.filter((p) => {
                const d = new Date(p.reachedTime);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            });
            filteredServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            });
            filteredExpenses = tripExpenses.filter((e) => {
                const d = new Date(e.date || e.createdAt);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            });
        } else if (timeFilter === "YTD") {
            filteredParcels = uniqueParcels.filter((p) => {
                const d = new Date(p.reachedTime);
                return d.getFullYear() === currentYear;
            });
            filteredServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getFullYear() === currentYear;
            });
            filteredExpenses = tripExpenses.filter((e) => {
                const d = new Date(e.date || e.createdAt);
                return d.getFullYear() === currentYear;
            });
        } else if (timeFilter === "Custom") {
            filteredParcels = uniqueParcels.filter((p) => {
                const d = new Date(p.reachedTime);
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            });
            filteredServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            });
            filteredExpenses = tripExpenses.filter((e) => {
                const d = new Date(e.date || e.createdAt);
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            });
        }

        const currentRevenue = filteredParcels.reduce(
            (acc, p) => acc + getNumericAmount(p.parcelDetails?.amount, p.amount, p.totalAmount, p.parcelAmount),
            0
        );
        const currentServices = filteredServices.reduce(
            (acc, s) => acc + getNumericAmount(s.totalServiceCost, s.cost, s.amount),
            0
        );
        const currentTripExp = filteredExpenses.reduce(
            (acc, e) => acc + getNumericAmount(e.totalAmount, e.amount, e.expenseAmount),
            0
        );

        const totalExpenses = currentServices + currentTripExp;

        console.log(`📊 ${timeFilter}: Revenue=${currentRevenue}, Services=${currentServices}, TripExp=${currentTripExp}, Total Exp=${totalExpenses}`);

        // Calculate Last Month stats specifically for comparison
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const lastMonthParcels = uniqueParcels.filter((p) => {
            const d = new Date(p.reachedTime);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });
        const lastMonthServices = services.filter((s) => {
            const d = new Date(s.createdAt || s.dateOfIssue);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });
        const lastMonthTripExpenses = tripExpenses.reduce((acc, exp) => {
            const d = new Date(exp.date || exp.createdAt);
            if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
                return acc + getNumericAmount(exp.totalAmount, exp.amount, exp.expenseAmount);
            }
            return acc;
        }, 0);

        const lastMonthRevenue = lastMonthParcels.reduce(
            (acc, p) => acc + getNumericAmount(p.parcelDetails?.amount, p.amount, p.totalAmount, p.parcelAmount),
            0
        );
        const lastMonthExp = lastMonthServices.reduce(
            (acc, s) => acc + getNumericAmount(s.totalServiceCost, s.cost, s.amount),
            0
        ) + lastMonthTripExpenses;

        return {
            revenue: currentRevenue,
            expenses: totalExpenses,
            profit: currentRevenue - totalExpenses,
            tripExpenses: currentTripExp,
            serviceExpenses: currentServices,
            lastMonthRevenue,
            lastMonthExpenses: lastMonthExp,
            lastMonthProfit: lastMonthRevenue - lastMonthExp
        };
    }, [parcels, services, tripExpenses, timeFilter, selectedMonth, selectedYear]);

    // Chart Data Generation (Last 6 Months)
    const chartData = useMemo(() => {
        const getNumericAmount = (...values: any[]) => {
            for (const value of values) {
                const parsed = Number(value);
                if (!isNaN(parsed)) return parsed;
            }
            return 0;
        };

        const lastSixMonths = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            lastSixMonths.push({
                month: d.toLocaleString("default", { month: "short" }),
                monthIdx: d.getMonth(),
                year: d.getFullYear(),
            });
        }

        return lastSixMonths.map((m) => {
            const monthParcels = parcels.filter((p) => {
                const d = new Date(p.reachedTime);
                return d.getMonth() === m.monthIdx && d.getFullYear() === m.year;
            });
            const monthServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getMonth() === m.monthIdx && d.getFullYear() === m.year;
            });

            const income = monthParcels.reduce(
                (acc, p) => acc + getNumericAmount(p.parcelDetails?.amount, p.amount, p.totalAmount, p.parcelAmount),
                0
            );
            const servExpenses = monthServices.reduce(
                (acc, s) => acc + getNumericAmount(s.totalServiceCost, s.cost, s.amount),
                0
            );
            const tripExp = tripExpenses.reduce((acc, exp) => {
                const d = new Date(exp.date || exp.createdAt);
                if (d.getMonth() === m.monthIdx && d.getFullYear() === m.year) {
                    return acc + getNumericAmount(exp.totalAmount, exp.amount, exp.expenseAmount);
                }
                return acc;
            }, 0);

            return {
                label: `${m.month}`,
                income,
                expenses: servExpenses + tripExp,
            };
        });
    }, [parcels, services, tripExpenses]);

    const maxChartValue = Math.max(
        ...chartData.map((d) => Math.max(d.income, d.expenses)),
        1000 // min scale
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Professional Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <ChevronLeft size={24} color="#1E293B" />
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>Financial Analytics</Text>
                        <Text style={styles.headerSubtitle}>Mukkam Branch Hub</Text>
                    </View>

                    <TouchableOpacity style={styles.notificationButton}>
                        <Bell size={22} color="#1E293B" />
                        <View style={styles.notificationBadge} />
                    </TouchableOpacity>
                </View>

                {/* Date Selection Strip */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterStrip}
                >
                    <TouchableOpacity
                        style={[styles.filterChip, timeFilter === "This Month" && styles.filterChipActive]}
                        onPress={() => setTimeFilter("This Month")}
                    >
                        <Text style={[styles.filterChipText, timeFilter === "This Month" && styles.filterChipTextActive]}>
                            This Month
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, timeFilter === "Last Month" && styles.filterChipActive]}
                        onPress={() => setTimeFilter("Last Month")}
                    >
                        <Text style={[styles.filterChipText, timeFilter === "Last Month" && styles.filterChipTextActive]}>
                            Last Month
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, timeFilter === "YTD" && styles.filterChipActive]}
                        onPress={() => setTimeFilter("YTD")}
                    >
                        <Text style={[styles.filterChipText, timeFilter === "YTD" && styles.filterChipTextActive]}>
                            YTD
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.filterChip, styles.customChip, timeFilter === "Custom" && styles.filterChipActive]}
                        onPress={() => setShowPicker(true)}
                    >
                        <CalendarDays size={16} color={timeFilter === "Custom" ? "#fff" : "#6366F1"} />
                        <Text style={[styles.filterChipText, timeFilter === "Custom" && styles.filterChipTextActive, { marginLeft: 6 }]}>
                            {timeFilter === "Custom"
                                ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedMonth]} ${selectedYear}`
                                : "Custom"
                            }
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Balance Card */}
                <View style={styles.mainBalanceCard}>
                    <View style={styles.balanceHeader}>
                        <View>
                            <Text style={styles.balanceLabel}>Net Monthly Profit</Text>
                            <Text style={styles.balanceValue}>₹{filteredStats.profit.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.balanceIconContainer}>
                            <TrendingUp size={24} color="#10B981" />
                        </View>
                    </View>

                    <View style={styles.balanceDivider} />

                    <View style={styles.balanceStatsStrip}>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatLabel}>Income</Text>
                            <Text style={[styles.miniStatValue, { color: '#10B981' }]}>+₹{filteredStats.revenue.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatLabel}>Expenses</Text>
                            <Text style={[styles.miniStatValue, { color: '#EF4444' }]}>-₹{filteredStats.expenses.toLocaleString('en-IN')}</Text>
                        </View>
                    </View>
                </View>

                {/* Secondary Metrics */}
                <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                        <View style={[styles.metricIcon, { backgroundColor: '#EEF2FF' }]}>
                            <Wallet size={18} color="#6366F1" />
                        </View>
                        <Text style={styles.metricLabel}>Last Month Revenue</Text>
                        <Text style={styles.metricValue}>₹{filteredStats.lastMonthRevenue.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <View style={[styles.metricIcon, { backgroundColor: '#FFF7ED' }]}>
                            <TrendingDown size={18} color="#EA580C" />
                        </View>
                        <Text style={styles.metricLabel}>Last Month Expense</Text>
                        <Text style={styles.metricValue}>₹{filteredStats.lastMonthExpenses.toLocaleString('en-IN')}</Text>
                    </View>
                </View>

                {/* Performance Comparison */}
                <View style={[styles.glassCard, { marginBottom: 16 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Performance Snapshot</Text>
                            <Text style={styles.cardSubtitle}>Current vs Last Month Profit</Text>
                        </View>
                    </View>

                    <View style={styles.comparisonTrack}>
                        <View style={styles.compRow}>
                            <Text style={styles.compLabel}>Current Selection</Text>
                            <Text style={[styles.compValue, { color: filteredStats.profit >= 0 ? '#10B981' : '#EF4444' }]}>
                                ₹{filteredStats.profit.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={styles.compRow}>
                            <Text style={styles.compLabel}>Last Month</Text>
                            <Text style={[styles.compValue, { color: filteredStats.lastMonthProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                                ₹{filteredStats.lastMonthProfit.toLocaleString('en-IN')}
                            </Text>
                        </View>

                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: '100%', backgroundColor: '#F1F5F9' }]} />
                            <View style={[
                                styles.progressBar,
                                {
                                    width: `${Math.min(100, (filteredStats.profit / (Math.max(filteredStats.profit, filteredStats.lastMonthProfit) || 1)) * 100)}%`,
                                    backgroundColor: '#6366F1'
                                }
                            ]} />
                        </View>
                    </View>
                </View>

                {/* Chart Section */}
                <View style={styles.glassCard}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Earnings Analysis</Text>
                            <Text style={styles.cardSubtitle}>Last 6 Months Performance</Text>
                        </View>
                        <TouchableOpacity style={styles.exportBtn}>
                            <ArrowUpRight size={18} color="#6366F1" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.chartContainer}>
                        <View style={styles.yAxis}>
                            {[1, 2, 3, 4].map((_, i) => (
                                <View key={i} style={styles.gridLine} />
                            ))}
                        </View>

                        <View style={styles.barsArea}>
                            {chartData.map((data, idx) => (
                                <View key={idx} style={styles.barGroup}>
                                    <View style={styles.barStack}>
                                        <View style={[
                                            styles.bar,
                                            styles.expenseBar,
                                            { height: (data.expenses / maxChartValue) * 140 }
                                        ]} />
                                        <View style={[
                                            styles.bar,
                                            styles.incomeBar,
                                            { height: (data.income / maxChartValue) * 140 }
                                        ]} />
                                    </View>
                                    <View style={[styles.monthIndicator, idx === 5 && styles.activeMonthIndicator]}>
                                        <Text style={[styles.monthLabel, idx === 5 && styles.activeMonthLabel]}>{data.label}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.chartLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                            <Text style={styles.legendText}>Gross Revenue</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
                            <Text style={styles.legendText}>Operating Costs</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal
                visible={showPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleRow}>
                                <Settings2 size={20} color="#6366F1" />
                                <Text style={styles.modalTitle}>Select Period</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowPicker(false)}>
                                <X size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.pickerLabel}>Month</Text>
                        <View style={styles.pickerGrid}>
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.pickerItem, selectedMonth === i && styles.pickerItemActive]}
                                    onPress={() => setSelectedMonth(i)}
                                >
                                    <Text style={[styles.pickerItemText, selectedMonth === i && styles.pickerItemTextActive]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.pickerLabel}>Year</Text>
                        <View style={styles.pickerGrid}>
                            {[2024, 2025, 2026].map((y) => (
                                <TouchableOpacity
                                    key={y}
                                    style={[styles.pickerItem, selectedYear === y && styles.pickerItemActive]}
                                    onPress={() => setSelectedYear(y)}
                                >
                                    <Text style={[styles.pickerItemText, selectedYear === y && styles.pickerItemTextActive]}>{y}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() => {
                                setTimeFilter("Custom");
                                setShowPicker(false);
                            }}
                        >
                            <Text style={styles.applyBtnText}>Apply Filter</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F1F5F9" },
    header: {
        backgroundColor: "#fff",
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0F172A",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
        marginTop: 2,
    },
    notificationButton: {
        padding: 8,
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#fff',
    },
    filterStrip: {
        paddingHorizontal: 24,
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    filterChipActive: {
        backgroundColor: "#0F172A",
        borderColor: "#0F172A",
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748B",
    },
    filterChipTextActive: {
        color: "#fff",
    },
    customChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#E0E7FF',
        backgroundColor: '#EEF2FF',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    mainBalanceCard: {
        backgroundColor: "#6366F1",
        borderRadius: 32,
        padding: 24,
        marginBottom: 20,
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    balanceLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: "rgba(255,255,255,0.7)",
        marginBottom: 4,
    },
    balanceValue: {
        fontSize: 32,
        fontWeight: '800',
        color: "#fff",
        letterSpacing: -1,
    },
    balanceIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginBottom: 20,
    },
    balanceStatsStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    miniStat: {
        flex: 1,
    },
    miniStatLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 2,
    },
    miniStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    verticalDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 20,
    },
    metricsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    metricIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    glassCard: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 24,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: '#94A3B8',
    },
    exportBtn: {
        padding: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
    },
    chartContainer: {
        height: 200,
        position: 'relative',
        justifyContent: 'flex-end',
    },
    yAxis: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 40,
        justifyContent: 'space-between',
    },
    gridLine: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    barsArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flex: 1,
        paddingHorizontal: 4,
    },
    barGroup: {
        alignItems: 'center',
        width: 40,
    },
    barStack: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 150,
        width: '100%',
    },
    bar: {
        width: 14,
        borderRadius: 6,
    },
    incomeBar: {
        backgroundColor: "#6366F1",
        zIndex: 2,
    },
    expenseBar: {
        backgroundColor: "#F1F5F9",
        position: 'absolute',
        bottom: 20,
        zIndex: 1,
    },
    monthIndicator: {
        marginTop: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    activeMonthIndicator: {
        backgroundColor: '#EEF2FF',
    },
    monthLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
    },
    activeMonthLabel: {
        color: '#6366F1',
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    comparisonTrack: {
        marginTop: 8,
    },
    compRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    compLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    compValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    progressContainer: {
        height: 8,
        position: 'relative',
        marginTop: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        borderRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 32,
        paddingBottom: 48,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 32,
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0F172A",
        letterSpacing: -0.5,
    },
    pickerLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    pickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 28,
    },
    pickerItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        minWidth: '22%',
        alignItems: 'center',
    },
    pickerItemActive: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    pickerItemText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    pickerItemTextActive: {
        color: '#fff',
    },
    applyBtn: {
        backgroundColor: '#0F172A',
        borderRadius: 20,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    applyBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

export default HubOverview;
