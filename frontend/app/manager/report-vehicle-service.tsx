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
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ChevronLeft, Calendar, AlertCircle } from "lucide-react-native";
import { api } from "../../utils/api";
import DateTimePicker from "@react-native-community/datetimepicker";

const ISSUE_TYPES = ["Accident", "Mechanical", "Engine", "Brake", "Electrical", "Maintenance"];

const ReportVehicleServiceScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    vehicleId?: string;
    vehicleReg?: string;
    editMode?: string;
    serviceRecordId?: string;
    existingData?: string;
    reporterName?: string;
    reporterRole?: string;
  }>();

  const isEdit = params.editMode === "true";
  const existing = params.existingData ? JSON.parse(params.existingData as string) : null;

  const [formData, setFormData] = useState({
    vehicleId: params.vehicleId || "",
    registrationNumber: params.vehicleReg || "",
    dateOfIssue: existing?.dateOfIssue ? new Date(existing.dateOfIssue) : new Date(),
    issueType: existing?.issueType || "",
    issueDescription: existing?.issueDescription || "",
    odometerReading: existing?.odometerReading ? String(existing.odometerReading) : "",
    serviceStartDate: existing?.serviceStartDate ? new Date(existing.serviceStartDate) : new Date(),
    workshopName: existing?.workshopName || "",
    totalServiceCost: existing?.totalServiceCost ? String(existing.totalServiceCost) : "",
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<"issue" | "service" | "completion" | null>(null);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(null);
    }
    if (selectedDate) {
      if (showDatePicker === "issue") {
        setFormData({ ...formData, dateOfIssue: selectedDate });
      } else if (showDatePicker === "service") {
        setFormData({ ...formData, serviceStartDate: selectedDate });
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const validateForm = () => {
    if (!formData.registrationNumber.trim()) {
      Alert.alert("Error", "Please enter registration number");
      return false;
    }
    if (!formData.issueType) {
      Alert.alert("Error", "Please select issue type");
      return false;
    }
    if (!formData.issueDescription.trim()) {
      Alert.alert("Error", "Please enter issue description");
      return false;
    }
    if (!formData.odometerReading.trim()) {
      Alert.alert("Error", "Please enter odometer reading");
      return false;
    }
    if (!formData.workshopName.trim()) {
      Alert.alert("Error", "Please enter workshop/service center name");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload: any = {
        vehicleId: formData.vehicleId,
        registrationNumber: formData.registrationNumber,
        dateOfIssue: formData.dateOfIssue.toISOString(),
        issueType: formData.issueType,
        issueDescription: formData.issueDescription,
        odometerReading: parseInt(formData.odometerReading),
        serviceStartDate: formData.serviceStartDate.toISOString(),
        workshopName: formData.workshopName,
        reportedBy: isEdit ? existing?.reportedBy : (params.reporterName || "Unknown"),
        reporterRole: isEdit ? existing?.reporterRole : (params.reporterRole || "Manager"),
      };

      if (formData.totalServiceCost.trim()) {
        payload.totalServiceCost = parseFloat(formData.totalServiceCost);
      }

      let res;
      if (isEdit && params.serviceRecordId) {
        res = await api.updateVehicleService(params.serviceRecordId, payload);
      } else {
        res = await api.createVehicleService(payload);
      }

      if (res.ok) {
        Alert.alert(
          "Success",
          isEdit
            ? "Service record updated successfully."
            : "Service record submitted successfully. Vehicle marked as In-Service.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Error", res.error || "Failed to submit service record");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit service record");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? "Edit Service Record" : "Report Vehicle Service"}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Vehicle ID / Registration */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Registration Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., KL 01 AB 1234"
              placeholderTextColor="#94A3B8"
              value={formData.registrationNumber}
              onChangeText={(text) =>
                setFormData({ ...formData, registrationNumber: text.toUpperCase() })
              }
              editable={!params.vehicleReg}
            />
          </View>

          {/* Date of Issue Reported */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date of Issue Reported *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker("issue")}
            >
              <Calendar size={20} color="#2563EB" />
              <Text style={styles.dateInputText}>{formatDate(formData.dateOfIssue)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker === "issue" && (
            <DateTimePicker
              value={formData.dateOfIssue}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Issue Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Issue Type *</Text>
            <View style={styles.issueTypeContainer}>
              {ISSUE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.issueTypeButton,
                    formData.issueType === type && styles.issueTypeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, issueType: type })}
                >
                  <Text
                    style={[
                      styles.issueTypeText,
                      formData.issueType === type && styles.issueTypeTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Issue Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Issue Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what exactly happened..."
              placeholderTextColor="#94A3B8"
              value={formData.issueDescription}
              onChangeText={(text) =>
                setFormData({ ...formData, issueDescription: text })
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Odometer Reading */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Odometer Reading (KM) *</Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.input, styles.inputWithUnitField]}
                placeholder="e.g., 15000"
                placeholderTextColor="#94A3B8"
                value={formData.odometerReading}
                onChangeText={(text) =>
                  setFormData({ ...formData, odometerReading: text.replace(/[^0-9]/g, "") })
                }
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>KM</Text>
            </View>
          </View>

          {/* Service Start Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Service Start Date *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker("service")}
            >
              <Calendar size={20} color="#2563EB" />
              <Text style={styles.dateInputText}>{formatDate(formData.serviceStartDate)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker === "service" && (
            <DateTimePicker
              value={formData.serviceStartDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
          )}

          {/* Workshop / Service Center Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Workshop / Service Center Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., ABC Auto Service Center"
              placeholderTextColor="#94A3B8"
              value={formData.workshopName}
              onChangeText={(text) =>
                setFormData({ ...formData, workshopName: text })
              }
            />
          </View>

          {/* Total Service Cost */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Total Service Cost (₹)</Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.input, styles.inputWithUnitField]}
                placeholder="e.g., 5000"
                placeholderTextColor="#94A3B8"
                value={formData.totalServiceCost}
                onChangeText={(text) =>
                  setFormData({ ...formData, totalServiceCost: text.replace(/[^0-9.]/g, "") })
                }
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>₹</Text>
            </View>
          </View>


          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{isEdit ? "Update Service Record" : "Submit Service Report"}</Text>
            )}
          </TouchableOpacity>

          {/* Helper Text */}
          <View style={styles.helperContainer}>
            <AlertCircle size={16} color="#94A3B8" />
            <Text style={styles.helperText}>
              Fields marked with * are required
            </Text>
          </View>
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
  content: { padding: 20, paddingBottom: 40 },

  // Form Group
  formGroup: { marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Input Styles
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  // Date Input
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    flex: 1,
  },

  // Issue Type Buttons
  issueTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  issueTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  issueTypeButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  issueTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  issueTypeTextActive: {
    color: "#fff",
  },

  // Input with Unit
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWithUnitField: {
    flex: 1,
  },
  unitLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    paddingHorizontal: 12,
  },

  // Submit Button
  submitButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Helper
  helperContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#94A3B8",
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
});

export default ReportVehicleServiceScreen;
