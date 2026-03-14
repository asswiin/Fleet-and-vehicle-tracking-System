import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  Alert,
  Image,
  BackHandler,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  User,
  CheckCircle,
  ArrowRight,
  Box,
  MapPin,
  Settings,
  Truck,
  Clock,
  Bell,
  LayoutGrid,
  Clock as PunchIcon,
  LogOut,
  Menu
} from "lucide-react-native";
import { useState, useCallback } from "react";
import { api, Driver } from "../../utils/api";

const { width } = Dimensions.get("window");

const DriverDashboard = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const driverName = (driverData?.name || params.userName || "Driver").toString();
  const driverId = params.userId;
  const initials = driverName.substring(0, 2).toUpperCase();

  const selectedRole = params.role || "driver";
  const selectedDistrict = params.district || "Kozhikode";
  const selectedBranch = params.branch || "Mukkam";

  const fetchDriver = async () => {
    if (!driverId) return;
    try {
      const res = await api.getDriver(driverId as string);
      if (res.ok && res.data) setDriverData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotificationCount = async () => {
    if (!driverId) return;
    try {
      const res = await api.getUnreadNotificationCount(driverId as string);
      if (res.ok && res.data) {
        setNotificationCount(res.data.count);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveTrip = async () => {
    if (!driverId) return;
    try {
      const res = await api.getActiveTrip(driverId as string);
      if (res.ok && res.data) setActiveTrip(res.data);
      else setActiveTrip(null);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDriver();
      fetchNotificationCount();
      fetchActiveTrip();

      const onBackPress = () => {
        Alert.alert("Exit App", "Are you sure you want to exit the app?", [
          { text: "Cancel", style: "cancel" },
          { text: "YES", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => backHandler.remove();
    }, [driverId])
  );

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out", style: "destructive", onPress: () => router.replace({
          pathname: "/shared/login",
          params: { role: selectedRole, district: selectedDistrict, branch: selectedBranch }
        } as any)
      },
    ]);
  };

  const handleProfileClick = () => {
    if (driverId) {
      router.push({
        pathname: "/driver/driver-profile",
        params: { driverId, role: selectedRole, district: selectedDistrict, branch: selectedBranch }
      } as any);
    } else {
      Alert.alert("Error", "Driver ID not found. Please relogin.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <Menu size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <LogOut size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleProfileClick} style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              {driverData?.profilePhoto ? (
                <Image
                  source={{ uri: api.getImageUrl(driverData.profilePhoto) || undefined }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
              <View style={[styles.statusIndicator, { backgroundColor: driverData?.isAvailable ? "#10B981" : "#94A3B8" }]} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.greetingText}>Welcome Back,</Text>
              <Text style={styles.nameText}>{driverName}</Text>
            </View>
            <TouchableOpacity style={styles.settingsBtn} onPress={handleProfileClick}>
              <Settings size={20} color="#64748B" />
            </TouchableOpacity>
          </TouchableOpacity>

          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>WORK STATUS</Text>
              <View style={[styles.statusBadge, { backgroundColor: driverData?.driverStatus === "On-trip" ? "#E0F2FE" : driverData?.isAvailable ? "#DCFCE7" : "#F1F5F9" }]}>
                <Text style={[styles.statusBadgeText, { color: driverData?.driverStatus === "On-trip" ? "#0369A1" : driverData?.isAvailable ? "#15803D" : "#475569" }]}>
                  {driverData?.driverStatus === "On-trip" ? "On Trip" : driverData?.isAvailable ? "Available" : "Offline"}
                </Text>
              </View>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>NOTIFICATIONS</Text>
              <Text style={styles.statusValue}>{notificationCount} Alerts</Text>
            </View>
          </View>
        </View>

        {/* Actionable Trip Card */}
        {activeTrip && (
          <TouchableOpacity
            style={styles.activeTripCard}
            onPress={() => router.push({
              pathname: "/driver/active-trip",
              params: { driverId, role: selectedRole, district: selectedDistrict, branch: selectedBranch }
            } as any)}
          >
            <View style={styles.activeTripHeader}>
              <View style={styles.tripIconBox}>
                <Truck size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeTripTitle}>On-going Trip</Text>
                <Text style={styles.activeTripSub}>Tracking active for {activeTrip.vehicleId?.regNumber}</Text>
              </View>
              <ArrowRight size={20} color="#fff" />
            </View>
            <View style={styles.tripProgressLine} />
            <Text style={styles.viewTripBtnText}>View Trip Details</Text>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        {/* Action Grid */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push({
              pathname: "/driver/trip-notifications",
              params: { driverId, role: selectedRole, district: selectedDistrict, branch: selectedBranch }
            } as any)}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#F5F3FF" }]}>
              <Bell size={22} color="#7C3AED" />
              {notificationCount > 0 && <View style={styles.alertDot} />}
            </View>
            <Text style={styles.actionLabel}>New Alerts</Text>
            <Text style={styles.actionSub}>{notificationCount > 0 ? "Pending Job" : "No Alerts"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push({
              pathname: "/shared/trip-history",
              params: { driverId, role: 'driver', district: selectedDistrict, branch: selectedBranch }
            } as any)}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Clock size={22} color="#2563EB" />
            </View>
            <Text style={styles.actionLabel}>Trip History</Text>
            <Text style={styles.actionSub}>Logbook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, activeTrip?.status !== "returning" && styles.disabledCard]}
            onPress={() => {
              if (activeTrip?.status !== "returning") {
                Alert.alert("Finalize Journey", "This becomes available when you are on a return trip.");
                return;
              }

              Alert.alert(
                "Complete Return Trip",
                "Have you completed the return journey and returned the vehicle?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Complete",
                    onPress: async () => {
                      try {
                        const res = await api.completeReturnTrip(activeTrip._id);
                        if (res.ok) {
                          Alert.alert("Success", "Status updated to Available.");
                          fetchActiveTrip();
                          fetchDriver();
                        }
                      } catch (e) { console.error(e); }
                    }
                  }
                ]
              );
            }}
          >
            <View style={[styles.actionIconBox, { backgroundColor: activeTrip?.status === "returning" ? "#ECFDF5" : "#F8FAFC" }]}>
              <CheckCircle size={22} color={activeTrip?.status === "returning" ? "#059669" : "#94A3B8"} />
            </View>
            <Text style={styles.actionLabel}>Finalize</Text>
            <Text style={styles.actionSub}>Return Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              if (activeTrip?.vehicleId) {
                router.push({
                  pathname: "/manager/report-vehicle-service" as any,
                  params: {
                    vehicleId: activeTrip.vehicleId._id,
                    vehicleReg: activeTrip.vehicleId.regNumber,
                    reporterName: driverName,
                    reporterRole: "Driver",
                  }
                });
              } else {
                Alert.alert("Breakdown", "No active vehicle to report.");
              }
            }}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#FFFBEB" }]}>
              <Settings size={22} color="#D97706" />
            </View>
            <Text style={styles.actionLabel}>Breakdown</Text>
            <Text style={styles.actionSub}>Report Issue</Text>
          </TouchableOpacity>
        </View>

        {/* SOS Card */}
        <TouchableOpacity
          style={styles.sosFullCard}
          onPress={() => router.push({
            pathname: "/driver/sos",
            params: { driverId, role: selectedRole, district: selectedDistrict, branch: selectedBranch }
          } as any)}
        >
          <View style={styles.sosIconCircle}>
            <Bell size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>Emergency SOS</Text>
            <Text style={styles.sosSub}>Alert support team immediately</Text>
          </View>
          <View style={styles.sosBadge}>
            <Text style={styles.sosBadgeText}>SOS</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <LayoutGrid size={24} color="#2563EB" />
          <Text style={[styles.navText, { color: "#2563EB" }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            if (activeTrip) {
              router.push({
                pathname: "/driver/active-trip",
                params: { driverId, role: selectedRole, district: selectedDistrict, branch: selectedBranch }
              } as any);
            } else {
              router.push({
                pathname: "/driver/trip-notifications",
                params: { driverId, role: selectedRole, district: selectedDistrict, branch: selectedBranch }
              } as any);
            }
          }}
        >
          <Truck size={24} color="#94A3B8" />
          <Text style={styles.navText}>Trips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push({
            pathname: "/driver/punching-history",
            params: { driverId, role: selectedRole, district: selectedDistrict, branch: selectedBranch }
          } as any)}
        >
          <PunchIcon size={24} color="#94A3B8" />
          <Text style={styles.navText}>Punching</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleProfileClick}>
          <User size={24} color="#94A3B8" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  iconButton: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  profileHeader: { flexDirection: "row", alignItems: "center" },
  avatarWrapper: { position: 'relative', marginRight: 16 },
  avatarImage: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: "#E2E8F0" },
  initialsAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  initialsText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  statusIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#fff" },
  profileInfo: { flex: 1 },
  greetingText: { fontSize: 13, color: "#94A3B8", fontWeight: "600", textTransform: 'uppercase', letterSpacing: 0.5 },
  nameText: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  settingsBtn: { padding: 8, backgroundColor: "#F8FAFC", borderRadius: 12 },

  statusBar: { flexDirection: "row", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  statusItem: { flex: 1 },
  statusLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "800", marginBottom: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  verticalDivider: { width: 1, height: "100%", backgroundColor: "#F1F5F9", marginHorizontal: 15 },
  statusValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },

  activeTripCard: { backgroundColor: "#2563EB", borderRadius: 24, padding: 20, marginBottom: 24, elevation: 8 },
  activeTripHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  tripIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 14 },
  activeTripTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  activeTripSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "500" },
  tripProgressLine: { height: 1.5, backgroundColor: "rgba(255,255,255,0.15)", width: "100%", marginBottom: 12 },
  viewTripBtnText: { color: "#fff", fontWeight: "700", fontSize: 14, textAlign: 'center' },

  idleStateCard: { backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 24, borderWidth: 1, borderColor: "#F1F5F9" },
  idleIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  idleTitle: { fontSize: 17, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  idleSub: { fontSize: 13, color: "#64748B", textAlign: 'center' },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  actionGroup: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  actionCard: { width: (width - 55) / 2, backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#F1F5F9" },
  actionIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  alertDot: { position: 'absolute', top: 10, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 2, borderColor: "#fff" },
  actionLabel: { fontSize: 14, fontWeight: "800", color: "#1E293B", marginBottom: 2 },
  actionSub: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  disabledCard: { opacity: 0.5 },

  sosFullCard: { flexDirection: "row", backgroundColor: "#FEF2F2", borderRadius: 20, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#FECACA", marginTop: 10 },
  sosIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EF4444", justifyContent: "center", alignItems: "center", marginRight: 14 },
  sosTitle: { fontSize: 15, fontWeight: "800", color: "#991B1B" },
  sosSub: { fontSize: 12, color: "#B91C1C", fontWeight: "500" },
  sosBadge: { backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sosBadgeText: { fontSize: 11, fontWeight: "900", color: "#EF4444" },

  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-around", paddingVertical: 14, paddingBottom: 30, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  navItem: { alignItems: "center", minWidth: 60 },
  navText: { fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 4 },
});

export default DriverDashboard;
