

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { api, Driver } from "../utils/api";
import { ChevronLeft, Save, MapPin } from "lucide-react-native";

const EditDriverProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ driverData: string }>();
  
  const [loading, setLoading] = useState(false);
  
  // Parse initial data
  let initialData: Driver | null = null;
  try {
    if (params.driverData) initialData = JSON.parse(params.driverData);
  } catch(e) { console.error(e); }

  const [form, setForm] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    mobile: initialData?.mobile || "",
    address: {
      house: initialData?.address?.house || "",
      street: initialData?.address?.street || "",
      city: initialData?.address?.city || "",
      district: initialData?.address?.district || "",
      state: initialData?.address?.state || "",
      zip: initialData?.address?.zip || "",
    }
  });

  const handleUpdate = async () => {
    if (!initialData?._id) return;
    
    // Basic validation
    if (!form.name || !form.email || !form.mobile) {
      Alert.alert("Error", "Name, Email and Mobile are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.updateDriver(initialData._id, form);

      if (response.ok) {
        Alert.alert("Success", "Profile updated successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Update Failed", response.error || "Could not update profile");
      }
    } catch (error) {
      Alert.alert("Error", "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionHeader}>Basic Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm({...form, name: t})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={form.mobile}
              keyboardType="phone-pad"
              onChangeText={(t) => setForm({...form, mobile: t})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(t) => setForm({...form, email: t})}
            />
          </View>

          {/* Read Only Fields */}
          <View style={styles.readOnlyContainer}>
             <Text style={styles.readOnlyLabel}>Note: License Number, Gender and Date of Birth cannot be changed directly. Please contact admin for corrections.</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionHeaderContainer}>
            <MapPin size={18} color="#2563EB" />
            <Text style={styles.sectionHeader}>Address Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>House Name / No</Text>
            <TextInput
              style={styles.input}
              value={form.address.house}
              onChangeText={(t) => updateAddress('house', t)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={styles.input}
              value={form.address.street}
              onChangeText={(t) => updateAddress('street', t)}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={form.address.city}
                onChangeText={(t) => updateAddress('city', t)}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>District</Text>
              <TextInput
                style={styles.input}
                value={form.address.district}
                onChangeText={(t) => updateAddress('district', t)}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={form.address.state}
                onChangeText={(t) => updateAddress('state', t)}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Zip Code</Text>
              <TextInput
                style={styles.input}
                value={form.address.zip}
                keyboardType="numeric"
                onChangeText={(t) => updateAddress('zip', t)}
              />
            </View>
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
                <Text style={styles.saveBtnText}>Save Changes</Text>
                <Save size={20} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
          
          <View style={{ height: 40 }} />

        </ScrollView>
      </KeyboardAvoidingView>
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
  
  sectionHeaderContainer: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 15 },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginLeft: 8 },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1E293B"
  },
  row: { flexDirection: "row" },
  
  readOnlyContainer: { backgroundColor: "#FFF7ED", padding: 12, borderRadius: 8, marginBottom: 16 },
  readOnlyLabel: { color: "#C2410C", fontSize: 12, lineHeight: 18 },
  
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 10 },
  
  saveBtn: {
    backgroundColor: "#2563EB", flexDirection: "row", justifyContent: "center", alignItems: "center",
    height: 50, borderRadius: 12, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" }
});

export default EditDriverProfileScreen;