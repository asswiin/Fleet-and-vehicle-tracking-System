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
  Image,
  TextInput,
  FlatList,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useState, useCallback } from "react";
import { ChevronLeft, Phone, CreditCard, Plus, Search, User, Clock } from "lucide-react-native";
import { api, Driver } from "../../utils/api";

const FILTER_TABS = ["All", "Available", "Offline", "Accepted", "On-trip", "Resigned"];

interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}

const DriversListScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userRole: string }>();
  const userRole = params.userRole || "admin"; // Default to admin: no add button unless manager explicitly passes
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");

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

  // Filter Logic
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.name.toLowerCase().includes(searchText.toLowerCase()) || 
      driver.mobile.toLowerCase().includes(searchText.toLowerCase()) ||
      driver.license.toLowerCase().includes(searchText.toLowerCase());
    
    let statusMatch = true;
    if (selectedTab !== "All") {
      if (selectedTab === "Available") {
        // Available = punched in AND not on a trip or accepted
        statusMatch = driver.isAvailable === true && driver.driverStatus !== "On-trip" && driver.driverStatus !== "Accepted";
      } else if (selectedTab === "Offline") {
        // Offline = not punched in (and not on trip, accepted or resigned)
        statusMatch = driver.isAvailable === false && driver.driverStatus !== "On-trip" && driver.driverStatus !== "Accepted" && driver.status !== "Resigned";
      } else if (selectedTab === "Accepted") {
        // Accepted = driver has accepted a trip but not yet started
        statusMatch = driver.driverStatus === "Accepted";
      } else if (selectedTab === "On-trip") {
        // On-trip = driverStatus is On-trip
        statusMatch = driver.driverStatus === "On-trip";
      } else if (selectedTab === "Resigned") {
        statusMatch = driver.status === "Resigned";
      } else {
        const currentStatus = driver.status || "Available";
        statusMatch = currentStatus === selectedTab;
      }
    }

    return matchesSearch && statusMatch;
  });

  // Helper for Status Badge Styles
  const getStatusStyles = (driver: Driver): StatusStyle => {
    // Priority 1: Check if driver is On-trip
    if (driver.driverStatus === "On-trip") {
      return { bg: '#DBEAFE', text: '#1E40AF', label: 'On-trip' };
    }
    
    // Priority 2: Check if driver has Accepted a trip
    if (driver.driverStatus === "Accepted") {
      return { bg: '#FEF3C7', text: '#D97706', label: 'Accepted' };
    }
    
    // Priority 3: Check if resigned
    if (driver.status === "Resigned") {
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Resigned' };
    }
    
    // Priority 4: Check availability (punched in/out)
    if (driver.isAvailable === true) {
      return { bg: '#DCFCE7', text: '#166534', label: 'Available' };
    } else {
      return { bg: '#F3E8FF', text: '#6B21A8', label: 'Offline' };
    }
  };

  const renderItem = ({ item }: { item: Driver }) => {
    const statusStyle = getStatusStyles(item);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          router.push({
            pathname: "/admin/drivers-details",
            params: { driver: encodeURIComponent(JSON.stringify(item)), viewerRole: userRole },
          } as any);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            {item.profilePhoto ? (
              <Image
                source={{ uri: api.getImageUrl(item.profilePhoto) || undefined }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.name ? item.name.charAt(0).toUpperCase() : "D"}
              </Text>
            )}
            {/* On-trip indicator dot */}
            {item.driverStatus === "On-trip" && (
              <View style={styles.onTripDot} />
            )}
          </View>
          
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{item.name}</Text>
            <View style={styles.driverDetail}>
              <Phone size={14} color="#64748B" />
              <Text style={styles.driverDetailText}>{item.mobile}</Text>
            </View>
            <View style={styles.driverDetail}>
              <CreditCard size={14} color="#64748B" />
              <Text style={styles.driverDetailText}>{item.license}</Text>
            </View>
          </View>

          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Drivers</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, mobile or license"
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabsContainer}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = selectedTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, isActive && styles.activeTab]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Driver List */}
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredDrivers}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <User size={48} color="#E2E8F0" />
                <Text style={styles.emptyText}>No drivers found</Text>
                <Text style={styles.emptySubtext}>
                  {searchText || selectedTab !== "All" 
                    ? "Try adjusting your filters" 
                    : "Tap the + button to add your first driver"}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB - Add Driver Button (Managers only) */}
      {userRole === "manager" && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => router.push("/admin/register-driver")}
        >
          <Plus size={32} color="#fff" />
        </TouchableOpacity>
      )}
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
    padding: 20,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
  searchWrapper: { paddingHorizontal: 20, paddingTop: 12 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#0F172A" },
  tabsWrapper: { paddingVertical: 12, backgroundColor: "#fff", marginBottom: 12 },
  tabsContainer: { paddingHorizontal: 20, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  activeTab: { backgroundColor: "#4F46E5" },
  tabText: { color: "#64748B", fontSize: 13, fontWeight: "600" },
  activeTabText: { color: "#fff" },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: { flexDirection: "row", alignItems: "center" },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: "cover",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  onTripDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#fff",
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: "600", color: "#1E293B", marginBottom: 4 },
  driverDetail: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  driverDetailText: { fontSize: 13, color: "#64748B", marginLeft: 6 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  emptyText: { color: "#94A3B8", fontSize: 16, marginTop: 12, fontWeight: "600" },
  emptySubtext: { fontSize: 14, color: "#94A3B8", textAlign: "center", marginTop: 4 },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default DriversListScreen;

