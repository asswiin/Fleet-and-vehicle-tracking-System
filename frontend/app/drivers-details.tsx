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
  Edit2 // Import Edit Icon
} from "lucide-react-native";
import { api, Driver } from "../utils/api";

const DriverDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ driver?: string }>();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      fetchDriverDetails();
    }, [])
  );

  // 3. Navigation to Edit Screen
  const handleEdit = () => {
    if (driver) {
      router.push({
        pathname: "edit-driver-profile",
        params: { driverData: JSON.stringify(driver) }
      } as any);
    }
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
        
        {/* EDIT BUTTON ADDED HERE */}
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Edit2 size={22} color="#2563EB" />
        </TouchableOpacity>
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