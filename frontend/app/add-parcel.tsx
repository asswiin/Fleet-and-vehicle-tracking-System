import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { 
  ChevronLeft, 
  User, 
  MapPin, 
  Package, 
  QrCode,
  Smartphone
} from "lucide-react-native";
import { api } from "../utils/api";

const AddParcelScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    senderName: "",
    senderPhone: "",
    senderHouse: "",
    senderStreet: "",
    senderCity: "",
    senderDistrict: "",
    senderState: "Kerala",
    recipientName: "",
    recipientPhone: "",
    recipientHouse: "",
    recipientStreet: "",
    recipientCity: "",
    recipientDistrict: "",
    recipientState: "Kerala",
    weight: "",
    parcelType: "",
    paymentAmount: "",
  });

  const handleSubmit = async () => {
    // 1. Validation
    if (
      !form.senderName ||
      !form.senderPhone ||
      !form.senderHouse ||
      !form.senderStreet ||
      !form.senderCity ||
      !form.senderDistrict ||
      !form.recipientName ||
      !form.recipientPhone ||
      !form.recipientHouse ||
      !form.recipientStreet ||
      !form.recipientCity ||
      !form.recipientDistrict ||
      !form.weight ||
      !form.parcelType ||
      !form.paymentAmount
    ) {
      Alert.alert("Missing Fields", "Please fill in all details to generate a tracking ID.");
      return;
    }

    // 2. Phone Validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.senderPhone) || !phoneRegex.test(form.recipientPhone)) {
      Alert.alert("Invalid Phone", "Please enter valid 10-digit phone numbers.");
      return;
    }

    // 3. Payment validation
    const amountNumber = Number(form.paymentAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      Alert.alert("Invalid Payment", "Enter a valid payment amount greater than 0.");
      return;
    }

    setLoading(true);

    try {
      const senderAddress = `${form.senderHouse}, ${form.senderStreet}, ${form.senderCity}, ${form.senderDistrict}, ${form.senderState}`;
      const recipientAddress = `${form.recipientHouse}, ${form.recipientStreet}, ${form.recipientCity}, ${form.recipientDistrict}, ${form.recipientState}`;

      // 4. API Call
      const payload = {
        sender: {
          name: form.senderName,
          phone: `+91${form.senderPhone}`,
          address: senderAddress,
        },
        recipient: {
          name: form.recipientName,
          phone: `+91${form.recipientPhone}`,
          address: recipientAddress,
        },
        weight: parseFloat(form.weight),
        type: form.parcelType,
        status: "Booked", // Initial Status
        date: new Date().toISOString(),
        paymentAmount: amountNumber,
      };

      const response = await api.createParcel(payload);

      if (response.ok) {
        Alert.alert(
          "Success", 
          `Consignment Registered!\nTracking ID: ${response.data.trackingId || 'Generated'}`, 
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", response.error || "Failed to register consignment.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Consignment</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* --- SENDER DETAILS --- */}
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
              <User size={18} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>Sender Details</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SENDER NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter sender name"
                placeholderTextColor="#94A3B8"
                value={form.senderName}
                onChangeText={(t) => setForm({ ...form, senderName: t })}
              />
            </View>

            <View style={styles.inputGroupLast}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
                value={form.senderPhone}
                onChangeText={(t) => { if (/^\d*$/.test(t)) setForm({ ...form, senderPhone: t }) }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>HOUSE / FLAT</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rose Villa"
                placeholderTextColor="#94A3B8"
                value={form.senderHouse}
                onChangeText={(t) => setForm({ ...form, senderHouse: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>STREET</Text>
              <TextInput
                style={styles.input}
                placeholder="Street name"
                placeholderTextColor="#94A3B8"
                value={form.senderStreet}
                onChangeText={(t) => setForm({ ...form, senderStreet: t })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>CITY</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  value={form.senderCity}
                  onChangeText={(t) => setForm({ ...form, senderCity: t })}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>DISTRICT</Text>
                <TextInput
                  style={styles.input}
                  placeholder="District"
                  placeholderTextColor="#94A3B8"
                  value={form.senderDistrict}
                  onChangeText={(t) => setForm({ ...form, senderDistrict: t })}
                />
              </View>
            </View>

            <View style={styles.inputGroupLast}>
              <Text style={styles.label}>STATE</Text>
              <View style={[styles.input, styles.readOnlyField]}>
                <Text style={{ color: "#64748B", fontSize: 15 }}>{form.senderState}</Text>
              </View>
            </View>
          </View>

          {/* --- RECIPIENT DETAILS --- */}
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <MapPin size={18} color="#D97706" />
            </View>
            <Text style={styles.sectionTitle}>Recipient Details</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>RECIPIENT NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter recipient name"
                placeholderTextColor="#94A3B8"
                value={form.recipientName}
                onChangeText={(t) => setForm({ ...form, recipientName: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
                value={form.recipientPhone}
                onChangeText={(t) => { if (/^\d*$/.test(t)) setForm({ ...form, recipientPhone: t }) }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>HOUSE / FLAT</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rose Villa"
                placeholderTextColor="#94A3B8"
                value={form.recipientHouse}
                onChangeText={(t) => setForm({ ...form, recipientHouse: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>STREET</Text>
              <TextInput
                style={styles.input}
                placeholder="Street name"
                placeholderTextColor="#94A3B8"
                value={form.recipientStreet}
                onChangeText={(t) => setForm({ ...form, recipientStreet: t })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>CITY</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  value={form.recipientCity}
                  onChangeText={(t) => setForm({ ...form, recipientCity: t })}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>DISTRICT</Text>
                <TextInput
                  style={styles.input}
                  placeholder="District"
                  placeholderTextColor="#94A3B8"
                  value={form.recipientDistrict}
                  onChangeText={(t) => setForm({ ...form, recipientDistrict: t })}
                />
              </View>
            </View>

            <View style={styles.inputGroupLast}>
              <Text style={styles.label}>STATE</Text>
              <View style={[styles.input, styles.readOnlyField]}>
                <Text style={{ color: "#64748B", fontSize: 15 }}>{form.recipientState}</Text>
              </View>
            </View>
          </View>

          {/* --- SPECIFICATIONS --- */}
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Package size={18} color="#166534" />
            </View>
            <Text style={styles.sectionTitle}>Specifications</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.inputGroupLast, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>WEIGHT (KG)</Text>
                <View style={styles.suffixInputWrapper}>
                  <TextInput
                    style={styles.suffixInput}
                    placeholder="0.0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={form.weight}
                    onChangeText={(t) => setForm({ ...form, weight: t })}
                  />
                  <Text style={styles.suffixText}>kg</Text>
                </View>
              </View>

              <View style={[styles.inputGroupLast, { flex: 1 }]}>
                <Text style={styles.label}>TYPE OF PARCEL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Document"
                  placeholderTextColor="#94A3B8"
                  value={form.parcelType}
                  onChangeText={(t) => setForm({ ...form, parcelType: t })}
                />
              </View>
            </View>

            <View style={styles.inputGroupLast}>
              <Text style={styles.label}>PAYMENT AMOUNT (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 499"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={form.paymentAmount}
                onChangeText={(t) => setForm({ ...form, paymentAmount: t })}
              />
            </View>
          </View>

          <View style={{ height: 20 }} />

          {/* SUBMIT BUTTON */}
          <TouchableOpacity 
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <QrCode size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.submitText}>Generate Tracking ID & Save</Text>
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
  
  // Section Headers
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 10 },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 10
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },

  // Card & Inputs
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: "#E2E8F0"
  },
  inputGroup: { marginBottom: 16 },
  inputGroupLast: { marginBottom: 0 },
  label: {
    fontSize: 11, fontWeight: "700", color: "#64748B", marginBottom: 6,
    textTransform: "uppercase", letterSpacing: 0.5
  },
  input: {
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: "#1E293B"
  },
  textArea: { height: 100 },
  readOnlyField: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  
  row: { flexDirection: "row" },
  
  // Suffix Input (for KG)
  suffixInputWrapper: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC",
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingHorizontal: 16,
  },
  suffixInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#1E293B" },
  suffixText: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },

  // Submit Button
  submitBtn: {
    backgroundColor: "#2563EB", height: 56, borderRadius: 12,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4, marginTop: 10
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" }
});

export default AddParcelScreen;