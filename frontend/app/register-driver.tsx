import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ChevronLeft, Smartphone, CreditCard, Home, ArrowRight, Mail, ChevronDown, Check, Calendar } from "lucide-react-native";
import { api } from "../utils/api";

// Kerala Districts List
const KERALA_DISTRICTS = [
  "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", 
  "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", 
  "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
];

const GENDER_OPTIONS = ["Male", "Female", "Other"];

interface DriverForm {
  name: string;
  mobile: string;
  email: string;
  license: string;
  house: string;
  street: string;
  city: string;
  district: string;
  state: string;
  gender: string;
  dob: string;
}

const RegisterDriverScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // UI State for Modal
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);

  const [form, setForm] = useState<DriverForm>({
    name: "",
    mobile: "",
    email: "",
    license: "",
    house: "",
    street: "",
    city: "",
    district: "",
    state: "Kerala", // Default State
    gender: "",
    dob: "",
  });

  const handleDistrictSelect = (district: string) => {
    setForm({ ...form, district });
    setShowDistrictModal(false);
  };

  const handleGenderSelect = (gender: string) => {
    setForm({ ...form, gender });
    setShowGenderModal(false);
  };

  const getEighteenYearsAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  };

  const handleDobChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) {
      setShowDobPicker(Platform.OS === "ios");
      return;
    }

    const maxDate = getEighteenYearsAgo();
    if (selectedDate > maxDate) {
      Alert.alert("Age Restriction", "Driver must be at least 18 years old.");
    } else {
      setForm({ ...form, dob: selectedDate.toISOString() });
    }

    if (Platform.OS !== "ios") {
      setShowDobPicker(false);
    }
  };

  const handleLicenseChange = (text: string) => {
    // Remove all spaces and convert to uppercase
    const cleaned = text.toUpperCase().replace(/\s/g, '');
    
    // Format: AAXX YYYYYYYYYYY (space after first 4 characters)
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 4) + ' ' + cleaned.slice(4);
    }
    
    // Limit to 15 characters (excluding space)
    if (cleaned.length <= 15) {
      setForm({ ...form, license: formatted });
    }
  };

  const handleSubmit = async () => {
    const { name, mobile, email, license, house, street, city, district, gender, dob } = form;

    // 1. Basic Empty Check
    if (!name.trim() || !mobile.trim() || !email.trim() || !license.trim() || !district.trim() || !gender.trim() || !dob.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    // 2. Phone Validation
    // Must be 10 digits, start with 6, 7, 8, or 9
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(mobile)) {
      Alert.alert("Invalid Phone", "Enter a valid phone number");
      return;
    }

    // 3. Email Validation (Allowed Providers)
    // List of allowed domains
    const allowedDomainsRegex = /@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com|zoho\.com|aol\.com|mail\.com|gmx\.com|yandex\.com|rediffmail\.com|yahoo\.co\.in|outlook\.in|live\.com|msn\.com|hey\.com)$/i;
    
    // Check standard email format + allowed domain
    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!standardEmailRegex.test(email) || !allowedDomainsRegex.test(email)) {
      Alert.alert(
        "Invalid Email", 
        "Please enter a valid email"
      );
      return;
    }

    // 4. Gender Validation
    const genderValue = gender.toLowerCase();
    const allowedGenders = ["male", "female", "other"];
    if (!allowedGenders.includes(genderValue)) {
      Alert.alert("Invalid Gender", "Please select gender as Male, Female, or Other.");
      return;
    }

    // 5. DOB Validation (18+)
    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) {
      Alert.alert("Invalid Date", "Please select a valid date of birth.");
      return;
    }
    const minDob = getEighteenYearsAgo();
    if (dobDate > minDob) {
      Alert.alert("Age Restriction", "Driver must be at least 18 years old.");
      return;
    }

    // 6. License Validation
    // Format: AA XX YYYY XXXXXXX (Total 15 alphanumeric characters)
    const cleanLicense = license.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Remove non-alphanumeric chars
    
    // Regex: 2 Letters (State) + 2 Digits (RTO) + 4 Digits (Year) + 7 Digits (ID)
    const licenseRegex = /^[A-Z]{2}[0-9]{13}$/;

    if (cleanLicense.length !== 15 || !licenseRegex.test(cleanLicense)) {
      Alert.alert(
        "Invalid License", 
        "License must follow format: State(2) RTO(2) Year(4) ID(7).\nExample: MH1420110062821"
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name,
        mobile: `+91${form.mobile}`, // Add +91 prefix for DB
        email: form.email,
        license: cleanLicense, // Send cleaned license number
        gender: genderValue,
        dob: dobDate.toISOString(),
        address: {
          house: form.house,
          street: form.street,
          city: form.city,
          district: form.district,
          state: form.state,
        }
      };

      const response = await api.createDriver(payload);

      if (response.ok) {
        Alert.alert("Success", "Driver Registered Successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Error", response.error || "Failed to register driver");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Driver</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.simpleInput}
              placeholder="e.g. John Smith"
              placeholderTextColor="#94A3B8"
              value={form.name}
              onChangeText={(t) => setForm({...form, name: t})}
            />
          </View>

          {/* Mobile */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneInputWrapper}>
              <Smartphone size={20} color="#94A3B8" style={styles.inputIcon} />
              <Text style={styles.phonePrefix}>+91</Text>
              <View style={styles.phoneDivider} />
              <TextInput
                style={styles.phoneInput}
                placeholder="98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
                value={form.mobile}
                onChangeText={(t) => {
                  // Only allow digits
                  if (/^\d*$/.test(t)) setForm({...form, mobile: t});
                }}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.iconInputWrapper}>
              <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.iconInput}
                placeholder="e.g. driver@gmail.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(t) => setForm({...form, email: t})}
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowGenderModal(true)}
            >
              <Text style={[styles.dropdownText, !form.gender && { color: "#94A3B8" }]}>
                {form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : "Select"}
              </Text>
              <ChevronDown size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDobPicker(true)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Calendar size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                <Text style={[styles.dropdownText, !form.dob && { color: "#94A3B8" }]}>
                  {form.dob ? new Date(form.dob).toLocaleDateString('en-GB') : "Select (18+ only)"}
                </Text>
              </View>
              <ChevronDown size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {showDobPicker && (
            <DateTimePicker
              value={form.dob ? new Date(form.dob) : getEighteenYearsAgo()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={handleDobChange}
              maximumDate={getEighteenYearsAgo()}
            />
          )}

          {/* License */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Driving License Number</Text>
            <View style={styles.iconInputWrapper}>
              <CreditCard size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.iconInput}
                placeholder="KL12 20201234567"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                maxLength={16}
                value={form.license}
                onChangeText={handleLicenseChange}
              />
            </View>
            <Text style={styles.helperText}>Format: State(2)RTO(2) Year(4)ID(7)</Text>
          </View>

          {/* Address Section */}
          <View style={styles.sectionHeader}>
            <Home size={20} color="#2563EB" fill="#2563EB" />
            <Text style={styles.sectionTitle}>Residential Address</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>House / Flat</Text>
            <TextInput
              style={styles.simpleInput}
              placeholder="e.g. Rose Villa"
              placeholderTextColor="#94A3B8"
              value={form.house}
              onChangeText={(t) => setForm({...form, house: t})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={styles.simpleInput}
              placeholder="Street name"
              placeholderTextColor="#94A3B8"
              value={form.street}
              onChangeText={(t) => setForm({...form, street: t})}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.simpleInput}
                placeholder="City"
                placeholderTextColor="#94A3B8"
                value={form.city}
                onChangeText={(t) => setForm({...form, city: t})}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>District</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowDistrictModal(true)}
              >
                <Text style={[styles.dropdownText, !form.district && { color: "#94A3B8" }]}>
                  {form.district || "Select"}
                </Text>
                <ChevronDown size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* State (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>State</Text>
            <View style={[styles.simpleInput, styles.disabledInput]}>
              <Text style={{ color: "#64748B", fontSize: 15 }}>{form.state}</Text>
            </View>
          </View>

          <View style={{ height: 20 }} />

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <>
                <Text style={styles.submitText}>Register Driver</Text>
                <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Gender</Text>
                  <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                    <Text style={styles.closeText}>Close</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={GENDER_OPTIONS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.districtItem} 
                      onPress={() => handleGenderSelect(item.toLowerCase())}
                    >
                      <Text style={[
                        styles.districtText, 
                        form.gender.toLowerCase() === item.toLowerCase() && styles.selectedDistrictText
                      ]}>
                        {item}
                      </Text>
                      {form.gender.toLowerCase() === item.toLowerCase() && <Check size={20} color="#0EA5E9" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* District Modal */}
      <Modal
        visible={showDistrictModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDistrictModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDistrictModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select District</Text>
                  <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
                    <Text style={styles.closeText}>Close</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={KERALA_DISTRICTS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.districtItem} 
                      onPress={() => handleDistrictSelect(item)}
                    >
                      <Text style={[
                        styles.districtText, 
                        form.district === item && styles.selectedDistrictText
                      ]}>
                        {item}
                      </Text>
                      {form.district === item && <Check size={20} color="#0EA5E9" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  backBtn: { padding: 4 },
  content: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: "row" },
  label: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  
  simpleInput: {
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 15, color: "#1E293B", backgroundColor: "#FFFFFF",
    height: 50, justifyContent: "center"
  },
  disabledInput: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  
  // Icon Input Wrapper
  iconInputWrapper: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, height: 50, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  iconInput: { flex: 1, fontSize: 15, color: "#1E293B", height: "100%" },
  
  // Phone Specific Styles
  phoneInputWrapper: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, height: 50, paddingHorizontal: 16,
  },
  phonePrefix: { fontSize: 16, fontWeight: "600", color: "#1E293B", marginRight: 8 },
  phoneDivider: { width: 1, height: 24, backgroundColor: "#E2E8F0", marginRight: 10 },
  phoneInput: { flex: 1, fontSize: 16, color: "#1E293B", height: "100%", letterSpacing: 1 },

  // Dropdown Button
  dropdownButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 12, height: 50, paddingHorizontal: 16,
  },
  dropdownText: { fontSize: 15, color: "#1E293B" },

  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginLeft: 10 },
  submitBtn: {
    backgroundColor: "#2563EB", height: 56, borderRadius: 12, flexDirection: "row",
    justifyContent: "center", alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  helperText: { fontSize: 12, color: "#64748B", marginTop: 4 },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "60%", padding: 20,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  closeText: { color: "#0EA5E9", fontSize: 16, fontWeight: "600" },
  districtItem: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: "#F8FAFC",
  },
  districtText: { fontSize: 16, color: "#334155" },
  selectedDistrictText: { color: "#0EA5E9", fontWeight: "700" },
});

export default RegisterDriverScreen;