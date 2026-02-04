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
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
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
  ChevronDown
} from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { api, Driver } from "../../utils/api";

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

  // 1. Initial Parse (Fast load)
  // We use this to show data immediately while waiting for a fresh fetch
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

  // 2. Fetch Latest Data (Ensures updates are seen after editing)
  const fetchDriverDetails = async () => {
    if (!driver?._id && !params.driver) return;
    
    // Get ID from existing state or params
    let driverId = driver?._id;
    if (!driverId && params.driver) {
       const parsed = JSON.parse(decodeURIComponent(params.driver));
       driverId = parsed._id;
    }

    if (!driverId) return;

    try {
      // Don't set full page loading to true to avoid flickering if we already have data
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
    }, [])
  );

  // 3. Navigation to Edit Screen
  const handleEdit = () => {
    if (driver) {
      router.push({
        pathname: "/driver/edit-driver-profile",
        params: { driverData: JSON.stringify(driver) }
      } as any);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const getSelectedMonthRecords = () => {
    return punchHistory.filter((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getMonth() === selectedDate.getMonth() &&
        recordDate.getFullYear() === selectedDate.getFullYear()
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "---";
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

  const formattedDob = () => {
    if (!driver?.dob) return "Not provided";
    const date = new Date(driver.dob);
    return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString('en-GB');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Details</Text>
        
        {/* Edit button visible only for manager/driver viewers */}
        {(viewerRole === 'manager' || viewerRole === 'driver') && (
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Edit2 size={22} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!driver ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No driver data found.</Text>
            <Text style={styles.emptySubtext}>Return to the list and try again.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              {/* PROFILE PHOTO LOGIC */}
              {driver.profilePhoto ? (
                <Image
                  source={{ uri: api.getImageUrl(driver.profilePhoto)! }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {driver.name ? driver.name.charAt(0).toUpperCase() : "D"}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{driver.name || "Unnamed Driver"}</Text>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: driver.status === 'Active' ? '#DCFCE7' : '#FEE2E2' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: driver.status === 'Active' ? '#166534' : '#991B1B' }
                  ]}>
                    {driver.status || "Unknown"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <DetailRow icon={<Phone size={18} color="#6B7280" />} label="Phone" value={driver.mobile || "Not provided"} />
            <DetailRow icon={<Mail size={18} color="#6B7280" />} label="Email" value={driver.email || "Not provided"} />
            <DetailRow 
              icon={<UserIcon size={18} color="#6B7280" />} 
              label="Gender" 
              value={driver.gender ? driver.gender.charAt(0).toUpperCase() + driver.gender.slice(1) : "Not provided"} 
            />
            <DetailRow icon={<CreditCard size={18} color="#6B7280" />} label="License" value={driver.license || "Not provided"} />
            <DetailRow icon={<Calendar size={18} color="#6B7280" />} label="DOB" value={formattedDob()} />
            <DetailRow icon={<Home size={18} color="#6B7280" />} label="Address" value={fullAddress()} multiline />
            
            {/* PUNCH HISTORY SECTION */}
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.punchHistoryToggle}
              onPress={() => {
                if (!showPunchHistory) {
                  fetchPunchHistory();
                }
                setShowPunchHistory(!showPunchHistory);
              }}
            >
              <View style={styles.punchHistoryHeader}>
                <History size={20} color="#2563EB" />
                <Text style={styles.punchHistoryTitle}>Punch History</Text>
              </View>
              <ChevronDown 
                size={20} 
                color="#64748B" 
                style={[styles.chevronIcon, showPunchHistory && styles.chevronOpen]}
              />
            </TouchableOpacity>

            {showPunchHistory && (
              <View style={styles.punchHistoryContainer}>
                {/* Month/Year Selector */}
                <View style={styles.dateSelector}>
                  <TouchableOpacity 
                    style={styles.dateValue} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Calendar size={16} color="#2563EB" />
                      <Text style={styles.dateValueText}>
                        {selectedDate.toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                    <ChevronDown size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Native Date Picker - Month/Year only */}
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}

                {/* Punch History Loading */}
                {punchLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#2563EB" />
                  </View>
                ) : (
                  <View>
                    {getSelectedMonthRecords().length > 0 ? (
                      <View style={styles.punchRecordsList}>
                        <View style={styles.punchTableHeader}>
                          <Text style={[styles.punchTableText, { flex: 1 }]}>Date</Text>
                          <Text style={[styles.punchTableText, { flex: 1, textAlign: "center" }]}>Punch In</Text>
                          <Text style={[styles.punchTableText, { flex: 1, textAlign: "right" }]}>Punch Out</Text>
                        </View>
                        
                        <ScrollView style={styles.punchRecordsScroll} nestedScrollEnabled>
                          {getSelectedMonthRecords().map((record, index) => (
                            <View 
                              key={index} 
                              style={[styles.punchRecordRow, index % 2 === 0 && styles.punchRecordRowAlt]}
                            >
                              <Text style={[styles.punchRecordDate, { flex: 1 }]}>
                                {formatDate(record.date)}
                              </Text>
                              <Text style={[styles.punchRecordTimeIn, { flex: 1, textAlign: "center" }]}>
                                {formatTime(record.punchInTime)}
                              </Text>
                              <Text style={[styles.punchRecordTimeOut, { flex: 1, textAlign: "right" }]}>
                                {formatTime(record.punchOutTime)}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    ) : (
                      <Text style={styles.noRecordsText}>No punch records for this month</Text>
                    )}
                  </View>
                )}
              </View>
            )}
            
            {/* LICENSE PHOTO SECTION */}
            {driver.licensePhoto && (
              <View style={styles.licenseSection}>
                <Text style={styles.sectionTitle}>Driving License Document</Text>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setShowLicenseModal(true)}
                  style={styles.licenseImageContainer}
                >
                  <Image 
                    source={{ uri: api.getImageUrl(driver.licensePhoto)! }} 
                    style={styles.licenseThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.zoomHint}>
                    <Text style={styles.zoomText}>Tap to View</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {driver.createdAt ? (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.footerText}>Registered on: {new Date(driver.createdAt).toLocaleDateString()}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Full Screen License Modal */}
      <Modal visible={showLicenseModal} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLicenseModal(false)}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
          {driver?.licensePhoto && (
            <Image 
              source={{ uri: api.getImageUrl(driver.licensePhoto)! }} 
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const DetailRow = ({
  icon,
  label,
  value,
  multiline = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  multiline?: boolean;
}) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, multiline && { lineHeight: 20 }]}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  editBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" }, // Added style for Edit Btn
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  avatarPlaceholder: {
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#fff" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 6 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 20 },
  
  // Punch History Styles
  punchHistoryToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  punchHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  punchHistoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  chevronIcon: {
    transform: [{rotate: "0deg"}],
  },
  chevronOpen: {
    transform: [{rotate: "180deg"}],
  },
  punchHistoryContainer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  dateSelector: {
    marginBottom: 12,
  },
  dateValue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateValueText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginHorizontal: 8,
  },
  loadingContainer: {
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  punchRecordsList: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 8,
  },
  punchTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  punchTableText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  punchRecordsScroll: {
    maxHeight: 300,
  },
  punchRecordRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  punchRecordRowAlt: {
    backgroundColor: "#FAFBFC",
  },
  punchRecordDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  punchRecordTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  punchRecordTimeIn: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
  },
  punchRecordTimeOut: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
  noRecordsText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 16,
    fontStyle: "italic",
  },
  
  detailRow: { flexDirection: "row", marginBottom: 16 },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailLabel: { fontSize: 11, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 15, color: "#1F2937" },
  
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: "#6B7280" },
  footerText: { fontSize: 12, color: "#9CA3AF", textAlign: 'right' },

  // License Section Styles
  licenseSection: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
  },
  licenseImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  licenseThumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  zoomText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DriverDetailsScreen;

