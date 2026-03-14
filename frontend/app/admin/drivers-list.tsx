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
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  Phone,
  Plus,
  Search,
  User,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowRight
} from "lucide-react-native";
import { api, Driver } from "../../utils/api";

const { width } = Dimensions.get("window");

const FILTER_TABS = ["All", "Available", "Offline", "On-trip", "Accepted", "Pending", "Resigned"];

const DriversListScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userRole: string }>();
  const userRole = params.userRole || "admin";
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");

  const fetchDrivers = async () => {
    try {
      const response = await api.getDrivers();
      if (response.ok && response.data) {
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

  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const matchesSearch =
        driver.name.toLowerCase().includes(searchText.toLowerCase()) ||
        driver.mobile.toLowerCase().includes(searchText.toLowerCase());

      let statusMatch = true;
      if (selectedTab !== "All") {
        if (selectedTab === "Available") {
          statusMatch = driver.isAvailable === true && !["On-trip", "Accepted", "pending"].includes(driver.driverStatus || "");
        } else if (selectedTab === "Offline") {
          statusMatch = driver.isAvailable === false && !["On-trip", "Accepted", "pending"].includes(driver.driverStatus || "");
        } else if (selectedTab === "On-trip") {
          statusMatch = driver.driverStatus === "On-trip";
        } else if (selectedTab === "Accepted") {
          statusMatch = driver.driverStatus === "Accepted";
        } else if (selectedTab === "Pending") {
          statusMatch = driver.driverStatus === "pending";
        } else if (selectedTab === "Resigned") {
          statusMatch = driver.status === "Resigned";
        }
      }
      return matchesSearch && statusMatch;
    });
  }, [drivers, searchText, selectedTab]);

  const stats = useMemo(() => {
    return {
      total: drivers.length,
      available: drivers.filter(d => d.isAvailable && d.driverStatus !== "On-trip").length,
      onTrip: drivers.filter(d => d.driverStatus === "On-trip").length,
    };
  }, [drivers]);

  const getStatusConfig = (driver: Driver) => {
    if (driver.driverStatus === "On-trip") {
      return { color: '#2563EB', bg: '#EFF6FF', label: 'On Trip', icon: Truck };
    }
    if (driver.driverStatus === "Accepted") {
      return { color: '#059669', bg: '#F0FDF4', label: 'Accepted', icon: CheckCircle2 };
    }
    if (driver.driverStatus === "pending") {
      return { color: '#D97706', bg: '#FFFBEB', label: 'Pending', icon: Clock };
    }
    if (driver.status === "Resigned") {
      return { color: '#EF4444', bg: '#FEF2F2', label: 'Resigned', icon: XCircle };
    }
    if (driver.isAvailable) {
      return { color: '#10B981', bg: '#ECFDF5', label: 'Available', icon: CheckCircle2 };
    }
    return { color: '#64748B', bg: '#F1F5F9', label: 'Offline', icon: XCircle };
  };

  const renderStatCard = (label: string, count: number, color: string) => (
    <View style={styles.miniStatCard}>
      <Text style={[styles.miniStatCount, { color }]}>{count}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Driver }) => {
    const config = getStatusConfig(item);
    const StatusIcon = config.icon;

    return (
      <TouchableOpacity
        style={styles.driverHorizontalCard}
        onPress={() => {
          router.push({
            pathname: "/admin/drivers-details",
            params: { driver: encodeURIComponent(JSON.stringify(item)), viewerRole: userRole },
          } as any);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={styles.avatarContainer}>
            {item.profilePhoto ? (
              <Image
                source={{ uri: api.getImageUrl(item.profilePhoto)! }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={20} color="#94A3B8" />
              </View>
            )}
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          </View>
        </View>

        <View style={styles.cardRight}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.statusTag, { backgroundColor: config.bg }]}>
              <StatusIcon size={8} color={config.color} />
              <Text style={[styles.statusTagText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Phone size={12} color="#64748B" />
              <Text style={styles.infoText} numberOfLines={1}>{item.mobile}</Text>
            </View>
            <View style={styles.infoItem}>
              <MapPin size={12} color="#64748B" />
              <Text style={styles.infoText} numberOfLines={1}>{item.address?.city || "Mukkam"}</Text>
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
          <Text style={styles.headerTitle}>Drivers</Text>
          {userRole === "manager" ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/admin/register-driver")}
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
              placeholder="Search by name or number..."
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
            data={filteredDrivers}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            numColumns={1}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No drivers found</Text>
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
    padding: 16,
    gap: 12,
  },
  driverHorizontalCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLeft: {
    marginRight: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F8FAFC",
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cardRight: {
    flex: 1,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
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

export default DriversListScreen;

