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
import { api } from "../../utils/api";

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
  const [tempDate, setTempDate] = useState(new Date());

  const [form, setForm] = useState<DriverForm>({
    name: "",
    mobile: "",
    email: "",
    license: "",
    house: "",
    street: "",
    city: "",
    district: "Kozhikode",
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

  const handleDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
    }
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirmDob = () => {
    const maxDate = getEighteenYearsAgo();
    if (tempDate > maxDate) {
      Alert.alert("Age Restriction", "Driver must be at least 18 years old.");
      return;
    }
    setForm({ ...form, dob: tempDate.toISOString() });
    setShowDobPicker(false);
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
        },
        branch: "Mukkam"
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>ADMINISTRATION</Text>
            <Text style={styles.headerTitle}>Register Driver</Text>
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
            <View style={styles.card}>
              <View style={styles.sectionHeaderContainer}>
                <View style={styles.sectionIcon}>
                  <CreditCard size={18} color="#4F46E5" />
                </View>
                <Text style={styles.sectionTitle}>Personal Details</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g. John Smith"
                    placeholderTextColor="#94A3B8"
                    value={form.name}
                    onChangeText={(t) => setForm({ ...form, name: t })}
                  />
                  <ArrowRight size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>MOBILE NUMBER</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.phonePrefixContainer}>
                    <Text style={styles.phonePrefix}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={form.mobile}
                    onChangeText={(t) => {
                      if (/^\d*$/.test(t)) setForm({ ...form, mobile: t });
                    }}
                  />
                  <Smartphone size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. driver@gmail.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(t) => setForm({ ...form, email: t })}
                  />
                  <Mail size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>GENDER</Text>
                  <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={() => setShowGenderModal(true)}
                  >
                    <Text style={[styles.inputValue, !form.gender && { color: "#94A3B8" }]}>
                      {form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : "Select"}
                    </Text>
                    <ChevronDown size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>DATE OF BIRTH</Text>
                  <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={() => setShowDobPicker(true)}
                  >
                    <Text style={[styles.inputValue, !form.dob && { color: "#94A3B8" }]}>
                      {form.dob ? new Date(form.dob).toLocaleDateString('en-GB') : "Select"}
                    </Text>
                    <Calendar size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>DRIVING LICENSE NUMBER</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="KL12 20201234567"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    maxLength={16}
                    value={form.license}
                    onChangeText={handleLicenseChange}
                  />
                  <CreditCard size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
                <Text style={styles.helperText}>Format: State(2) RTO(2) Year(4) ID(7)</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeaderContainer}>
                <View style={[styles.sectionIcon, { backgroundColor: '#F0F9FF' }]}>
                  <Home size={18} color="#0EA5E9" />
                </View>
                <Text style={styles.sectionTitle}>Residential Address</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>HOUSE / FLAT NAME</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rose Villa"
                    placeholderTextColor="#94A3B8"
                    value={form.house}
                    onChangeText={(t) => setForm({ ...form, house: t })}
                  />
                  <Home size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>STREET NAME</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Street name"
                    placeholderTextColor="#94A3B8"
                    value={form.street}
                    onChangeText={(t) => setForm({ ...form, street: t })}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>CITY / TOWN</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      placeholderTextColor="#94A3B8"
                      value={form.city}
                      onChangeText={(t) => setForm({ ...form, city: t })}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>DISTRICT</Text>
                  <TouchableOpacity 
                    style={[styles.inputWrapper, { backgroundColor: "#F8FAFC" }]}
                    onPress={() => setShowDistrictModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.inputValue, { color: "#64748B", flex: 1 }]}>
                      {form.district}
                    </Text>
                    <ChevronDown size={18} color="#94A3B8" style={styles.suffixIcon} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>STATE</Text>
                <View style={[styles.inputWrapper, { backgroundColor: "#F8FAFC" }]}>
                  <Text style={[styles.inputValue, { color: "#64748B" }]}>
                    {form.state}
                  </Text>
                </View>
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
                  <Text style={styles.submitButtonText}>Register Driver</Text>
                  <Check size={20} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {showDobPicker && Platform.OS === 'ios' && (
          <Modal
            visible={showDobPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDobPicker(false)}
          >
            <View style={styles.datePickerModalContainer}>
              <View style={styles.datePickerContent}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Date of Birth</Text>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDobChange}
                  maximumDate={getEighteenYearsAgo()}
                />
                <View style={styles.datePickerActions}>
                  <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDobPicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePickerConfirm} onPress={handleConfirmDob}>
                    <Text style={styles.datePickerConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {showDobPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDobPicker(false);
              if (date) {
                setTempDate(date);
                setTimeout(handleConfirmDob, 100);
              }
            }}
            maximumDate={getEighteenYearsAgo()}
          />
        )}

        {/* Gender Modal */}
        <Modal
          visible={showGenderModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowGenderModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>Select Gender</Text>
                      <Text style={styles.modalSubtitle}>DRIVER INFORMATION</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowGenderModal(false)} style={styles.modalCloseButton}>
                      <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={GENDER_OPTIONS}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectionItem,
                          form.gender.toLowerCase() === item.toLowerCase() && styles.selectedSelectionItem
                        ]}
                        onPress={() => handleGenderSelect(item.toLowerCase())}
                      >
                        <Text style={[
                          styles.selectionText,
                          form.gender.toLowerCase() === item.toLowerCase() && styles.selectedSelectionText
                        ]}>
                          {item}
                        </Text>
                        {form.gender.toLowerCase() === item.toLowerCase() && (
                          <View style={styles.checkContainer}>
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
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
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDistrictModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowDistrictModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>Select District</Text>
                      <Text style={styles.modalSubtitle}>KERALA STATE</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowDistrictModal(false)} style={styles.modalCloseButton}>
                      <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={KERALA_DISTRICTS}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.selectionItem,
                          form.district === item && styles.selectedSelectionItem
                        ]}
                        onPress={() => handleDistrictSelect(item)}
                      >
                        <Text style={[
                          styles.selectionText,
                          form.district === item && styles.selectedSelectionText
                        ]}>
                          {item}
                        </Text>
                        {form.district === item && (
                          <View style={styles.checkContainer}>
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
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
  phonePrefixContainer: {
    paddingRight: 12,
    marginRight: 12,
    borderRightWidth: 1.5,
    borderRightColor: "#E2E8F0",
  },
  phonePrefix: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: "#1E293B"
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
  helperText: { 
    fontSize: 11, 
    color: "#94A3B8", 
    marginTop: 6,
    marginLeft: 4,
    fontStyle: 'italic',
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

export default RegisterDriverScreen;

