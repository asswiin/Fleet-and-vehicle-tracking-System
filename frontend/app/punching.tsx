import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
} from "lucide-react-native";
import { useState, useEffect, useCallback } from "react";
import { api, Driver } from "../utils/api";

interface PunchRecord {
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
}

const PunchingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const driverId = params.driverId as string;

  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [punchHistory, setPunchHistory] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchDriver();
    fetchPunchHistory();
  }, []);

  const fetchDriver = async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      const res = await api.getDriver(driverId);
      if (res.ok && res.data) {
        setDriverData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPunchHistory = async () => {
    if (!driverId) return;
    try {
      const res = await api.getPunchHistory(driverId);
      if (res.ok && res.data) {
        // Ensure data is array
        const history = Array.isArray(res.data) ? res.data : [];
        setPunchHistory(history);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- ROBUST DATE COMPARISON HELPER ---
  const isSameDay = (d1: Date, d2String: string) => {
    if (!d2String) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2String);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isPunchedInOnDate = (date: Date): boolean => {
    return punchHistory.some((record) => {
      // Check if dates match AND punchInTime is present/truthy
      return isSameDay(date, record.date) && !!record.punchInTime;
    });
  };

  const isPunchedOutOnDate = (date: Date): boolean => {
    return punchHistory.some((record) => {
      // Check if dates match AND punchOutTime is present/truthy
      return isSameDay(date, record.date) && !!record.punchOutTime;
    });
  };

  const getPunchInTimeForDate = (date: Date): string | null => {
    const record = punchHistory.find((r) => isSameDay(date, r.date));
    if (record?.punchInTime) {
      return new Date(record.punchInTime).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return null;
  };

  const getPunchOutTimeForDate = (date: Date): string | null => {
    const record = punchHistory.find((r) => isSameDay(date, r.date));
    if (record?.punchOutTime) {
      return new Date(record.punchOutTime).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return null;
  };

  const handlePunch = async () => {
    if (!driverId) return;

    try {
      setPunchLoading(true);
      const res = await api.punchDriver(driverId);

      if (res.ok) {
        // Immediately fetch fresh data to update UI
        await fetchPunchHistory(); 
        await fetchDriver();
        Alert.alert("Success", "Punched in successfully!");
      } else {
        Alert.alert("Info", res.error || "Could not punch in");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to punch in");
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!driverId) return;

    try {
      setPunchLoading(true);
      const res = await api.punchOutDriver(driverId);

      if (res.ok) {
        // Immediately fetch fresh data to update UI
        await fetchPunchHistory();
        await fetchDriver();
        Alert.alert("Success", "Punched out successfully! Shift Ended.");
      } else {
        Alert.alert("Info", res.error || "Could not punch out");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to punch out");
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePrevDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (newDate > new Date()) {
      setSelectedDate(new Date());
    } else {
      setSelectedDate(newDate);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const driverName = driverData?.name || "Driver";
  const initials = driverName.substring(0, 2).toUpperCase();

  const dateDisplay = selectedDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Calculate status states for clearer rendering logic
  const punchedIn = isPunchedInOnDate(selectedDate);
  const punchedOut = isPunchedOutOnDate(selectedDate);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Punching Record</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Driver Card */}
        <View style={styles.driverCard}>
          <View style={styles.avatar}>
            {driverData?.profilePhoto ? (
              <Image
                source={{ uri: api.getImageUrl(driverData.profilePhoto) || undefined }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.driverDetail}>{driverData?.license || "License"}</Text>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={handlePrevDate} style={styles.dateButton}>
            <ChevronLeft size={24} color="#2563EB" />
          </TouchableOpacity>

          <View style={styles.dateInfo}>
            <Text style={styles.dateText}>{dateDisplay}</Text>
            {isToday(selectedDate) && (
              <Text style={styles.todayBadge}>Today</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleNextDate}
            disabled={isToday(selectedDate)}
            style={[
              styles.dateButton,
              isToday(selectedDate) && { opacity: 0.5 },
            ]}
          >
            <ChevronRight size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            punchedOut
              ? styles.statusCompleted
              : punchedIn
              ? styles.statusPunched
              : styles.statusNotPunched,
          ]}
        >
          <View style={styles.statusContent}>
            {punchedOut ? (
              <>
                <CheckCircle size={48} color="#10B981" strokeWidth={1.5} />
                <Text style={styles.statusTitle}>Shift Completed</Text>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>In: {getPunchInTimeForDate(selectedDate)}</Text>
                  <Text style={styles.timeLabel}>Out: {getPunchOutTimeForDate(selectedDate)}</Text>
                </View>
              </>
            ) : punchedIn ? (
              <>
                <CheckCircle size={48} color="#F59E0B" strokeWidth={1.5} />
                <Text style={styles.statusTitle}>Punched In</Text>
                <Text style={styles.punchTimeText}>At {getPunchInTimeForDate(selectedDate)}</Text>
              </>
            ) : (
              <>
                <Circle size={48} color="#CBD5E1" strokeWidth={1.5} />
                <Text style={styles.statusTitle}>Not Punched</Text>
                <Text style={styles.statusSubtitle}>
                  {isToday(selectedDate)
                    ? "Click below to punch in"
                    : "No punch recorded for this date"}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Action Buttons - Only show for today */}
        {isToday(selectedDate) && (
          <View style={styles.buttonContainer}>
            
            {/* PUNCH IN Button */}
            {/* Disabled if: Loading OR Already Punched In */}
            <TouchableOpacity
              style={[
                styles.punchButton,
                (punchLoading || punchedIn) && styles.punchButtonDisabled,
                { flex: 1, marginRight: 10 },
              ]}
              onPress={handlePunch}
              disabled={punchLoading || punchedIn}
              activeOpacity={0.8}
            >
              {punchLoading && !punchedIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.punchButtonText}>
                   {punchedIn ? "PUNCHED IN" : "PUNCH IN"}
                </Text>
              )}
            </TouchableOpacity>

            {/* PUNCH OUT Button */}
            {/* Disabled if: Loading OR Not Punched In OR Already Punched Out */}
            <TouchableOpacity
              style={[
                styles.punchOutButton,
                (punchLoading || !punchedIn || punchedOut) && styles.punchOutButtonDisabled,
                { flex: 1, marginLeft: 10 },
              ]}
              onPress={handlePunchOut}
              disabled={punchLoading || !punchedIn || punchedOut}
              activeOpacity={0.8}
            >
              {punchLoading && punchedIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.punchOutButtonText}>
                   {punchedOut ? "SHIFT ENDED" : "PUNCH OUT"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        {isToday(selectedDate) && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Punch in to mark yourself as "Available" on the dashboard. Punch out when your shift ends.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },

  scrollContent: { padding: 20, paddingBottom: 100 },
  container: { flex: 1 },

  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40, resizeMode: "cover" },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#fff" },
  driverName: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  driverDetail: { fontSize: 14, color: "#64748B" },

  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateButton: { padding: 8 },
  dateInfo: { alignItems: "center", flex: 1 },
  dateText: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  todayBadge: { fontSize: 11, fontWeight: "600", color: "#10B981", marginTop: 4 },

  statusCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  statusPunched: { backgroundColor: "#ECFDF5", borderLeftWidth: 4, borderLeftColor: "#10B981" },
  statusCompleted: { backgroundColor: "#DBEAFE", borderLeftWidth: 4, borderLeftColor: "#0EA5E9" },
  statusNotPunched: { backgroundColor: "#F8FAFC", borderLeftWidth: 4, borderLeftColor: "#CBD5E1" },
  statusContent: { alignItems: "center" },
  statusTitle: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginTop: 12, marginBottom: 4 },
  statusSubtitle: { fontSize: 14, color: "#64748B", textAlign: "center" },
  punchTimeText: { fontSize: 14, color: "#10B981", fontWeight: "600" },
  timeRow: { marginTop: 8, alignItems: "center" },
  timeLabel: { fontSize: 13, color: "#475569", fontWeight: "500", marginTop: 4 },

  buttonContainer: { flexDirection: "row", marginBottom: 16 },
  punchButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  punchButtonDisabled: { opacity: 0.5, backgroundColor: "#94A3B8" }, // Visual feedback for disabled
  punchButtonText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },

  punchOutButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  punchOutButtonDisabled: { opacity: 0.5, backgroundColor: "#94A3B8" }, // Visual feedback for disabled
  punchOutButtonText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },

  infoBox: {
    backgroundColor: "#E0E7FF",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
  },
  infoText: { fontSize: 12, color: "#1E40AF", lineHeight: 18 },
});

export default PunchingScreen;