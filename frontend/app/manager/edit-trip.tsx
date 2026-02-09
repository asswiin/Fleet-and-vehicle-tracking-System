import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  StatusBar
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Save, User, Truck, CheckCircle, AlertTriangle } from "lucide-react-native";
import { api, Driver, Vehicle } from "../../utils/api";

const EditTripScreen = () => {
  const router = useRouter();
  const { tripId, tripData } = useLocalSearchParams<{ tripId: string; tripData: string }>();
  
  // Parse initial data
  const initialTrip = JSON.parse(tripData || "{}");

  const [selectedDriver, setSelectedDriver] = useState<string>(initialTrip.driverId?._id || "");
  const [selectedVehicle, setSelectedVehicle] = useState<string>(initialTrip.vehicleId?._id || "");
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [loadingResources, setLoadingResources] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);


  // --- Vehicle Capacity Logic (copied from select-vehicle.tsx) ---
  // Calculate total parcel weight for this trip
  const totalWeight = Array.isArray(initialTrip.parcelIds)
    ? initialTrip.parcelIds.reduce((sum: number, p: any) => sum + (parseFloat(p.weight) || 0), 0)
    : 0;

  const getVehicleCapacity = (vehicle: Vehicle): number => {
    if (vehicle.capacity) {
      const capacityNum = parseFloat(vehicle.capacity);
      if (!isNaN(capacityNum) && capacityNum > 0) {
        return capacityNum;
      }
    }
    return getDefaultCapacity(vehicle.type);
  };

  const getDefaultCapacity = (type: string): number => {
    switch (type?.toLowerCase()) {
      case "van": return 1000;
      case "box truck": return 3000;
      case "truck": return 5000;
      default: return 600;
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        api.getDrivers(),
        api.getVehicles()
      ]);

      if (driversRes.ok && driversRes.data) {
        const driverList = Array.isArray(driversRes.data) ? driversRes.data : (driversRes.data as any).data;
        const available = driverList.filter((d: Driver) => 
          (d.status === "Active" && d.isAvailable && d.driverStatus !== "On-trip") || d._id === initialTrip.driverId?._id
        );
        setDrivers(available);
      }

      if (vehiclesRes.ok && vehiclesRes.data) {
        // Only show vehicles with enough capacity for the trip's total parcel weight
        const vehicleList = vehiclesRes.data.filter((v: Vehicle) => {
          // Allow current vehicle even if it doesn't meet criteria (for edit)
          if (v._id === initialTrip.vehicleId?._id) return true;
          // Only show if Active and has enough capacity
          const isActive = v.status === "Active";
          const vehicleCapacity = getVehicleCapacity(v);
          return isActive && vehicleCapacity >= totalWeight;
        });
        setVehicles(vehicleList);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load resources");
    } finally {
      setLoadingResources(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDriver || !selectedVehicle) {
      Alert.alert("Error", "Driver and Vehicle cannot be empty");
      return;
    }

    const isDriverChanging = selectedDriver !== initialTrip.driverId?._id;

    const confirmMessage = isDriverChanging
      ? "You are changing the driver. The new driver will receive a notification to accept this trip."
      : "Save changes to vehicle assignment?";

    Alert.alert("Confirm Update", confirmMessage, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Confirm", 
        onPress: async () => {
          performUpdate();
        } 
      }
    ]);
  };

  const performUpdate = async () => {
    setSaving(true);
    try {
      const response = await api.updateTripResources(tripId, {
        driverId: selectedDriver,
        vehicleId: selectedVehicle,
        // managerId: "..." // Pass manager ID here if available in context/params
      });

      if (response.ok) {
        Alert.alert(
          "Success", 
          "Trip updated successfully! " + (selectedDriver !== initialTrip.driverId?._id ? "New driver has been notified." : ""), 
          [{ 
            text: "OK", 
            onPress: () => {
              // Redirect to Manager Dashboard after editing
              router.push("/manager/manager-dashboard" as any);
            } 
          }]
        );
      } else {
        Alert.alert("Error", response.error || "Failed to update trip");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Helper to find name by ID for display
  const getDriverName = (id: string) => drivers.find(d => d._id === id)?.name || "Unknown";
  const getVehicleName = (id: string) => vehicles.find(v => v._id === id)?.regNumber || "Unknown";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Trip Assignment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningBox}>
          <AlertTriangle size={20} color="#D97706" />
          <Text style={styles.warningText}>
            Changing the driver will send a new assignment notification. The trip status will revert to "Pending" until accepted.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Trip #{initialTrip.tripId}</Text>

        {/* Driver Selection */}
        <Text style={styles.label}>Assigned Driver</Text>
        <TouchableOpacity 
          style={styles.selector} 
          onPress={() => setShowDriverModal(true)}
        >
          <View style={styles.selectorContent}>
            <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
              <User size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.selectorLabel}>Driver</Text>
              <Text style={styles.selectorText}>{getDriverName(selectedDriver)}</Text>
            </View>
          </View>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        {/* Vehicle Selection */}
        <Text style={styles.label}>Assigned Vehicle</Text>
        <TouchableOpacity 
          style={styles.selector}
          onPress={() => setShowVehicleModal(true)}
        >
          <View style={styles.selectorContent}>
            <View style={[styles.iconBox, { backgroundColor: "#F3E8FF" }]}>
              <Truck size={20} color="#9333EA" />
            </View>
            <View>
              <Text style={styles.selectorLabel}>Vehicle</Text>
              <Text style={styles.selectorText}>{getVehicleName(selectedVehicle)}</Text>
            </View>
          </View>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.disabledBtn]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes & Notify</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Driver Modal */}
      <Modal visible={showDriverModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDriverModal(false)}>
              <ArrowLeft size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Driver</Text>
            <View style={{ width: 24 }} />
          </View>
          {loadingResources ? <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 20}} /> : (
            <FlatList
              data={drivers}
              keyExtractor={item => item._id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.modalItem, selectedDriver === item._id && styles.modalItemSelected]}
                  onPress={() => {
                    setSelectedDriver(item._id);
                    setShowDriverModal(false);
                  }}
                >
                  <View>
                    <Text style={[styles.itemTitle, selectedDriver === item._id && {color: "#2563EB"}]}>{item.name}</Text>
                    <Text style={styles.itemSub}>{item.mobile} • {item.driverStatus || "Available"}</Text>
                  </View>
                  {selectedDriver === item._id && <CheckCircle size={20} color="#2563EB" />}
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Vehicle Modal */}
      <Modal visible={showVehicleModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
              <ArrowLeft size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Vehicle</Text>
            <View style={{ width: 24 }} />
          </View>
          {loadingResources ? <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 20}} /> : (
            <FlatList
              data={vehicles}
              keyExtractor={item => item._id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.modalItem, selectedVehicle === item._id && styles.modalItemSelected]}
                  onPress={() => {
                    setSelectedVehicle(item._id);
                    setShowVehicleModal(false);
                  }}
                >
                  <View>
                    <Text style={[styles.itemTitle, selectedVehicle === item._id && {color: "#2563EB"}]}>{item.regNumber}</Text>
                    <Text style={styles.itemSub}>{item.model} • {item.capacity}kg</Text>
                  </View>
                  {selectedVehicle === item._id && <CheckCircle size={20} color="#2563EB" />}
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
  content: { padding: 20 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 20 },
  
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
    marginBottom: 24,
    gap: 12,
  },
  warningText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 20 },

  label: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  selector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20, shadowColor: "#000", shadowOffset: {width:0, height:1}, shadowOpacity:0.05, shadowRadius:2, elevation: 1 },
  selectorContent: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  selectorLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  selectorText: { fontSize: 16, color: "#0F172A", fontWeight: "700" },
  changeText: { color: "#2563EB", fontWeight: "600", fontSize: 14 },
  
  saveBtn: { backgroundColor: "#2563EB", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 18, borderRadius: 16, gap: 8, marginTop: 20, shadowColor: "#2563EB", shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:8, elevation: 6 },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalItemSelected: { backgroundColor: "#EFF6FF" },
  itemTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  itemSub: { fontSize: 13, color: "#64748B", marginTop: 4 },
});

export default EditTripScreen;