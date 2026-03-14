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
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useState, useCallback, useMemo } from "react";
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
  Bell,
  Search,
  Plus,
  ArrowUpRight,
  LayoutGrid,
  Settings,
  Shield,
  MapPin,
  Contact,
} from "lucide-react-native";

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
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
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
        api.getUsers(),
        api.getVehicles(),
        api.getDrivers(),
        api.getAllHistory(),
        api.getExpenses(),
        api.getAllVehicleServices()
      ]);

      let managerList: User[] = [];
      let driverList: Driver[] = [];
      let vehicleCount = 0;

      if (usersRes.ok && usersRes.data) {
        managerList = usersRes.data.filter((user: any) => user.role === "manager");
        const admin = usersRes.data.find((user: any) => user.role === "admin");
        if (admin) setAdminData(admin);
        setManagers(managerList);
      }

      if (vehiclesRes.ok && vehiclesRes.data) {
        setVehicles(vehiclesRes.data);
        vehicleCount = vehiclesRes.data.length;
      }

      if (driversRes.ok && driversRes.data) {
        const rawData = driversRes.data as any;
        driverList = Array.isArray(rawData) ? rawData : rawData.data || [];
        setDrivers(driverList);
      }

      let monthlyRevenue = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalEarnings = 0;
      if (historyRes.ok && Array.isArray(historyRes.data)) {
        totalEarnings = historyRes.data.reduce((acc: number, dp: any) => {
          const reachedDate = new Date(dp.reachedTime);
          if (reachedDate.getMonth() === currentMonth && reachedDate.getFullYear() === currentYear) {
            return acc + (Number(dp.parcelDetails?.amount) || 0);
          }
          return acc;
        }, 0);
      }

      let totalTripExpenses = 0;
      if (tripExpensesRes.ok && tripExpensesRes.data) {
        totalTripExpenses = tripExpensesRes.data.reduce((acc: number, exp: any) => {
          const expDate = new Date(exp.date || exp.createdAt);
          if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            return acc + (Number(exp.totalAmount) || 0);
          }
          return acc;
        }, 0);
      }

      let totalServiceCosts = 0;
      if (servicesRes.ok && servicesRes.data) {
        totalServiceCosts = servicesRes.data.reduce((acc: number, service: any) => {
          const serviceDate = new Date(service.createdAt || service.dateOfIssue);
          if (serviceDate.getMonth() === currentMonth && serviceDate.getFullYear() === currentYear) {
            return acc + (Number(service.totalServiceCost) || 0);
          }
          return acc;
        }, 0);
      }

      monthlyRevenue = totalEarnings - (totalTripExpenses + totalServiceCosts);

      setStats({
        managers: managerList.length,
        drivers: driverList.length,
        vehicles: vehicleCount,
        revenue: monthlyRevenue,
      });

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleLogout = () => {
    setShowSettingsMenu(false);
    router.replace({
      pathname: "/shared/login",
      params: { role: selectedRole, district: selectedDistrict }
    } as any);
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
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.adminName}>{adminData?.name || "Administrator"}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconCircle}>
              <Search size={20} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle}>
              <Bell size={20} color="#64748B" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
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
              <Text style={styles.balanceLabel}>Total Monthly Revenue</Text>
              <Text style={styles.balanceValue}>₹{stats.revenue.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.balanceIconContainer}>
              <ArrowUpRight size={24} color="#fff" />
            </View>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.locationTag}>
              <MapPin size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.locationText}>{selectedDistrict}</Text>
            </View>
            <Text style={styles.viewAnalytics}>View Detailed Analytics</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
              <Users size={20} color="#6366F1" />
            </View>
            <View style={styles.statBoxContent}>
              <Text style={styles.statNumber}>{stats.managers}</Text>
              <Text style={styles.statLabel}>Managers</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
              <Truck size={20} color="#10B981" />
            </View>
            <View style={styles.statBoxContent}>
              <Text style={stats.drivers > 0 ? styles.statNumber : [styles.statNumber, { color: '#94A3B8' }]}>{stats.drivers}</Text>
              <Text style={styles.statLabel}>Drivers</Text>
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
            <Text style={styles.sectionTitle}>Active Managers</Text>
            <TouchableOpacity onPress={() => router.push("/admin/managers-list" as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.cardList}>
            {loading && !refreshing ? (
              <ActivityIndicator color="#6366F1" />
            ) : managers.length > 0 ? (
              managers.slice(0, 2).map((manager) => (
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
                        <Text style={styles.avatarInitial}>{manager.name.charAt(0)}</Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.personName}>{manager.name}</Text>
                      <Text style={styles.personSub}>Hub Manager • {selectedDistrict}</Text>
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
            <Text style={styles.sectionTitle}>Active Drivers</Text>
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
                        <Text style={styles.avatarInitial}>{driver.name.charAt(0)}</Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.personName}>{driver.name}</Text>
                      <Text style={styles.personSub}>{driver.license || "Licensed Driver"} • {driver.status || "Active"}</Text>
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

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Settings Menu Overlay */}
      {showSettingsMenu && (
        <View style={styles.settingsOverlay}>
          <TouchableOpacity 
            style={styles.overlayClose} 
            onPress={() => setShowSettingsMenu(false)} 
          />
          <View style={styles.settingsMenu}>
            <View style={styles.menuHeader}>
              <Shield size={16} color="#6366F1" />
              <Text style={styles.menuTitle}>Admin Settings</Text>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={styles.logoutIcon}>
                <LogOut size={18} color="#EF4444" />
              </View>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setShowSettingsMenu(!showSettingsMenu)}
        >
          <Settings size={24} color={showSettingsMenu ? "#6366F1" : "#94A3B8"} />
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
    width: (width - 48 - 12) / 2,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statBoxContent: {
    marginLeft: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  statNumber: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "700" },
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
  personSub: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
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
  settingsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  overlayClose: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  settingsMenu: {
    position: 'absolute',
    bottom: 110,
    right: 30,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    width: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  menuTitle: { fontSize: 13, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});

export default AdminDashboard;
