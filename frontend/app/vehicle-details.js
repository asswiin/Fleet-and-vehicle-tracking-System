import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { 
  ChevronLeft, 
  Truck, 
  Calendar, 
  FileCheck, 
  AlertCircle,
  Weight,
  History,
  Tag
} from "lucide-react-native";

export default function VehicleDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse vehicle data
  let initialVehicle = {};
  try {
    initialVehicle = JSON.parse(params.vehicle);
  } catch (e) {
    console.error("Error parsing vehicle data");
  }

  const [vehicle, setVehicle] = useState(initialVehicle);
  const [loading, setLoading] = useState(false);

  // Helper for Status Color
  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return '#22C55E';
      case 'Sold': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  // --- API CALL TO MARK AS SOLD ---
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
            setLoading(true);
            try {
              // Replace with your IP Address
              const response = await fetch(`http://172.20.10.5:5000/api/vehicles/${vehicle._id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Sold" }),
              });

              if (response.ok) {
                const updatedVehicle = await response.json();
                setVehicle(updatedVehicle); // Update UI immediately
                Alert.alert("Success", "Vehicle marked as Sold.");
              } else {
                Alert.alert("Error", "Failed to update status.");
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

  // Helper for Expiry Status
  const getExpiryStatus = (dateStr) => {
    if (!dateStr) return { text: "Not Set", color: "#94A3B8" };
    const [day, month, year] = dateStr.split("/");
    const expiryDate = new Date(`${year}-${month}-${day}`);
    const today = new Date();
    
    if (expiryDate < today) return { text: "Expired", color: "#EF4444" }; 
    return { text: "Valid", color: "#22C55E" }; 
  };

  const renderDocRow = (label, date) => {
    const status = getExpiryStatus(date);
    return (
      <View style={styles.docRow}>
        <View>
          <Text style={styles.docLabel}>{label}</Text>
          <View style={styles.dateRow}>
            <Calendar size={14} color="#64748B" style={{marginRight:4}} />
            <Text style={styles.docDate}>{date || "N/A"}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: status.color + "20" }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.iconContainer}>
            <Truck size={40} color="#2563EB" />
          </View>
          <Text style={styles.regNumber}>{vehicle.regNumber}</Text>
          <Text style={styles.model}>{vehicle.model}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{vehicle.type}</Text>
          </View>
        </View>

        {/* Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specRow}>
            <View style={styles.specItem}>
              <Weight size={20} color="#64748B" style={{marginBottom:4}} />
              <Text style={styles.specLabel}>Capacity</Text>
              <Text style={styles.specValue}>{vehicle.capacity ? `${vehicle.capacity} Kg` : "N/A"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.specItem}>
              <AlertCircle size={20} color="#64748B" style={{marginBottom:4}} />
              <Text style={styles.specLabel}>Status</Text>
              <Text style={[styles.specValue, {color: getStatusColor(vehicle.status)}]}>
                {vehicle.status || "Active"}
              </Text>
            </View>
          </View>
        </View>

        {/* Compliance Documents */}
        <View style={styles.section}>
          <View style={{flexDirection:'row', alignItems:'center', marginBottom:16}}>
            <FileCheck size={20} color="#0F172A" />
            <Text style={[styles.sectionTitle, {marginBottom:0, marginLeft:8}]}>Compliance Documents</Text>
          </View>
          
          {renderDocRow("Insurance Policy", vehicle.insuranceExpiry)}
          <View style={styles.line} />
          {renderDocRow("Pollution Certificate", vehicle.pollutionExpiry)}
          <View style={styles.line} />
          {renderDocRow("Road Tax", vehicle.taxExpiry)}
        </View>

        {/* Padding for bottom buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- BOTTOM ACTION BUTTONS --- */}
      <View style={styles.footer}>
        
        {/* View History Button */}
        <TouchableOpacity style={styles.historyBtn} onPress={handleViewHistory}>
          <History size={20} color="#1E293B" style={{ marginRight: 8 }} />
          <Text style={styles.historyText}>View History</Text>
        </TouchableOpacity>

        {/* Mark as Sold Button */}
        {vehicle.status === "Sold" ? (
          <View style={styles.soldBadge}>
            <Text style={styles.soldText}>VEHICLE SOLD</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.sellBtn, loading && { opacity: 0.7 }]} 
            onPress={handleMarkAsSold}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Tag size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.sellText}>Mark as Sold</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, backgroundColor: "#fff"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  content: { padding: 20 },
  
  mainCard: {
    backgroundColor: "#fff", padding: 24, borderRadius: 20, alignItems: "center",
    marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#EFF6FF",
    justifyContent: "center", alignItems: "center", marginBottom: 16
  },
  regNumber: { fontSize: 24, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  model: { fontSize: 16, color: "#64748B", marginBottom: 12 },
  typeBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  typeText: { fontSize: 12, fontWeight: "600", color: "#475569", textTransform: "uppercase" },

  section: {
    backgroundColor: "#fff", padding: 20, borderRadius: 16, marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 5, elevation: 1
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  
  specRow: { flexDirection: "row", justifyContent: "space-around" },
  specItem: { alignItems: "center" },
  specLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 2 },
  specValue: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  divider: { width: 1, backgroundColor: "#E2E8F0" },

  docRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  docLabel: { fontSize: 14, fontWeight: "600", color: "#334155" },
  dateRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  docDate: { fontSize: 13, color: "#64748B" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  line: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },

  // --- FOOTER STYLES ---
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', flexDirection: 'row', padding: 20,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 10
  },
  historyBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    paddingVertical: 14, borderRadius: 12
  },
  historyText: { color: '#1E293B', fontWeight: '600', fontSize: 15 },
  sellBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EF4444', // Red
    paddingVertical: 14, borderRadius: 12
  },
  sellText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  soldBadge: {
    flex: 1, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, paddingVertical: 14,
  },
  soldText: { color: '#991B1B', fontWeight: '700', fontSize: 14 }
});