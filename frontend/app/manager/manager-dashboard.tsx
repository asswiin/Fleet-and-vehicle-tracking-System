import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import {
  Search,
  Bell,
  Truck,
  Clock,
  Package,
  Wrench,
  AlertTriangle,
  Navigation,
  User,
  Car,
  Settings,
  ArrowUpRight,
  LayoutGrid,
  LogOut,
} from "lucide-react-native";
import { api } from "../../utils/api";
import type { User as UserType } from "../../utils/api";

const { width } = Dimensions.get("window");

const ManagerDashboard = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Dynamic Name & ID
  const displayName = params.userName || "Manager";
  const userId = params.userId;
  
  // Get role selection params for logout
  const selectedRole = params.role || "manager";
  const selectedDistrict = params.district || "";
  const selectedBranch = params.branch || "";
  
  const [managerData, setManagerData] = useState<UserType | null>(null);
  const [declinedCount, setDeclinedCount] = useState(0);

  // Fetch Manager Details
  const fetchManagerData = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await api.getUser(userId as string);
      if (response.ok && response.data) {
        setManagerData(response.data);
      }
    } catch (error) {
      console.error("Error fetching manager data:", error);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchManagerData();
      // Fetch declined parcels count
      const fetchDeclined = async () => {
        const res = await api.getDeclinedParcels();
        if (res.ok && Array.isArray(res.data)) {
          setDeclinedCount(res.data.length);
        } else {
          setDeclinedCount(0);
        }
      };
      fetchDeclined();
    }, [fetchManagerData])
  );

  const navigateToProfile = () => {
    if (userId) {
      router.push({
        pathname: "/manager/manager-profile",
        params: { userId: userId }
      } as any);
    } else {
      console.warn("User ID missing, cannot navigate to profile.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => router.replace({
        pathname: "/shared/login",
        params: {
          role: selectedRole,
          district: selectedDistrict,
          branch: selectedBranch,
        }
      } as any) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {managerData?.profilePhoto ? (
                <Image
                  source={{ uri: api.getImageUrl(managerData.profilePhoto) || undefined }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={{fontSize: 20, fontWeight:'bold', color: '#64748B'}}>
                    {displayName.toString().charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
      
                <Text style={styles.headerSubtitle}>Welcome back, </Text>
                 <Text style={styles.headerTitle}>{displayName}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconBtn}>
                <Search size={24} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Bell size={24} color="#374151" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                <LogOut size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={[styles.statCard, styles.blueCard]}>
              <View style={styles.statHeader}>
                <Truck size={24} color="rgba(255,255,255,0.8)" />
                <View style={styles.statBadgeBlue}>
                  <ArrowUpRight size={16} color="#fff" />
                  <Text style={styles.statBadgeText}> --</Text>
                </View>
              </View>
              <Text style={styles.statLabelWhite}>Active Trips</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.statCard, styles.purpleCard]}>
              <View style={styles.statHeader}>
                <Clock size={24} color="rgba(255,255,255,0.8)" />
                <View style={styles.statBadgePurple}>
                  <Text style={styles.statBadgeText}>--</Text>
                </View>
              </View>
              <Text style={styles.statLabelWhite}>On Time Rate</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: "#E0F2FE" }]}>
                <Truck size={24} color="#0284C7" />
              </View>
              <Text style={styles.actionLabel}>Trips</Text>
            </TouchableOpacity>




<TouchableOpacity 
  style={styles.actionItem}
  onPress={() => router.push("/manager/trip-list" as any)}
>
  <View style={[styles.actionIcon, { backgroundColor: "#E0F2FE" }]}> 
    <Truck size={24} color="#0284C7" />
    {declinedCount > 0 && (
      <View style={styles.declinedBadge}>
        <Text style={styles.declinedBadgeText}>{declinedCount}</Text>
      </View>
    )}
  </View>
  <Text style={styles.actionLabel}>Manage Trips</Text>
</TouchableOpacity>



            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => router.push({
                pathname: "/manager/selecting-parcel-improved",
                params: { managerId: userId }
              } as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#F3E8FF" }]}>
                <Navigation size={24} color="#9333EA" />
              </View>
              <Text style={styles.actionLabel}>Assign Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: "#FFEDD5" }]}>
                <Wrench size={24} color="#EA580C" />
              </View>
              <Text style={styles.actionLabel}>Repairs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}>
                <AlertTriangle size={24} color="#DC2626" />
              </View>
              <Text style={styles.actionLabel}>Alerts</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <LayoutGrid size={24} color="#2563EB" fill="#2563EB" fillOpacity={0.1} />
          <Text style={[styles.navLabel, { color: "#2563EB" }]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push("/manager/parcel-list")}
        >
          <Package size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Parcel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push({ pathname: "/admin/drivers-list", params: { userRole: "manager" } })}
        >
          <User size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Drivers</Text>
        </TouchableOpacity>

         <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push({ pathname: "/admin/vehicle-list", params: { userRole: "manager" }})}
        >
          <Car size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Vehicle</Text>
        </TouchableOpacity>
        
        {/* Settings -> Manager Profile */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={navigateToProfile}
        >
          <User size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, marginTop: 5 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10, backgroundColor: "#E5E7EB", justifyContent: 'center', alignItems: 'center', resizeMode: 'cover' },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  headerSubtitle: { fontSize: 11, color: "#6B7280" },
  headerRight: { flexDirection: "row", gap: 12 },
  iconBtn: { position: "relative" as const },
  notificationDot: { position: "absolute", top: -2, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#F9FAFB" },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statCard: { width: (width - 40) / 2, height: 110, borderRadius: 16, padding: 12, justifyContent: "space-between" },
  blueCard: { backgroundColor: "#2563EB" },
  purpleCard: { backgroundColor: "#A855F7" },
  statHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statBadgeBlue: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statBadgePurple: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  statLabelWhite: { color: "#fff", fontSize: 16, fontWeight: "500" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  actionGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  actionItem: { alignItems: "center", width: "22%" },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  actionLabel: { fontSize: 10, fontWeight: "600", color: "#4B5563" },
  declinedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  declinedBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    zIndex: 20,
  },
  navItem: { alignItems: "center" },
  navLabel: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", marginTop: 4 },
});

export default ManagerDashboard;

