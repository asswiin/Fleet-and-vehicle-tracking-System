import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { api } from "../../utils/api";
import type { User } from "../../utils/api";
import { 
  ChevronLeft, 
  Edit2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  LogOut,
} from "lucide-react-native";

const ManagerProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  
  const [manager, setManager] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!params.userId) return;
    try {
      // Don't set loading to true on refresh to avoid flicker
      if (!manager) setLoading(true); 
      
      const response = await api.getUser(params.userId);
      if (response.ok && response.data) {
        setManager(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Reload data whenever screen is focused (after edit)
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [params.userId])
  );

  const handleEdit = () => {
    if (manager) {
      router.push({
        pathname: "/manager/edit-manager-profile",
        params: { userData: JSON.stringify(manager) }
      } as any);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => router.replace("login" as any) },
    ]);
  };

  const getFullAddress = () => {
    if (!manager?.address) return "Address not provided";
    const { house, street, city, district, state } = manager.address;
    return [house, street, city, district, state].filter(Boolean).join(", ");
  };

  if (loading && !manager) {
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
          {manager?.profilePhoto ? (
            <Image
              source={{ uri: api.getImageUrl(manager.profilePhoto) }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {manager?.name ? manager.name.charAt(0).toUpperCase() : "M"}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{manager?.name}</Text>
          <Text style={styles.role}>Logistics Manager</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{manager?.status || "Active"}</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.row}>
            <View style={styles.iconBox}><Phone size={20} color="#64748B" /></View>
            <View>
              <Text style={styles.label}>Mobile Number</Text>
              <Text style={styles.value}>{manager?.phone || "-"}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.iconBox}><Mail size={20} color="#64748B" /></View>
            <View>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{manager?.email || "-"}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.iconBox}><Calendar size={20} color="#64748B" /></View>
            <View>
              <Text style={styles.label}>Date of Birth</Text>
              <Text style={styles.value}>{manager?.dob || "-"}</Text>
            </View>
          </View>
        </View>

        {/* Address Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Details</Text>
          <View style={styles.row}>
            <View style={styles.iconBox}><MapPin size={20} color="#64748B" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Full Address</Text>
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
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#E0F2FE",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
    overflow: "hidden", resizeMode: "cover",
  },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#0284C7" },
  name: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  role: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: "#22C55E" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#166534" },

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

  logoutButton: {
    backgroundColor: "#EF4444", flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 16, borderRadius: 12, marginTop: 10,
    shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "700" }
});

export default ManagerProfileScreen;

