import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ArrowLeft, Truck, User, ChevronRight, AlertCircle } from "lucide-react-native";
import { api, type Trip } from "../../utils/api";

const TripListScreen = () => {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const response = await api.getAllTrips();
      if (response.ok && response.data) {
        // Sort by newest first
        setTrips(response.data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#F59E0B"; // Orange
      case "accepted": return "#10B981"; // Green
      case "in-progress": return "#3B82F6"; // Blue
      case "declined": return "#EF4444"; // Red
      default: return "#64748B";
    }
  };

  const renderItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push({ pathname: "/manager/trip-details", params: { tripId: item._id } } as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.tripId}>Trip #{item.tripId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <User size={16} color="#64748B" />
        <Text style={styles.infoText}>{item.driverId?.name || "No Driver"}</Text>
      </View>

      <View style={styles.row}>
        <Truck size={16} color="#64748B" />
        <Text style={styles.infoText}>{item.vehicleId?.regNumber || "No Vehicle"}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <ChevronRight size={20} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Managed Trips</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 50 }} />
      ) : trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertCircle size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No trips found</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
  list: { padding: 16 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  tripId: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  infoText: { fontSize: 14, color: "#475569" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 8 },
  dateText: { fontSize: 12, color: "#94A3B8" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 10, color: "#94A3B8" }
});

export default TripListScreen;