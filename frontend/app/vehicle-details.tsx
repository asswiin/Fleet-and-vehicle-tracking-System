import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { api, type Vehicle } from "../utils/api";
import { 
  ChevronLeft, 
  Truck, 
  FileCheck, 
  AlertCircle,
  History,
  Tag
} from "lucide-react-native";

const VehicleDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicle: string; userRole: string }>();
  
  // Default to 'admin' (view-only) if no role is passed
  const userRole = params.userRole || "admin";

  const [vehicle, setVehicle] = useState<Partial<Vehicle>>({});
  const [loading, setLoading] = useState(false);

  // Load vehicle data on mount
  useEffect(() => {
    try {
      if (params.vehicle) {
        const parsedVehicle = JSON.parse(params.vehicle);
        setVehicle(parsedVehicle);
      }
    } catch (e) {
      console.error("Error parsing vehicle data", e);
      Alert.alert("Error", "Could not load vehicle details");
    }
  }, [params.vehicle]);

  // --- Helpers ---

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'Active': return '#22C55E'; // Green
      case 'Sold': return '#EF4444';   // Red
      default: return '#F59E0B';       // Orange/Amber
    }
  };

  const getExpiryStatus = (dateStr?: string) => {
    if (!dateStr) return { text: "Not Set", color: "#94A3B8" };
    
    // Handle both DD/MM/YYYY and YYYY-MM-DD formats
    let expiryDate: Date;
    
    if (dateStr.includes('/')) {
      // Assuming DD/MM/YYYY
      const [day, month, year] = dateStr.split("/");
      expiryDate = new Date(`${year}-${month}-${day}`);
    } else {
      // Assuming ISO string or other format handled by Date constructor
      expiryDate = new Date(dateStr);
    }

    // Check if date is invalid
    if (isNaN(expiryDate.getTime())) {
       return { text: "Invalid Date", color: "#94A3B8" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
      return { text: "Expired", color: "#EF4444" }; 
    }
    return { text: "Valid", color: "#22C55E" }; 
  };

  // --- Handlers ---

  const handleMarkAsSold = async () => {
    Alert.alert(
      "Confirm Sale",
      "Are you sure you want to mark this vehicle as Sold? This will remove it from active fleet operations.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Mark as Sold", 
          style: "destructive",
          onPress: async () => {
            if (!vehicle._id) return;
            setLoading(true);
            try {
              const response = await api.updateVehicleStatus(vehicle._id, "Sold");

              if (response.ok && response.data) {
                setVehicle(response.data); // Update local state to reflect 'Sold' immediately
                Alert.alert("Success", "Vehicle marked as Sold.");
              } else {
                Alert.alert("Error", response.error || "Failed to update status.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Network error.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleViewHistory = () => {
    Alert.alert("Coming Soon", "Service and Trip history feature is under development.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicle Details</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Main Info Card */}
          <View style={styles.mainCard}>
            <View style={styles.iconContainer}>
              <Truck size={40} color="#0EA5E9" />
            </View>
            <Text style={styles.modelText}>{vehicle.model || "Unknown Model"}</Text>
            <Text style={styles.regText}>{vehicle.regNumber || "No Reg #"}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status) + "20" }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(vehicle.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(vehicle.status) }]}>
                {vehicle.status || "Unknown"}
              </Text>
            </View>
          </View>

          {/* Vehicle Specifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Specifications</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Text style={styles.label}>VEHICLE TYPE</Text>
                <Text style={styles.value}>{vehicle.type || "N/A"}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRight}>
                <Text style={styles.label}>WEIGHT CAPACITY</Text>
                {/* Explicitly check for weight property */}
                <Text style={styles.value}>
                  {vehicle.weight ? `${vehicle.weight} Kg` : "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* Document Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Document Status</Text>
            
            {/* Insurance */}
            <View style={styles.docItem}>
              <View style={styles.docIcon}>
                <FileCheck size={20} color="#0EA5E9" />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.label}>Insurance Expiry</Text>
                <Text style={styles.value}>{vehicle.insuranceDate || "Not Set"}</Text>
              </View>
              <View style={[styles.docBadge, { backgroundColor: getExpiryStatus(vehicle.insuranceDate).color + "20" }]}>
                <Text style={[styles.docBadgeText, { color: getExpiryStatus(vehicle.insuranceDate).color }]}>
                  {getExpiryStatus(vehicle.insuranceDate).text}
                </Text>
              </View>
            </View>

            {/* Pollution */}
            <View style={styles.docItem}>
              <View style={styles.docIcon}>
                <AlertCircle size={20} color="#0EA5E9" />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.label}>Pollution Certificate</Text>
                <Text style={styles.value}>{vehicle.pollutionDate || "Not Set"}</Text>
              </View>
              <View style={[styles.docBadge, { backgroundColor: getExpiryStatus(vehicle.pollutionDate).color + "20" }]}>
                <Text style={[styles.docBadgeText, { color: getExpiryStatus(vehicle.pollutionDate).color }]}>
                  {getExpiryStatus(vehicle.pollutionDate).text}
                </Text>
              </View>
            </View>

            {/* Road Tax */}
            <View style={styles.docItem}>
              <View style={styles.docIcon}>
                <Tag size={20} color="#0EA5E9" />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.label}>Road Tax</Text>
                <Text style={styles.value}>{vehicle.taxDate || "Not Set"}</Text>
              </View>
              <View style={[styles.docBadge, { backgroundColor: getExpiryStatus(vehicle.taxDate).color + "20" }]}>
                <Text style={[styles.docBadgeText, { color: getExpiryStatus(vehicle.taxDate).color }]}>
                  {getExpiryStatus(vehicle.taxDate).text}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {/* Everyone can view history */}
            <TouchableOpacity style={styles.outlineButton} onPress={handleViewHistory}>
              <History size={20} color="#0EA5E9" style={{ marginRight: 8 }} />
              <Text style={styles.outlineButtonText}>View History</Text>
            </TouchableOpacity>
            
            {/* 
              CONDITIONAL: 
              1. Must be MANAGER
              2. Vehicle must NOT be Sold
            */}
            {userRole === "manager" && vehicle.status !== "Sold" && (
              <TouchableOpacity 
                style={styles.dangerButton} 
                onPress={handleMarkAsSold}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.dangerButtonText}>Mark as Sold</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

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
    padding: 20,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  content: { padding: 20 },
  
  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modelText: { fontSize: 20, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  regText: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLeft: { flex: 1 },
  infoDivider: { width: 1, height: 40, backgroundColor: "#E2E8F0", marginHorizontal: 12 },
  infoRight: { flex: 1 },
  label: { fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 4, textTransform: "uppercase" },
  value: { fontSize: 15, fontWeight: "600", color: "#1E293B" },

  docItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  docInfo: { flex: 1 },
  docBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  docBadgeText: { fontSize: 11, fontWeight: "600" },

  actionContainer: { flexDirection: "row", gap: 12, marginBottom: 40 },
  outlineButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#0EA5E9",
  },
  outlineButtonText: { color: "#0EA5E9", fontWeight: "600", fontSize: 14 },
  dangerButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#EF4444",
  },
  dangerButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

export default VehicleDetailsScreen;