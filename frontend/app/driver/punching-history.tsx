import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { ChevronLeft, Calendar, MapPin, ChevronDown } from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { api } from "../../utils/api";

interface PunchRecord {
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
  punchInAddress?: string;
  punchOutAddress?: string;
}

const PunchingHistoryScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const driverId = params.driverId as string;

  const [punchHistory, setPunchHistory] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPunchHistory();
    }, [driverId])
  );

  const fetchPunchHistory = async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      const res = await api.getPunchHistory(driverId);
      if (res.ok && res.data) {
        const history = Array.isArray(res.data) ? res.data : [];
        setPunchHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to fetch punch history");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "---";
    return new Date(timeString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getSelectedDateRecords = () => {
    return punchHistory.filter((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getDate() === selectedDate.getDate() &&
        recordDate.getMonth() === selectedDate.getMonth() &&
        recordDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  };

  // New Date Handler (Native Picker)
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleNewPunching = () => {
    router.push({
      pathname: "/driver/punching",
      params: { driverId },
    });
  };

  const selectedRecords = getSelectedDateRecords();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#E53E3E" />
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
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Punching History</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Date Selector Trigger */}
      <View style={styles.dateSelector}>
        <TouchableOpacity 
          style={styles.dateValue} 
          onPress={() => setShowDatePicker(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Calendar size={18} color="#2563EB" />
            <Text style={styles.dateValueText}>
              {selectedDate.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
          <ChevronDown size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Native Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          maximumDate={new Date()} // Prevent selecting future dates
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Summary Card */}
        {selectedRecords.length > 0 && (
          <View style={styles.statusSummaryCard}>
            <View style={styles.statusSummaryRow}>
              <View style={styles.statusSummaryItem}>
                <Text style={styles.statusSummaryLabel}>Punch In</Text>
                <Text style={styles.statusSummaryValue}>
                  {selectedRecords[0]?.punchInTime
                    ? new Date(selectedRecords[0].punchInTime).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "Not recorded"}
                </Text>
                <Text style={[
                  styles.statusSummaryStatus,
                  selectedRecords[0]?.punchInTime && { color: "#10B981" }
                ]}>
                  {selectedRecords[0]?.punchInTime ? "✓ Checked In" : "✗ Not checked in"}
                </Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusSummaryItem}>
                <Text style={styles.statusSummaryLabel}>Punch Out</Text>
                <Text style={styles.statusSummaryValue}>
                  {selectedRecords[0]?.punchOutTime
                    ? new Date(selectedRecords[0].punchOutTime).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "Not recorded"}
                </Text>
                <Text style={[
                  styles.statusSummaryStatus,
                  selectedRecords[0]?.punchOutTime && { color: "#DC2626" }
                ]}>
                  {selectedRecords[0]?.punchOutTime ? "✓ Checked Out" : "✗ Not checked out"}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* New Punching Button */}
      <TouchableOpacity
        style={styles.newPunchingButton}
        onPress={handleNewPunching}
        activeOpacity={0.8}
      >
        <Text style={styles.newPunchingButtonText}>NEW PUNCHING</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  dateSelector: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dateValue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateValueText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginHorizontal: 10,
  },
  statusSummaryCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  statusSummaryRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusSummaryItem: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusSummaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusSummaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  statusSummaryStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  statusDivider: {
    width: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  newPunchingButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  newPunchingButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
});

export default PunchingHistoryScreen;

