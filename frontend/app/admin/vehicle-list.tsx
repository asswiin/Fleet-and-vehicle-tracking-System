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
  Image,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import { api, type Vehicle } from "../../utils/api";
import {
  ChevronLeft,
  Plus,
  Search,
  Truck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Settings,
  Scale
} from "lucide-react-native";

const { width } = Dimensions.get("window");

const FILTER_TABS = ["All", "Available", "On-trip", "In-Service", "Sold"];

const VehicleListScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userRole: string; userName: string }>();
  const userRole = params.userRole || "admin";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");

  const fetchVehicles = async () => {
    try {
      const response = await api.getVehicles();
      if (response.ok && response.data) {
        setVehicles(response.data);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
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
  }, [vehicles, searchText, selectedTab]);

  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === "Active").length,
      onTrip: vehicles.filter(v => v.status === "On-trip").length,
    };
  }, [vehicles]);

  const getStatusConfig = (status?: string) => {
    const displayStatus = status === "Active" ? "Available" : status;
    switch (displayStatus) {
      case 'Available':
        return { color: '#059669', bg: '#F0FDF4', label: 'Available', icon: TrendingUp };
      case 'On-trip':
        return { color: '#2563EB', bg: '#EFF6FF', label: 'On Trip', icon: Truck };
      case 'In-Service':
        return { color: '#D97706', bg: '#FFFBEB', label: 'In Service', icon: Settings };
      case 'Sold':
        return { color: '#EF4444', bg: '#FEF2F2', label: 'Sold', icon: AlertTriangle };
      default:
        return { color: '#64748B', bg: '#F1F5F9', label: displayStatus || 'Unknown', icon: Truck };
    }
  };

  const renderStatCard = (label: string, count: number, color: string) => (
    <View style={styles.miniStatCard}>
      <Text style={[styles.miniStatCount, { color }]}>{count}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Vehicle }) => {
    const config = getStatusConfig(item.status);
    const StatusIcon = config.icon;

    return (
      <TouchableOpacity
        style={styles.vehicleCard}
        onPress={() => {
          router.push({
            pathname: "/admin/vehicle-details",
            params: {
              vehicleId: item._id,
              userRole: userRole,
              userName: params.userName,
            }
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={styles.imageContainer}>
            {item.profilePhoto ? (
              <Image
                source={{ uri: api.getImageUrl(item.profilePhoto)! }}
                style={styles.vehicleImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Truck size={28} color="#94A3B8" />
              </View>
            )}
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.regNoText}>{item.regNumber}</Text>
            <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
              <StatusIcon size={12} color={config.color} />
              <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          <ArrowRight size={18} color="#CBD5E1" />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.modelText}>{item.model}</Text>
              <Text style={styles.typeText}>{item.type}</Text>
            </View>
          </View>
          <View style={[styles.infoItem, { alignItems: 'flex-end' }]}>
            <View style={styles.capacityBadge}>
              <Scale size={13} color="#6366F1" />
              <Text style={styles.capacityText}>
                Cap: {(item.capacity || item.weight) ? `${item.capacity || item.weight}${String(item.capacity || item.weight).toLowerCase().includes('kg') ? '' : 'kg'}` : "N/A"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inventory</Text>
          {userRole === "manager" ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/admin/register-vehicle")}
            >
              <Plus size={24} color="#2563EB" />
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
        </View>

        <View style={styles.statsOverview}>
          {renderStatCard("Total", stats.total, "#0F172A")}
          {renderStatCard("Available", stats.available, "#059669")}
          {renderStatCard("On Trip", stats.onTrip, "#2563EB")}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search registration or model..."
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterContent}
        >
          {FILTER_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.activeTab]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            data={filteredVehicles}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No vehicles found</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  addButton: {
    padding: 8,
    marginRight: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  statsOverview: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  miniStatCount: {
    fontSize: 18,
    fontWeight: "800",
  },
  miniStatLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#0F172A",
  },
  filterBar: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeTab: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  list: {
    padding: 20,
    gap: 16,
  },
  vehicleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageContainer: {
    position: "relative",
  },
  vehicleImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  regNoText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoRow: {
    flex: 1,
  },
  infoItem: {
    justifyContent: "center",
  },
  modelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  typeText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  capacityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  capacityText: {
    fontSize: 12,
    color: "#4338CA",
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "500",
  },
});

export default VehicleListScreen;



