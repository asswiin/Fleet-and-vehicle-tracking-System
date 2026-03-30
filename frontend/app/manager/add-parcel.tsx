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
  Smartphone,
  ChevronDown,
  ChevronUp
} from "lucide-react-native";
import { api } from "../../utils/api";

const PARCEL_TYPES = [
  "Clothes",
  "Shoes and accessories",
  "Books",
  "Electronic items",
  "Spare parts"
];

const AddParcelScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

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
    recipientEmail: "",
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
      !form.senderEmail ||
      !form.senderHouse ||
      !form.senderStreet ||
      !form.senderCity ||
      !form.senderDistrict ||
      !form.recipientName ||
      !form.recipientPhone ||
      !form.recipientEmail ||
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.senderEmail)) {
      Alert.alert("Invalid Sender Email", "Please enter a valid sender email address.");
      return;
    }

    if (!emailRegex.test(form.recipientEmail)) {
      Alert.alert("Invalid Recipient Email", "Please enter a valid recipient email address.");
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
          email: form.senderEmail.trim(),
          address: senderAddress,
        },
        recipient: {
          name: form.recipientName,
          phone: `+91${form.recipientPhone}`,
          email: form.recipientEmail.trim(),
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>LOGISTICS MANAGEMENT</Text>
            <Text style={styles.headerTitle}>Register Consignment</Text>
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
            {/* Sender Details */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderContainer}>
                <View style={styles.sectionIcon}>
                  <User size={18} color="#4F46E5" />
                </View>
                <Text style={styles.sectionTitle}>Sender Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter sender name"
                    placeholderTextColor="#94A3B8"
                    value={form.senderName}
                    onChangeText={(t) => setForm({ ...form, senderName: t })}
                  />
                  <User size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.phonePrefix}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={form.senderPhone}
                    onChangeText={(t) => { if (/^\d*$/.test(t)) setForm({ ...form, senderPhone: t }) }}
                  />
                  <Smartphone size={18} color="#94A3B8" style={styles.suffixIcon} />
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
                    value={form.senderEmail}
                    onChangeText={(t) => setForm({ ...form, senderEmail: t })}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>HOUSE / FLAT</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Rose Villa"
                      placeholderTextColor="#94A3B8"
                      value={form.senderHouse}
                      onChangeText={(t) => setForm({ ...form, senderHouse: t })}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>STREET</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Street name"
                      placeholderTextColor="#94A3B8"
                      value={form.senderStreet}
                      onChangeText={(t) => setForm({ ...form, senderStreet: t })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>CITY / HUB</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      placeholderTextColor="#94A3B8"
                      value={form.senderCity}
                      onChangeText={(t) => setForm({ ...form, senderCity: t })}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>DISTRICT</Text>
                  <View style={styles.inputWrapper}>
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
            </View>

            {/* Recipient Details */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderContainer}>
                <View style={[styles.sectionIcon, { backgroundColor: '#F0F9FF' }]}>
                  <MapPin size={18} color="#0EA5E9" />
                </View>
                <Text style={styles.sectionTitle}>Recipient Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter recipient name"
                    placeholderTextColor="#94A3B8"
                    value={form.recipientName}
                    onChangeText={(t) => setForm({ ...form, recipientName: t })}
                  />
                  <User size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.phonePrefix}>+91</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={form.recipientPhone}
                    onChangeText={(t) => { if (/^\d*$/.test(t)) setForm({ ...form, recipientPhone: t }) }}
                  />
                  <Smartphone size={18} color="#94A3B8" style={styles.suffixIcon} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="recipient@example.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.recipientEmail}
                    onChangeText={(t) => setForm({ ...form, recipientEmail: t })}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>HOUSE / FLAT</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Rose Villa"
                      placeholderTextColor="#94A3B8"
                      value={form.recipientHouse}
                      onChangeText={(t) => setForm({ ...form, recipientHouse: t })}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>STREET</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Street name"
                      placeholderTextColor="#94A3B8"
                      value={form.recipientStreet}
                      onChangeText={(t) => setForm({ ...form, recipientStreet: t })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>CITY / DESTINATION</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      placeholderTextColor="#94A3B8"
                      value={form.recipientCity}
                      onChangeText={(t) => setForm({ ...form, recipientCity: t })}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>DISTRICT</Text>
                  <View style={styles.inputWrapper}>
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
            </View>

            {/* Consignment Details */}
            <View style={styles.card}>
              <View style={styles.sectionHeaderContainer}>
                <View style={[styles.sectionIcon, { backgroundColor: '#FDF2F8' }]}>
                  <Package size={18} color="#DB2777" />
                </View>
                <Text style={styles.sectionTitle}>Consignment Details</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>PARCEL WEIGHT</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="0.0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={form.weight}
                      onChangeText={(t) => setForm({ ...form, weight: t })}
                    />
                    <Text style={styles.weightUnit}>KG</Text>
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                  <Text style={styles.label}>TYPE OF PARCEL</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Select or type..."
                      placeholderTextColor="#94A3B8"
                      value={form.parcelType}
                      onChangeText={(t) => setForm({ ...form, parcelType: t })}
                      onFocus={() => setShowTypeDropdown(true)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                      activeOpacity={0.7}
                    >
                      <ChevronDown size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {showTypeDropdown && (
                    <View style={styles.dropdownMenu}>
                      {PARCEL_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.dropdownItem,
                            form.parcelType === type && styles.dropdownItemActive
                          ]}
                          onPress={() => {
                            setForm({ ...form, parcelType: type });
                            setShowTypeDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            form.parcelType === type && styles.dropdownItemTextActive
                          ]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PAYMENT AMOUNT (₹)</Text>
                <View style={[styles.inputWrapper, { borderColor: '#10B981' }]}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={form.paymentAmount}
                    onChangeText={(t) => setForm({ ...form, paymentAmount: t })}
                  />
                  <Smartphone size={18} color="#10B981" style={styles.suffixIcon} />
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
                  <QrCode size={20} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.submitButtonText}>Submit Consignment & Print ID</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    fontSize: 18,
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
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
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
  phonePrefix: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
    marginRight: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981",
    marginRight: 8,
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
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#EEF2FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
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
});

export default AddParcelScreen;

