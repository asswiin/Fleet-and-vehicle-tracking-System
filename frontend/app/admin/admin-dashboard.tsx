import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import React from "react";
import { api } from "../../utils/api";
import type { User, Driver, Vehicle } from "../../utils/api";
import {
  Users,
  Truck,
  Car,
  ChevronRight,
  LogOut,
  Phone,
  IndianRupee,
  History,
  Plus,
  ArrowUpRight,
  LayoutGrid,
  MapPin,
  Contact,
} from "lucide-react-native";

const BRANCHES_BY_DISTRICT: Record<string, string[]> = {
  "Alappuzha": ["Alappuzha Town", "Cherthala", "Kayamkulam", "Mavelikkara", "Haripad"],
  "Ernakulam": ["Kochi City", "Aluva", "Muvattupuzha", "Angamaly", "Perumbavoor", "Kalamassery"],
  "Idukki": ["Thodupuzha", "Kattappana", "Munnar", "Adimali", "Painavu"],
  "Kannur": ["Kannur City", "Thalassery", "Payyanur", "Iritty", "Taliparamba"],
  "Kasaragod": ["Kasaragod Town", "Kanhangad", "Nileshwaram", "Uppala"],
  "Kollam": ["Kollam City", "Punalur", "Karunagappally", "Kottarakkara", "Chathannoor"],
  "Kottayam": ["Kottayam Town", "Changanassery", "Pala", "Kanjirappally", "Vaikom"],
  "Kozhikode": ["Mukkam", "Kunnamangalam", "Kozhikode City", "Thamarassery", "Vadakara", "Koyilandy"],
  "Malappuram": ["Malappuram Town", "Manjeri", "Kottakkal", "Perinthalmanna", "Tirur", "Ponnani"],
  "Palakkad": ["Palakkad Town", "Ottapalam", "Chittur", "Mannarkkad", "Shornur", "Alathur"],
  "Pathanamthitta": ["Pathanamthitta Town", "Adoor", "Thiruvalla", "Konni", "Ranni"],
  "Thiruvananthapuram": ["Trivandrum City", "Neyyattinkara", "Attingal", "Varkala", "Nedumangad"],
  "Thrissur": ["Thrissur City", "Chalakudy", "Guruvayur", "Kunnamkulam", "Kodungallur", "Irinjalakuda"],
  "Wayanad": ["Kalpetta", "Sulthan Bathery", "Mananthavady", "Meenangadi"],
};

const { width } = Dimensions.get("window");

