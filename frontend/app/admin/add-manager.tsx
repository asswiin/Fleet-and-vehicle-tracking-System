import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import React from "react";
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from "../../utils/api";
import {
  ChevronLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Home,
  Map,
  Navigation,
  ChevronDown,
  Check
} from "lucide-react-native";

// List of Districts in Kerala
const KERALA_DISTRICTS = [
  "Alappuzha",
  "Ernakulam",
  "Idukki",
  "Kannur",
  "Kasaragod",
  "Kollam",
  "Kottayam",
  "Kozhikode",
  "Malappuram",
  "Palakkad",
  "Pathanamthitta",
  "Thiruvananthapuram",
  "Thrissur",
  "Wayanad",
];

interface ManagerFormData {
  name: string;
  email: string;
  phone: string;
  dob: string;
  houseName: string;
  street: string;
  city: string;
  district: string;
  state: string;
}

const AddManagerScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Calculate 18 Years Ago
  const today = new Date();
  const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

  // Form State
  const [formData, setFormData] = useState<ManagerFormData>({
    name: "",
    email: "",
    phone: "",
    dob: "",
    houseName: "",
    street: "",
    city: "",
    district: "Kozhikode",
    state: "Kerala",
  });

  // Date Picker State
  const [date, setDate] = useState<Date>(eighteenYearsAgo);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(eighteenYearsAgo);

  // District Modal State
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  // Handlers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirmDate = () => {
    const day = tempDate.getDate().toString().padStart(2, '0');
    const month = (tempDate.getMonth() + 1).toString().padStart(2, '0');
    const year = tempDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    setFormData({ ...formData, dob: formattedDate });
    setDate(tempDate);
    setShowDatePicker(false);
  };

  const toggleDatePicker = () => {
    setTempDate(date);
    setShowDatePicker(!showDatePicker);
  };

  const handleDistrictSelect = (district: string) => {
    setFormData({ ...formData, district: district });
    setShowDistrictModal(false);
  };

  const handleAddManager = async () => {
    const { name, email, phone, dob, houseName, street, city, district, state } = formData;

    // Validation
    if (
      !name.trim() || !email.trim() || !phone.trim() || !dob.trim() ||
      !houseName.trim() || !street.trim() || !city.trim() || !district.trim() || !state.trim()
    ) {
      Alert.alert("Missing Information", "Please fill in all fields completely.");
      return;
    }

    // Email Validation
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

    // Phone Validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert("Invalid Phone", "Number must be 10 digits and start with 6, 7, 8, or 9.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: `+91${formData.phone}`,
        place: `${formData.city}, ${formData.state}`,
        dob: formData.dob,
        address: {
          house: formData.houseName,
          street: formData.street,
          city: formData.city,
          district: formData.district,
          state: formData.state
        },
        branch: "Mukkam"
      };

      const response = await api.createManager(payload);

      if (response.ok) {
        Alert.alert(
          "Success",
          `Manager added! Password sent to ${formData.email}.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", response.error || "Failed to create manager");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Could not connect to server.");
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
            <Text style={styles.headerTitle}>Add New Manager</Text>
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
              {/* Personal Details Section */}
              <View style={styles.sectionHeaderContainer}>
                <View style={styles.sectionIcon}>
                  <User size={18} color="#4F46E5" />
                </View>
                <Text style={styles.sectionTitle}>Personal Details</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="E.g. John Doe"
                    placeholderTextColor="#94A3B8"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                  <User size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                  />
                  <Mail size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.phonePrefixContainer}>
                    <Text style={styles.phonePrefix}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={formData.phone}
                    onChangeText={(text) => {
                      if (/^\d*$/.test(text)) setFormData({ ...formData, phone: text });
                    }}
                  />
                  <Phone size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>DATE OF BIRTH</Text>
                <TouchableOpacity onPress={toggleDatePicker} style={styles.inputWrapper} activeOpacity={0.7}>
                  <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 14 }]}>
                    {formData.dob ? formData.dob : <Text style={{ color: "#94A3B8" }}>Select Date (Min. 18 years)</Text>}
                  </Text>
                  <Calendar size={18} color="#94A3B8" style={styles.suffixIcon} />
                </TouchableOpacity>

                {showDatePicker && Platform.OS === 'ios' && (
                  <Modal
                    visible={showDatePicker}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDatePicker(false)}
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
                          onChange={handleDateChange}
                          maximumDate={eighteenYearsAgo}
                        />
                        <View style={styles.datePickerActions}>
                          <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(false)}>
                            <Text style={styles.datePickerCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.datePickerConfirm} onPress={handleConfirmDate}>
                            <Text style={styles.datePickerConfirmText}>Confirm</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
                )}

                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) {
                        setTempDate(date);
                        setTimeout(handleConfirmDate, 100);
                      }
                    }}
                    maximumDate={eighteenYearsAgo}
                  />
                )}
              </View>
            </View>

            <View style={styles.card}>
              {/* Address Details Section */}
              <View style={styles.sectionHeaderContainer}>
                <View style={[styles.sectionIcon, { backgroundColor: '#F0F9FF' }]}>
                  <Home size={18} color="#0EA5E9" />
                </View>
                <Text style={styles.sectionTitle}>Address Details</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>HOUSE NAME / FLAT NO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rose Villa, Flat 4B"
                    placeholderTextColor="#94A3B8"
                    value={formData.houseName}
                    onChangeText={(text) => setFormData({ ...formData, houseName: text })}
                  />
                  <Home size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>STREET NAME</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Street Address"
                    placeholderTextColor="#94A3B8"
                    value={formData.street}
                    onChangeText={(text) => setFormData({ ...formData, street: text })}
                  />
                  <Map size={18} color="#94A3B8" style={styles.suffixIcon} />
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
                      value={formData.city}
                      onChangeText={(text) => setFormData({ ...formData, city: text })}
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
                      {formData.district}
                    </Text>
                    <ChevronDown size={18} color="#94A3B8" style={styles.suffixIcon} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>STATE</Text>
                <View style={[styles.inputWrapper, { backgroundColor: "#F8FAFC" }]}>
                  <Text style={[styles.inputValue, { color: "#64748B" }]}>
                    {formData.state}
                  </Text>
                  <Navigation size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Footer with Floating Action Button Style */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleAddManager}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.submitButtonText}>Register Manager</Text>
                  <Check size={20} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* District Selection Modal */}
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
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.districtItem,
                          formData.district === item && styles.selectedDistrictItem
                        ]}
                        onPress={() => handleDistrictSelect(item)}
                      >
                        <Text style={[
                          styles.districtText,
                          formData.district === item && styles.selectedDistrictText
                        ]}>
                          {item}
                        </Text>
                        {formData.district === item && (
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
    fontSize: 15, 
    color: "#1E293B", 
    fontWeight: "500",
    paddingTop: 0,
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
  districtItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  selectedDistrictItem: {
    backgroundColor: "#EEF2FF",
  },
  districtText: {
    fontSize: 16,
    color: "#475569",
    fontWeight: "500",
  },
  selectedDistrictText: {
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

export default AddManagerScreen;

