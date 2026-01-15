import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { ChevronLeft, Phone, CreditCard, Plus } from "lucide-react-native";
import { api, Driver } from "../utils/api";

const DriversListScreen = () => {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDrivers = async () => {
    try {
      const response = await api.getDrivers();
      if (response.ok && response.data) {
        // Handle case where backend returns array directly or inside { data: [] }
        const list = Array.isArray(response.data) ? response.data : (response.data as any).data;
        setDrivers(list || []);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Drivers</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading drivers...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {drivers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No drivers registered yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the + button to add your first driver
                </Text>
              </View>
            ) : (
              drivers.map((driver) => (
                <TouchableOpacity 
                  key={driver._id}
                  style={styles.driverCard}
                  onPress={() => {
                    router.push({
                      pathname: "drivers-details",
                      params: { driver: encodeURIComponent(JSON.stringify(driver)) },
                    } as any);
                  }}
                >
                  <View style={styles.driverHeader}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>
                        {driver.name ? driver.name.charAt(0).toUpperCase() : "D"}
                      </Text>
                    </View>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{driver.name}</Text>
                      <View style={styles.driverDetail}>
                        <Phone size={14} color="#6B7280" />
                        <Text style={styles.driverDetailText}>{driver.mobile}</Text>
                      </View>
                      <View style={styles.driverDetail}>
                        <CreditCard size={14} color="#6B7280" />
                        <Text style={styles.driverDetailText}>{driver.license}</Text>
                      </View>
                      {driver.address?.city ? (
                        <Text style={styles.driverLocation}>
                          {driver.address.city}, {driver.address.state}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        {/* Floating Add Button */}
        <TouchableOpacity 
          style={styles.fabButton}
          onPress={() => router.push("register-driver" as any)}
        >
          <Plus size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#374151", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  driverCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  driverHeader: { flexDirection: "row" },
  avatarContainer: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#2563EB",
    justifyContent: "center", alignItems: "center", marginRight: 16,
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  driverDetail: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  driverDetailText: { fontSize: 14, color: "#6B7280", marginLeft: 8 },
  driverLocation: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },
  fabButton: {
    position: "absolute", right: 20, bottom: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: "#2563EB", justifyContent: "center",
    alignItems: "center", shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});

export default DriversListScreen;