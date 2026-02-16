import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from "../../utils/api";
import {
  ChevronLeft,
  ChevronDown,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Cloud,
  FileText,
  Camera,
  Plus,
  X,
  Image as ImageIcon,
  Truck
} from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { Image } from "react-native";

const VEHICLE_TYPES = ["Truck", "Lorry", "Pickups", "Container"];

interface VehicleForm {
  regNumber: string;
  model: string;
  type: string;
  weight: string;
  insuranceDate: string;
  pollutionDate: string;
  taxDate: string;
  vehiclePhotos: string[];
  profilePhoto: string;
}

interface DatePickerState {
  show: boolean;
  field: keyof VehicleForm | null;
  value: Date;
}

const RegisterVehicleScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<VehicleForm>({
    regNumber: "",
    model: "",
    type: "",
    weight: "",
    insuranceDate: "",
    pollutionDate: "",
    taxDate: "",
    vehiclePhotos: [],
    profilePhoto: ""
  });

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [datePicker, setDatePicker] = useState<DatePickerState>({
    show: false,
    field: null,
    value: new Date()
  });

  // ------------------------------------------------------------------
  // UPDATED REGISTRATION NUMBER LOGIC
  // ------------------------------------------------------------------

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

  // ------------------------------------------------------------------

  // Date Picker Logic
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePicker(prev => ({ ...prev, show: false }));
    }
    if (selectedDate && datePicker.field) {
      const formatted = selectedDate.toLocaleDateString('en-GB');
      setForm({ ...form, [datePicker.field]: formatted });
    }
  };

  const openDatePicker = (field: keyof VehicleForm) => {
    setDatePicker({ show: true, field, value: new Date() });
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

  const handleSubmit = async () => {
    // Validation
    if (!form.regNumber || !form.type || !form.model) {
      Alert.alert("Missing Fields", "Please fill Registration Number, Model and Type");
      return;
    }

    if (!validateRegNumber(form.regNumber)) {
      Alert.alert("Invalid Format", "Format should be like: KL 07 AB 1234 or KL 07 A 1");
      return;
    }

    setLoading(true);

    try {
      const response = await api.registerVehicle(form);

      if (response.ok) {
        Alert.alert("Success", "Vehicle Registered Successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Error", response.error || "Registration failed");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Registration</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

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

        {/* Registration Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registration Number</Text>
          <TextInput
            style={styles.input}
            placeholder="KL 07 AB 1234"
            placeholderTextColor="#94A3B8"
            value={form.regNumber}
            onChangeText={handleRegNumberChange}
            autoCapitalize="characters"
            maxLength={13} // Allows for spaces in max length format
          />
          <Text style={styles.helperText}>Format: State Dist Series Number (e.g. KL 07 A 1)</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Model Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2023"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={form.model}
            onChangeText={(t) => setForm({ ...form, model: t.replace(/[^0-9]/g, '') })}
          />
        </View>

        {/* Vehicle Type Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Type</Text>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowTypeModal(true)}>
            <Text style={[styles.inputText, !form.type && { color: "#94A3B8" }]}>
              {form.type || "Select type"}
            </Text>
            <ChevronDown size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight Capacity (Kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2500"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={form.weight}
            onChangeText={(t) => setForm({ ...form, weight: t })}
          />
        </View>

        {/* Document Expiry Section */}
        <View style={styles.sectionHeader}>
          <Calendar size={20} color="#2563EB" />
          <Text style={styles.sectionTitle}>Document Expiry</Text>
        </View>
        <Text style={styles.descText}>Set the expiration dates for mandatory compliance.</Text>

        {/* Insurance Expiry */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Insurance Expiry</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('insuranceDate')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldCheck size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <Text style={[styles.inputText, !form.insuranceDate && { color: "#94A3B8" }]}>
                {form.insuranceDate || "mm/dd/yyyy"}
              </Text>
            </View>
            <Calendar size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Pollution Certificate */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pollution Certificate</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('pollutionDate')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Cloud size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <Text style={[styles.inputText, !form.pollutionDate && { color: "#94A3B8" }]}>
                {form.pollutionDate || "mm/dd/yyyy"}
              </Text>
            </View>
            <Calendar size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Road Tax */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Road Tax</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('taxDate')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FileText size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <Text style={[styles.inputText, !form.taxDate && { color: "#94A3B8" }]}>
                {form.taxDate || "mm/dd/yyyy"}
              </Text>
            </View>
            <Calendar size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Vehicle Photos */}
        <View style={styles.sectionHeader}>
          <Camera size={20} color="#2563EB" />
          <Text style={styles.sectionTitle}>Vehicle Photos (Optional)</Text>
        </View>
        <Text style={styles.descText}>Add photos of the vehicle from different angles.</Text>

        <View style={styles.photoContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {form.vehiclePhotos.map((photo, index) => (
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

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>{loading ? "Registering..." : "Register Vehicle"}</Text>
          {!loading && <CheckCircle2 size={20} color="#fff" style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Picker Component */}
      {datePicker.show && (
        <DateTimePicker
          value={datePicker.value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      {/* Dropdown Modal */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowTypeModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Vehicle Type</Text>
            <FlatList
              data={VEHICLE_TYPES}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setForm({ ...form, type: item });
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, form.type === item && { color: '#2563EB', fontWeight: 'bold' }]}>
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
    padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F1F5F9"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  content: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 8 },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12,
    height: 50, paddingHorizontal: 16, fontSize: 15, color: "#0F172A"
  },
  helperText: { fontSize: 12, color: "#64748B", marginTop: 4 },
  inputText: { fontSize: 15, color: "#0F172A" },
  dropdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12,
    height: 50, paddingHorizontal: 16
  },
  dateBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12,
    height: 50, paddingHorizontal: 16
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 15, marginBottom: 5 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginLeft: 8 },
  descText: { fontSize: 13, color: "#64748B", marginBottom: 20, lineHeight: 18 },
  submitBtn: {
    backgroundColor: "#2563EB",
    height: 56, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center",
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#0F172A' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' },
  modalItemText: { fontSize: 16, color: '#334155' },
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

export default RegisterVehicleScreen;