interface Stats {
  managers: number;
  drivers: number;
  vehicles: number;
  revenue: number;
}

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const selectedRole = params.role || "admin";
  const selectedDistrict = params.district || "Kozhikode";

  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [adminData, setAdminData] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>((params.branch as string) || "Mukkam");
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<Stats>({
    managers: 0,
    drivers: 0,
    vehicles: 0,
    revenue: 0,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, vehiclesRes, driversRes, historyRes, tripExpensesRes, servicesRes] = await Promise.all([
        api.getUsers().catch(() => ({ ok: false, data: [] })),
        api.getVehicles().catch(() => ({ ok: false, data: [] })),
        api.getDrivers().catch(() => ({ ok: false, data: [] })),
        api.getAllHistory().catch(() => ({ ok: false, data: [] })),
        api.getExpenses().catch(() => ({ ok: false, data: [] })),
        api.getAllVehicleServices().catch(() => ({ ok: false, data: [] }))
      ]);

      const normalize = (str: any) => str?.toString().trim().toLowerCase() || "";
      const normDistrict = normalize(selectedDistrict);
      const normBranch = normalize(selectedBranch);

      let managerList: User[] = [];
      let driverList: Driver[] = [];
      let vehicleCount = 0;

      const getBranch = (obj: any) => normalize(obj.branch || obj.address?.branch);
      const getDistrict = (obj: any) => normalize(obj.district || obj.address?.district);

      if (usersRes.ok && usersRes.data) {
        managerList = usersRes.data.filter((user: any) => {
          if (user.role !== "manager" || user.status === "Resigned") return false;
          const uBranch = getBranch(user);
          return uBranch === normBranch || (selectedBranch === "Mukkam");
        });
        const admin = usersRes.data.find((user: any) => user.role === "admin");
        if (admin) setAdminData(admin);
        setManagers(managerList);
      }

      if (vehiclesRes.ok && vehiclesRes.data) {
        const filteredVehicles = vehiclesRes.data.filter((v: any) => {
          const vBranch = getBranch(v);
          return vBranch === normBranch || (selectedBranch === "Mukkam");
        });
        setVehicles(filteredVehicles);
        vehicleCount = filteredVehicles.length;
      }

      const rawDrivers = driversRes.ok ? driversRes.data : [];
      const allDrivers = Array.isArray(rawDrivers) ? rawDrivers : (rawDrivers as any).data || [];
      driverList = allDrivers.filter((d: any) => {
        if (d.status === "Resigned") return false;
        const dBranch = getBranch(d);
        return dBranch === normBranch || (selectedBranch === "Mukkam");
      });
      setDrivers(driverList);

      const safeParseDate = (dateStr: any) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'string' && dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const getNumericAmount = (...values: any[]) => {
        for (const value of values) {
          const parsed = Number(value);
          if (!isNaN(parsed)) return parsed;
        }
        return 0;
      };

      let totalEarnings = 0;
      if (historyRes.ok && Array.isArray(historyRes.data)) {
        totalEarnings = historyRes.data.reduce((acc: number, dp: any) => {
          const dpBranch = getBranch(dp);
          const matchesBranch = selectedBranch === "Mukkam" || !dpBranch || dpBranch === normBranch;

          if (matchesBranch) {
            const amount = getNumericAmount(
              dp.parcelDetails?.amount,
              dp.amount,
              dp.totalAmount,
              dp.parcelAmount
            );
            return acc + amount;
          }
          return acc;
        }, 0);
      }

      let totalTripExpenses = 0;
      if (tripExpensesRes.ok && tripExpensesRes.data) {
        totalTripExpenses = (tripExpensesRes.data as any[]).reduce((acc: number, exp: any) => {
          const expBranch = getBranch(exp);
          const matchesBranch = selectedBranch === "Mukkam" || !expBranch || expBranch === normBranch;

          if (matchesBranch) {
            const amount = getNumericAmount(exp.totalAmount, exp.amount, exp.expenseAmount);
            return acc + amount;
          }
          return acc;
        }, 0);
      }

      let totalServiceCosts = 0;
      if (servicesRes.ok && servicesRes.data) {
        totalServiceCosts = (servicesRes.data as any[]).reduce((acc: number, service: any) => {
          const sBranch = getBranch(service);
          const matchesBranch = selectedBranch === "Mukkam" || !sBranch || sBranch === normBranch;

          if (matchesBranch) {
            const cost = getNumericAmount(service.totalServiceCost, service.cost, service.amount);
            return acc + cost;
          }
          return acc;
        }, 0);
      }

      const monthlyRevenue = totalEarnings - (totalTripExpenses + totalServiceCosts);

      setStats({
        managers: managerList.length,
        drivers: driverList.length,
        vehicles: vehicleCount,
        revenue: monthlyRevenue, // Net revenue (delivered - service - trip expenses)
      });

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [selectedBranch])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedBranch]);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: () => {
            router.replace({
              pathname: "/shared/login",
              params: { role: "admin", district: selectedDistrict }
            } as any);
          },
          style: "destructive",
        },
      ]
    );
  };

  const handleManagerClick = (manager: User) => {
    router.push({
      pathname: "/admin/manager-details" as any,
      params: { user: JSON.stringify(manager) }
    });
  };

  const handleDriverClick = (driver: Driver) => {
    router.push({
      pathname: "/admin/drivers-details" as any,
      params: { driver: encodeURIComponent(JSON.stringify(driver)), viewerRole: "admin" }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Dynamic Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome</Text>
            <Text style={styles.adminName}>{adminData?.name || "Administrator"}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {/* Main Financial Card */}
        <TouchableOpacity
          style={styles.mainBalanceCard}
          onPress={() => router.push({
            pathname: "/admin/hub-overview",
            params: { role: selectedRole, district: selectedDistrict }
          } as any)}
        >
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Net Revenue</Text>
              <Text style={styles.balanceValue}>₹{stats.revenue.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.balanceIconContainer}>
              <ArrowUpRight size={24} color="#fff" />
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.locationTag}>
              <MapPin size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.locationText}>{selectedDistrict} • {selectedBranch}</Text>
            </View>
            <Text style={styles.viewAnalytics}>View Detailed Analytics</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
              <Users size={18} color="#6366F1" />
            </View>
            <View style={styles.statBoxContent}>
              <Text style={styles.statNumber}>{stats.managers}</Text>
              <Text style={styles.statLabel}>Managers</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
              <Contact size={18} color="#10B981" />
            </View>
            <View style={styles.statBoxContent}>
              <Text style={stats.drivers > 0 ? styles.statNumber : [styles.statNumber, { color: '#94A3B8' }]}>{stats.drivers}</Text>
              <Text style={styles.statLabel}>Drivers</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF7ED' }]}>
              <Truck size={18} color="#F97316" />
            </View>
            <View style={styles.statBoxContent}>
              <Text style={stats.vehicles > 0 ? styles.statNumber : [styles.statNumber, { color: '#94A3B8' }]}>{stats.vehicles}</Text>
              <Text style={styles.statLabel}>Vehicles</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push({
              pathname: "/admin/add-manager",
              params: { role: selectedRole, district: selectedDistrict }
            } as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Plus size={20} color="#16A34A" />
            </View>
            <Text style={styles.actionLabel}>Add Manager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push({
              pathname: "/shared/trip-history",
              params: { role: 'admin', district: selectedDistrict }
            } as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F8FAFC' }]}>
              <History size={20} color="#6366F1" />
            </View>
            <Text style={styles.actionLabel}>All Trips</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Recent Managers Section */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Managers ({stats.managers})</Text>
            <TouchableOpacity onPress={() => router.push("/admin/managers-list" as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardList}>
            {loading && !refreshing ? (
              <ActivityIndicator color="#6366F1" />
            ) : managers.length > 0 ? (
              managers.slice(0, 3).map((manager) => (
                <TouchableOpacity
                  key={manager._id}
                  style={styles.personItem}
                  onPress={() => handleManagerClick(manager)}
                >
                  <View style={styles.personInfo}>
                    <View style={styles.personAvatar}>
                      {manager.profilePhoto ? (
                        <Image source={{ uri: api.getImageUrl(manager.profilePhoto) || undefined }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarInitial}>{manager.name.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.personName}>{manager.name}</Text>
                      <View style={styles.personSubRow}>
                        <View style={styles.statusDotActive} />
                        <Text style={styles.personSub}>{manager.branch || "Head"} • {selectedDistrict}</Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyMsg}>No managers assigned yet.</Text>
            )}
          </View>
        </View>

        {/* Active Drivers Section */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Drivers ({stats.drivers})</Text>
            <TouchableOpacity onPress={() => router.push("/admin/drivers-list" as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardList}>
            {loading && !refreshing ? (
              <ActivityIndicator color="#6366F1" />
            ) : drivers.length > 0 ? (
              drivers.slice(0, 3).map((driver) => (
                <TouchableOpacity
                  key={driver._id}
                  style={styles.personItem}
                  onPress={() => handleDriverClick(driver)}
                >
                  <View style={styles.personInfo}>
                    <View style={styles.personAvatar}>
                      {driver.profilePhoto ? (
                        <Image source={{ uri: api.getImageUrl(driver.profilePhoto) || undefined }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarInitial}>{driver.name.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.personName}>{driver.name}</Text>
                      <View style={styles.personSubRow}>
                        <View style={[
                          styles.statusDot, 
                          { backgroundColor: driver.driverStatus === "On-trip" ? "#2563EB" : (driver.isAvailable ? "#10B981" : "#94A3B8") }
                        ]} />
                        <Text style={styles.personSub}>
                          {driver.driverStatus === "On-trip" ? "On Trip" : (driver.isAvailable ? "Available" : "Offline")} • {driver.license}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyMsg}>No drivers registered yet.</Text>
            )}
          </View>
        </View>

        {/* Active Vehicles Section */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Vehicles ({stats.vehicles})</Text>
            <TouchableOpacity onPress={() => router.push("/admin/vehicles-list" as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardList}>
            {loading && !refreshing ? (
              <ActivityIndicator color="#6366F1" />
            ) : vehicles.length > 0 ? (
              vehicles.slice(0, 3).map((v) => (
                <TouchableOpacity
                  key={v._id}
                  style={styles.personItem}
                  onPress={() => router.push({
                    pathname: "/admin/vehicle-details" as any,
                    params: { vehicleId: v._id }
                  })}
                >
                  <View style={styles.personInfo}>
                    <View style={styles.personAvatar}>
                      {v.profilePhoto ? (
                        <Image source={{ uri: api.getImageUrl(v.profilePhoto) || undefined }} style={styles.avatarImg} />
                      ) : (
                        <Truck size={24} color="#94A3B8" />
                      )}
                    </View>
                    <View>
                      <Text style={styles.personName}>{v.regNumber}</Text>
                      <Text style={styles.personSub}>{v.type} • {v.model}</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyMsg}>No vehicles registered yet.</Text>
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Settings Menu Overlay */}



      {/* Modern Bottom Nav */}
      <View style={styles.bottomTab}>
        <TouchableOpacity style={styles.tabItem}>
          <LayoutGrid size={24} color="#6366F1" />
          <View style={styles.activeDot} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/admin/managers-list" as any)}
        >
          <Users size={24} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/admin/drivers-list" as any)}
        >
          <Contact size={24} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/admin/vehicle-list" as any)}
        >
          <Car size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 13, color: "#94A3B8", fontWeight: "600", marginBottom: 2 },
  adminName: { fontSize: 22, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: { flexDirection: "row", gap: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    borderWidth: 2,
    borderColor: '#fff',
  },
  scrollContent: { padding: 24 },
  mainBalanceCard: {
    backgroundColor: "#6366F1",
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: "#fff",
    letterSpacing: -1,
  },
  balanceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  locationText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  viewAnalytics: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statBoxContent: {
    marginTop: 8,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  statLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 16 },
  actionsGrid: { gap: 12, paddingRight: 40, marginBottom: 32 },
  actionCard: {
    width: 120,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionLabel: { fontSize: 12, fontWeight: "700", color: "#475569", textAlign: 'center' },
  listSection: { marginBottom: 32 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAll: { color: "#6366F1", fontSize: 14, fontWeight: "700" },
  cardList: { gap: 12 },
  personItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  personInfo: { flexDirection: "row", alignItems: "center", gap: 14 },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 18, fontWeight: "800", color: "#6366F1" },
  personName: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  personSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personSub: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  statusDotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  emptyMsg: { textAlign: 'center', color: '#94A3B8', fontSize: 14, paddingVertical: 20 },
  bottomTab: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    height: 70,
    borderRadius: 35,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    paddingHorizontal: 10,
  },
  tabItem: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  branchModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%',
  },
  branchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  branchModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  branchList: {
    marginBottom: 20,
  },
  branchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  branchItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  branchItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  branchItemTextSelected: {
    color: '#6366F1',
    fontWeight: '700',
  },
});

export default AdminDashboard;
