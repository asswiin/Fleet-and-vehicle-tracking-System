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
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import {
  ChevronLeft,
  Wrench,
  Calendar,
  Gauge,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Edit2,
  IndianRupee,
} from "lucide-react-native";
import { api } from "../../utils/api";

const ISSUE_COLORS: Record<string, string> = {
  Accident: "#EF4444",
  Mechanical: "#F59E0B",
  Engine: "#8B5CF6",
  Brake: "#EC4899",
  Electrical: "#3B82F6",
  Maintenance: "#10B981",
};

const VehicleServiceHistoryScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    vehicleId?: string;
    vehicleReg?: string;
    vehicleModel?: string;
  }>();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecords = useCallback(async (silent = false) => {
    if (!params.vehicleId) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.getVehicleServiceHistory(params.vehicleId);
      if (res.ok && Array.isArray(res.data)) {
        setRecords(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.vehicleId]);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleMarkCompleted = async (recordId: string) => {
    try {
      const res = await api.updateServiceStatus(recordId, "Completed");
      if (res.ok) {
        fetchRecords(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (item: any) => {
    router.push({
      pathname: "/manager/report-vehicle-service" as any,
      params: {
        vehicleId: params.vehicleId,
        vehicleReg: params.vehicleReg,
        editMode: "true",
        serviceRecordId: item._id,
        existingData: JSON.stringify(item),
      },
    });
  };

  const renderRecord = (item: any) => {
    const issueColor = ISSUE_COLORS[item.issueType] || "#64748B";
    const isActive = item.status === "In-Service";

    return (
      <View key={item._id} style={styles.card}>
        {/* Status strip */}
        <View style={[styles.statusStrip, { backgroundColor: isActive ? "#F59E0B" : "#22C55E" }]} />

        <View style={styles.cardContent}>
          {/* Header row */}
          <View style={styles.cardHeader}>
            <View style={[styles.issueTypeBadge, { backgroundColor: issueColor + "18" }]}>
              <Text style={[styles.issueTypeLabel, { color: issueColor }]}>{item.issueType}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
                <Edit2 size={14} color="#2563EB" />
              </TouchableOpacity>
              <View style={[styles.statusBadge, { backgroundColor: isActive ? "#FEF3C7" : "#DCFCE7" }]}>
                <View style={[styles.statusDot, { backgroundColor: isActive ? "#F59E0B" : "#22C55E" }]} />
                <Text style={[styles.statusLabel, { color: isActive ? "#92400E" : "#166534" }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {item.issueDescription}
          </Text>

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Calendar size={14} color="#64748B" />
              <Text style={styles.infoLabel}>Issue Date</Text>
              <Text style={styles.infoValue}>{formatDate(item.dateOfIssue)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Calendar size={14} color="#64748B" />
              <Text style={styles.infoLabel}>Service Start</Text>
              <Text style={styles.infoValue}>{formatDate(item.serviceStartDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Gauge size={14} color="#64748B" />
              <Text style={styles.infoLabel}>Odometer</Text>
              <Text style={styles.infoValue}>{item.odometerReading?.toLocaleString()} KM</Text>
            </View>
            <View style={styles.infoItem}>
              <MapPin size={14} color="#64748B" />
              <Text style={styles.infoLabel}>Workshop</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{item.workshopName}</Text>
            </View>
            {item.totalServiceCost != null && (
              <View style={styles.infoItem}>
                <IndianRupee size={14} color="#64748B" />
                <Text style={styles.infoLabel}>Service Cost</Text>
                <Text style={styles.infoValue}>₹{item.totalServiceCost.toLocaleString()}</Text>
              </View>
            )}
            {item.serviceCompletionDate && (
              <View style={styles.infoItem}>
                <CheckCircle size={14} color="#22C55E" />
                <Text style={styles.infoLabel}>Completed On</Text>
                <Text style={styles.infoValue}>{formatDate(item.serviceCompletionDate)}</Text>
              </View>
            )}
          </View>

          {/* Mark completed button if still In-Service */}
          {isActive && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleMarkCompleted(item._id)}
            >
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.completeButtonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Service History</Text>
            {params.vehicleReg && (
              <Text style={styles.headerSubtitle}>{params.vehicleReg}</Text>
            )}
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Summary stats */}
        {!loading && records.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{records.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                {records.filter((r) => r.status === "In-Service").length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#22C55E" }]}>
                {records.filter((r) => r.status === "Completed").length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading service history...</Text>
            </View>
          ) : records.length === 0 ? (
            <View style={styles.centerContainer}>
              <Wrench size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Service Records</Text>
              <Text style={styles.emptySubtitle}>
                This vehicle has no service history yet.
              </Text>
            </View>
          ) : (
            records.map(renderRecord)
          )}
        </ScrollView>
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
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  headerSubtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  content: { padding: 20, paddingBottom: 40 },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
  },
  statValue: { fontSize: 20, fontWeight: "700", color: "#1E293B" },
  statLabel: { fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 2 },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusStrip: { width: 5 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  issueTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  issueTypeLabel: { fontSize: 12, fontWeight: "700" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontWeight: "600" },

  description: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 12,
  },

  // Info grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoItem: {
    width: "47%",
    flexDirection: "column",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  infoLabel: { fontSize: 10, fontWeight: "600", color: "#94A3B8", textTransform: "uppercase" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#1E293B" },

  // Complete button
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: "#22C55E",
    borderRadius: 8,
  },
  completeButtonText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  // Loading / Empty
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: "#94A3B8", marginTop: 4 },
});

export default VehicleServiceHistoryScreen;
