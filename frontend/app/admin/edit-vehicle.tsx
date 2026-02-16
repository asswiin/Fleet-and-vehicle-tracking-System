import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api } from "../../utils/api";
import {
  ChevronLeft,
  Save,
  ChevronDown,
  Calendar,
  ShieldCheck,
  Cloud,
  FileText,
  CheckCircle2,
  Camera,
  Plus,
  X,
  Image as ImageIcon,
  Truck
} from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { Image } from "react-native";

const VEHICLE_TYPES = ["Truck", "Lorry", "Pickups", "Container"];

const EditVehicleScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleData: string }>();
  const [loading, setLoading] = useState(false);

  // Parse initial data
  let initialData: any = {};
  try {
    if (params.vehicleData) initialData = JSON.parse(params.vehicleData);
  } catch (e) {
    console.error("Error parsing vehicle data", e);
  }

  // Form State
  const [form, setForm] = useState({
    regNumber: initialData.regNumber || "",
    model: initialData.model || "",
    type: initialData.type || "",
    weight: initialData.capacity?.toString() || initialData.weight?.toString() || "",
    insuranceDate: initialData.insuranceExpiry || initialData.insuranceDate || "",
    pollutionDate: initialData.pollutionExpiry || initialData.pollutionDate || "",
    taxDate: initialData.taxExpiry || initialData.taxDate || "",
    vehiclePhotos: initialData.vehiclePhotos || [],
    profilePhoto: initialData.profilePhoto || ""
  });

  // UI State
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [datePicker, setDatePicker] = useState<{ show: boolean; field: string | null; value: Date }>({
    show: false,
    field: null,
    value: new Date(),
  });

  // Handle Registration Number Input with Formatting
  const handleRegNumberChange = (text: string) => {
    // 1. Clean input: Remove non-alphanumeric, convert to uppercase
    let cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 2. Limit Raw Length (State(2)+Dist(2)+Series(2)+Num(4) = Max 10 chars)
    if (cleaned.length > 10) {
      cleaned = cleaned.substring(0, 10);
    }

    let formatted = "";

    // 3. Construct the formatted string

    // Part 1: State (First 2 chars)
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 2);
    }

    // Part 2: District (Next 2 chars)
    if (cleaned.length >= 3) {
      formatted += " " + cleaned.substring(2, 4);
    }

    // Part 3: Series (1 or 2 Letters) & Number (1 to 4 Digits)
    if (cleaned.length >= 5) {
      const remaining = cleaned.substring(4);

      // Regex separates Letters (Series) from Digits (Number)
      const match = remaining.match(/^([A-Z]*)([0-9]*)$/);

      if (match) {
        const series = match[1]; // Captured letters
        const number = match[2]; // Captured numbers

        // Add space before Series if series exists
        if (series.length > 0) {
          formatted += " " + series;
        }

        // Add space before Number if number exists
        if (number.length > 0) {
          formatted += " " + number;
        }
      } else {
        formatted += " " + remaining;
      }
    }

    setForm({ ...form, regNumber: formatted });
  };

  const validateRegNumber = (reg: string): boolean => {
    // Format: 
    // ^[A-Z]{2}    -> 2 Letters (State)
    // \s[0-9]{2}   -> Space + 2 Numbers (District)
    // \s[A-Z]{1,2} -> Space + 1 or 2 Letters (Series)
    // \s[0-9]{1,4} -> Space + 1 to 4 Numbers (Unique ID)
    const regex = /^[A-Z]{2}\s[0-9]{2}\s[A-Z]{1,2}\s[0-9]{1,4}$/;
    return regex.test(reg);
  };

  // Helper to handle date changes
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setDatePicker((prev) => ({ ...prev, show: false }));
    }

    if (selectedDate && datePicker.field) {
      // Keep ISO string for backend, or standard format depending on your DB preference
      // Here we store ISO string
      setForm({ ...form, [datePicker.field]: selectedDate.toISOString() });
    }
  };

  const openDatePicker = (field: string, currentValue: string) => {
    const dateValue = currentValue ? new Date(currentValue) : new Date();
    setDatePicker({ show: true, field, value: dateValue });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const newPhotos = result.assets
        .map(asset => asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null)
        .filter(photo => photo !== null) as string[];

      setForm(prev => ({
        ...prev,
        vehiclePhotos: [...(prev.vehiclePhotos || []), ...newPhotos]
      }));
    }
  };

  const removeImage = (index: number) => {
    const updatedPhotos = [...form.vehiclePhotos];
    updatedPhotos.splice(index, 1);
    setForm({ ...form, vehiclePhotos: updatedPhotos });
  };

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setForm({ ...form, profilePhoto: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  // Format date for display
  const displayDate = (isoString: string) => {
    if (!isoString) return "Select Date";
    return new Date(isoString).toLocaleDateString("en-GB");
  };

  const handleUpdate = async () => {
    if (!form.regNumber || !form.model || !form.type) {
      Alert.alert("Validation Error", "Reg Number, Model and Type are required.");
      return;
    }

    if (!validateRegNumber(form.regNumber)) {
      Alert.alert("Invalid Registration Number", "Please enter a valid registration number in format: KL 01 AB 1234");
      return;
    }

    setLoading(true);

    try {
      // Check if registration number already exists for a different vehicle
      const vehiclesResponse = await api.getVehicles();
      if (vehiclesResponse.ok && vehiclesResponse.data) {
        const isDuplicate = vehiclesResponse.data.some(
          (vehicle: any) =>
            vehicle.regNumber === form.regNumber &&
            vehicle._id !== initialData._id // Exclude current vehicle
        );

        if (isDuplicate) {
          Alert.alert("Registration Number Already Exists", "This registration number is already registered for another vehicle.");
          setLoading(false);
          return;
        }
      }

      const response = await api.updateVehicle(initialData._id, form);

      if (response.ok) {
        Alert.alert("Success", "Vehicle details updated successfully", [
          {
            text: "OK",
            onPress: () => {
              // Navigate back two steps (to list) or one step (to details)
              // Using replace to refresh details might be better logic, 
              // but simple back works if we use useFocusEffect in details/list
              router.back();
            }
          },
        ]);
      } else {
        Alert.alert("Error", response.error || "Update failed");
      }
    } catch (error) {
      Alert.alert("Error", "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Vehicle</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Photo Section */}
        <View style={styles.profilePhotoSection}>
          <TouchableOpacity onPress={pickProfilePhoto} style={styles.profilePhotoContainer}>
            {form.profilePhoto ? (
              <Image source={{ uri: form.profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Truck size={40} color="#94A3B8" />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Camera size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profilePhotoLabel}>Vehicle Profile Photo</Text>
        </View>

        {/* Reg Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registration Number</Text>
          <TextInput
            style={styles.input}
            value={form.regNumber}
            onChangeText={handleRegNumberChange}
            placeholder="KL 01 AB 1234"
            maxLength={13}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Model Number</Text>
          <TextInput
            style={styles.input}
            value={form.model}
            keyboardType="numeric"
            placeholder="e.g. 2023"
            onChangeText={(t) => setForm({ ...form, model: t.replace(/[^0-9]/g, '') })}
          />
        </View>

        {/* Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Type</Text>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowTypeModal(true)}>
            <Text style={styles.inputText}>{form.type || "Select Type"}</Text>
            <ChevronDown size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight Capacity (Kg)</Text>
          <TextInput
            style={styles.input}
            value={form.weight}
            keyboardType="numeric"
            onChangeText={(t) => setForm({ ...form, weight: t })}
          />
        </View>

        <Text style={styles.sectionTitle}>Document Expiry Dates</Text>

        {/* Insurance */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Insurance Expiry</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker("insuranceDate", form.insuranceDate)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ShieldCheck size={18} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.inputText}>{displayDate(form.insuranceDate)}</Text>
            </View>
            <Calendar size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Pollution */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pollution Certificate Expiry</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker("pollutionDate", form.pollutionDate)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Cloud size={18} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.inputText}>{displayDate(form.pollutionDate)}</Text>
            </View>
            <Calendar size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Tax */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Road Tax Expiry</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker("taxDate", form.taxDate)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FileText size={18} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.inputText}>{displayDate(form.taxDate)}</Text>
            </View>
            <Calendar size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Vehicle Photos */}
        <Text style={styles.sectionTitle}>Vehicle Photos (Optional)</Text>
        <Text style={styles.descText}>Add/Update photos of the vehicle.</Text>

        <View style={styles.photoContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {form.vehiclePhotos.map((photo: string, index: number) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photoItem} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => removeImage(index)}
                >
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
              <Plus size={24} color="#2563EB" />
              <Text style={styles.addPhotoText}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={{ height: 20 }} />

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.7 }]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.saveBtnText}>Update Vehicle</Text>
              <Save size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Date Picker */}
      {datePicker.show && (
        <DateTimePicker
          value={datePicker.value}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
        />
      )}

      {/* Type Modal */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowTypeModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Vehicle Type</Text>
            <FlatList
              data={VEHICLE_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setForm({ ...form, type: item });
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, form.type === item && { color: "#2563EB", fontWeight: "bold" }]}>
                    {item}
                  </Text>
                  {form.type === item && <CheckCircle2 size={18} color="#2563EB" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
  content: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: "#1E293B",
  },
  dropdownBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  inputText: { fontSize: 15, color: "#1E293B" },
  dateBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 10, marginBottom: 15 },
  saveBtn: {
    backgroundColor: "#2563EB", flexDirection: "row", justifyContent: "center", alignItems: "center",
    height: 50, borderRadius: 12, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 15, color: "#0F172A" },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", flexDirection: "row", justifyContent: "space-between" },
  modalItemText: { fontSize: 16, color: "#334155" },
  descText: { fontSize: 13, color: "#64748B", marginBottom: 15, lineHeight: 18 },
  photoContainer: { marginBottom: 20 },
  photoWrapper: { marginRight: 12, position: 'relative' },
  photoItem: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#E2E8F0' },
  removePhotoBtn: {
    position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444',
    borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center'
  },
  addPhotoBtn: {
    width: 100, height: 100, borderRadius: 12, borderStyle: 'dashed',
    borderWidth: 2, borderColor: '#2563EB', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EFF6FF'
  },
  addPhotoText: { fontSize: 12, fontWeight: '600', color: '#2563EB', marginTop: 4 },
  profilePhotoSection: { alignItems: 'center', marginBottom: 24 },
  profilePhotoContainer: { position: 'relative' },
  profilePhoto: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E2E8F0' },
  profilePlaceholder: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1'
  },
  cameraIconBadge: {
    position: 'absolute', bottom: 5, right: 5, backgroundColor: '#2563EB',
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff'
  },
  profilePhotoLabel: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 10 }
});

export default EditVehicleScreen;

