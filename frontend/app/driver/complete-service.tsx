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
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ChevronLeft, CheckCircle, IndianRupee, Gauge } from "lucide-react-native";
import { api } from "../../utils/api";

const CompleteServiceScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    serviceId: string;
    driverId: string;
    vehicleReg: string;
    previousOdometer: string;
    role: string;
  }>();

  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState(params.previousOdometer || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!cost.trim()) {
      Alert.alert("Error", "Please enter the total service cost.");
      return;
    }
    if (!odometer.trim()) {
      Alert.alert("Error", "Please enter current odometer reading.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.updateServiceStatus(
        params.serviceId as string,
        "Completed",
        params.driverId as string,
        params.role || "Driver",
        parseFloat(cost),
        parseInt(odometer)
      );

      if (res.ok) {
        Alert.alert("Success", "Service marked as completed. Vehicle is now Active.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Error", res.error || "Failed to update service status");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Service</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{params.vehicleReg}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Service Cost (₹) *</Text>
            <View style={styles.inputWrapper}>
              <IndianRupee size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 1500"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Odometer Reading (KM) *</Text>
            <View style={styles.inputWrapper}>
              <Gauge size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 12500"
                value={odometer}
                onChangeText={setOdometer}
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
              />
            </View>
            <Text style={styles.hint}>Previous: {params.previousOdometer} KM</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Confirm Completion</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
  content: { padding: 20 },
  infoCard: {
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  infoLabel: { fontSize: 12, color: "#1E40AF", fontWeight: "600", textTransform: "uppercase" },
  infoValue: { fontSize: 18, fontWeight: "700", color: "#1E3A8A", marginTop: 4 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 16, color: "#1E293B", fontWeight: "500" },
  hint: { fontSize: 12, color: "#64748B", marginTop: 4, fontStyle: "italic" },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#10B981",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: { opacity: 0.6 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

export default CompleteServiceScreen;
