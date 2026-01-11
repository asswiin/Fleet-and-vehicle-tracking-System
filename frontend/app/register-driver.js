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
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { 
  ChevronLeft, 
  Smartphone, 
  CreditCard, 
  Home, 
  ArrowRight 
} from "lucide-react-native";

export default function RegisterDriverScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    license: "",
    street: "",
    city: "",
    district: "",
    state: "",
    zip: ""
  });

  const handleSubmit = () => {
    // Validation
    if (!form.name || !form.mobile || !form.license) {
      Alert.alert("Missing Fields", "Please fill in the required fields.");
      return;
    }
    // Add API call here
    Alert.alert("Success", "Driver Registered Successfully");
    router.back();
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
            <View style={styles.iconInputWrapper}>
              <Smartphone size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.iconInput}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={form.mobile}
                onChangeText={(t) => setForm({...form, mobile: t})}
              />
            </View>
          </View>

          {/* License */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Driving License Number</Text>
            <View style={styles.iconInputWrapper}>
              <CreditCard size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.iconInput}
                placeholder="X000-0000-0000"
                placeholderTextColor="#94A3B8"
                value={form.license}
                onChangeText={(t) => setForm({...form, license: t})}
              />
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.sectionHeader}>
            <Home size={20} color="#2563EB" fill="#2563EB" />
            <Text style={styles.sectionTitle}>Residential Address</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>house/flat</Text>
            <TextInput
              style={styles.simpleInput}
              placeholder="e.g. 123 Main St"
              placeholderTextColor="#94A3B8"
              value={form.street}
              onChangeText={(t) => setForm({...form, street: t})}
            />
          </View>

          {/* Row 1: City & District */}
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
              <TextInput
                style={styles.simpleInput}
                placeholder="District"
                placeholderTextColor="#94A3B8"
                value={form.district}
                onChangeText={(t) => setForm({...form, district: t})}
              />
            </View>
          </View>

          {/* Row 2: State & Zip */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.simpleInput}
                placeholder="State"
                placeholderTextColor="#94A3B8"
                value={form.state}
                onChangeText={(t) => setForm({...form, state: t})}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Zip Code</Text>
              <TextInput
                style={styles.simpleInput}
                placeholder="Zip Code"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={form.zip}
                onChangeText={(t) => setForm({...form, zip: t})}
              />
            </View>
          </View>

          <View style={{ height: 20 }} />

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit</Text>
            <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  content: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#1E293B", marginBottom: 8 },
  
  // Input Styles
  simpleInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0F172A"
  },
  iconInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 12,
  },
  iconInput: { flex: 1, fontSize: 15, color: "#0F172A", height: "100%" },
  inputIcon: { marginRight: 10 },
  
  // Section Header
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginLeft: 8 },
  
  row: { flexDirection: "row" },
  
  // Button
  submitBtn: {
    backgroundColor: "#2563EB",
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});