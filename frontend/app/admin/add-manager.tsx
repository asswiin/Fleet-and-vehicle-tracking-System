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
    district: "",
    state: "Kerala", 
  });

  // Date Picker State
  const [date, setDate] = useState<Date>(eighteenYearsAgo);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // District Modal State
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  // Handlers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setDate(selectedDate);
      
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      
      setFormData({ ...formData, dob: formattedDate });
    }
  };

  const toggleDatePicker = () => {
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
        }
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
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Manager</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
            
            {/* Personal Details */}
            <Text style={styles.sectionHeader}>Personal Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL (@gmail.com)</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@gmail.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <View style={styles.inputWrapper}>
                <Phone size={20} color="#94A3B8" style={styles.inputIcon} />
                <Text style={styles.phonePrefix}>+91</Text>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.input}
                  placeholder="98765 43210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={formData.phone}
                  onChangeText={(text) => {
                     if (/^\d*$/.test(text)) setFormData({ ...formData, phone: text });
                  }}
                />
              </View>
            </View>

            {/* Date of Birth Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DATE OF BIRTH (Min. 18 Years)</Text>
              <TouchableOpacity onPress={toggleDatePicker} style={styles.inputWrapper}>
                <Calendar size={20} color="#94A3B8" style={styles.inputIcon} />
                <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 14 }]}>
                    {formData.dob ? formData.dob : <Text style={{color: "#94A3B8"}}>Select Date</Text>}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  maximumDate={eighteenYearsAgo}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Address Details */}
            <Text style={styles.sectionHeader}>Address Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>HOUSE NAME / FLAT NO</Text>
              <View style={styles.inputWrapper}>
                <Home size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rose Villa, Flat 4B"
                  placeholderTextColor="#94A3B8"
                  value={formData.houseName}
                  onChangeText={(text) => setFormData({ ...formData, houseName: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>STREET</Text>
              <View style={styles.inputWrapper}>
                <Map size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Street Name"
                  placeholderTextColor="#94A3B8"
                  value={formData.street}
                  onChangeText={(text) => setFormData({ ...formData, street: text })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>CITY / TOWN</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 0 }]} 
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
                  style={[styles.inputWrapper, { paddingLeft: 12 }]} 
                  onPress={() => setShowDistrictModal(true)}
                >
                  <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 14, color: formData.district ? "#1E293B" : "#94A3B8" }]}>
                    {formData.district || "Select"}
                  </Text>
                  <ChevronDown size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>STATE</Text>
              <View style={[styles.inputWrapper, { backgroundColor: "#F1F5F9" }]}> 
                <Navigation size={20} color="#94A3B8" style={styles.inputIcon} />
                <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 14, color: "#64748B" }]}>
                  {formData.state}
                </Text>
              </View>
            </View>

            <View style={{height: 20}} /> 
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.disabledButton]} 
              onPress={handleAddManager}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Manager</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* District Selection Modal */}
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
                          formData.district === item && styles.selectedDistrictText
                        ]}>
                          {item}
                        </Text>
                        {formData.district === item && <Check size={20} color="#0EA5E9" />}
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
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 10,
  },
  iconButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  cancelText: { fontSize: 16, fontWeight: "600", color: "#64748B" },
  formContainer: { paddingBottom: 100 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0EA5E9",
    marginTop: 10,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
  },
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: "row" },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  phonePrefix: { fontSize: 16, fontWeight: "600", color: "#1E293B", marginRight: 8 },
  phoneDivider: { width: 1, height: 24, backgroundColor: "#E2E8F0", marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1E293B", height: "100%" },
  footer: { position: "absolute", bottom: 30, left: 20, right: 20 },
  submitButton: {
    backgroundColor: "#0EA5E9",
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeText: {
    color: "#0EA5E9",
    fontSize: 16,
    fontWeight: "600",
  },
  districtItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  districtText: {
    fontSize: 16,
    color: "#334155",
  },
  selectedDistrictText: {
    color: "#0EA5E9",
    fontWeight: "700",
  },
});

export default AddManagerScreen;

