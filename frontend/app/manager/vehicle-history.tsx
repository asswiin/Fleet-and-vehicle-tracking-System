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
    TextInput,
    Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Package,
    MapPin,
    Truck,
    Clock,
    User,
    Search,
    X,
    Filter,
    Navigation,
    CheckCircle,
    AlertCircle,
    ArrowRight,
} from "lucide-react-native";
import { api } from "../../utils/api";

const { width } = Dimensions.get("window");

const VehicleHistoryScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{
        vehicleId?: string;
        vehicleReg?: string;
        vehicleModel?: string;
    }>();

    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempYear, setTempYear] = useState(new Date().getFullYear());
    const [tempMonth, setTempMonth] = useState(new Date().getMonth());
    const [tempDay, setTempDay] = useState<number | null>(null);

    const fetchVehicleHistory = async () => {
        if (!params.vehicleId) return;
        try {
            setLoading(true);
            const res = await api.getVehicleHistory(params.vehicleId);
            if (res.ok && Array.isArray(res.data)) {
                setTrips(res.data);
            }
        } catch (error) {
            console.error("Error fetching vehicle history:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchVehicleHistory();
    }, [params.vehicleId]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchVehicleHistory();
    }, [params.vehicleId]);

    // --- Filtering ---
    const filteredTrips = useMemo(() => {
        let result = trips;
        const q = searchQuery.trim().toLowerCase();

        if (q) {
            result = result.filter((trip) => {
                if (trip.tripId?.toLowerCase().includes(q)) return true;
                if (trip.status?.toLowerCase().includes(q)) return true;
                if (trip.driverId?.name?.toLowerCase().includes(q)) return true;
                if (trip.startLocation?.address?.toLowerCase().includes(q)) return true;
                // Search parcels
                return trip.parcelIds?.some((p: any) => {
                    if (p.trackingId?.toLowerCase().includes(q)) return true;
                    if (p.recipientName?.toLowerCase().includes(q)) return true;
                    if (p.deliveryLocation?.locationName?.toLowerCase().includes(q)) return true;
                    if (p.parcelType?.toLowerCase().includes(q)) return true;
                    if (String(p.weight || "").includes(q)) return true;
                    return false;
                });
            });
        }

        if (selectedDate) {
            const sd = selectedDate;
            result = result.filter((trip) => {
                const d = new Date(trip.completedAt || trip.startedAt || trip.assignedAt || trip.createdAt);
                return (
                    d.getFullYear() === sd.getFullYear() &&
                    d.getMonth() === sd.getMonth() &&
                    d.getDate() === sd.getDate()
                );
            });
        }

        return result;
    }, [trips, searchQuery, selectedDate]);

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedDate(null);
    };

    // --- Status helpers ---
    const getStatusStyle = (status: string) => {
        switch (status) {
            case "completed":
                return { bg: "#DCFCE7", text: "#166534", label: "Completed" };
            case "in-progress":
                return { bg: "#DBEAFE", text: "#1E40AF", label: "In Progress" };
            case "pending":
                return { bg: "#FEF3C7", text: "#92400E", label: "Pending" };
            case "accepted":
                return { bg: "#E0E7FF", text: "#3730A3", label: "Accepted" };
            case "cancelled":
                return { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" };
            case "declined":
                return { bg: "#FEE2E2", text: "#991B1B", label: "Declined" };
            default:
                return { bg: "#F1F5F9", text: "#475569", label: status || "Unknown" };
        }
    };

    const getDeliveryStatusIcon = (status: string) => {
        switch (status) {
            case "delivered":
                return <CheckCircle size={14} color="#16A34A" />;
            case "in-transit":
                return <Navigation size={14} color="#2563EB" />;
            case "failed":
                return <AlertCircle size={14} color="#DC2626" />;
            default:
                return <Clock size={14} color="#94A3B8" />;
        }
    };

    // --- Date helpers ---
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatSelectedDate = (date: Date) => {
        return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const openDatePicker = () => {
        if (selectedDate) {
            setTempYear(selectedDate.getFullYear());
            setTempMonth(selectedDate.getMonth());
            setTempDay(selectedDate.getDate());
        } else {
            const now = new Date();
            setTempYear(now.getFullYear());
            setTempMonth(now.getMonth());
            setTempDay(null);
        }
        setShowDatePicker(true);
    };

    const confirmDate = () => {
        if (tempDay) {
            setSelectedDate(new Date(tempYear, tempMonth, tempDay));
        }
        setShowDatePicker(false);
    };

    const renderCalendar = () => {
        const totalDays = daysInMonth(tempYear, tempMonth);
        const startDay = firstDayOfMonth(tempYear, tempMonth);
        const weeks: (number | null)[][] = [];
        let currentWeek: (number | null)[] = Array(startDay).fill(null);

        for (let day = 1; day <= totalDays; day++) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
        }

        const today = new Date();
        const isToday = (day: number) =>
            day === today.getDate() && tempMonth === today.getMonth() && tempYear === today.getFullYear();

        return weeks.map((week, wi) => (
            <View key={wi} style={styles.calendarRow}>
                {week.map((day, di) => {
                    if (day === null) return <View key={di} style={styles.calendarCell} />;
                    const selected = day === tempDay;
                    return (
                        <TouchableOpacity
                            key={di}
                            style={[
                                styles.calendarCell,
                                selected && styles.calendarCellSelected,
                                isToday(day) && !selected && styles.calendarCellToday,
                            ]}
                            onPress={() => setTempDay(day)}
                        >
                            <Text
                                style={[
                                    styles.calendarDayText,
                                    selected && styles.calendarDayTextSelected,
                                    isToday(day) && !selected && styles.calendarDayTextToday,
                                ]}
                            >
                                {day}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        ));
    };

    // --- Trip Stats ---
    const stats = useMemo(() => {
        const completed = trips.filter((t) => t.status === "completed").length;
        const totalParcels = trips.reduce((sum, t) => sum + (t.parcelIds?.length || 0), 0);
        const totalWeight = trips.reduce((sum, t) => sum + (t.totalWeight || 0), 0);
        const totalKm = trips.reduce((sum, t) => sum + (t.totalDistance || 0), 0);
        return { total: trips.length, completed, totalParcels, totalWeight, totalKm };
    }, [trips]);

    // --- Chronological trip numbering (oldest completed first = #1) ---
    const tripNumberMap = useMemo(() => {
        const sorted = [...trips].sort((a, b) => {
            const dateA = new Date(a.completedAt || a.startedAt || a.acceptedAt || a.assignedAt || a.createdAt).getTime();
            const dateB = new Date(b.completedAt || b.startedAt || b.acceptedAt || b.assignedAt || b.createdAt).getTime();
            return dateA - dateB; // oldest first
        });
        const map = new Map<string, number>();
        sorted.forEach((trip, idx) => map.set(trip._id, idx + 1));
        return map;
    }, [trips]);

    // --- Render Trip Card ---
    const renderTripItem = ({ item }: { item: any }) => {
        const isExpanded = expandedId === item._id;
        const statusStyle = getStatusStyle(item.status);
        const parcelCount = item.parcelIds?.length || 0;
        const destinations = item.deliveryDestinations || [];
        const tripNumber = tripNumberMap.get(item._id) || 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => setExpandedId(isExpanded ? null : item._id)}
            >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <View style={styles.tripNumberBadge}>
                            <Text style={styles.tripNumberText}>{tripNumber}</Text>
                        </View>
                        <View style={styles.tripBadge}>
                            <Text style={styles.tripBadgeText}>TRIP #{item.tripId}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                            {statusStyle.label}
                        </Text>
                    </View>
                </View>

                {/* Date */}
                <Text style={styles.dateText}>
                    {formatDate(item.completedAt || item.startedAt || item.createdAt)}
                </Text>

                {/* Quick Info */}
                <View style={styles.quickInfo}>
                    <View style={styles.quickInfoItem}>
                        <Package size={16} color="#6366F1" />
                        <Text style={styles.quickInfoValue}>
                            {parcelCount} {parcelCount === 1 ? "Parcel" : "Parcels"}
                        </Text>
                    </View>
                    <View style={styles.quickInfoDivider} />
                    <View style={styles.quickInfoItem}>
                        <User size={16} color="#0EA5E9" />
                        <Text style={styles.quickInfoValue} numberOfLines={1}>
                            {item.driverId?.name || "Unassigned"}
                        </Text>
                    </View>
                    {item.totalWeight > 0 && (
                        <>
                            <View style={styles.quickInfoDivider} />
                            <View style={styles.quickInfoItem}>
                                <Truck size={16} color="#F59E0B" />
                                <Text style={styles.quickInfoValue}>{item.totalWeight} Kg</Text>
                            </View>
                        </>
                    )}
                    {item.totalDistance > 0 && (
                        <>
                            <View style={styles.quickInfoDivider} />
                            <View style={styles.quickInfoItem}>
                                <Navigation size={16} color="#10B981" />
                                <Text style={styles.quickInfoValue}>{item.totalDistance} Km</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Route Preview */}
                {item.startLocation?.address && destinations.length > 0 && (
                    <View style={styles.routePreview}>
                        <View style={styles.routePoint}>
                            <View style={[styles.routeDot, { backgroundColor: "#64748B" }]} />
                            <Text style={styles.routeText} numberOfLines={1}>
                                {item.startLocation.address}
                            </Text>
                        </View>
                        <View style={styles.routeLine} />
                        <View style={styles.routePoint}>
                            <View style={[styles.routeDot, { backgroundColor: "#EF4444" }]} />
                            <Text style={styles.routeText} numberOfLines={1}>
                                {destinations[destinations.length - 1]?.locationName || "Destination"}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Expand Arrow */}
                <View style={styles.expandHint}>
                    <ChevronRight
                        size={16}
                        color="#94A3B8"
                        style={{ transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }}
                    />
                    <Text style={styles.expandHintText}>
                        {isExpanded ? "Tap to collapse" : "Tap for details"}
                    </Text>
                </View>

                {/* Expanded Content */}
                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.divider} />

                        {/* Timeline */}
                        <Text style={styles.sectionTitle}>Trip Timeline</Text>
                        <View style={styles.timeline}>
                            {item.assignedAt && (
                                <View style={styles.timelineItem}>
                                    <View style={[styles.timelineDot, { backgroundColor: "#94A3B8" }]} />
                                    <View style={styles.timelineInfo}>
                                        <Text style={styles.timelineLabel}>Assigned</Text>
                                        <Text style={styles.timelineTime}>{formatDate(item.assignedAt)}</Text>
                                    </View>
                                </View>
                            )}
                            {item.acceptedAt && (
                                <View style={styles.timelineItem}>
                                    <View style={[styles.timelineDot, { backgroundColor: "#3B82F6" }]} />
                                    <View style={styles.timelineInfo}>
                                        <Text style={styles.timelineLabel}>Accepted</Text>
                                        <Text style={styles.timelineTime}>{formatDate(item.acceptedAt)}</Text>
                                    </View>
                                </View>
                            )}
                            {item.startedAt && (
                                <View style={styles.timelineItem}>
                                    <View style={[styles.timelineDot, { backgroundColor: "#2563EB" }]} />
                                    <View style={styles.timelineInfo}>
                                        <Text style={styles.timelineLabel}>Journey Started</Text>
                                        <Text style={styles.timelineTime}>{formatDate(item.startedAt)}</Text>
                                    </View>
                                </View>
                            )}
                            {item.completedAt && (
                                <View style={styles.timelineItem}>
                                    <View style={[styles.timelineDot, { backgroundColor: "#16A34A" }]} />
                                    <View style={styles.timelineInfo}>
                                        <Text style={styles.timelineLabel}>Completed</Text>
                                        <Text style={styles.timelineTime}>{formatDate(item.completedAt)}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Driver Info */}
                        {item.driverId && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.sectionTitle}>Driver</Text>
                                <View style={styles.driverRow}>
                                    <View style={styles.driverAvatar}>
                                        <User size={20} color="#2563EB" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.driverName}>{item.driverId.name}</Text>
                                        {item.driverId.phone && (
                                            <Text style={styles.driverPhone}>{item.driverId.phone}</Text>
                                        )}
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Delivery Destinations */}
                        {destinations.length > 0 && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.sectionTitle}>Deliveries</Text>
                                {destinations.map((dest: any, idx: number) => (
                                    <View key={idx} style={styles.destItem}>
                                        <View style={styles.destHeader}>
                                            <View style={styles.destOrderBadge}>
                                                <Text style={styles.destOrderText}>{dest.order || idx + 1}</Text>
                                            </View>
                                            <Text style={styles.destName} numberOfLines={1}>
                                                {dest.locationName}
                                            </Text>
                                            <View style={styles.destStatusRow}>
                                                {getDeliveryStatusIcon(dest.deliveryStatus)}
                                                <Text
                                                    style={[
                                                        styles.destStatusText,
                                                        {
                                                            color:
                                                                dest.deliveryStatus === "delivered"
                                                                    ? "#16A34A"
                                                                    : dest.deliveryStatus === "failed"
                                                                    ? "#DC2626"
                                                                    : dest.deliveryStatus === "in-transit"
                                                                    ? "#2563EB"
                                                                    : "#94A3B8",
                                                        },
                                                    ]}
                                                >
                                                    {dest.deliveryStatus || "pending"}
                                                </Text>
                                            </View>
                                        </View>
                                        {dest.deliveredAt && (
                                            <Text style={styles.destTime}>
                                                Delivered: {formatDate(dest.deliveredAt)}
                                            </Text>
                                        )}
                                        {dest.notes && (
                                            <Text style={styles.destNotes}>Note: {dest.notes}</Text>
                                        )}
                                    </View>
                                ))}
                            </>
                        )}

                        {/* Parcel Details */}
                        {item.parcelIds && item.parcelIds.length > 0 && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.sectionTitle}>Parcels</Text>
                                {item.parcelIds.map((p: any, idx: number) => (
                                    <View key={p._id || idx} style={styles.parcelItem}>
                                        <View style={styles.parcelHeader}>
                                            <Text style={styles.parcelTrackId}>
                                                {p.trackingId || `Parcel ${idx + 1}`}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.parcelStatusBadge,
                                                    {
                                                        backgroundColor:
                                                            p.status === "Delivered"
                                                                ? "#DCFCE7"
                                                                : p.status === "In Transit"
                                                                ? "#DBEAFE"
                                                                : "#F1F5F9",
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.parcelStatusText,
                                                        {
                                                            color:
                                                                p.status === "Delivered"
                                                                    ? "#166534"
                                                                    : p.status === "In Transit"
                                                                    ? "#1E40AF"
                                                                    : "#475569",
                                                        },
                                                    ]}
                                                >
                                                    {p.status || "Booked"}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.parcelDetails}>
                                            {p.recipientName && (
                                                <View style={styles.pDetail}>
                                                    <Text style={styles.pDetailLabel}>To:</Text>
                                                    <Text style={styles.pDetailValue}>{p.recipientName}</Text>
                                                </View>
                                            )}
                                            {p.parcelType && (
                                                <View style={styles.pDetail}>
                                                    <Text style={styles.pDetailLabel}>Type:</Text>
                                                    <Text style={styles.pDetailValue}>{p.parcelType}</Text>
                                                </View>
                                            )}
                                            {p.weight > 0 && (
                                                <View style={styles.pDetail}>
                                                    <Text style={styles.pDetailLabel}>Weight:</Text>
                                                    <Text style={styles.pDetailValue}>{p.weight} Kg</Text>
                                                </View>
                                            )}
                                        </View>
                                        {p.deliveryLocation?.locationName && (
                                            <View style={styles.parcelLocation}>
                                                <MapPin size={12} color="#94A3B8" />
                                                <Text style={styles.parcelLocationText} numberOfLines={1}>
                                                    {p.deliveryLocation.locationName}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </>
                        )}

                        {/* Notes */}
                        {item.notes && (
                            <View style={styles.notesBox}>
                                <Text style={styles.notesLabel}>Notes:</Text>
                                <Text style={styles.notesText}>{item.notes}</Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ChevronLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Vehicle History</Text>
                    <Text style={styles.headerSubtitle}>
                        {params.vehicleReg} • {params.vehicleModel}
                    </Text>
                </View>
            </View>

            {/* Stats Row */}
            {!loading && trips.length > 0 && (
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Trips</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: "#16A34A" }]}>{stats.completed}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: "#6366F1" }]}>{stats.totalParcels}</Text>
                        <Text style={styles.statLabel}>Parcels</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                            {stats.totalWeight.toFixed(0)}
                        </Text>
                        <Text style={styles.statLabel}>Kg Total</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: "#10B981" }]}>
                            {stats.totalKm.toFixed(1)}
                        </Text>
                        <Text style={styles.statLabel}>Km Total</Text>
                    </View>
                </View>
            )}

            {/* Search & Date Filter */}
            <View style={styles.filterContainer}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Search size={16} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Trip ID, driver, tracking ID, destination…"
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery("")}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <X size={16} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.dateButton, selectedDate && styles.dateButtonActive]}
                        onPress={openDatePicker}
                    >
                        <Calendar size={16} color={selectedDate ? "#fff" : "#2563EB"} />
                        <Text
                            style={[styles.dateButtonText, selectedDate && styles.dateButtonTextActive]}
                        >
                            {selectedDate ? formatSelectedDate(selectedDate) : "Date"}
                        </Text>
                    </TouchableOpacity>
                </View>
                {(searchQuery || selectedDate) && (
                    <View style={styles.activeFiltersRow}>
                        <Filter size={12} color="#64748B" />
                        <Text style={styles.activeFiltersText}>
                            {filteredTrips.length} result{filteredTrips.length !== 1 ? "s" : ""}
                        </Text>
                        <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                            <Text style={styles.clearBtnText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Date Picker Modal */}
            <Modal visible={showDatePicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Date</Text>
                        <View style={styles.monthNav}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (tempMonth === 0) {
                                        setTempMonth(11);
                                        setTempYear(tempYear - 1);
                                    } else setTempMonth(tempMonth - 1);
                                    setTempDay(null);
                                }}
                                style={styles.monthNavBtn}
                            >
                                <ChevronLeft size={20} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.monthNavText}>
                                {monthNames[tempMonth]} {tempYear}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (tempMonth === 11) {
                                        setTempMonth(0);
                                        setTempYear(tempYear + 1);
                                    } else setTempMonth(tempMonth + 1);
                                    setTempDay(null);
                                }}
                                style={styles.monthNavBtn}
                            >
                                <ChevronRight size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.calendarRow}>
                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                                <View key={d} style={styles.calendarCell}>
                                    <Text style={styles.calendarHeaderText}>{d}</Text>
                                </View>
                            ))}
                        </View>
                        {renderCalendar()}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            {selectedDate && (
                                <TouchableOpacity
                                    style={styles.modalClearBtn}
                                    onPress={() => {
                                        setSelectedDate(null);
                                        setShowDatePicker(false);
                                    }}
                                >
                                    <Text style={styles.modalClearText}>Clear Date</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, !tempDay && { opacity: 0.4 }]}
                                onPress={confirmDate}
                                disabled={!tempDay}
                            >
                                <Text style={styles.modalConfirmText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Trip List */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={filteredTrips}
                    keyExtractor={(item) => item._id}
                    renderItem={renderTripItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Truck size={60} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>
                                {searchQuery || selectedDate
                                    ? "No Matching Trips"
                                    : "No Trip History"}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery || selectedDate
                                    ? "Try adjusting your search or date filter."
                                    : "Trips assigned to this vehicle will appear here."}
                            </Text>
                            {(searchQuery || selectedDate) && (
                                <TouchableOpacity onPress={clearFilters} style={styles.emptyResetBtn}>
                                    <Text style={styles.emptyResetText}>Clear Filters</Text>
                                </TouchableOpacity>
                            )}
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        gap: 12,
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
    headerSubtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    // Stats
    statsRow: {
        flexDirection: "row",
        backgroundColor: "#fff",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    statItem: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
    statLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600", marginTop: 2, textTransform: "uppercase" },
    statDivider: { width: 1, backgroundColor: "#E2E8F0" },

    // Filters
    filterContainer: {
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 42,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 13, color: "#1E293B", paddingVertical: 0 },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 12,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    dateButtonActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
    dateButtonText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
    dateButtonTextActive: { color: "#fff" },
    activeFiltersRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
    activeFiltersText: { fontSize: 12, color: "#64748B", flex: 1 },
    clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "#FEE2E2" },
    clearBtnText: { fontSize: 11, fontWeight: "700", color: "#DC2626" },

    // Cards
    listContent: { padding: 16, paddingBottom: 40 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 14,
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
        marginBottom: 6,
    },
    cardHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    tripNumberBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#1E293B",
        justifyContent: "center",
        alignItems: "center",
    },
    tripNumberText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#fff",
    },
    tripBadge: { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tripBadgeText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusBadgeText: { fontSize: 11, fontWeight: "700" },
    dateText: { fontSize: 12, color: "#94A3B8", marginBottom: 12 },

    quickInfo: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    quickInfoItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
    quickInfoValue: { fontSize: 13, color: "#1E293B", fontWeight: "600" },
    quickInfoDivider: { width: 1, height: 20, backgroundColor: "#E2E8F0", marginHorizontal: 8 },

    // Route Preview
    routePreview: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12, marginBottom: 8 },
    routePoint: { flexDirection: "row", alignItems: "center", gap: 8 },
    routeDot: { width: 10, height: 10, borderRadius: 5 },
    routeText: { fontSize: 12, color: "#475569", flex: 1 },
    routeLine: {
        width: 1,
        height: 16,
        backgroundColor: "#CBD5E1",
        marginLeft: 4.5,
        marginVertical: 2,
    },

    expandHint: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "center", marginTop: 4 },
    expandHintText: { fontSize: 11, color: "#94A3B8" },

    // Expanded
    expandedContent: { marginTop: 4 },
    divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 10,
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: "flex-start",
    },

    // Timeline
    timeline: { gap: 0 },
    timelineItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    timelineInfo: {},
    timelineLabel: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
    timelineTime: { fontSize: 11, color: "#94A3B8", marginTop: 1 },

    // Driver
    driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    driverAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    driverName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
    driverPhone: { fontSize: 12, color: "#64748B", marginTop: 2 },

    // Destinations
    destItem: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    destHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    destOrderBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#2563EB",
        justifyContent: "center",
        alignItems: "center",
    },
    destOrderText: { fontSize: 11, fontWeight: "800", color: "#fff" },
    destName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#1E293B" },
    destStatusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    destStatusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
    destTime: { fontSize: 11, color: "#64748B", marginTop: 6, marginLeft: 32 },
    destNotes: { fontSize: 11, color: "#94A3B8", marginTop: 4, marginLeft: 32, fontStyle: "italic" },

    // Parcels
    parcelItem: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    parcelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    parcelTrackId: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
    parcelStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    parcelStatusText: { fontSize: 10, fontWeight: "800" },
    parcelDetails: { flexDirection: "row", gap: 12, marginBottom: 4 },
    pDetail: { flex: 1 },
    pDetailLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600" },
    pDetailValue: { fontSize: 12, color: "#1E293B", fontWeight: "600" },
    parcelLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    parcelLocationText: { fontSize: 11, color: "#64748B" },

    // Notes
    notesBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: "#CBD5E1",
    },
    notesLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", marginBottom: 4 },
    notesText: { fontSize: 13, color: "#334155", fontStyle: "italic" },

    // Empty
    emptyContainer: { flex: 1, height: 400, justifyContent: "center", alignItems: "center" },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#475569", marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: "#94A3B8", marginTop: 4, textAlign: "center", paddingHorizontal: 32 },
    emptyResetBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#EFF6FF", borderRadius: 10 },
    emptyResetText: { fontSize: 14, color: "#2563EB", fontWeight: "700" },

    // Date Picker Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
    modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 20, width: width - 48, maxWidth: 380 },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#1E293B", textAlign: "center", marginBottom: 16 },
    monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    monthNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
    },
    monthNavText: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
    calendarRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 4 },
    calendarCell: { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 20 },
    calendarCellSelected: { backgroundColor: "#2563EB" },
    calendarCellToday: { borderWidth: 1.5, borderColor: "#2563EB" },
    calendarHeaderText: { fontSize: 11, fontWeight: "700", color: "#94A3B8" },
    calendarDayText: { fontSize: 14, color: "#1E293B", fontWeight: "500" },
    calendarDayTextSelected: { color: "#fff", fontWeight: "700" },
    calendarDayTextToday: { color: "#2563EB", fontWeight: "700" },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
    modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    modalCancelText: { fontSize: 14, color: "#64748B", fontWeight: "600" },
    modalClearBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#FEF2F2" },
    modalClearText: { fontSize: 14, color: "#DC2626", fontWeight: "600" },
    modalConfirmBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: "#2563EB" },
    modalConfirmText: { fontSize: 14, color: "#fff", fontWeight: "700" },
});

export default VehicleHistoryScreen;
