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
} from "lucide-react-native";
import { api } from "../../utils/api";

const { width } = Dimensions.get("window");

type TimeFilter = "This Month" | "Last Month" | "YTD";
type ChartFilter = "Daily" | "Weekly" | "Monthly";

const HubOverview = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("This Month");

    const [parcels, setParcels] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [parcelsRes, servicesRes] = await Promise.all([
                api.getParcels(),
                api.getAllVehicleServices(),
            ]);

            if (parcelsRes.ok) setParcels(parcelsRes.data || []);
            if (servicesRes.ok) setServices(servicesRes.data || []);
        } catch (error) {
            console.error("Error fetching hub data:", error);
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
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let filteredParcels = parcels;
        let filteredServices = services;

        if (timeFilter === "This Month") {
            filteredParcels = parcels.filter((p) => {
                const d = new Date(p.createdAt || p.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            filteredServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
        } else if (timeFilter === "Last Month") {
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            filteredParcels = parcels.filter((p) => {
                const d = new Date(p.createdAt || p.date);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            });
            filteredServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            });
        } else if (timeFilter === "YTD") {
            filteredParcels = parcels.filter((p) => {
                const d = new Date(p.createdAt || p.date);
                return d.getFullYear() === currentYear;
            });
            filteredServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getFullYear() === currentYear;
            });
        }

        const totalRevenue = filteredParcels.reduce(
            (acc, p) => acc + (Number(p.paymentAmount) || 0),
            0
        );
        const totalExpenses = filteredServices.reduce(
            (acc, s) => acc + (Number(s.totalServiceCost) || 0),
            0
        );

        return {
            revenue: totalRevenue,
            expenses: totalExpenses,
            profit: totalRevenue - totalExpenses,
        };
    }, [parcels, services, timeFilter]);

    // Chart Data generation - Month-wise (Last 6 months)
    const chartData = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();

        // Create an array for the last 6 months including current
        const lastSixMonths = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            lastSixMonths.push({
                month: months[d.getMonth()],
                monthIdx: d.getMonth(),
                year: d.getFullYear(),
            });
        }

        return lastSixMonths.map((m) => {
            const monthParcels = parcels.filter((p) => {
                const d = new Date(p.createdAt || p.date);
                return d.getMonth() === m.monthIdx && d.getFullYear() === m.year;
            });
            const monthServices = services.filter((s) => {
                const d = new Date(s.createdAt || s.dateOfIssue);
                return d.getMonth() === m.monthIdx && d.getFullYear() === m.year;
            });

            const income = monthParcels.reduce((acc, p) => acc + (Number(p.paymentAmount) || 0), 0);
            const expenses = monthServices.reduce((acc, s) => acc + (Number(s.totalServiceCost) || 0), 0);

            return {
                label: `${m.month}`,
                income,
                expenses,
            };
        });
    }, [parcels, services]);

    const maxChartValue = Math.max(
        ...chartData.map((d) => Math.max(d.income, d.expenses)),
        1000 // min scale
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ChevronLeft size={24} color="#1E293B" />
                </TouchableOpacity>

                <View style={styles.userInfo}>
                    <Text style={styles.headerTitle}>Hub Overview</Text>
                </View>

                <TouchableOpacity style={styles.iconButton}>
                    <Bell size={24} color="#1E293B" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Time Filters */}
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[styles.filterBtn, timeFilter === "This Month" && styles.filterBtnActive]}
                        onPress={() => setTimeFilter("This Month")}
                    >
                        <Text style={[styles.filterText, timeFilter === "This Month" && styles.filterTextActive]}>
                            This Month
                        </Text>
                        <ChevronDown size={16} color={timeFilter === "This Month" ? "#fff" : "#64748B"} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.smallFilterBtn, timeFilter === "Last Month" && styles.filterBtnActive]}
                        onPress={() => setTimeFilter("Last Month")}
                    >
                        <Text style={[styles.filterText, timeFilter === "Last Month" && styles.filterTextActive]}>
                            Last Month
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.smallFilterBtn, timeFilter === "YTD" && styles.filterBtnActive]}
                        onPress={() => setTimeFilter("YTD")}
                    >
                        <Text style={[styles.filterText, timeFilter === "YTD" && styles.filterTextActive]}>
                            YTD
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsGrid}>
                    <View style={styles.statsCard}>
                        <View style={[styles.cardIcon, { backgroundColor: '#E0F2FE' }]}>
                            <DollarSign size={20} color="#0EA5E9" />
                        </View>
                        <Text style={styles.cardLabel}>Total Revenue</Text>
                        <Text style={styles.cardValue}>₹{filteredStats.revenue.toLocaleString('en-IN')}</Text>
                        <View style={styles.trendRow}>
                            {/* Static trend for visual appeal matching the requested design */}
                            <Text style={styles.trendText}>--</Text>
                        </View>
                    </View>

                    <View style={styles.statsCard}>
                        <View style={[styles.cardIcon, { backgroundColor: '#F3E8FF' }]}>
                            <Briefcase size={20} color="#A855F7" />
                        </View>
                        <Text style={styles.cardLabel}>Net Profit</Text>
                        <Text style={styles.cardValue}>₹{filteredStats.profit.toLocaleString('en-IN')}</Text>
                        <View style={styles.trendRow}>
                            <Text style={styles.trendText}>--</Text>
                        </View>
                    </View>
                </View>

                {/* Profit & Loss Chart Section */}
                <View style={styles.chartSection}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Profit & Loss</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeReport}>See Report</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bar Chart */}
                    <View style={styles.chartContainer}>
                        <View style={styles.yAxis}>
                            <View style={styles.gridLine} />
                            <View style={styles.gridLine} />
                            <View style={styles.gridLine} />
                            <View style={styles.gridLine} />
                        </View>

                        <View style={styles.barsArea}>
                            {chartData.map((data, idx) => (
                                <View key={idx} style={styles.barGroup}>
                                    <View style={styles.barStack}>
                                        {/* Expenses bar (Light Blue) */}
                                        <View style={[
                                            styles.bar,
                                            styles.expenseBar,
                                            { height: (data.expenses / maxChartValue) * 120 }
                                        ]} />
                                        {/* Income bar (Blue) */}
                                        <View style={[
                                            styles.bar,
                                            styles.incomeBar,
                                            { height: (data.income / maxChartValue) * 120 }
                                        ]} />
                                    </View>
                                    <Text style={[styles.dayLabel, idx === 5 && styles.activeDay]}>{data.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Legend */}
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#2563EB' }]} />
                            <Text style={styles.legendText}>Income</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#BFDBFE' }]} />
                            <Text style={styles.legendText}>Expenses</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "#F8FAFC",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profilePic: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    filterRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    smallFilterBtn: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    filterBtnActive: {
        backgroundColor: '#2563EB',
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    filterTextActive: {
        color: '#fff',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 32,
    },
    statsCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardLabel: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
    },
    cardValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    chartSection: {
        marginBottom: 24,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    seeReport: {
        color: '#2563EB',
        fontWeight: '600',
        fontSize: 14,
    },
    switcher: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        padding: 4,
        borderRadius: 14,
        marginBottom: 24,
    },
    switchBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    switchBtnActive: {
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    switchText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    switchTextActive: {
        color: '#2563EB',
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        height: 240,
        position: 'relative',
        justifyContent: 'flex-end',
    },
    barsArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flex: 1,
        zIndex: 2,
    },
    barGroup: {
        alignItems: 'center',
        flex: 1,
    },
    barStack: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 20,
        height: 150,
    },
    bar: {
        width: 14,
        borderRadius: 4,
    },
    incomeBar: {
        backgroundColor: '#2563EB',
        zIndex: 2,
    },
    expenseBar: {
        backgroundColor: '#BFDBFE',
        position: 'absolute',
        bottom: 20,
        zIndex: 1,
    },
    dayLabel: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 12,
        fontWeight: '600',
    },
    activeDay: {
        color: '#2563EB',
    },
    yAxis: {
        position: 'absolute',
        top: 24,
        left: 24,
        right: 24,
        bottom: 60,
        justifyContent: 'space-between',
    },
    gridLine: {
        height: 1,
        backgroundColor: '#F1F5F9',
        width: '100%',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginTop: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
});

export default HubOverview;
