import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Save, Package, User, MapPin } from "lucide-react-native";
import { api, type Parcel } from "../utils/api";

const EditParcelScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const parcelId = params.parcelId as string;

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    senderName: "",
    senderPhone: "",
    senderEmail: "",
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

  const normalizePhone = (raw?: string) => {
    if (!raw) return "";
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length > 10 && digits.startsWith("91")) {
      return digits.slice(digits.length - 10);
    }
    return digits.slice(0, 10);
  };

  const loadParcel = useCallback(async () => {
    if (!parcelId) {
      setError("No parcel ID provided");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await api.getParcel(parcelId);
    if (response.ok && response.data) {
      const p = response.data;
      setParcel(p);
      const senderAddr = p.sender?.address || "";
      const recipientAddr = p.recipient?.address || "";
      
      // Parse address string to components
      const senderParts = senderAddr.split(",").map((s: string) => s.trim());
      const recipientParts = recipientAddr.split(",").map((s: string) => s.trim());
      
      setForm({
        senderName: p.sender?.name || "",
        senderPhone: normalizePhone(p.sender?.phone),
        senderEmail: p.sender?.email || "",
        senderHouse: senderParts[0] || "",
        senderStreet: senderParts[1] || "",
        senderCity: senderParts[2] || "",
        senderDistrict: senderParts[3] || "",
        senderState: senderParts[4] || "Kerala",
        recipientName: p.recipient?.name || "",
        recipientPhone: normalizePhone(p.recipient?.phone),
        recipientHouse: recipientParts[0] || "",
        recipientStreet: recipientParts[1] || "",
        recipientCity: recipientParts[2] || "",
        recipientDistrict: recipientParts[3] || "",
        recipientState: recipientParts[4] || "Kerala",
        weight: p.weight?.toString() || "",
        parcelType: p.type || "",
        paymentAmount: p.paymentAmount?.toString() || "",
      });
    } else {
      setError(response.error || "Failed to load parcel");
    }
    setLoading(false);
  }, [parcelId]);

  useEffect(() => {
    loadParcel();
  }, [loadParcel]);

  const validate = () => {
    if (!form.senderName || !form.senderPhone || !form.senderEmail || !form.senderHouse ||
        !form.senderStreet || !form.senderCity || !form.senderDistrict ||
        !form.recipientName || !form.recipientPhone || !form.recipientHouse ||
        !form.recipientStreet || !form.recipientCity || !form.recipientDistrict ||
        !form.weight || !form.parcelType || !form.paymentAmount) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return false;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.senderPhone) || !phoneRegex.test(form.recipientPhone)) {
      Alert.alert("Invalid Phone", "Enter valid 10-digit phone numbers starting with 6-9.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.senderEmail)) {
      Alert.alert("Invalid Email", "Enter a valid sender email address.");
      return false;
    }

    const weightNumber = Number(form.weight);
    if (!Number.isFinite(weightNumber) || weightNumber <= 0) {
      Alert.alert("Invalid Weight", "Weight should be greater than 0.");
      return false;
    }

    const amountNumber = Number(form.paymentAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      Alert.alert("Invalid Amount", "Payment amount should be greater than 0.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!parcelId) return;
    if (!validate()) return;
    setSubmitting(true);

    const senderAddress = `${form.senderHouse}, ${form.senderStreet}, ${form.senderCity}, ${form.senderDistrict}, ${form.senderState}`;
    const recipientAddress = `${form.recipientHouse}, ${form.recipientStreet}, ${form.recipientCity}, ${form.recipientDistrict}, ${form.recipientState}`;

    const payload = {
      sender: {
        name: form.senderName.trim(),
        phone: `+91${form.senderPhone}`,
        email: form.senderEmail.trim(),
        address: senderAddress,
      },
      recipient: {
        name: form.recipientName.trim(),
        phone: `+91${form.recipientPhone}`,
        address: recipientAddress,
      },
      weight: Number(form.weight),
      type: form.parcelType.trim(),
      paymentAmount: Number(form.paymentAmount),
    };

    const response = await api.updateParcel(parcelId, payload);
    setSubmitting(false);

    if (response.ok) {
      Alert.alert("Updated", "Parcel details saved", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Error", response.error || "Failed to update parcel");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Parcel</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Parcel</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Unable to load parcel</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadParcel}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Parcel</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Sender Details */}
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}> 
              <User size={18} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>Sender Details</Text>
          </View>
          <View style={styles.card}>
            <LabeledInput label="Sender Name" value={form.senderName} onChange={(t) => setForm({ ...form, senderName: t })} />
            <LabeledInput label="Phone Number" keyboardType="number-pad" maxLength={10} prefixText="+91"
              value={form.senderPhone}
              onChange={(t) => { if (/^\d*$/.test(t)) setForm({ ...form, senderPhone: t }); }}
              placeholder="9876543210"
            />
            <LabeledInput label="Email" value={form.senderEmail}
              keyboardType="email-address" autoCapitalize="none"
              onChange={(t) => setForm({ ...form, senderEmail: t })}
              placeholder="name@example.com"
            />
            <LabeledInput label="House / Flat" value={form.senderHouse} onChange={(t) => setForm({ ...form, senderHouse: t })} />
            <LabeledInput label="Street" value={form.senderStreet} onChange={(t) => setForm({ ...form, senderStreet: t })} />
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  value={form.senderCity}
                  onChangeText={(t) => setForm({ ...form, senderCity: t })}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>District</Text>
                <TextInput
                  style={styles.input}
                  placeholder="District"
                  placeholderTextColor="#94A3B8"
                  value={form.senderDistrict}
                  onChangeText={(t) => setForm({ ...form, senderDistrict: t })}
                />
              </View>
            </View>
          </View>

          {/* Recipient Details */}
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}> 
              <MapPin size={18} color="#D97706" />
            </View>
            <Text style={styles.sectionTitle}>Recipient Details</Text>
          </View>
          <View style={styles.card}>
            <LabeledInput label="Recipient Name" value={form.recipientName} onChange={(t) => setForm({ ...form, recipientName: t })} />
            <LabeledInput label="Phone Number" keyboardType="number-pad" maxLength={10} prefixText="+91"
              value={form.recipientPhone}
              onChange={(t) => { if (/^\d*$/.test(t)) setForm({ ...form, recipientPhone: t }); }}
              placeholder="9876543210"
            />
            <LabeledInput label="House / Flat" value={form.recipientHouse} onChange={(t) => setForm({ ...form, recipientHouse: t })} />
            <LabeledInput label="Street" value={form.recipientStreet} onChange={(t) => setForm({ ...form, recipientStreet: t })} />
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                  value={form.recipientCity}
                  onChangeText={(t) => setForm({ ...form, recipientCity: t })}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>District</Text>
                <TextInput
                  style={styles.input}
                  placeholder="District"
                  placeholderTextColor="#94A3B8"
                  value={form.recipientDistrict}
                  onChangeText={(t) => setForm({ ...form, recipientDistrict: t })}
                />
              </View>
            </View>
          </View>

          {/* Parcel Details */}
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}> 
              <Package size={18} color="#166534" />
            </View>
            <Text style={styles.sectionTitle}>Parcel Details</Text>
          </View>
          <View style={styles.card}>
            <LabeledInput label="Weight (kg)" keyboardType="numeric" value={form.weight}
              onChange={(t) => setForm({ ...form, weight: t })}
              placeholder="0.0"
            />
            <LabeledInput label="Parcel Type" value={form.parcelType} onChange={(t) => setForm({ ...form, parcelType: t })} placeholder="Document" />
            <LabeledInput label="Payment Amount (₹)" keyboardType="numeric" value={form.paymentAmount}
              onChange={(t) => setForm({ ...form, paymentAmount: t })}
              placeholder="499"
            />
          </View>

          <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} disabled={submitting} onPress={handleSubmit}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const LabeledInput = ({ label, value, onChange, placeholder, keyboardType, maxLength, multiline, numberOfLines, autoCapitalize, icon, prefixText } : {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  icon?: React.ReactNode;
  prefixText?: string;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrapper, multiline && styles.inputWrapperMultiline]}>
      {icon}
      {prefixText ? (
        <>
          <Text style={styles.phonePrefix}>{prefixText}</Text>
          <View style={styles.phoneDivider} />
        </>
      ) : null}
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        onChangeText={onChange}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={numberOfLines}
        autoCapitalize={autoCapitalize}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#B91C1C", marginBottom: 4 },
  errorSubtitle: { fontSize: 13, color: "#475569", marginBottom: 12, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  retryText: { color: "#fff", fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 12, color: "#64748B", fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputWrapperMultiline: { alignItems: "flex-start", paddingVertical: 10 },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: "#0F172A", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingHorizontal: 12 },
  inputMultiline: { minHeight: 70, textAlignVertical: "top" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  submitBtn: {
    height: 52,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  phonePrefix: { color: "#64748B", fontWeight: "700", marginRight: 8 },
  phoneDivider: { width: 1, height: 24, backgroundColor: "#E2E8F0", marginRight: 10 },
});

export default EditParcelScreen;
