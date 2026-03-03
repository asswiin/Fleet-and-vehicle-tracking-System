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
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  Menu,
  LogOut,
  Clock,
  Bell,
  Settings,
  LayoutGrid,
  Truck,
  Clock as PunchIcon,
  User,
  CheckCircle
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

  // Prefer fetched driver data; fallback to login param
  const driverName = (driverData?.name || params.userName || "Driver 1").toString();
  const driverId = params.userId; // Capture the ID
  const initials = driverName.substring(0, 2).toUpperCase();

  // Get role selection params for logout
  const selectedRole = params.role || "driver";
  const selectedDistrict = params.district || "";
  const selectedBranch = params.branch || "";

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
    }, [driverId])
  );

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out", style: "destructive", onPress: () => router.replace({
          pathname: "/shared/login",
          params: {
            role: selectedRole,
            district: selectedDistrict,
            branch: selectedBranch,
          }
        } as any)
      },
    ]);
  };

  // Navigate to Profile
  const handleProfileClick = () => {
    if (driverId) {
      router.push({
        pathname: "/driver/driver-profile",
        params: { driverId: driverId }
      } as any);
    } else {
      Alert.alert("Error", "Driver ID not found. Please relogin.");
    }
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Header */}
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

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            {driverData?.profilePhoto ? (
              <Image
                source={{ uri: api.getImageUrl(driverData.profilePhoto) || undefined }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.driverName}>{driverName}</Text>
            {driverData?.driverStatus === "On-trip" && (
              <View style={styles.onTripBadge}>
                <Truck size={12} color="#fff" />
                <Text style={styles.onTripText}>On Trip</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions Title */}
        <View style={styles.sectionHeader}>
          <View style={styles.blueBar} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        {/* Grid Container */}
        <View style={styles.gridContainer}>

          {/* Card 1: Active Trip */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (driverId) {
                router.push({
                  pathname: "/driver/active-trip",
                  params: { driverId: driverId }
                } as any);
              }
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Truck size={24} color="#16A34A" />
            </View>
            <Text style={styles.cardTitle}>Active Trip</Text>
            <Text style={styles.cardSubtitle}>View current trip</Text>
          </TouchableOpacity>

          {/* Card 2: History */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (driverId) {
                router.push({
                  pathname: "/shared/trip-history",
                  params: { driverId: driverId, role: 'driver' }
                } as any);
              } else {
                Alert.alert("Error", "Driver ID not found. Please relogin.");
              }
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
              <Clock size={24} color="#2563EB" />
            </View>
            <Text style={styles.cardTitle}>History</Text>
            <Text style={styles.cardSubtitle}>View past trips</Text>
          </TouchableOpacity>

          {/* Card 3: Alerts */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (driverId) {
                router.push({
                  pathname: "/driver/trip-notifications",
                  params: { driverId: driverId }
                } as any);
              }
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Bell size={24} color="#D97706" />
              {notificationCount > 0 && <View style={styles.notificationDot} />}
            </View>
            <Text style={styles.cardTitle}>Alerts</Text>
            <Text style={styles.cardSubtitle}>
              {notificationCount > 0 ? `${notificationCount} new trip${notificationCount > 1 ? 's' : ''}` : 'No new alerts'}
            </Text>
          </TouchableOpacity>

          {/* Card 3: SOS */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (driverId) {
                router.push({
                  pathname: "/driver/sos",
                  params: { driverId: driverId }
                } as any);
              } else {
                router.push("/driver/sos");
              }
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
              <Text style={styles.sosText}>SOS</Text>
            </View>
            <Text style={styles.cardTitle}>SOS</Text>
            <Text style={styles.cardSubtitle}>Emergency help</Text>
          </TouchableOpacity>

          {/* Card 4: Report Breakdown */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (activeTrip?.vehicleId) {
                router.push({
                  pathname: "/manager/report-vehicle-service" as any,
                  params: {
                    vehicleId: activeTrip.vehicleId._id,
                    vehicleReg: activeTrip.vehicleId.regNumber,
                  }
                });
              } else {
                Alert.alert("No Active Trip", "You can only report a breakdown while on an active trip.");
              }
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#F1F5F9" }]}>
              <Settings size={24} color="#475569" />
            </View>
            <Text style={styles.cardTitle}>Report Info</Text>
            <Text style={styles.cardSubtitle}>Breakdown Report</Text>
          </TouchableOpacity>

          {/* Card 5: Complete Return Trip */}
          <TouchableOpacity
            style={[styles.card, activeTrip?.status !== "returning" && { opacity: 0.6 }]}
            onPress={() => {
              if (activeTrip?.status !== "returning") {
                Alert.alert("Action Not Available", "You can only finalize a return trip after delivering all parcels.");
                return;
              }

              Alert.alert(
                "Complete Return Trip",
                "Are you sure you have completed the return journey and are ready to clear your status?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Complete",
                    onPress: async () => {
                      try {
                        const res = await api.completeReturnTrip(activeTrip._id);
                        if (res.ok) {
                          Alert.alert("Success", "Trip completed. You are now available.");
                          fetchActiveTrip();
                          fetchDriver();
                        } else {
                          Alert.alert("Error", res.error || "Failed to complete trip");
                        }
                      } catch (e) {
                        console.error(e);
                        Alert.alert("Error", "Something went wrong.");
                      }
                    }
                  }
                ]
              );
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: activeTrip?.status === "returning" ? "#E0F2FE" : "#F1F5F9" }]}>
              <CheckCircle size={24} color={activeTrip?.status === "returning" ? "#0891B2" : "#94A3B8"} />
            </View>
            <Text style={styles.cardTitle}>Return Trip Done</Text>
            <Text style={styles.cardSubtitle}>Finalize travel</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <LayoutGrid size={24} color="#2563EB" />
          <Text style={[styles.navText, { color: "#2563EB" }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            if (driverId) {
              router.push({
                pathname: "/driver/active-trip",
                params: { driverId: driverId }
              } as any);
            }
          }}
        >
          <Truck size={24} color="#94A3B8" />
          <Text style={styles.navText}>Trips</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => {
          if (driverId) {
            router.push({
              pathname: "/driver/punching-history",
              params: { driverId: driverId }
            } as any);
          }
        }}>
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  iconButton: { padding: 4 },

  scrollContent: { padding: 20, paddingBottom: 100 },

  // Profile Section
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    marginTop: 10,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: "cover",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  profileTextContainer: { justifyContent: "center" },
  welcomeText: { fontSize: 14, color: "#64748B", marginBottom: 4 },
  driverName: { fontSize: 22, fontWeight: "700", color: "#0F172A" },
  onTripBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  onTripText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 4,
  },

  // Quick Actions Header
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  blueBar: { width: 4, height: 24, backgroundColor: "#2563EB", borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },

  // Grid
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 15,
  },
  card: {
    width: (width - 55) / 2, // 2 column layout
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 5,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    position: 'relative'
  },
  notificationDot: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#FEF3C7"
  },
  sosText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#DC2626"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },

  // Bottom Nav
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  navItem: { alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 11, fontWeight: "600", color: "#94A3B8", marginTop: 4 },
});

export default DriverDashboard;

