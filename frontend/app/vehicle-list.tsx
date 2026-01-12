import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useState, useCallback } from "react";
import { api, type Vehicle } from "../utils/api";
import { ChevronLeft, Plus, Search, Truck } from "lucide-react-native";

const FILTER_TABS = ["All", "Available", "On-trip", "In-Service", "Sold"];

interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}

const VehicleListScreen = () => {
  const router = useRouter();
  
  // 1. Get the user role passed from Dashboard (Admin or Manager)
  const params = useLocalSearchParams<{ userRole: string }>();
  const userRole = params.userRole || "admin"; // Default to admin if undefined

  const [vehicles, setVehicles] = useState<Vehicle[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");

  // 2. Fetch Data
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await api.getVehicles();

      if (response.ok && response.data) {
        setVehicles(response.data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [])
  );

  // 3. Filter Logic
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.regNumber.toLowerCase().includes(searchText.toLowerCase()) || 
      v.model.toLowerCase().includes(searchText.toLowerCase());
    
    let statusMatch = true;
    if (selectedTab !== "All") {
      const currentStatus = v.status === "Active" ? "Available" : v.status;
      statusMatch = currentStatus === selectedTab;
    }

    return matchesSearch && statusMatch;
  });

  // 4. Helper for Status Badge Styles
  const getStatusStyles = (status?: string): StatusStyle => {
    const displayStatus = status === "Active" ? "Available" : status;

    switch(displayStatus) {
      case 'Available': 
        return { bg: '#DCFCE7', text: '#166534', label: 'Available' };
      case 'On-trip': 
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'On-trip' };
      case 'In-Service': 
        return { bg: '#FEF3C7', text: '#92400E', label: 'In-Service' };
      case 'Sold': 
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Sold' };
      default: 
        return { bg: '#F1F5F9', text: '#475569', label: status || 'Unknown' };
    }
  };

  // 5. Navigate to Details (Passing the Role)
  const handleVehicleClick = (vehicle: Vehicle) => {
    router.push({
      pathname: "vehicle-details" as any,
      params: { 
        vehicle: JSON.stringify(vehicle),
        userRole: userRole // Pass role so details screen knows whether to show "Sell" button
      }
    });
  };

  const renderItem = ({ item }: { item: Vehicle }) => {
    const statusStyle = getStatusStyles(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleVehicleClick(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconBox}>
            <Truck size={24} color="#4F46E5" fill="#4F46E5" />
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.modelText}>{item.model}</Text>
            <Text style={styles.regText}>{item.regNumber}</Text>
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
          <Text style={styles.headerTitle}>Fleet Inventory</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Reg. # or Model"
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

        {/* Vehicle List */}
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredVehicles}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Truck size={48} color="#E2E8F0" />
                <Text style={styles.emptyText}>No vehicles found</Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB - Add Vehicle Button */}
      {/* You can hide this for Managers if needed, currently shown for both */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push("register-vehicle" as any)}
      >
        <Plus size={32} color="#fff" />
      </TouchableOpacity>
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
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContainer: { flex: 1 },
  modelText: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  regText: { fontSize: 13, color: "#64748B", marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  emptyText: { color: "#94A3B8", fontSize: 16, marginTop: 12 },
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

export default VehicleListScreen;