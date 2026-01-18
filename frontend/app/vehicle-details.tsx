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
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router"; // Add useFocusEffect
import { useState, useCallback } from "react";
import { api } from "../utils/api";
import { 
  ChevronLeft, 
  Truck, 
  FileCheck, 
  AlertCircle,
  History,
  Tag,
  Edit2 // Import Edit Icon
} from "lucide-react-native";

const VehicleDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicle: string; userRole: string }>();
  
  const userRole = params.userRole || "admin";

  const [vehicle, setVehicle] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // 1. Initial Load from Params
  useState(() => {
    try {
      if (params.vehicle) {
        const parsedVehicle = JSON.parse(params.vehicle);
        setVehicle(parsedVehicle);
      }
    } catch (e) {
      console.error("Error parsing vehicle data", e);
    }
  });

  // 2. REFRESH DATA ON FOCUS (Crucial for seeing changes after edit)
  const fetchLatestDetails = async () => {
    if (!vehicle._id) return;
    try {
      // Assuming you have getVehicle API logic or use getVehicles and filter
      const res = await api.getVehicle(vehicle._id);
      if (res.ok && res.data) {
        setVehicle(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLatestDetails();
    }, [vehicle._id]) // Dependency on ID ensures it runs if ID exists
  );

  // --- Date Helpers (Keep existing logic) ---
  const parseDate = (dateInput?: string): Date | null => {
    if (!dateInput) return null;
    if (dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) return date;
    return null;
  };

  const formatDateForDisplay = (dateInput?: string) => {
    const date = parseDate(dateInput);
    if (!date) return "Not Set";
    return date.toLocaleDateString('en-GB');
  };

  const getExpiryStatus = (dateInput?: string) => {
    const date = parseDate(dateInput);
    if (!date) return { text: "Not Set", color: "#94A3B8" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return { text: "Expired", color: "#EF4444" }; 
    return { text: "Valid", color: "#22C55E" }; 
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'Active': return '#22C55E';
      case 'Sold': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  // DB key accessors
  const getTaxDate = () => vehicle.taxExpiry || vehicle.taxDate || vehicle.roadTaxExpiry;
  const getInsuranceDate = () => vehicle.insuranceExpiry || vehicle.insuranceDate || vehicle.insurance_date;
  const getPollutionDate = () => vehicle.pollutionExpiry || vehicle.pollutionDate || vehicle.pollution_date;
  const getWeight = () => vehicle.capacity || vehicle.weight || vehicle.weightCapacity; // Added 'capacity' check

  // --- Handlers ---

  const handleMarkAsSold = async () => {
    // ... (Existing logic for selling)
    Alert.alert("Confirm Sale", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Mark as Sold", style: "destructive", onPress: async () => {
            if(!vehicle._id) return;
            setLoading(true);
            try {
                const res = await api.updateVehicleStatus(vehicle._id, "Sold");
                if(res.ok && res.data) { setVehicle(res.data); Alert.alert("Success", "Vehicle marked as sold"); }
            } catch(e) { Alert.alert("Error", "Network Error"); } finally { setLoading(false); }
        }}
    ]);
  };

  const handleEdit = () => {
    router.push({
        pathname: "edit-vehicle",
        params: { vehicleData: JSON.stringify(vehicle) }
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicle Details</Text>
          
          {/* EDIT BUTTON (Manager Only) */}
          {userRole === 'manager' ? (
             <TouchableOpacity onPress={handleEdit} style={styles.iconBtn}>
               <Edit2 size={24} color="#2563EB" />
             </TouchableOpacity>
          ) : (
             <View style={{ width: 28 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* ... (Existing Main Card & Info) ... */}
          <View style={styles.mainCard}>
            <View style={styles.iconContainer}>
              <Truck size={40} color="#0EA5E9" />
            </View>
            <Text style={styles.modelText}>{vehicle.regNumber || "No Reg #"}</Text>
            <Text style={styles.regText}>{vehicle.model || "Unknown Model"}</Text>
            
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
                <Text style={styles.value}>
                  {getWeight() ? `${getWeight()} Kg` : "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* ... (Existing Document Status Section) ... */}
          <View style={styles.section}>
             {/* Insurance, Pollution, Tax items as per your existing file */}
             <Text style={styles.sectionTitle}>Document Status</Text>
             {/* ... (Copy paste your existing docItem views here) ... */}
             <View style={styles.docItem}>
                <View style={styles.docIcon}><FileCheck size={20} color="#0EA5E9" /></View>
                <View style={styles.docInfo}>
                    <Text style={styles.label}>Insurance Expiry</Text>
                    <Text style={styles.value}>{formatDateForDisplay(getInsuranceDate())}</Text>
                </View>
                <View style={[styles.docBadge, { backgroundColor: getExpiryStatus(getInsuranceDate()).color + "20" }]}>
                    <Text style={[styles.docBadgeText, { color: getExpiryStatus(getInsuranceDate()).color }]}>{getExpiryStatus(getInsuranceDate()).text}</Text>
                </View>
             </View>
             {/* Repeat for Pollution and Tax... */}
             <View style={styles.docItem}>
                <View style={styles.docIcon}><AlertCircle size={20} color="#0EA5E9" /></View>
                <View style={styles.docInfo}>
                    <Text style={styles.label}>Pollution Certificate</Text>
                    <Text style={styles.value}>{formatDateForDisplay(getPollutionDate())}</Text>
                </View>
                <View style={[styles.docBadge, { backgroundColor: getExpiryStatus(getPollutionDate()).color + "20" }]}>
                    <Text style={[styles.docBadgeText, { color: getExpiryStatus(getPollutionDate()).color }]}>{getExpiryStatus(getPollutionDate()).text}</Text>
                </View>
             </View>
              <View style={styles.docItem}>
                <View style={styles.docIcon}><Tag size={20} color="#0EA5E9" /></View>
                <View style={styles.docInfo}>
                    <Text style={styles.label}>Road Tax</Text>
                    <Text style={styles.value}>{formatDateForDisplay(getTaxDate())}</Text>
                </View>
                <View style={[styles.docBadge, { backgroundColor: getExpiryStatus(getTaxDate()).color + "20" }]}>
                    <Text style={[styles.docBadgeText, { color: getExpiryStatus(getTaxDate()).color }]}>{getExpiryStatus(getTaxDate()).text}</Text>
                </View>
             </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.outlineButton} onPress={() => Alert.alert("Info", "Coming soon")}>
              <History size={20} color="#0EA5E9" style={{ marginRight: 8 }} />
              <Text style={styles.outlineButtonText}>View History</Text>
            </TouchableOpacity>
            
            {userRole === "manager" && vehicle.status !== "Sold" && (
              <TouchableOpacity style={styles.dangerButton} onPress={handleMarkAsSold} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerButtonText}>Mark as Sold</Text>}
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
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F1F5F9"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  iconBtn: { padding: 4 },
  content: { padding: 20 },
  mainCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  iconContainer: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: "#E0F2FE",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  modelText: { fontSize: 20, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  regText: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },
  section: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLeft: { flex: 1 },
  infoDivider: { width: 1, height: 40, backgroundColor: "#E2E8F0", marginHorizontal: 12 },
  infoRight: { flex: 1 },
  label: { fontSize: 11, fontWeight: "700", color: "#94A3B8", marginBottom: 4, textTransform: "uppercase" },
  value: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  docItem: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  docIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#F1F5F9",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  docInfo: { flex: 1 },
  docBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  docBadgeText: { fontSize: 11, fontWeight: "600" },
  actionContainer: { flexDirection: "row", gap: 12, marginBottom: 40 },
  outlineButton: {
    flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center",
    paddingVertical: 12, borderRadius: 8, borderWidth: 2, borderColor: "#0EA5E9",
  },
  outlineButtonText: { color: "#0EA5E9", fontWeight: "600", fontSize: 14 },
  dangerButton: {
    flex: 1, justifyContent: "center", alignItems: "center",
    paddingVertical: 12, borderRadius: 8, backgroundColor: "#EF4444",
  },
  dangerButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

export default VehicleDetailsScreen;