
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
  Alert,
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
  Calendar,
  LogOut
} from "lucide-react-native";

const DriverProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    driverId: string,
    role?: string,
    district?: string,
    branch?: string
  }>();

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

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => router.replace({
          pathname: "/shared/login",
          params: {
            role: params.role || "driver",
            district: params.district || "",
            branch: params.branch || "",
          }
        } as any)
      },
    ]);
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

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#F5F7FA" 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  header: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#1A202C",
    letterSpacing: 0.3,
  },
  backBtn: { 
    padding: 8,
    marginRight: 8,
  },
  editBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  editText: { 
    marginLeft: 6, 
    color: "#1D4ED8", 
    fontWeight: "700",
    fontSize: 14,
  },

  content: { 
    padding: 20 
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: "cover",
  },
  avatarText: { 
    fontSize: 44, 
    fontWeight: "800", 
    color: "#fff" 
  },
  name: { 
    fontSize: 26, 
    fontWeight: "800", 
    color: "#1A202C", 
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  role: { 
    fontSize: 15, 
    color: "#718096", 
    marginBottom: 16,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#BBFBBB",
  },
  statusDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    marginRight: 8 
  },
  statusText: { 
    fontSize: 13, 
    fontWeight: "700", 
    color: "#166534",
    letterSpacing: 0.3,
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#1A202C", 
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  row: { 
    flexDirection: "row", 
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  label: { 
    fontSize: 11, 
    color: "#718096", 
    marginBottom: 4, 
    fontWeight: "700", 
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: { 
    fontSize: 16, 
    color: "#1A202C", 
    fontWeight: "600",
    lineHeight: 24,
  },
  logoutButton: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 20,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  logoutText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "800",
    letterSpacing: 0.3,
  }
});

export default DriverProfileScreen;

