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
  const [tempDate, setTempDate] = useState(new Date());

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
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setDatePicker((prev) => ({ ...prev, show: false }));
    }
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirmDate = () => {
    if (datePicker.field) {
      const formatted = tempDate.toLocaleDateString('en-GB');
      setForm({ ...form, [datePicker.field]: formatted });
    }
    setDatePicker((prev) => ({ ...prev, show: false }));
  };

  const openDatePicker = (field: string, currentValue: string) => {
    const dateValue = currentValue ? new Date(currentValue) : new Date();
    setTempDate(dateValue);
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

      const response = await api.updateVehicle(initialData._id, {
        ...form,
        branch: "Mukkam",
        district: "Kozhikode"
      });

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
      {datePicker.show && Platform.OS === 'ios' && (
        <Modal visible={datePicker.show} transparent animationType="slide">
          <View style={styles.datePickerModalContainer}>
            <View style={styles.datePickerContent}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Date</Text>
              </View>
              <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  textColor="#fff"
                />
              </View>
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={styles.datePickerCancel}
                  onPress={() => setDatePicker(prev => ({ ...prev, show: false }))}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePickerConfirm}
                  onPress={handleConfirmDate}
                >
                  <Text style={styles.datePickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {datePicker.show && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setDatePicker(prev => ({ ...prev, show: false }));
            if (date) {
              setTempDate(date);
              setTimeout(() => {
                if (datePicker.field) {
                  const formatted = date.toLocaleDateString('en-GB');
                  setForm(prev => ({ ...prev, [datePicker.field!]: formatted }));
                }
              }, 100);
            }
          }}
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
  safeArea: { 
    flex: 1, 
    backgroundColor: "#F5F7FA" 
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
  content: { 
    padding: 24 
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 11, 
    fontWeight: "700", 
    color: "#718096", 
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A202C",
    fontWeight: "500",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputText: { 
    fontSize: 15, 
    color: "#1A202C",
    fontWeight: "500",
  },
  dateBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#1A202C", 
    marginTop: 24,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 56,
    borderRadius: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
  },
  saveBtnText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "flex-end" 
  },
  modalContent: { 
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    marginBottom: 20, 
    color: "#1A202C",
    letterSpacing: 0.3,
  },
  modalItem: { 
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalItemText: { 
    fontSize: 16, 
    color: "#1A202C",
    fontWeight: "600",
  },
  descText: { 
    fontSize: 13, 
    color: "#718096", 
    marginBottom: 16, 
    lineHeight: 20,
    fontWeight: "500",
  },
  photoContainer: { 
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#F0F4F8",
  },
  photoWrapper: { 
    marginRight: 12, 
    position: 'relative' 
  },
  photoItem: { 
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#fff',
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  addPhotoText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#2563EB', 
    marginTop: 6,
    letterSpacing: 0.3,
  },
  profilePhotoSection: { 
    alignItems: 'center', 
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  profilePhotoContainer: { 
    position: 'relative' 
  },
  profilePhoto: { 
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E2E8F0',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  profilePhotoLabel: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1A202C', 
    marginTop: 16,
    letterSpacing: 0.2,
  },
  datePickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  datePickerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  datePickerCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  datePickerConfirm: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  }
});

export default EditVehicleScreen;

