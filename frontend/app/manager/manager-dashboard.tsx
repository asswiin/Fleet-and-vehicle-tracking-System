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
  Animated,
  Modal,
  BackHandler,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback, useRef, useEffect } from "react";
import {
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
  MessageSquare,
  LogOut,
  MapPin,
  DollarSign,
  Bell,
  CheckCircle,
  Activity,
} from "lucide-react-native";
import { api, type User as UserType } from "../../utils/api";

const { width } = Dimensions.get("window");

const ManagerDashboard = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Dynamic Name & ID
  const rawUserId = params.userId as string;
  const rawUserName = params.userName as string;

  const [managerData, setManagerData] = useState<UserType | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Robust ID selection: prioritize params, then state
  const userId = (rawUserId && rawUserId !== "undefined" && rawUserId !== "null")
    ? rawUserId
    : (managerData?._id);

  const displayName = managerData?.name || (rawUserName && rawUserName !== "undefined" ? rawUserName : "Manager");

  // Get role selection params for logout
  const selectedRole = params.role || "manager";
  const selectedDistrict = params.district || "Kozhikode";
  const selectedBranch = params.branch || "Mukkam";

  const [declinedCount, setDeclinedCount] = useState(0);
  const [hasVehicleAlerts, setHasVehicleAlerts] = useState(false);
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [sosAlertActive, setSosAlertActive] = useState(false);
  const [serviceAlertCount, setServiceAlertCount] = useState(0);
  const [deliveryUnreadCount, setDeliveryUnreadCount] = useState(0);

  // Expiry Warning Helpers
  const parseDate = (dateInput?: string): Date | null => {
    if (!dateInput) return null;
    if (dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) return date;
    return null;
  };

  const isExpiringSoon = (dateInput?: string) => {
    const date = parseDate(dateInput);
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tenDaysFromNow = new Date(today);
    tenDaysFromNow.setDate(today.getDate() + 10);
    return date <= tenDaysFromNow;
  };

  const checkVehicleExpiries = async () => {
    try {
      const res = await api.getVehicleAlertsSummary();
      if (res.ok && res.data) {
        setHasVehicleAlerts(res.data.hasAlerts);
      }
    } catch (e) {
      console.error("Error checking vehicle expiries", e);
    }
  };

  const fetchActiveTrips = async () => {
    try {
      const res = await api.getOngoingTrips();
      if (res.ok && Array.isArray(res.data)) {
        // Map to Trip objects adding liveProgress so UI remains consistent
        const active = res.data.map((item: any) => ({
          ...item.trip,
          liveProgress: item.progress || 0
        })).filter(Boolean);
        setActiveTrips(active);
        // Check if any active trip has SOS active
        const hasSOS = active.some((t: any) => t.sos === true);
        setSosAlertActive(hasSOS);
      }
    } catch (e) {
      console.error("Error fetching active trips", e);
    }
  };

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
        const res = await api.getDeclinedCount();
        if (res.ok && res.data) {
          setDeclinedCount(res.data.count);
        } else {
          setDeclinedCount(0);
        }
      };

      const fetchUnreadNotifications = async () => {
        if (!userId) return;

        const listRes = await api.getManagerNotifications(userId);
        if (listRes.ok && Array.isArray(listRes.data)) {
          const unreadGeneral = listRes.data.filter(
            (n: any) => !n.read && ["parcel_delivered", "driver_accepted", "driver_declined", "journey_started"].includes(n.type)
          );
          setDeliveryUnreadCount(unreadGeneral.length);
        } else {
          setDeliveryUnreadCount(0);
        }
      };

      const refreshData = async () => {
        fetchDeclined();
        fetchUnreadNotifications();
        checkVehicleExpiries();
        fetchActiveTrips();

        // Fetch service alerts (Repairs)
        const sRes = await api.getServiceAlertsCount();
        if (sRes.ok && sRes.data) {
          setServiceAlertCount(sRes.data.count);
        }
      };

      refreshData();

      // Polling for live updates on dashboard
      const interval = setInterval(() => {
        fetchActiveTrips();
        fetchUnreadNotifications();
      }, 5000);
      // Add BackHandler to prevent going back to assignment screens
      const onBackPress = () => {
        Alert.alert("Exit App", "Are you sure you want to exit the app?", [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel",
          },
          { text: "YES", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => {
        clearInterval(interval);
        backHandler.remove();
      };
    }, [fetchManagerData])
  );

  const navigateToProfile = () => {
    // Always try to use managerData._id if available
    const id = userId || managerData?._id;
    if (id && id !== "undefined" && id !== "null") {
      router.push({
        pathname: "/manager/manager-profile",
        params: {
          userId: id,
          role: selectedRole,
          district: selectedDistrict,
          branch: selectedBranch,
        }
      } as any);
    } else {
      Alert.alert("Error", "User ID missing or invalid. Please relogin.");
    }
  };

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
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#64748B' }}>
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
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  router.push({
                    pathname: "/manager/manager-notifications",
                    params: {
                      managerId: userId,
                      role: selectedRole,
                      district: selectedDistrict,
                      branch: selectedBranch,
                    },
                  } as any);
                }}
              >
                <Bell size={24} color={deliveryUnreadCount > 0 ? "#2563EB" : "#64748B"} fill={deliveryUnreadCount > 0 ? "#2563EB" : "transparent"} fillOpacity={0.1} />
                {(declinedCount > 0 || serviceAlertCount > 0 || deliveryUnreadCount > 0) && (
                  <View style={[styles.notificationDot, deliveryUnreadCount > 0 && { backgroundColor: "#2563EB" }]}>
                    <Text style={styles.notificationBadgeText}>
                      {deliveryUnreadCount > 0 ? deliveryUnreadCount : ""}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                <LogOut size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={[styles.statCard, styles.blueCard]}
              onPress={() => router.push("/manager/on-going-trip" as any)}
            >
              <View style={styles.statHeader}>
                <Truck size={24} color="rgba(255,255,255,0.8)" />
                <View style={styles.statBadgeBlue}>
                  <ArrowUpRight size={16} color="#fff" />
                  <Text style={styles.statBadgeText}> {activeTrips.length}</Text>
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
            {/* ROW 1: CORE OPERATIONS */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push({
                pathname: "/manager/selecting-parcel-improved",
                params: {
                  managerId: userId,
                  role: selectedRole,
                  district: selectedDistrict,
                  branch: selectedBranch,
                }
              } as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#F3E8FF" }]}>
                <Navigation size={22} color="#9333EA" />
              </View>
              <Text style={styles.actionLabel}>Assign Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push({
                pathname: "/manager/trip-list",
                params: {
                  userId: userId,
                  userName: displayName,
                  role: selectedRole,
                  district: selectedDistrict,
                  branch: selectedBranch,
                }
              } as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Truck size={22} color="#2563EB" />
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
                pathname: "/manager/on-going-trip",
                params: {
                  userId: userId,
                  userName: displayName,
                  role: selectedRole,
                  district: selectedDistrict,
                  branch: selectedBranch,
                }
              } as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#E0F2FE" }]}>
                <Activity size={22} color="#0284C7" />
                {sosAlertActive && (
                  <View style={[styles.declinedBadge, { backgroundColor: '#EF4444' }]}>
                    <Text style={[styles.declinedBadgeText, { fontSize: 9 }]}>⚠️</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionLabel}>Ongoing</Text>
            </TouchableOpacity>

            {/* ROW 2: MANAGEMENT & HISTORY */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push("/manager/delivered-parcels" as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#DCFCE7" }]}>
                <CheckCircle size={22} color="#166534" />
              </View>
              <Text style={styles.actionLabel}>Delivered</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={async () => {
                if (serviceAlertCount > 0) {
                  await api.markVehicleServicesAsRead();
                  setServiceAlertCount(0);
                }
                router.push({
                  pathname: "/manager/vehicle-service-history",
                  params: {
                    userName: displayName,
                    role: selectedRole,
                    district: selectedDistrict,
                    branch: selectedBranch,
                  }
                } as any);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FFEDD5" }]}>
                <Wrench size={22} color="#EA580C" />
                {serviceAlertCount > 0 && (
                  <View style={[styles.declinedBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.declinedBadgeText}>!</Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionLabel}>Repairs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push({
                pathname: "/manager/expenses",
                params: {
                  userId: userId,
                  userName: displayName,
                  role: selectedRole,
                  district: selectedDistrict,
                  branch: selectedBranch,
                }
              } as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}>
                <DollarSign size={22} color="#DC2626" />
              </View>
              <Text style={styles.actionLabel}>Expenses</Text>
            </TouchableOpacity>
          </View>

          {/* Active Deliveries Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Active Deliveries</Text>
            <TouchableOpacity onPress={() => router.push({
              pathname: "/manager/on-going-trip",
              params: { userId: userId, userName: displayName }
            } as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {activeTrips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Truck size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>No active deliveries</Text>
            </View>
          ) : (
            activeTrips.slice(0, 2).map((trip) => {
              const calculateLiveProgress = (t: any) => {
                if (t.status === "completed" || t.status === "Delivered") return 100;
                if (t.status === "accepted") return 0;
                if (t.liveProgress !== undefined) return t.liveProgress;
                return 0;
              };
              const progress = calculateLiveProgress(trip);

              return (
                <TouchableOpacity
                  key={trip._id}
                  style={styles.deliveryCard}
                  onPress={() => router.push({
                    pathname: "/manager/track-trip",
                    params: { tripId: trip._id }
                  } as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.resourceAvatars}>
                        <View style={styles.vehicleAvatarWrapper}>
                          {trip.vehicleId?.profilePhoto ? (
                            <Image
                              source={{ uri: api.getImageUrl(trip.vehicleId.profilePhoto) || undefined }}
                              style={styles.resourceAvatarImage}
                            />
                          ) : (
                            <View style={[styles.resourceAvatarPlaceholder, { backgroundColor: "#F1F5F9" }]}>
                              <Car size={16} color="#4F46E5" />
                            </View>
                          )}
                        </View>
                        <View style={styles.driverAvatarWrapper}>
                          {trip.driverId?.profilePhoto ? (
                            <Image
                              source={{ uri: api.getImageUrl(trip.driverId.profilePhoto) || undefined }}
                              style={styles.resourceAvatarImage}
                            />
                          ) : (
                            <View style={[styles.resourceAvatarPlaceholder, { backgroundColor: "#DBEAFE" }]}>
                              <User size={14} color="#2563EB" />
                            </View>
                          )}
                        </View>
                      </View>
                      <View>
                        <Text style={styles.vehicleName}>{trip.vehicleId?.regNumber || "Vehicle"}</Text>
                        <Text style={styles.driverNameSub}>{trip.driverId?.name || "Driver"}</Text>
                      </View>
                    </View>
                    <View style={styles.dashDestinationBox}>
                      <MapPin size={10} color="#2563EB" />
                      <Text style={styles.dashDestinationText} numberOfLines={1}>
                        {trip.deliveryDestinations && trip.deliveryDestinations.length > 0
                          ? trip.deliveryDestinations[trip.deliveryDestinations.length - 1].locationName
                          : "No Dest"}
                      </Text>
                    </View>
                    <View style={[styles.inTransitBadge, { backgroundColor: trip.status === 'accepted' ? '#FEF3C7' : '#EFF6FF' }]}>
                      <Text style={[styles.inTransitText, { color: trip.status === 'accepted' ? '#92400E' : '#2563EB' }]}>
                        {trip.status === 'accepted' ? 'ACCEPTED' : 'IN TRANSIT'}
                      </Text>
                    </View>
                  </View>

                  {trip.sos && (
                    <Animated.View style={[styles.sosBadge, { transform: [{ scale: pulseAnim }] }]}>
                      <AlertTriangle size={14} color="#fff" />
                      <Text style={styles.sosBadgeText}>SOS EMERGENCY REPORTED</Text>
                    </Animated.View>
                  )}

                  <View style={styles.progressRow}>
                    <View>
                      <Text style={styles.tripIdDash}>TRIP ID: {trip.tripId}</Text>
                      <Text style={styles.trackingIdDash}>
                        TRACK ID: {trip.parcelIds?.[0]?.trackingId || "N/A"}
                        {trip.parcelIds && trip.parcelIds.length > 1 ? ` (+${trip.parcelIds.length - 1} more)` : ""}
                      </Text>
                    </View>
                    <Text style={styles.progressPercentText}>{Math.round(progress)}%</Text>
                  </View>

                  <View style={styles.dashboardProgressBarBg}>
                    <View style={[styles.dashboardProgressBarFill, { width: `${progress}%` }]} />
                    <View style={[styles.dashboardProgressKnob, { left: `${progress}%` }]} />
                  </View>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity style={styles.messageIconButton}>
                      <MessageSquare size={18} color="#374151" style={{ marginRight: 8 }} />
                      <Text style={styles.actionBtnLabel}>Message</Text>
                    </TouchableOpacity>
                    <View style={styles.trackLinkDash}>
                      <Text style={styles.trackLinkTextDash}>Live Track</Text>
                      <Navigation size={14} color="#2563EB" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

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
          onPress={() => router.push({
            pathname: "/manager/parcel-list",
            params: {
              userId: userId,
              userName: displayName,
              role: selectedRole,
              district: selectedDistrict,
              branch: selectedBranch,
            }
          } as any)}
        >
          <Package size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Parcel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push({
            pathname: "/admin/drivers-list",
            params: {
              userRole: "manager",
              role: selectedRole,
              district: selectedDistrict,
              branch: selectedBranch,
            }
          })}
        >
          <User size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Drivers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push({
            pathname: "/admin/vehicle-list",
            params: {
              userRole: "manager",
              userName: displayName,
              role: selectedRole,
              district: selectedDistrict,
              branch: selectedBranch,
            }
          })}
        >
          <View style={{ position: 'relative' }}>
            <Car size={24} color="#9CA3AF" />
            {hasVehicleAlerts && (
              <View style={[styles.declinedBadge, { top: -4, right: -4, width: 14, height: 14, minWidth: 14 }]}>
                <Text style={[styles.declinedBadgeText, { fontSize: 8 }]}>!</Text>
              </View>
            )}
          </View>
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
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  actionItem: {
    alignItems: "center",
    width: (width - 64 - 24) / 3, // 32 (scroll padding) + 32 (grid padding)
    marginBottom: 12
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  actionLabel: { fontSize: 10, fontWeight: "700", color: "#4B5563", textAlign: 'center' },
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
  notificationDot: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  notificationPreviewCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  brightOutline: {
    borderColor: "#2563EB",
    borderWidth: 2,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  deliveredBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  deliveredBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  previewTime: {
    fontSize: 12,
    color: "#64748B",
  },
  previewMessage: {
    fontSize: 15,
    color: "#1E293B",
    lineHeight: 22,
    marginBottom: 16,
  },
  previewFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  noNotifText: {
    textAlign: "center",
    color: "#64748B",
    paddingVertical: 40,
    fontSize: 15,
  },
  viewAllBtn: {
    marginTop: 20,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  viewAllBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  deliveryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  truckIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  driverNameSub: {
    fontSize: 12,
    color: "#6B7280",
  },
  dashDestinationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    maxWidth: "30%",
  },
  dashDestinationText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0369A1",
  },
  inTransitBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inTransitText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTimeText: {
    fontSize: 11,
    color: "#6B7280",
  },
  tripIdDash: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
  },
  trackingIdDash: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  dashboardProgressBarBg: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    marginBottom: 16,
    position: "relative",
  },
  dashboardProgressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 3,
  },
  dashboardProgressKnob: {
    position: "absolute",
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#fff",
    marginLeft: -5,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  messageIconButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  trackLinkDash: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 6,
  },
  trackLinkTextDash: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  actionBtnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  sosBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  sosBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  resourceAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 65,
    height: 44,
  },
  vehicleAvatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverAvatarWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 3,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  resourceAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ManagerDashboard;

