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
  KeyboardAvoidingView,
  ActivityIndicator,
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
  const [tempDate, setTempDate] = useState(new Date());

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
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePicker(prev => ({ ...prev, show: false }));
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
    setDatePicker(prev => ({ ...prev, show: false }));
  };

  const openDatePicker = (field: keyof VehicleForm) => {
    setTempDate(new Date());
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
      const response = await api.registerVehicle({
        ...form,
        branch: "Mukkam",
        district: "Kozhikode"
      });

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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>FLEET MANAGEMENT</Text>
            <Text style={styles.headerTitle}>Vehicle Registration</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.formContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Photo Section */}
            <View style={styles.profilePhotoSection}>
              <TouchableOpacity onPress={pickProfilePhoto} style={styles.profilePhotoContainer} activeOpacity={0.8}>
                {form.profilePhoto ? (
                  <Image source={{ uri: form.profilePhoto }} style={styles.profilePhoto} />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Truck size={40} color="#94A3B8" />
                    <Text style={styles.placeholderLabel}>Add Profile</Text>
                  </View>
                )}
                <View style={styles.cameraIconBadge}>
                  <Camera size={14} color="#fff" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
              <Text style={styles.profilePhotoLabel}>MAIN VEHICLE PROFILE</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeaderContainer}>
                <View style={styles.sectionIcon}>
                  <Truck size={18} color="#4F46E5" />
                </View>
                <Text style={styles.sectionTitle}>Vehicle Identification</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>REGISTRATION NUMBER</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="KL 07 AB 1234"
                    placeholderTextColor="#94A3B8"
                    value={form.regNumber}
                    onChangeText={handleRegNumberChange}
                    autoCapitalize="characters"
                    maxLength={13}
                  />
                  <FileText size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
                <Text style={styles.helperText}>Format: State Dist Series Number (e.g. KL 07 A 1)</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>MODEL / YEAR</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 2023"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={form.model}
                      onChangeText={(t) => setForm({ ...form, model: t.replace(/[^0-9]/g, '') })}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>VEHICLE TYPE</Text>
                  <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowTypeModal(true)}>
                    <Text style={[styles.inputValue, !form.type && { color: "#94A3B8" }]}>
                      {form.type || "Select"}
                    </Text>
                    <ChevronDown size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>WEIGHT CAPACITY (KG)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2500"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={form.weight}
                    onChangeText={(t) => setForm({ ...form, weight: t })}
                  />
                  <Text style={styles.weightUnit}>KG</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeaderContainer}>
                <View style={[styles.sectionIcon, { backgroundColor: '#F0F9FF' }]}>
                  <ShieldCheck size={18} color="#0EA5E9" />
                </View>
                <Text style={styles.sectionTitle}>Compliance & Documents</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>INSURANCE EXPIRY</Text>
                <TouchableOpacity style={styles.inputWrapper} onPress={() => openDatePicker('insuranceDate')}>
                  <Text style={[styles.inputValue, !form.insuranceDate && { color: "#94A3B8" }]}>
                    {form.insuranceDate || "DD/MM/YYYY"}
                  </Text>
                  <Calendar size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>POLLUTION CERTIFICATE</Text>
                <TouchableOpacity style={styles.inputWrapper} onPress={() => openDatePicker('pollutionDate')}>
                  <Text style={[styles.inputValue, !form.pollutionDate && { color: "#94A3B8" }]}>
                    {form.pollutionDate || "DD/MM/YYYY"}
                  </Text>
                  <Cloud size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ROAD TAX EXPIRY</Text>
                <TouchableOpacity style={styles.inputWrapper} onPress={() => openDatePicker('taxDate')}>
                  <Text style={[styles.inputValue, !form.taxDate && { color: "#94A3B8" }]}>
                    {form.taxDate || "DD/MM/YYYY"}
                  </Text>
                  <FileText size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeaderContainer}>
                <View style={[styles.sectionIcon, { backgroundColor: '#FDF2F8' }]}>
                  <ImageIcon size={18} color="#DB2777" />
                </View>
                <Text style={styles.sectionTitle}>Vehicle Gallery</Text>
              </View>
              
              <Text style={styles.descText}>Capture exterior and interior views for documentation.</Text>

              <View style={styles.photoContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                  {form.vehiclePhotos.map((photo, index) => (
                    <View key={index} style={styles.photoWrapper}>
                      <Image source={{ uri: photo }} style={styles.photoItem} />
                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        onPress={() => removeImage(index)}
                      >
                        <X size={12} color="#fff" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage} activeOpacity={0.7}>
                    <Plus size={20} color="#4F46E5" />
                    <Text style={styles.addPhotoText}>Add Photo</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.submitButtonText}>Register Vehicle</Text>
                  <CheckCircle2 size={20} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

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

        <Modal visible={showTypeModal} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowTypeModal(false)} activeOpacity={1}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Select Type</Text>
                  <Text style={styles.modalSubtitle}>VEHICLE CATEGORY</Text>
                </View>
                <TouchableOpacity onPress={() => setShowTypeModal(false)} style={styles.modalCloseButton}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={VEHICLE_TYPES}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.selectionItem,
                      form.type === item && styles.selectedSelectionItem
                    ]}
                    onPress={() => {
                      setForm({ ...form, type: item });
                      setShowTypeModal(false);
                    }}
                  >
                    <Text style={[
                      styles.selectionText,
                      form.type === item && styles.selectedSelectionText
                    ]}>
                      {item}
                    </Text>
                    {form.type === item && (
                      <View style={styles.checkContainer}>
                        <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" 
  },
  container: { 
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  iconButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center", 
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#64748B" 
  },
  formContent: { 
    padding: 20,
  },
  profilePhotoSection: { 
    alignItems: 'center', 
    marginBottom: 24 
  },
  profilePhotoContainer: { 
    position: 'relative',
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  profilePhoto: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profilePlaceholder: {
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  placeholderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  cameraIconBadge: {
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#4F46E5',
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 3, 
    borderColor: '#fff',
  },
  profilePhotoLabel: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#94A3B8', 
    marginTop: 12,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    letterSpacing: -0.2,
  },
  inputGroup: { 
    marginBottom: 18 
  },
  row: { 
    flexDirection: "row" 
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  suffixIcon: { 
    marginLeft: 10 
  },
  input: { 
    flex: 1, 
    fontSize: 15, 
    color: "#1E293B", 
    height: "100%",
    fontWeight: "500",
  },
  inputValue: {
    flex: 1,
    fontSize: 15, 
    color: "#1E293B", 
    fontWeight: "500",
  },
  weightUnit: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    marginLeft: 10,
  },
  helperText: { 
    fontSize: 11, 
    color: "#94A3B8", 
    marginTop: 6,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  descText: { 
    fontSize: 12, 
    color: "#94A3B8", 
    marginBottom: 16, 
    marginLeft: 4,
    lineHeight: 18,
  },
  photoContainer: { 
    marginTop: 4 
  },
  photoWrapper: { 
    marginRight: 12, 
    position: 'relative' 
  },
  photoItem: { 
    width: 110, 
    height: 110, 
    borderRadius: 16, 
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removePhotoBtn: {
    position: 'absolute', 
    top: -6, 
    right: -6, 
    backgroundColor: '#EF4444',
    borderRadius: 12, 
    width: 24, 
    height: 24, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
  },
  addPhotoBtn: {
    width: 110, 
    height: 110, 
    borderRadius: 16, 
    borderStyle: 'dashed',
    borderWidth: 2, 
    borderColor: '#4F46E5', 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
  },
  addPhotoText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#4F46E5', 
    marginTop: 8 
  },
  footer: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  submitButton: {
    backgroundColor: "#4F46E5",
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  disabledButton: { 
    backgroundColor: "#94A3B8",
    shadowOpacity: 0.1,
    elevation: 0,
  },
  submitButtonText: { 
    color: "#FFFFFF", 
    fontSize: 16, 
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxHeight: "80%",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  closeText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "700",
  },
  selectionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  selectedSelectionItem: {
    backgroundColor: "#EEF2FF",
  },
  selectionText: {
    fontSize: 16,
    color: "#475569",
    fontWeight: "500",
  },
  selectedSelectionText: {
    color: "#4F46E5",
    fontWeight: "700",
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
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default RegisterVehicleScreen;

