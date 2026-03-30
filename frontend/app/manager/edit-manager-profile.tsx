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
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import React from "react";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { api, User } from "../../utils/api";
import { 
  ChevronLeft, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  Home, 
  Map, 
  Navigation,
  ChevronDown,
  Check,
  Save,
  Camera,
  X
} from "lucide-react-native";

// List of Districts in Kerala
const KERALA_DISTRICTS = [
  "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod",
  "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad",
  "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad",
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

const EditManagerProfileScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ userData: string }>();
  const [loading, setLoading] = useState(false);
  
  // CHANGED: Store the full asset object to get mimeType
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Parse Initial Data
  let initialData: User | null = null;
  try {
    if (params.userData) initialData = JSON.parse(params.userData);
  } catch (e) {
    console.error("Error parsing user data", e);
  }

  // Strip +91 for display
  const cleanPhone = initialData?.phone?.startsWith('+91') 
    ? initialData.phone.substring(3) 
    : initialData?.phone || "";

  // Form State
  const [formData, setFormData] = useState<ManagerFormData>({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: cleanPhone,
    dob: initialData?.dob || "",
    houseName: initialData?.address?.house || "",
    street: initialData?.address?.street || "",
    city: initialData?.address?.city || "",
    district: initialData?.address?.district || "",
    state: initialData?.address?.state || "Kerala",
  });

  const today = new Date();
  const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const getInitialDate = () => {
    if(formData.dob) {
       if(formData.dob.includes('/')) {
         const parts = formData.dob.split('/');
         return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
       }
       const d = new Date(formData.dob);
       if(!isNaN(d.getTime())) return d;
    }
    return eighteenYearsAgo;
  }
  
  const [date, setDate] = useState<Date>(getInitialDate());
  const [showDistrictModal, setShowDistrictModal] = useState(false);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
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

  const handleDistrictSelect = (district: string) => {
    setFormData({ ...formData, district: district });
    setShowDistrictModal(false);
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "Permission to access media library is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
      });

      if (!result.canceled && result.assets[0]) {
        // CHANGED: Store full asset
        setSelectedAsset(result.assets[0]);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleUpdate = async () => {
    if (!initialData?._id) return;

    const { name, email, phone, houseName, city } = formData;
    
    if (!name.trim() || !email.trim() || !phone.trim() || !houseName.trim() || !city.trim()) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert("Invalid Phone", "Number must be 10 digits.");
      return;
    }

    setLoading(true);

    try {
      // Build the payload
      const payload: any = {
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
          state: formData.state,
        },
        branch: "Mukkam"
      };

      // Convert image to base64 if a new image was selected
      if (selectedAsset) {
        try {
          const base64 = await FileSystem.readAsStringAsync(selectedAsset.uri, {
            encoding: 'base64',
          });
          const mimeType = selectedAsset.mimeType || 'image/jpeg';
          payload.profilePhotoBase64 = `data:${mimeType};base64,${base64}`;
        } catch (imgError) {
          console.error('Error converting image to base64:', imgError);
          Alert.alert("Error", "Failed to process image. Please try again.");
          setLoading(false);
          return;
        }
      }

      const response = await api.updateUserProfileWithImage(initialData._id, payload);

      if (response.ok) {
        Alert.alert("Success", "Profile updated successfully!", [{ text: "OK", onPress: () => router.back() }]);
      } else {
        Alert.alert("Error", response.error || "Failed to update profile");
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
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 28 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
            
            {/* Profile Photo Section */}
            <View style={styles.profilePhotoSection}>
              <TouchableOpacity 
                style={styles.profilePhotoContainer}
                onPress={handlePickImage}
              >
                {selectedAsset || initialData?.profilePhoto ? (
                  <>
                    <Image
                      source={{ uri: selectedAsset?.uri || api.getImageUrl(initialData?.profilePhoto) || undefined }}
                      style={styles.profilePhoto}
                    />
                    <View style={styles.cameraOverlay}>
                      <Camera size={28} color="#fff" />
                    </View>
                  </>
                ) : (
                  <View style={styles.profilePhotoPlaceholder}>
                    <Camera size={40} color="#94A3B8" />
                    <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {selectedAsset && (
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setSelectedAsset(null)}
                >
                  <X size={20} color="#EF4444" />
                  <Text style={styles.removePhotoText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Personal Details */}
            <Text style={styles.sectionHeader}>Personal Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputWrapper}>
                <UserIcon size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
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
              <Text style={styles.label}>DATE OF BIRTH</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputWrapper}>
                <Calendar size={20} color="#94A3B8" style={styles.inputIcon} />
                <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 14 }]}>
                    {formData.dob || "Select Date"}
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
                    value={formData.city}
                    onChangeText={(text) => setFormData({ ...formData, city: text })}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>DISTRICT</Text>
                <View 
                  style={[styles.inputWrapper, { paddingLeft: 12, backgroundColor: "#F1F5F9" }]} 
                >
                  <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 14, color: "#64748B" }]}>
                    {formData.district}
                  </Text>
                </View>
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
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                  <Save size={20} color="#fff" style={{ marginLeft: 8 }} />
                </>
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
  safeArea: { 
    flex: 1, 
    backgroundColor: "#F5F7FA" 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 24 
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  iconButton: { 
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#1A202C",
    letterSpacing: 0.3,
  },
  formContainer: { 
    paddingBottom: 120 
  },
  
  // Profile Photo Styles
  profilePhotoSection: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F4F8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  profilePhotoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    position: "relative",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  profilePhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0284C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  profilePhotoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    marginTop: 10,
    fontSize: 12,
    color: "#718096",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  removePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  removePhotoText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  sectionHeader: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1A202C",
    marginTop: 24,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  inputGroup: { 
    marginBottom: 20 
  },
  row: { 
    flexDirection: "row" 
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#718096",
    marginBottom: 8,
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
    height: 52,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: { 
    marginRight: 12 
  },
  phonePrefix: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#1A202C", 
    marginRight: 10 
  },
  phoneDivider: { 
    width: 1, 
    height: 28, 
    backgroundColor: "#E2E8F0", 
    marginRight: 12 
  },
  input: { 
    flex: 1, 
    fontSize: 15, 
    color: "#1A202C", 
    height: "100%",
    fontWeight: "500",
  },
  footer: { 
    position: "absolute", 
    bottom: 20, 
    left: 24, 
    right: 24 
  },
  submitButton: {
    backgroundColor: "#2563EB",
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  disabledButton: { 
    opacity: 0.7 
  },
  submitButtonText: { 
    color: "#FFFFFF", 
    fontSize: 16, 
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    padding: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#1A202C",
    letterSpacing: 0.3,
  },
  closeText: { 
    color: "#0284C7", 
    fontSize: 16, 
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  districtItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  districtText: { 
    fontSize: 16, 
    color: "#1A202C",
    fontWeight: "600",
  },
  selectedDistrictText: { 
    color: "#0284C7", 
    fontWeight: "800" 
  },
});

export default EditManagerProfileScreen;












