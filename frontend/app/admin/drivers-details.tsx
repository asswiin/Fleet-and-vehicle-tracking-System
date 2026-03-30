import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  Phone,
  Mail,
  CreditCard,
  Home,
  Calendar,
  User as UserIcon,
  Edit2,
  History,
  ChevronDown,
  MapPin,
  Clock,
  ShieldX,
  MoreVertical,
  AlertTriangle,
  LogOut,
  UserX,
  FileText,
} from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { api, Driver } from "../../utils/api";

const { width } = Dimensions.get("window");

const DriverDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ driver?: string; viewerRole?: string }>();
  const viewerRole = (params.viewerRole as string) || "manager";

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [punchHistory, setPunchHistory] = useState<any[]>([]);
  const [punchLoading, setPunchLoading] = useState(false);
  const [showPunchHistory, setShowPunchHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initial Parse
  useState(() => {
    if (params.driver) {
      try {
        const parsed = JSON.parse(decodeURIComponent(params.driver));
        setDriver(parsed);
      } catch (err) {
        console.warn("Failed to parse driver payload", err);
      }
    }
  });

  const fetchDriverDetails = async () => {
    let driverId = driver?._id;
    if (!driverId && params.driver) {
      const parsed = JSON.parse(decodeURIComponent(params.driver));
      driverId = parsed._id;
    }
    if (!driverId) return;

    try {
      const response = await api.getDriver(driverId);
      if (response.ok && response.data) {
        setDriver(response.data);
      }
    } catch (error) {
      console.error("Error refreshing driver details:", error);
    }
  };

  const fetchPunchHistory = async () => {
    if (!driver?._id) return;
    try {
      setPunchLoading(true);
      const res = await api.getPunchHistory(driver._id);
      if (res.ok && res.data) {
        const history = Array.isArray(res.data) ? res.data : [];
        setPunchHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPunchLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDriverDetails();
      if (driver?._id) {
        fetchPunchHistory();
      }
    }, [driver?._id])
  );

  const handleEdit = () => {
    if (driver) {
      router.push({
        pathname: "/driver/edit-driver-profile",
        params: { driverData: JSON.stringify(driver) }
      } as any);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const selectedMonthRecords = useMemo(() => {
    return punchHistory.filter((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getMonth() === selectedDate.getMonth() &&
        recordDate.getFullYear() === selectedDate.getFullYear()
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [punchHistory, selectedDate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "--:--";
    return new Date(timeString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fullAddress = () => {
    if (!driver?.address) return "Not provided";
    const parts = [
      driver.address.house,
      driver.address.street,
      driver.address.city,
      driver.address.district,
      driver.address.state,
      driver.address.zip,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "Not provided";
  };

  const getStatusConfig = () => {
    if (driver?.status === "Resigned") return { label: "Resigned", bg: "#FEF2F2", text: "#EF4444" };
    if (driver?.status === "Terminated") return { label: "Terminated", bg: "#7F1D1D", text: "#fff" };
    if (driver?.driverStatus === "On-trip") return { label: "On Trip", bg: "#E0F2FE", text: "#0369A1" };
    if (driver?.isAvailable) return { label: "Available", bg: "#DCFCE7", text: "#15803D" };
    return { label: "Offline", bg: "#F3E8FF", text: "#7E22CE" };
  };

  const statusConfig = getStatusConfig();

  const handleResign = () => {
    Alert.alert(
      "Confirm Resignation",
      "Mark this driver as resigned? This will disable their access and update the system records.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.updateDriverStatus(driver!._id, { 
                status: "Resigned",
                isAvailable: false,
                driverStatus: "offline"
              });
              if (res.ok) {
                Alert.alert("Process Complete", "Driver status updated to Resigned.");
                fetchDriverDetails();
              }
            } catch (err) {
              Alert.alert("Error", "Could not update status.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleTerminate = () => {
    Alert.alert(
      "DANGER: TEMINATION",
      "Are you sure you want to TERMINATE this driver? The user will be notified immediately via email and locked out of the app.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "TERMINATE NOW", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.updateDriverStatus(driver!._id, { 
                status: "Terminated",
                isAvailable: false,
                driverStatus: "offline"
              });
              if (res.ok) {
                Alert.alert("Termination Successful", "Driver has been terminated.");
                fetchDriverDetails();
              }
            } catch (err) {
              Alert.alert("Error", "Failed to process termination.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: driver?.profilePhoto ? api.getImageUrl(driver.profilePhoto)! : "https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1000&auto=format&fit=crop" }}
            style={styles.heroBg}
            blurRadius={10}
          />
          <View style={styles.heroOverlay} />

          <View style={styles.heroHeader}>
            <TouchableOpacity style={styles.glassButton} onPress={() => router.back()}>
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Driver Identity</Text>
            {(viewerRole === 'manager' || viewerRole === 'driver') && driver?.status !== 'Resigned' && driver?.status !== 'Terminated' ? (
              <TouchableOpacity style={styles.glassButton} onPress={handleEdit}>
                <Edit2 size={20} color="#fff" />
              </TouchableOpacity>
            ) : <View style={{ width: 44 }} />}
          </View>

          <View style={styles.profileInfoHero}>
            <View style={styles.profileAvatarWrapper}>
              {driver?.profilePhoto ? (
                <Image
                  source={{ uri: api.getImageUrl(driver.profilePhoto)! }}
                  style={styles.profileAvatar}
                />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Text style={styles.profileAvatarText}>
                    {driver?.name ? driver.name.charAt(0).toUpperCase() : "D"}
                  </Text>
                </View>
              )}
              <View style={[styles.profileStatusDot, { backgroundColor: statusConfig.text }]} />
            </View>
            <Text style={styles.profileName}>{driver?.name || "Driver Name"}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={[styles.heroStatusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.heroStatusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Grid Cards */}
        <View style={styles.mainContainer}>
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => Linking.openURL(`tel:${driver?.mobile}`)}>
              <View style={styles.statIconBox}><Phone size={18} color="#4F46E5" /></View>
              <Text style={styles.statValue} numberOfLines={1}>{driver?.mobile || "N/A"}</Text>
              <Text style={styles.statLabel}>Mobile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => Linking.openURL(`mailto:${driver?.email}`)}>
              <View style={styles.statIconBox}><Mail size={18} color="#10B981" /></View>
              <Text style={styles.statValue}>{driver?.email || "N/A"}</Text>
              <Text style={styles.statLabel}>Email</Text>
            </TouchableOpacity>
          </View>

          {/* Records Section */}
          <Text style={styles.sectionTitle}>Performance & Activity</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => router.push({ pathname: "/shared/trip-history", params: { driverId: driver?._id, role: viewerRole } } as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                <History size={20} color="#4F46E5" />
              </View>
              <Text style={styles.actionTitle}>Trip Ledger</Text>
              <Text style={styles.actionSub}>Full history</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setShowPunchHistory(!showPunchHistory)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Clock size={20} color="#10B981" />
              </View>
              <Text style={styles.actionTitle}>Attendance</Text>
              <Text style={styles.actionSub}>Punch records</Text>
            </TouchableOpacity>
          </View>

          {showPunchHistory && (
             <View style={styles.attendanceContainer}>
                <TouchableOpacity style={styles.monthPicker} onPress={() => setShowDatePicker(true)}>
                  <Calendar size={16} color="#64748B" />
                  <Text style={styles.monthTitle}>
                    {selectedDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </TouchableOpacity>

                {punchLoading ? <ActivityIndicator size="small" color="#4F46E5" /> : (
                  selectedMonthRecords.length > 0 ? (
                    selectedMonthRecords.slice(0, 5).map((r, i) => (
                      <View key={i} style={styles.punchRow}>
                        <View style={styles.dateCirc}><Text style={styles.dateCircText}>{new Date(r.date).getDate()}</Text></View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeLabel}>PUNCH IN</Text>
                            <Text style={styles.timeVal}>{formatTime(r.punchInTime)}</Text>
                        </View>
                        <View style={styles.timeBox}>
                            <Text style={styles.timeLabel}>PUNCH OUT</Text>
                            <Text style={styles.timeVal}>{formatTime(r.punchOutTime)}</Text>
                        </View>
                      </View>
                    ))
                  ) : <Text style={styles.emptyText}>No records for this month</Text>
                )}
             </View>
          )}

          {/* Essential Info */}
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            <InfoRow icon={Mail} label="Email" value={driver?.email || "--"} />
            <InfoRow icon={UserIcon} label="Gender" value={driver?.gender || "--"} />
            <InfoRow icon={Calendar} label="DOB" value={driver?.dob ? new Date(driver.dob).toLocaleDateString() : "--"} />
            <InfoRow icon={CreditCard} label="License" value={driver?.license || "--"} />
            <InfoRow icon={MapPin} label="Address" value={fullAddress()} isLast />
          </View>

          {/* Management Zone */}
          {viewerRole === 'manager' && driver?.status !== 'Resigned' && driver?.status !== 'Terminated' && (
            <View style={styles.managementZone}>
              <View style={styles.managementHeader}>
                <AlertTriangle size={18} color="#EF4444" />
                <Text style={styles.managementTitle}>Driver Management</Text>
              </View>
              
              <View style={styles.managementActions}>
                <TouchableOpacity style={styles.manageBtn} onPress={handleResign}>
                  <LogOut size={20} color="#EF4444" />
                  <View style={styles.manageBtnContent}>
                    <Text style={styles.manageBtnTitle}>Mark Resigned</Text>
                    <Text style={styles.manageBtnSub}>Driver left voluntarily</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.manageBtn, styles.terminateBtn]} onPress={handleTerminate}>
                  <UserX size={20} color="#fff" />
                  <View style={styles.manageBtnContent}>
                    <Text style={[styles.manageBtnTitle, { color: '#fff' }]}>Terminate Contract</Text>
                    <Text style={[styles.manageBtnSub, { color: 'rgba(255,255,255,0.7)' }]}>Force removal from system</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Dates and Footer */}
          <View style={styles.systemMetadata}>
             <Text style={styles.metaText}>Joined Network: {driver?.createdAt ? new Date(driver.createdAt).toLocaleDateString() : '--'}</Text>
             {(driver?.status === "Resigned" || driver?.status === "Terminated") && (
               <View style={styles.terminationBanner}>
                 <Text style={styles.terminationText}>
                   Account {driver.status} on {driver.resignedDate ? new Date(driver.resignedDate).toLocaleDateString() : 'recently'}
                 </Text>
               </View>
             )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer: Full History (Only if not already shown) */}
      <View style={styles.stickyFooter}>
          <TouchableOpacity 
            style={styles.primaryFooterBtn}
            onPress={() => router.push({ pathname: "/shared/trip-history", params: { driverId: driver?._id, role: viewerRole } } as any)}
          >
            <FileText size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryFooterBtnText}>Full Trip Audit</Text>
          </TouchableOpacity>
      </View>

      {/* Modals */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const InfoRow = ({ icon: Icon, label, value, isLast }: any) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.infoIconBox}>
      <Icon size={18} color="#6366F1" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValueText}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 140 },
  
  // Hero
  heroSection: { height: 320, backgroundColor: "#0F172A", position: "relative" },
  heroBg: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.4)" },
  heroHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 50 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  glassButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255, 255, 255, 0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  
  profileInfoHero: { alignItems: "center", marginTop: 10 },
  profileAvatarWrapper: { position: "relative", padding: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 64 },
  profileAvatar: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: "#fff" },
  profileAvatarPlaceholder: { width: 104, height: 104, borderRadius: 52, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#fff" },
  profileAvatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  profileStatusDot: { position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: "#fff" },
  profileName: { fontSize: 24, fontWeight: "900", color: "#fff", marginTop: 12 },
  heroStatusBadge: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  heroStatusText: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },

  mainContainer: { paddingHorizontal: 20, marginTop: -30 },
  
  // Stats Row
  statsRow: { 
    flexDirection: "row", 
    backgroundColor: "#fff", 
    borderRadius: 24, 
    padding: 20, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 20, 
    elevation: 8,
    gap: 12
  },
  statItem: { flex: 1, alignItems: "center" },
  statIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F8FAFC", justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  statLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#1E293B", marginTop: 28, marginBottom: 16, letterSpacing: -0.3 },
  
  // Action Grid
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 14, fontWeight: "800", color: "#1E293B" },
  actionSub: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginTop: 2 },

  // Attendance
  attendanceContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  monthTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1E293B' },
  punchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  dateCirc: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  dateCircText: { fontSize: 13, fontWeight: '800', color: '#4F46E5' },
  timeBox: { flex: 1 },
  timeLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  timeVal: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, paddingVertical: 10 },

  // Details Card
  detailsCard: { backgroundColor: "#fff", borderRadius: 24, padding: 8, borderWidth: 1, borderColor: "#F1F5F9" },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  infoIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 16 },
  infoLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" },
  infoValueText: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginTop: 2 },

  // Management Zone
  managementZone: { marginTop: 32, backgroundColor: '#FEF2F2', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#FEE2E2' },
  managementHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  managementTitle: { fontSize: 16, fontWeight: "900", color: "#991B1B" },
  managementActions: { gap: 12 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2' },
  manageBtnContent: { marginLeft: 16, flex: 1 },
  manageBtnTitle: { fontSize: 14, fontWeight: "800", color: "#1E293B" },
  manageBtnSub: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginTop: 2 },
  terminateBtn: { backgroundColor: '#7F1D1D', borderColor: '#7F1D1D' },

  systemMetadata: { marginTop: 32, alignItems: 'center' },
  metaText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  terminationBanner: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#FEE2E2', borderRadius: 12 },
  terminationText: { fontSize: 12, color: "#EF4444", fontWeight: "700" },

  stickyFooter: { position: "absolute", bottom: 0, width: '100%', padding: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  primaryFooterBtn: { height: 56, backgroundColor: '#0F172A', borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  primaryFooterBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default DriverDetailsScreen;
