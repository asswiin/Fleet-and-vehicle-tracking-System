
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { api, Driver } from "../../utils/api";
import { 
  ChevronLeft, 
  Edit2, 
  Phone, 
  Mail, 
  CreditCard, 
  MapPin, 
  User,
  Calendar
} from "lucide-react-native";

const DriverProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ driverId: string }>();
  
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDriverDetails = async () => {
    if (!params.driverId) return;
    try {
      setLoading(true);
      const response = await api.getDriver(params.driverId);
      if (response.ok && response.data) {
        setDriver(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Reload data every time screen is focused (in case edits were made)
  useFocusEffect(
    useCallback(() => {
      fetchDriverDetails();
    }, [params.driverId])
  );

  const handleEdit = () => {
    if (driver) {
      router.push({
        pathname: "/driver/edit-driver-profile",
        params: { driverData: JSON.stringify(driver) }
      } as any);
    }
  };

  const getFullAddress = () => {
    if (!driver?.address) return "Address not provided";
    const { house, street, city, district, state } = driver.address;
    return [house, street, city, district, state].filter(Boolean).join(", ");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
          <Edit2 size={20} color="#2563EB" />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {driver?.profilePhoto ? (
              <Image
                source={{ uri: api.getImageUrl(driver.profilePhoto) || undefined }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {driver?.name ? driver.name.charAt(0).toUpperCase() : "D"}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{driver?.name}</Text>
          <Text style={styles.role}>Registered Driver</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: driver?.status === 'Active' ? '#22C55E' : '#EF4444' }]} />
            <Text style={styles.statusText}>{driver?.status || "Unknown"}</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.row}>
            <View style={styles.iconBox}><Phone size={20} color="#64748B" /></View>
            <View>
              <Text style={styles.label}>Mobile Number</Text>
              <Text style={styles.value}>{driver?.mobile}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.iconBox}><Mail size={20} color="#64748B" /></View>
            <View>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{driver?.email}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.iconBox}><Calendar size={20} color="#64748B" /></View>
            <View>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>
                {driver?.dob ? new Date(driver.dob).toLocaleDateString('en-GB') : "N/A"}
              </Text>
            </View>
          </View>

           <View style={styles.row}>
            <View style={styles.iconBox}><User size={20} color="#64748B" /></View>
            <View>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>
                {driver?.gender ? driver.gender.charAt(0).toUpperCase() + driver.gender.slice(1) : "N/A"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Address</Text>
          
          <View style={styles.row}>
            <View style={styles.iconBox}><CreditCard size={20} color="#64748B" /></View>
            <View>
              <Text style={styles.label}>License Number</Text>
              <Text style={styles.value}>{driver?.license}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.iconBox}><MapPin size={20} color="#64748B" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Permanent Address</Text>
              <Text style={styles.value}>{getFullAddress()}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F1F5F9"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
  editBtn: { flexDirection: "row", alignItems: "center", padding: 4 },
  editText: { marginLeft: 4, color: "#2563EB", fontWeight: "600" },
  
  content: { padding: 20 },
  
  profileCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#2563EB",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    resizeMode: "cover",
  },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#fff" },
  name: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  role: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600", color: "#475569" },

  section: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  row: { flexDirection: "row", marginBottom: 16 },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#F1F5F9",
    justifyContent: "center", alignItems: "center", marginRight: 16,
  },
  label: { fontSize: 12, color: "#94A3B8", marginBottom: 2, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 15, color: "#1E293B", fontWeight: "500" },
});

export default DriverProfileScreen;

