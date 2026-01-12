import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Alert, 
  ActivityIndicator 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { api, type User } from "../utils/api"; 
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  UserX // Changed icon to represent resignation
} from "lucide-react-native";

const ManagerDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ user: string }>();
  const [loading, setLoading] = useState(false);
  
  let user: Partial<User> = {};
  try {
    if (params.user) {
      user = JSON.parse(params.user);
    }
  } catch (e) {
    console.error("Error parsing user data", e);
  }

  const getAddressField = (field: keyof NonNullable<User['address']>) => {
    return (user.address && user.address[field]) ? user.address[field] : "-";
  };

  // Helper to determine badge color based on status
  const isResigned = user.status === "Resigned";

  const handleResign = async () => {
    if (!user._id) return;

    Alert.alert(
      "Confirm Resignation",
      `Are you sure you want to mark ${user.name} as Resigned? \n\nThey will be moved to the Resigned list and will no longer be able to access the dashboard.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Resigned",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              // CHANGE: We use updateUser or updateUserStatus instead of deleteUser
              // This keeps the record in the DB but changes status to 'Resigned'
              
              // Depending on your API implementation, use one of these:
              // Option A (Specific Status Update):
              const response = await api.updateUserStatus(user._id!, "Resigned");
              
              // Option B (Generic Update - if Option A doesn't exist in your utils/api):
              // const response = await api.updateUser(user._id!, { status: "Resigned" });

              if (response.ok) {
                Alert.alert("Success", "Manager marked as Resigned", [
                  { text: "OK", onPress: () => router.back() }
                ]);
              } else {
                // If backend returns HTML error, response.error might be vague
                console.error("API Error:", response); 
                Alert.alert("Error", response.error || "Failed to update status. Check server logs.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Network error occurred");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manager Details</Text>
          <View style={{ width: 28 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          {/* Main Profile Card */}
          <View style={styles.profileCard}>
            <View style={[styles.avatar, isResigned && styles.avatarResigned]}>
              <Text style={[styles.avatarText, isResigned && styles.avatarTextResigned]}>
                {user.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>Logistics Manager</Text>
            
            <View style={[styles.statusBadge, isResigned ? styles.badgeResigned : styles.badgeActive]}>
              <Text style={[styles.statusText, isResigned ? styles.textResigned : styles.textActive]}>
                {user.status || "Active"}
              </Text>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.iconBox}><Mail size={20} color="#0EA5E9" /></View>
              <View>
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconBox}><Phone size={20} color="#0EA5E9" /></View>
              <View>
                <Text style={styles.label}>Phone Number</Text>
                <Text style={styles.value}>{user.phone}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconBox}><Calendar size={20} color="#0EA5E9" /></View>
              <View>
                <Text style={styles.label}>Date of Birth</Text>
                <Text style={styles.value}>{user.dob || "Not Provided"}</Text>
              </View>
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address Details</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.iconBox}><MapPin size={20} color="#0EA5E9" /></View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Formatted Address</Text>
                <Text style={styles.value}>{user.place || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.addressGrid}>
                <View style={styles.addressItem}>
                    <Text style={styles.label}>House/Flat</Text>
                    <Text style={styles.value}>{getAddressField("house")}</Text>
                </View>
                <View style={styles.addressItem}>
                    <Text style={styles.label}>Street</Text>
                    <Text style={styles.value}>{getAddressField("street")}</Text>
                </View>
                <View style={styles.addressItem}>
                    <Text style={styles.label}>City</Text>
                    <Text style={styles.value}>{getAddressField("city")}</Text>
                </View>
                <View style={styles.addressItem}>
                    <Text style={styles.label}>District</Text>
                    <Text style={styles.value}>{getAddressField("district")}</Text>
                </View>
                <View style={styles.addressItem}>
                    <Text style={styles.label}>State</Text>
                    <Text style={styles.value}>{getAddressField("state")}</Text>
                </View>
            </View>
          </View>

          {/* Resign / Delete Button */}
          {/* Only show if not already resigned */}
          {!isResigned && (
            <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleResign}
                disabled={loading}
            >
                {loading ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <>
                    <UserX size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.deleteButtonText}>Mark as Resigned</Text>
                </>
                )}
            </TouchableOpacity>
          )}
          
          {isResigned && (
              <View style={styles.resignedNotice}>
                  <Text style={styles.resignedNoticeText}>This manager has resigned and is inactive.</Text>
              </View>
          )}

          <View style={{ height: 20 }} />

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    marginTop: 30,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backButton: { padding: 4 },
  content: { padding: 20 },
  
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#E0F2FE",
    justifyContent: "center", alignItems: "center", marginBottom: 12
  },
  avatarResigned: { backgroundColor: "#FEE2E2" },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#0EA5E9" },
  avatarTextResigned: { color: "#EF4444" },
  
  name: { fontSize: 22, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  role: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: "#DCFCE7" },
  badgeResigned: { backgroundColor: "#FEE2E2" },
  
  statusText: { fontSize: 12, fontWeight: "600" },
  textActive: { color: "#166534" },
  textResigned: { color: "#991B1B" },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#F1F5F9",
    justifyContent: "center", alignItems: "center", marginRight: 16
  },
  label: { fontSize: 12, color: "#94A3B8", marginBottom: 2, textTransform: "uppercase", fontWeight: "600" },
  value: { fontSize: 15, color: "#334155", fontWeight: "500" },

  addressGrid: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    padding: 15,
    borderRadius: 12,
    gap: 12
  },
  addressItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8
  },
  deleteButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  resignedNotice: {
      padding: 15,
      backgroundColor: "#F1F5F9",
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10
  },
  resignedNoticeText: {
      color: "#64748B",
      fontWeight: '600'
  }
});

export default ManagerDetailsScreen;