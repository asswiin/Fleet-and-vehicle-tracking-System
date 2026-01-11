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
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  ChevronLeft, 
  ChevronDown, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  Cloud, 
  FileText 
} from "lucide-react-native";

const VEHICLE_TYPES = ["Truck", "Lorry", "Van", "Container", "Trailer"];

export default function RegisterVehicleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    regNumber: "",
    model: "",
    type: "",
    weight: "",
    insuranceDate: "",
    pollutionDate: "",
    taxDate: ""
  });

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [datePicker, setDatePicker] = useState({ show: false, field: null, value: new Date() });

  // --- REGEX & FORMATTING LOGIC ---
  const handleRegNumberChange = (text) => {
    // 1. Remove non-alphanumeric characters & convert to Uppercase
    let cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 2. Limit length to max chars (AA 00 BB 0000 = 10 chars + spaces)
    // We strictly look for: 2 letters, 2 numbers, 2 letters, 4 numbers = 10 chars max
    if (cleaned.length > 10) {
      cleaned = cleaned.substring(0, 10);
    }

    // 3. Auto-Format with spaces: AA 00 BB 0000
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.substring(0, 2) + " " + cleaned.substring(2);
    }
    if (cleaned.length > 4) {
      formatted = cleaned.substring(0, 2) + " " + cleaned.substring(2, 4) + " " + cleaned.substring(4);
    }
    if (cleaned.length > 6) {
      formatted = cleaned.substring(0, 2) + " " + cleaned.substring(2, 4) + " " + cleaned.substring(4, 6) + " " + cleaned.substring(6);
    }

    setForm({ ...form, regNumber: formatted });
  };

  const validateRegNumber = (reg) => {
    // Regex: 2 Letters + space + 2 Digits + space + 2 Letters + space + 4 Digits
    // Example: KL 01 AB 1234
    const regex = /^[A-Z]{2}\s[0-9]{2}\s[A-Z]{2}\s[0-9]{4}$/;
    return regex.test(reg);
  };

  // --- Date Picker Logic ---
  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
        setDatePicker(prev => ({ ...prev, show: false }));
    }
    if (selectedDate) {
      const formatted = selectedDate.toLocaleDateString('en-GB');
      setForm({ ...form, [datePicker.field]: formatted });
    }
  };

  const openDatePicker = (field) => {
    setDatePicker({ show: true, field, value: new Date() });
  };

  const handleSubmit = async () => {
    // 1. Validate Fields
    if (!form.regNumber || !form.type || !form.model) {
      Alert.alert("Missing Fields", "Please fill Registration Number, Model and Type");
      return;
    }

    // 2. Validate Reg Number Format
    if (!validateRegNumber(form.regNumber)) {
      Alert.alert("Invalid Format", "Registration Number must be in format: AA 00 BB 0000 (e.g., KL 07 AB 1234)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://172.20.10.5:5000/api/vehicles/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Vehicle Registered Successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Error", data.message || "Registration failed");
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
        
        {/* Registration Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registration Number</Text>
          <TextInput
            style={styles.input}
            placeholder="AA 00 BB 0000"
            placeholderTextColor="#94A3B8"
            value={form.regNumber}
            onChangeText={handleRegNumberChange} // Use custom handler
            autoCapitalize="characters"
            maxLength={13} // 10 chars + 3 spaces
          />
          <Text style={styles.helperText}>Format: State Dist Series Number (e.g. KL 07 AB 1234)</Text>
        </View>

        {/* Model */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Model / Make</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ford Transit 2023"
            placeholderTextColor="#94A3B8"
            value={form.model}
            onChangeText={(t) => setForm({...form, model: t})}
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
            onChangeText={(t) => setForm({...form, weight: t})}
          />
        </View>

        {/* Document Expiry Section */}
        <View style={styles.sectionHeader}>
          <Calendar size={20} color="#2563EB" />
          <Text style={styles.sectionTitle}>Document Expiry</Text>
        </View>
        <Text style={styles.descText}>Set the expiration dates for mandatory compliance.</Text>

        {/* Dates */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Insurance Expiry</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('insuranceDate')}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <ShieldCheck size={18} color="#94A3B8" style={{marginRight:8}} />
              <Text style={[styles.inputText, !form.insuranceDate && { color: "#94A3B8" }]}>
                {form.insuranceDate || "mm/dd/yyyy"}
              </Text>
            </View>
            <Calendar size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pollution Certificate</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('pollutionDate')}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <Cloud size={18} color="#94A3B8" style={{marginRight:8}} />
              <Text style={[styles.inputText, !form.pollutionDate && { color: "#94A3B8" }]}>
                {form.pollutionDate || "mm/dd/yyyy"}
              </Text>
            </View>
            <Calendar size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Road Tax</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openDatePicker('taxDate')}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <FileText size={18} color="#94A3B8" style={{marginRight:8}} />
              <Text style={[styles.inputText, !form.taxDate && { color: "#94A3B8" }]}>
                {form.taxDate || "mm/dd/yyyy"}
              </Text>
            </View>
            <Calendar size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />

        {/* Register Button */}
        <TouchableOpacity 
          style={[styles.submitBtn, loading && {opacity: 0.7}]} 
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
                  <Text style={[styles.modalItemText, form.type === item && {color:'#2563EB', fontWeight:'bold'}]}>
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
}

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
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection:'row', justifyContent:'space-between' },
  modalItemText: { fontSize: 16, color: '#334155' }
});