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
  ShieldCheck,
  MoreVertical,
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

  // 1. Initial Parse
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
    if (Platform.OS === 'android') setShowDatePicker(false);
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
    if (driver?.driverStatus === "On-trip") return { label: "On Trip", bg: "#E0F2FE", text: "#0369A1" };
    if (driver?.isAvailable) return { label: "Available", bg: "#DCFCE7", text: "#15803D" };
    return { label: "Offline", bg: "#F3E8FF", text: "#7E22CE" };
  };

  const statusConfig = getStatusConfig();

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
            <Text style={styles.heroTitle}>Driver Profile</Text>
            {(viewerRole === 'manager' || viewerRole === 'driver') ? (
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.heroStatusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.heroStatusText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
              </View>
              {driver?.status === "Resigned" && (
                <View style={[styles.heroStatusBadge, { backgroundColor: "#FEE2E2" }]}>
                  <Text style={[styles.heroStatusText, { color: "#EF4444" }]}>Resigned</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions / Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Phone size={20} color="#6366F1" />
            <Text style={styles.statValue}>{driver?.mobile || "N/A"}</Text>
            <Text style={styles.statLabel}>Contact</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <CreditCard size={20} color="#10B981" />
            <Text style={styles.statValue} numberOfLines={1}>{driver?.license || "N/A"}</Text>
            <Text style={styles.statLabel}>License</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.statValue}>{driver?.isAvailable ? "Punched In" : "Punched Out"}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Main Content Sections */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionHeader}>Personal Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon={Mail} label="Email Address" value={driver?.email || "Not provided"} />
            <InfoRow icon={UserIcon} label="Gender" value={driver?.gender ? driver.gender.charAt(0).toUpperCase() + driver.gender.slice(1) : "Not provided"} />
            <InfoRow icon={Calendar} label="Date of Birth" value={driver?.dob ? new Date(driver.dob).toLocaleDateString() : "Not provided"} />
            <InfoRow icon={MapPin} label="Home Address" value={fullAddress()} isLast />
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Activity Tracking</Text>
            <TouchableOpacity onPress={() => setShowPunchHistory(!showPunchHistory)}>
              <Text style={styles.seeMoreText}>{showPunchHistory ? "Hide Details" : "Show Details"}</Text>
            </TouchableOpacity>
          </View>

          {/* Punch History Redesign */}
          <View style={styles.infoCard}>
            <TouchableOpacity
              style={styles.historyToggleItem}
              onPress={() => setShowPunchHistory(!showPunchHistory)}
            >
              <View style={styles.historyIconBox}>
                <History size={20} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyToggleTitle}>Duty Records</Text>
                <Text style={styles.historyToggleSub}>View punch-in and out timestamps</Text>
              </View>
              <ChevronDown size={20} color="#64748B" style={{ transform: [{ rotate: showPunchHistory ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>

            {showPunchHistory && (
              <View style={styles.expandedHistory}>
                <TouchableOpacity style={styles.monthSelector} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.monthSelectorText}>
                    {selectedDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </Text>
                  <Calendar size={16} color="#6366F1" />
                </TouchableOpacity>

                {punchLoading ? (
                  <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 20 }} />
                ) : selectedMonthRecords.length > 0 ? (
                  <View style={styles.punchList}>
                    {selectedMonthRecords.slice(0, 5).map((record, i) => (
                      <View key={i} style={[styles.punchRow, i === selectedMonthRecords.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.punchDateBox}>
                          <Text style={styles.punchDay}>{new Date(record.date).getDate()}</Text>
                          <Text style={styles.punchMo}>{new Date(record.date).toLocaleDateString('en-IN', { month: 'short' })}</Text>
                        </View>
                        <View style={styles.punchTimeBox}>
                          <View style={styles.timeLabelRow}>
                            <Clock size={12} color="#10B981" />
                            <Text style={styles.inTime}>{formatTime(record.punchInTime)}</Text>
                          </View>
                          <View style={styles.timeLabelRow}>
                            <Clock size={12} color="#EF4444" />
                            <Text style={styles.outTime}>{formatTime(record.punchOutTime)}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                    {selectedMonthRecords.length > 5 && (
                      <Text style={styles.moreRecordsHint}>+ {selectedMonthRecords.length - 5} more records this month</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.noDataText}>No records found for this period</Text>
                )}
              </View>
            )}
          </View>

          {/* License Doc Section */}
          {driver?.licensePhoto && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionHeader}>Verification Documents</Text>
              <TouchableOpacity
                style={styles.docCard}
                onPress={() => setShowLicenseModal(true)}
                activeOpacity={0.9}
              >
                <View style={styles.docIconBox}>
                  <ShieldCheck size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docCardTitle}>Driving License</Text>
                  <Text style={styles.docCardSub}>Verified Document Attachment</Text>
                </View>
                <Image source={{ uri: api.getImageUrl(driver.licensePhoto)! }} style={styles.docThumbnail} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer Info */}
        <View style={styles.pageFooter}>
          <Text style={styles.footerInfoText}>System Registered: {driver?.createdAt ? new Date(driver.createdAt).toDateString() : 'N/A'}</Text>
        </View>
      </ScrollView>

      {/* Primary Action Button */}
      <View style={styles.footerAction}>
        {viewerRole === 'manager' && driver?.status !== 'Resigned' && (
          <TouchableOpacity
            style={[styles.mainActionButton, { backgroundColor: '#FEF2F2', marginBottom: 12, borderWidth: 1, borderColor: '#FEE2E2', shadowOpacity: 0 }]}
            onPress={() => {
              import("react-native").then(({ Alert }) => {
                Alert.alert(
                  "Mark as Resigned",
                  "Are you sure you want to mark this driver as resigned? This will take them offline and they will no longer be available for trips.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Confirm Resignation", 
                      style: "destructive",
                      onPress: async () => {
                        try {
                          setLoading(true);
                          const res = await api.updateDriver(driver!._id, { 
                            status: "Resigned",
                            isAvailable: false,
                            driverStatus: "offline"
                          });
                          if (res.ok) {
                            Alert.alert("Success", "Driver has been marked as resigned.");
                            fetchDriverDetails();
                          } else {
                            Alert.alert("Error", res.error || "Failed to update driver status");
                          }
                        } catch (err) {
                          Alert.alert("Error", "An unexpected error occurred.");
                        } finally {
                          setLoading(false);
                        }
                      }
                    }
                  ]
                );
              });
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <UserIcon size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={[styles.mainActionButtonText, { color: '#EF4444' }]}>Mark as Resigned</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.mainActionButton}
          onPress={() => {
            router.push({
              pathname: "/shared/trip-history",
              params: { driverId: driver?._id, role: viewerRole }
            } as any);
          }}
        >
          <History size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.mainActionButtonText}>View Full Trip History</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Full Screen License Modal */}
      <Modal visible={showLicenseModal} transparent={true} animationType="fade">
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowLicenseModal(false)}>
            <Text style={styles.modalCloseText}>CLOSE VIEW</Text>
          </TouchableOpacity>
          {driver?.licensePhoto && (
            <Image
              source={{ uri: api.getImageUrl(driver.licensePhoto)! }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon: Icon, label, value, isLast }: any) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.infoIconBox}>
      <Icon size={18} color="#64748B" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValueText}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 120 },
  heroSection: {
    height: 340,
    backgroundColor: "#1E293B",
    position: "relative",
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  profileInfoHero: {
    alignItems: "center",
    marginTop: 20,
  },
  profileAvatarWrapper: {
    position: "relative",
    padding: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 60,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileAvatarText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
  },
  profileStatusDot: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginTop: 12,
  },
  heroStatusBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroStatusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 24,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "60%",
    backgroundColor: "#F1F5F9",
    alignSelf: "center",
  },
  detailsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6366F1",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  infoValueText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 2,
  },
  historyToggleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  historyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  historyToggleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  historyToggleSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  expandedHistory: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    paddingTop: 12,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 16,
  },
  monthSelectorText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  punchList: {
    backgroundColor: "#fff",
  },
  punchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  punchDateBox: {
    width: 50,
    alignItems: "center",
    marginRight: 16,
  },
  punchDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  punchMo: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  punchTimeBox: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  timeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  outTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  moreRecordsHint: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  noDataText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 20,
    fontStyle: "italic",
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  docIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  docCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  docCardSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  docThumbnail: {
    width: 60,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  pageFooter: {
    marginTop: 40,
    alignItems: "center",
    paddingBottom: 20,
  },
  footerInfoText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  footerAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  mainActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    height: 56,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  mainActionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  fullScreenImage: {
    width: width,
    height: width * 1.5,
  },
});

export default DriverDetailsScreen;


