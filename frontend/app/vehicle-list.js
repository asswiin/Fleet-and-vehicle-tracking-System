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
  ScrollView
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { 
  ChevronLeft, 
  Plus, 
  Search, 
  Truck, 
} from "lucide-react-native";

const FILTER_TABS = ["All", "Available", "On-trip", "In-Service", "Sold"];

export default function VehicleListScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // State for Search and Filters
  const [searchText, setSearchText] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");

  // 1. Fetch Data
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      // Replace with your actual IP address
      const response = await fetch("http://172.20.10.5:5000/api/vehicles");
      const data = await response.json();

      if (response.ok) {
        setVehicles(data);
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

  // 2. Filter Logic
  const filteredVehicles = vehicles.filter(v => {
    // Search Filter
    const matchesSearch = 
      v.regNumber.toLowerCase().includes(searchText.toLowerCase()) || 
      v.model.toLowerCase().includes(searchText.toLowerCase());
    
    // Tab Filter
    // Note: If DB status is "Active", we treat it as "Available" for this UI
    let statusMatch = true;
    if (selectedTab !== "All") {
      // Handle the mapping: DB "Active" -> UI "Available"
      const currentStatus = v.status === "Active" ? "Available" : v.status;
      statusMatch = currentStatus === selectedTab;
    }

    return matchesSearch && statusMatch;
  });

  // 3. Helper for Status Badge Styles
  const getStatusStyles = (status) => {
    // Map DB status "Active" to UI "Available"
    const displayStatus = status === "Active" ? "Available" : status;

    switch(displayStatus) {
      case 'Available': 
        return { bg: '#DCFCE7', text: '#166534', label: 'Available' }; // Green
      case 'On-trip': 
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'On-trip' };   // Blue
      case 'In-Service': 
        return { bg: '#FEF3C7', text: '#92400E', label: 'In-Service' }; // Orange/Yellow
      case 'Sold': 
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Sold' };       // Red
      default: 
        return { bg: '#F1F5F9', text: '#475569', label: status };       // Gray
    }
  };

  const handleVehicleClick = (vehicle) => {
    router.push({
      pathname: "/vehicle-details",
      params: { vehicle: JSON.stringify(vehicle) }
    });
  };

  // 4. Render Card
  const renderItem = ({ item }) => {
    const statusStyle = getStatusStyles(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleVehicleClick(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          
          {/* Icon Box */}
          <View style={styles.iconBox}>
            <Truck size={24} color="#4F46E5" fill="#4F46E5" />
          </View>

          {/* Text Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.modelText}>{item.model}</Text>
            <Text style={styles.regText}>{item.regNumber}</Text>
          </View>

          {/* Status Badge */}
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

        {/* FAB */}
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => router.push("/register-vehicle")}
        >
          <Plus size={32} color="#fff" />
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 15
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A" },

  // Search
  searchWrapper: { paddingHorizontal: 20, marginBottom: 15 },
  searchContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    height: 50, borderRadius: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: "#E2E8F0" // Added light border like screenshot
  },
  searchInput: { flex: 1, height: "100%", fontSize: 15, color: "#0F172A" },

  // Tabs
  tabsWrapper: { marginBottom: 10 },
  tabsContainer: { paddingHorizontal: 20, gap: 10, paddingBottom: 10 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "transparent",
  },
  activeTab: { backgroundColor: "#4F46E5" }, // Indigo/Purple color
  tabText: { fontSize: 14, color: "#64748B", fontWeight: "500" },
  activeTabText: { color: "#fff", fontWeight: "600" },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Card Design
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    // Soft Shadow
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2
  },
  cardContent: {
    flexDirection: "row", alignItems: "center", padding: 16
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 12, 
    backgroundColor: "#EDE9FE", // Light purple background
    justifyContent: "center", alignItems: "center", marginRight: 16
  },
  infoContainer: { flex: 1 },
  modelText: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  regText: { fontSize: 13, color: "#64748B", textTransform: 'uppercase' },
  
  // Badges
  badge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: "#94A3B8", fontSize: 16, marginTop: 10 },

  // FAB
  fab: {
    position: "absolute", bottom: 30, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#4F46E5", // Matches Tab Color
    justifyContent: "center", alignItems: "center",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
  },
});