import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { api, type User } from "../../utils/api";
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UserX,
  Edit2,
} from "lucide-react-native";

const ManagerDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ user: string }>();

  const [user, setUser] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);

  // Initial Data Parse
  useState(() => {
    try {
      if (params.user) {
        setUser(JSON.parse(params.user));
      }
    } catch (e) {
      console.error("Error parsing user data", e);
    }
  });

  // Refresh data on focus (after edit)
  const fetchUserDetails = async () => {
    if (!user._id) return;
    try {
      const response = await api.getUser(user._id);
      if (response.ok && response.data) {
        setUser(response.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserDetails();
    }, [user._id])
  );

  const handleEdit = () => {
    router.push({
      pathname: "/manager/edit-manager-profile",
      params: { userData: JSON.stringify(user) }
    } as any);
  };

  const getAddressField = (field: keyof NonNullable<User['address']>) => {
    return (user.address && user.address[field]) ? user.address[field] : "-";
  };

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
              const response = await api.updateUserStatus(user._id!, "Resigned");

              if (response.ok) {
                Alert.alert("Success", "Manager marked as Resigned", [
                  { text: "OK", onPress: () => router.back() }
                ]);
              } else {
                Alert.alert("Error", response.error || "Failed to update status.");
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

          {/* EDIT BUTTON */}
          {!isResigned ? (
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Edit2 size={24} color="#2563EB" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>

          {/* Main Profile Card */}
          <View style={styles.profileCard}>
            {user.profilePhoto ? (
              <Image
                source={{ uri: api.getImageUrl(user.profilePhoto) || undefined }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, isResigned && styles.avatarResigned]}>
                <Text style={[styles.avatarText, isResigned && styles.avatarTextResigned]}>
                  {user.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>Logistics Manager</Text>
            <View style={[styles.statusBadge, isResigned ? styles.badgeResigned : styles.badgeActive]}>
              <Text style={[styles.statusText, isResigned ? styles.textResigned : styles.textActive]}>
                {isResigned && user.resignedDate
                  ? `Resigned on ${new Date(user.resignedDate).toLocaleDateString('en-IN')}`
                  : (user.status || "Active")}
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

            <View style={[styles.infoRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
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

            <View style={[styles.infoRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
              <View style={styles.iconBox}><MapPin size={20} color="#0EA5E9" /></View>
              <View style={{ flex: 1 }}>
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
              <View style={[styles.addressItem, { borderBottomWidth: 0 }]}>
                <Text style={styles.label}>State</Text>
                <Text style={styles.value}>{getAddressField("state")}</Text>
              </View>
            </View>
          </View>

          {/* Resign / Delete Button */}
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
              <Text style={styles.resignedNoticeText}>
                This manager has resigned and is inactive.
              </Text>
              {user.resignedDate && (
                <Text style={[styles.resignedNoticeText, { marginTop: 4, fontSize: 13 }]}>
                  Date of Resignation: {new Date(user.resignedDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              )}
            </View>
          )}

          <View style={{ height: 20 }} />

        </ScrollView>
      </View >
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F0F4F8" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF5",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  backButton: { padding: 8 },
  editButton: { padding: 8 },
  content: { padding: 20, paddingTop: 24 },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    resizeMode: "cover",
  },
  avatarResigned: { backgroundColor: "#FEE2E2" },
  avatarText: { fontSize: 40, fontWeight: "800", color: "#0EA5E9" },
  avatarTextResigned: { color: "#EF4444" },

  name: { fontSize: 26, fontWeight: "800", color: "#0F172A", marginBottom: 6, letterSpacing: -0.5 },
  role: { fontSize: 15, color: "#64748B", fontWeight: "600", marginBottom: 16 },

  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  badgeActive: { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#BBF7D0" },
  badgeResigned: { backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA" },

  statusText: { fontSize: 13, fontWeight: "700" },
  textActive: { color: "#166534" },
  textResigned: { color: "#991B1B" },

  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 20, letterSpacing: -0.3 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#F0F4F8" },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    marginTop: 2,
  },
  label: { fontSize: 11, color: "#94A3B8", marginBottom: 4, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5 },
  value: { fontSize: 16, color: "#1E293B", fontWeight: "600" },

  addressGrid: {
    marginTop: 0,
    backgroundColor: "#F8FBFF",
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  addressItem: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  resignedNotice: {
    padding: 20,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  resignedNoticeText: {
    color: "#991B1B",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default ManagerDetailsScreen;

