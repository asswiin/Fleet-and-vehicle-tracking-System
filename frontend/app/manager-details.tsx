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
import { api, type User } from "../utils/api"; // Ensure api is imported here
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Trash2 
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

  const handleDelete = async () => {
    if (!user._id) return;

    Alert.alert(
      "Delete Manager",
      `Are you sure you want to remove ${user.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              // Assuming your API has a deleteUser method
              const response = await api.deleteUser(user._id!);

              if (response.ok) {
                Alert.alert("Success", "Manager removed successfully", [
                  { text: "OK", onPress: () => router.back() }
                ]);
              } else {
                Alert.alert("Error", response.error || "Failed to delete manager");
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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>Logistics Manager</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Active</Text>
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

          {/* Delete Button */}
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Trash2 size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.deleteButtonText}>Delete Manager</Text>
              </>
            )}
          </TouchableOpacity>
          
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
  avatarText: { fontSize: 32, fontWeight: "700", color: "#0EA5E9" },
  name: { fontSize: 22, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  role: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  statusBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#166534", fontSize: 12, fontWeight: "600" },

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
  }
});

export default ManagerDetailsScreen;