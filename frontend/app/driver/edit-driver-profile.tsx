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
  Platform,
  Image,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  StatusBar
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { api, Driver } from "../../utils/api";
import {
  ArrowLeft,
  Save,
  MapPin,
  Camera,
  Upload,
  User,
  Calendar,
  CreditCard,
  ChevronDown,
  Check,
  Mail,
  Phone,
  Home,
  Briefcase
} from "lucide-react-native";

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const KERALA_DISTRICTS = [
  "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod",
  "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad",
  "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad",
];

const EditDriverProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ driverData: string }>();

  const [loading, setLoading] = useState(false);

  // Parse initial data
  let initialData: Driver | null = null;
  try {
    if (params.driverData) initialData = JSON.parse(params.driverData);
  } catch (e) {
    console.error(e);
  }

  // Strip +91 from mobile if present
  const cleanMobile = initialData?.mobile?.startsWith('+91')
    ? initialData.mobile.substring(3)
    : initialData?.mobile || "";

  // Format license with space after first 4 characters
  const formatLicenseDisplay = (license: string) => {
    const cleaned = license.toUpperCase().replace(/\s/g, '');
    if (cleaned.length > 4) {
      return cleaned.slice(0, 4) + ' ' + cleaned.slice(4);
    }
    return cleaned;
  };

  // Form State
  const [form, setForm] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    mobile: cleanMobile,
    license: formatLicenseDisplay(initialData?.license || ""),
    gender: initialData?.gender || "",
    dob: initialData?.dob || "",
    address: {
      house: initialData?.address?.house || "",
      street: initialData?.address?.street || "",
      city: initialData?.address?.city || "",
      district: initialData?.address?.district || "",
      state: initialData?.address?.state || "",
      zip: initialData?.address?.zip || "",
    }
  });

  // UI State
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  // const [showDistrictModal, setShowDistrictModal] = useState(false); // Removed as per new design

  // --- IMAGE STATE ---
  const initialProfileUri = initialData?.profilePhoto ? api.getImageUrl(initialData.profilePhoto) : null;
  const initialLicenseUri = initialData?.licensePhoto ? api.getImageUrl(initialData.licensePhoto) : null;

  const [profileImageUri, setProfileImageUri] = useState<string | null>(initialProfileUri);
  const [licenseImageUri, setLicenseImageUri] = useState<string | null>(initialLicenseUri);

  // CHANGED: Store full Asset objects
  const [newProfileAsset, setNewProfileAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [newLicenseAsset, setNewLicenseAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // --- HANDLERS ---

  const pickImage = async (type: 'profile' | 'license') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [4, 3],
      quality: 0.3,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (type === 'profile') {
        setProfileImageUri(asset.uri);
        setNewProfileAsset(asset); // Store asset
      } else {
        setLicenseImageUri(asset.uri);
        setNewLicenseAsset(asset); // Store asset
      }
    }
  };

  const handleGenderSelect = (gender: string) => {
    setForm({ ...form, gender: gender.toLowerCase() });
    setShowGenderModal(false);
  };

  // const handleDistrictSelect = (district: string) => { // Removed as per new design
  //   setForm(prev => ({
  //     ...prev,
  //     address: { ...prev.address, district }
  //   }));
  //   setShowDistrictModal(false);
  // };

  const handleDobChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDobPicker(false);
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirmDob = () => {
    // Validate age (must be 18 or older)
    const today = new Date();
    const age = today.getFullYear() - tempDate.getFullYear();
    const monthDiff = today.getMonth() - tempDate.getMonth();
    
    if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < tempDate.getDate())) {
      Alert.alert('Invalid Age', 'Driver must be at least 18 years old');
      return;
    }
    
    setForm({ ...form, dob: tempDate.toISOString() });
    setShowDobPicker(false);
  };

  const getMaximumDobDate = () => {
    const today = new Date();
    return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  };

  // License formatting with auto-space (same as register-driver)
  const handleLicenseChange = (text: string) => {
    // Remove all spaces and convert to uppercase
    const cleaned = text.toUpperCase().replace(/\s/g, '');

    // Format: AAXX YYYYYYYYYYY (space after first 4 characters)
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 4) + ' ' + cleaned.slice(4);
    }

    // Limit to 15 characters (excluding space)
    if (cleaned.length <= 15) {
      setForm({ ...form, license: formatted });
    }
  };

  const handleUpdate = async () => {
    if (!initialData?._id) return;

    if (!form.name || !form.email || !form.mobile || !form.license || !form.gender || !form.dob) {
      Alert.alert("Required Fields", "Please fill in all mandatory information.");
      return;
    }

    // Mobile Validation (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.mobile)) {
      Alert.alert("Invalid Phone", "Enter a 10-digit phone number starting with 6-9.");
      return;
    }

    // Email Validation (Allowed Providers) - Simplified as per new snippet
    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!standardEmailRegex.test(form.email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // License Validation (Format: AA XX YYYY XXXXXXX - Total 15 alphanumeric characters)
    const cleanLicense = form.license.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const licenseRegex = /^[A-Z]{2}[0-9]{13}$/;

    if (cleanLicense.length !== 15 || !licenseRegex.test(cleanLicense)) {
      Alert.alert("Invalid License", "License must follow format: AAXX YYYYYYYYYYY (15 alphanumeric characters).");
      return;
    }

    setLoading(true);

    try {
      // Check if license already exists for another driver
      const licenseCheck = await api.checkLicenseExists(cleanLicense, initialData._id);
      if (licenseCheck.ok && licenseCheck.data?.exists) {
        setLoading(false);
        Alert.alert("License Conflict", "This license number is already registered.");
        return;
      }

      // Build payload with base64 images (Vercel compatible)
      const payload: any = {
        name: form.name,
        email: form.email,
        mobile: form.mobile.startsWith('+91') ? form.mobile : `+91${form.mobile}`,
        license: cleanLicense,
        gender: form.gender,
        dob: form.dob,
        address: form.address,
        branch: "Mukkam"
      };

      // Convert profile image to base64 if a new image was selected
      if (newProfileAsset) {
        try {
          const base64 = await FileSystem.readAsStringAsync(newProfileAsset.uri, {
            encoding: 'base64',
          });
          const mimeType = newProfileAsset.mimeType || 'image/jpeg';
          payload.profilePhotoBase64 = `data:${mimeType};base64,${base64}`;
        } catch (imgError) {
          console.error('Error converting profile image to base64:', imgError);
        }
      }

      // Convert license image to base64 if a new image was selected
      if (newLicenseAsset) {
        try {
          const base64 = await FileSystem.readAsStringAsync(newLicenseAsset.uri, {
            encoding: 'base64',
          });
          const mimeType = newLicenseAsset.mimeType || 'image/jpeg';
          payload.licensePhotoBase64 = `data:${mimeType};base64,${base64}`;
        } catch (imgError) {
          console.error('Error converting license image to base64:', imgError);
        }
      }

      const response = await api.updateDriverProfileWithImage(initialData._id, payload);
      console.log('API Response:', response);

      if (response.ok) {
        Alert.alert("Profile Updated", "Your changes have been saved successfully.", [{ text: "Great", onPress: () => router.back() }]);
      } else {
        let errorMessage = response.error || "Could not save changes.";

        // Parse additional error details if available
        if (response.data && typeof response.data === 'string') {
          try {
            const errorData = JSON.parse(response.data);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            // Use original error if JSON parsing fails
          }
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        }

        console.error('Update failed:', {
          status: response.status,
          error: response.error,
          data: response.data
        });

        Alert.alert("Update Failed", errorMessage);
      }
    } catch (error) {
      console.error('Network/App error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert("System Error", "A network error occurred. Please try again.");
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={() => pickImage('profile')} style={styles.avatarContainer}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={40} color="#94A3B8" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Camera size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoTitle}>{form.name || "Driver Name"}</Text>
            <Text style={styles.photoSubtitle}>Tap to update profile picture</Text>
          </View>

          {/* Personal Information Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <User size={20} color="#4F46E5" />
              </View>
              <Text style={styles.sectionTitle}>Status Details</Text>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputField}>
                <User size={18} color="#94A3B8" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.inputLabel}>Gender</Text>
                <TouchableOpacity
                  style={styles.dropdownField}
                  onPress={() => setShowGenderModal(true)}
                >
                  <Text style={[styles.dropdownValue, !form.gender && { color: "#94A3B8" }]}>
                    {form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : "Select"}
                  </Text>
                  <ChevronDown size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>DOB</Text>
                <TouchableOpacity
                  style={styles.dropdownField}
                  onPress={() => setShowDobPicker(true)}
                >
                  <Calendar size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                  <Text style={[styles.dropdownValue, !form.dob && { color: "#94A3B8" }]}>
                    {form.dob ? new Date(form.dob).toLocaleDateString('en-GB') : "Select"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Contact Information Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Mail size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.sectionTitle}>Contact Details</Text>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputField}>
                <Mail size={18} color="#94A3B8" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={form.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(t) => setForm({ ...form, email: t })}
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <View style={[styles.inputField, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }]}>
                  <Phone size={18} color="#94A3B8" style={styles.fieldIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={form.mobile}
                    keyboardType="phone-pad"
                    maxLength={10}
                    onChangeText={(t) => setForm({ ...form, mobile: t.replace(/[^0-9]/g, '') })}
                    placeholder="9876543210"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Professional Details Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Briefcase size={20} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>Verification</Text>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>License Number</Text>
              <View style={styles.inputField}>
                <CreditCard size={18} color="#94A3B8" style={styles.fieldIcon} />
                <TextInput
                  style={[styles.textInput, { letterSpacing: 1 }]}
                  value={form.license}
                  autoCapitalize="characters"
                  maxLength={16}
                  placeholder="AA00 00000000000"
                  placeholderTextColor="#94A3B8"
                  onChangeText={handleLicenseChange}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>License Document</Text>
            <TouchableOpacity style={styles.documentUpload} onPress={() => pickImage('license')}>
              {licenseImageUri ? (
                <Image source={{ uri: licenseImageUri }} style={styles.documentImage} resizeMode="cover" />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Upload size={32} color="#CBD5E1" />
                  <Text style={styles.uploadTitle}>Upload Document</Text>
                  <Text style={styles.uploadSubtitle}>Driving License (Front/Back)</Text>
                </View>
              )}
              {licenseImageUri && (
                <View style={styles.editBadge}>
                  <Camera size={14} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Address Card */}
          <View style={[styles.sectionCard, { marginBottom: 30 }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MapPin size={20} color="#EF4444" />
              </View>
              <Text style={styles.sectionTitle}>Residential Address</Text>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>House / Flat No.</Text>
              <View style={styles.inputField}>
                <Home size={18} color="#94A3B8" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={form.address.house}
                  onChangeText={(t) => updateAddress('house', t)}
                  placeholder="House name/number"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Street / Area</Text>
              <TextInput
                style={styles.simpleInput}
                value={form.address.street}
                onChangeText={(t) => updateAddress('street', t)}
                placeholder="Locality or street name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.simpleInput}
                  value={form.address.city}
                  onChangeText={(t) => updateAddress('city', t)}
                  placeholder="City"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>District</Text>
                <View style={[styles.simpleInput, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                  <Text style={{ color: '#64748B' }}>{form.address.district}</Text>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.simpleInput}
                  value={form.address.state}
                  onChangeText={(t) => updateAddress('state', t)}
                />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Zip Code</Text>
                <TextInput
                  style={styles.simpleInput}
                  value={form.address.zip}
                  keyboardType="numeric"
                  maxLength={6}
                  onChangeText={(t) => updateAddress('zip', t.replace(/[^0-9]/g, ''))}
                  placeholder="673xxx"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Apply Changes</Text>
              <Save size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* DOB Picker */}
      {showDobPicker && Platform.OS === 'ios' && (
        <Modal visible={showDobPicker} transparent animationType="slide">
          <View style={styles.datePickerModalContainer}>
            <View style={styles.datePickerContent}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
              </View>
              <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDobChange}
                  maximumDate={getMaximumDobDate()}
                  textColor="#fff"
                />
              </View>
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={styles.datePickerCancel}
                  onPress={() => setShowDobPicker(false)}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePickerConfirm}
                  onPress={handleConfirmDob}
                >
                  <Text style={styles.datePickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showDobPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowDobPicker(false);
            if (date) {
              setTempDate(date);
              setTimeout(() => {
                // Validate age
                const today = new Date();
                const age = today.getFullYear() - date.getFullYear();
                const monthDiff = today.getMonth() - date.getMonth();
                
                if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < date.getDate())) {
                  Alert.alert('Invalid Age', 'Driver must be at least 18 years old');
                  return;
                }
                
                setForm(prev => ({ ...prev, dob: date.toISOString() }));
              }, 100);
            }
          }}
          maximumDate={getMaximumDobDate()}
        />
      )}

      {/* Gender Selection Modal */}
      <Modal
        visible={showGenderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Gender</Text>
                  <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                    <Text style={styles.modalCloseText}>Done</Text>
                  </TouchableOpacity>
                </View>
                {GENDER_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.modalItem}
                    onPress={() => handleGenderSelect(item)}
                  >
                    <Text style={[
                      styles.modalItemText,
                      form.gender.toLowerCase() === item.toLowerCase() && styles.modalItemSelectedText
                    ]}>
                      {item}
                    </Text>
                    {form.gender.toLowerCase() === item.toLowerCase() && (
                      <Check size={20} color="#4F46E5" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* District Modal - Removed as per new design */}
      {/* <Modal
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
                      style={styles.modalItem}
                      onPress={() => handleDistrictSelect(item)}
                    >
                      <Text style={[
                        styles.modalItemText,
                        form.address.district === item && styles.selectedModalItemText
                      ]}>
                        {item}
                      </Text>
                      {form.address.district === item && <Check size={20} color="#0EA5E9" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal> */}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 10,
    marginLeft: -10,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Photo Section
  photoSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#4F46E5',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 16,
    letterSpacing: -0.5,
  },
  photoSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  // Cards
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },

  // Inputs
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  simpleInput: {
    height: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
    justifyContent: 'center',
  },
  row: {
    flexDirection: "row",
  },

  // Phone Input
  phoneInputRow: {
    flexDirection: "row",
  },
  countryCode: {
    height: 54,
    width: 60,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },

  // Dropdown
  dropdownField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 52,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  dropdownValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
    flex: 1,
  },

  // Document Upload
  documentUpload: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 4,
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginTop: 12,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  editBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F46E5",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalItemText: {
    fontSize: 16,
    color: "#475569",
    fontWeight: "500",
  },
  modalItemSelectedText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  datePickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  datePickerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  datePickerCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  datePickerConfirm: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default EditDriverProfileScreen;












