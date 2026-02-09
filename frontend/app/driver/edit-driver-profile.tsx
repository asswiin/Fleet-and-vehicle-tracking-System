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
  TouchableWithoutFeedback
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { api, Driver } from "../../utils/api";
import { 
  ChevronLeft, 
  Save, 
  MapPin, 
  Camera, 
  Upload, 
  User, 
  Calendar, 
  CreditCard,
  ChevronDown,
  Check
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
  } catch(e) { console.error(e); }

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
  const [showDistrictModal, setShowDistrictModal] = useState(false);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: type === 'profile' ? [1, 1] : [4, 3], 
      quality: 0.7, 
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

  const handleDistrictSelect = (district: string) => {
    setForm(prev => ({
      ...prev,
      address: { ...prev.address, district }
    }));
    setShowDistrictModal(false);
  };

  const handleDobChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDobPicker(false);
    
    if (selectedDate) {
      setForm({ ...form, dob: selectedDate.toISOString() });
    }
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
      Alert.alert("Error", "All fields including License, Gender, and DOB are required.");
      return;
    }

    // Mobile Validation (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.mobile)) {
      Alert.alert("Invalid Phone", "Enter a valid 10-digit phone number starting with 6, 7, 8, or 9.");
      return;
    }

    // Email Validation (Allowed Providers)
    const allowedDomainsRegex = /@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|proton\.me|protonmail\.com|zoho\.com|aol\.com|mail\.com|gmx\.com|yandex\.com|rediffmail\.com|yahoo\.co\.in|outlook\.in|live\.com|msn\.com|hey\.com)$/i;
    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!standardEmailRegex.test(form.email) || !allowedDomainsRegex.test(form.email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // License Validation (Format: AA XX YYYY XXXXXXX - Total 15 alphanumeric characters)
    const cleanLicense = form.license.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const licenseRegex = /^[A-Z]{2}[0-9]{13}$/;

    if (cleanLicense.length !== 15 || !licenseRegex.test(cleanLicense)) {
      Alert.alert(
        "Invalid License", 
        "License must follow format: State(2) RTO(2) Year(4) ID(7).\nExample: MH14 20110062821"
      );
      return;
    }

    setLoading(true);

    try {
      // Check if license already exists for another driver
      const licenseCheck = await api.checkLicenseExists(cleanLicense, initialData._id);
      if (licenseCheck.ok && licenseCheck.data?.exists) {
        setLoading(false);
        Alert.alert(
          "License Already Exists", 
          `This license number is already registered to another driver${licenseCheck.data.driverName ? ` (${licenseCheck.data.driverName})` : ''}.`
        );
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
        address: form.address
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
        Alert.alert("Success", "Profile updated successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        let errorMessage = response.error || "Could not update profile";
        
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
      Alert.alert("Error", `Network error occurred: ${errorMessage}`);
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
          
          {/* --- PROFILE PHOTO --- */}
          <View style={styles.profilePhotoContainer}>
            <TouchableOpacity onPress={() => pickImage('profile')} style={styles.avatarWrapper}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                   <Text style={{ fontSize: 30, color: '#CBD5E1', fontWeight:'bold' }}>
                      {form.name ? form.name.charAt(0).toUpperCase() : "D"}
                   </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Camera size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Tap to change profile photo</Text>
          </View>

          <Text style={styles.sectionHeader}>Personal Information</Text>
          
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.iconInputWrapper}>
              <User size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.iconInput}
                value={form.name}
                onChangeText={(t) => setForm({...form, name: t})}
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowGenderModal(true)}
            >
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <User size={20} color="#94A3B8" style={styles.inputIcon} />
                  <Text style={[styles.dropdownText, !form.gender && { color: "#94A3B8" }]}>
                    {form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : "Select Gender"}
                  </Text>
               </View>
              <ChevronDown size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* DOB */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDobPicker(true)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Calendar size={20} color="#94A3B8" style={styles.inputIcon} />
                <Text style={[styles.dropdownText, !form.dob && { color: "#94A3B8" }]}>
                  {form.dob ? new Date(form.dob).toLocaleDateString('en-GB') : "Select Date"}
                </Text>
              </View>
              <ChevronDown size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {showDobPicker && (
            <DateTimePicker
              value={form.dob ? new Date(form.dob) : new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDobChange}
              maximumDate={getMaximumDobDate()}
            />
          )}

          {/* Mobile */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={form.mobile}
                keyboardType="phone-pad"
                maxLength={10}
                onChangeText={(t) => setForm({...form, mobile: t.replace(/[^0-9]/g, '')})}
              />
            </View>
          </View>

          {/* Email */}
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

          {/* License Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Number</Text>
            <View style={styles.iconInputWrapper}>
              <CreditCard size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.iconInput}
                value={form.license}
                autoCapitalize="characters"
                maxLength={16}
                placeholder="KL01 20200012345"
                placeholderTextColor="#94A3B8"
                onChangeText={handleLicenseChange}
              />
            </View>
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
              Format: State(2) RTO(2) Year(4) ID(7) - e.g., KL01 20200012345
            </Text>
          </View>

          {/* --- LICENSE PHOTO --- */}
          <View style={styles.licenseContainer}>
             <Text style={styles.label}>Driving License Photo</Text>
             <TouchableOpacity style={styles.licenseUploadBox} onPress={() => pickImage('license')}>
                {licenseImageUri ? (
                  <Image source={{ uri: licenseImageUri }} style={styles.licenseImage} resizeMode="cover" />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Upload size={24} color="#64748B" />
                    <Text style={styles.uploadText}>Upload License Image</Text>
                  </View>
                )}
                <View style={styles.editIconOverlay}>
                   <Camera size={16} color="#2563EB" />
                </View>
             </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* --- ADDRESS --- */}
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
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowDistrictModal(true)}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <MapPin size={20} color="#94A3B8" style={styles.inputIcon} />
                  <Text style={[styles.dropdownText, !form.address.district && { color: "#94A3B8" }]}>
                    {form.address.district || "Select District"}
                  </Text>
                </View>
                <ChevronDown size={18} color="#94A3B8" />
              </TouchableOpacity>
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
                maxLength={6}
                onChangeText={(t) => updateAddress('zip', t.replace(/[^0-9]/g, ''))}
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

      {/* Gender Modal */}
      <Modal
        visible={showGenderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Gender</Text>
                  <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                    <Text style={styles.closeText}>Close</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={GENDER_OPTIONS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.modalItem} 
                      onPress={() => handleGenderSelect(item)}
                    >
                      <Text style={[
                        styles.modalItemText, 
                        form.gender.toLowerCase() === item.toLowerCase() && styles.selectedModalItemText
                      ]}>
                        {item}
                      </Text>
                      {form.gender.toLowerCase() === item.toLowerCase() && <Check size={20} color="#0EA5E9" />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* District Modal */}
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
      </Modal>

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
  
  // Profile Photo
  profilePhotoContainer: { alignItems: 'center', marginBottom: 25 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E2E8F0', justifyContent:'center', alignItems:'center', borderWidth: 3, borderColor: '#fff' },
  cameraBadge: { 
    position: 'absolute', bottom: 0, right: 0, 
    backgroundColor: '#2563EB', padding: 8, borderRadius: 20, 
    borderWidth: 2, borderColor: '#fff' 
  },
  photoHint: { fontSize: 12, color: '#64748B', marginTop: 8 },

  sectionHeaderContainer: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 15 },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginLeft: 8 },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  
  // Inputs
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1E293B"
  },
  iconInputWrapper: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  iconInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: "#1E293B" },

  // Phone
  phoneInputContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, overflow: "hidden",
  },
  phonePrefix: {
    backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 10,
    borderRightWidth: 1, borderRightColor: "#E2E8F0",
  },
  phonePrefixText: { fontSize: 15, fontWeight: "600", color: "#475569" },
  phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1E293B" },

  // Dropdown
  dropdownButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  dropdownText: { fontSize: 15, color: "#1E293B" },

  // License Photo
  licenseContainer: { marginBottom: 16 },
  licenseUploadBox: { 
    height: 160, backgroundColor: '#F1F5F9', borderRadius: 12, 
    borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative'
  },
  licenseImage: { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { marginTop: 8, color: '#64748B', fontSize: 13, fontWeight: '500' },
  editIconOverlay: { position: 'absolute', top: 10, right: 10, backgroundColor:'#fff', padding:6, borderRadius:20, shadowColor:'#000', shadowOpacity:0.1, elevation:2 },

  row: { flexDirection: "row" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 15 },
  saveBtn: {
    backgroundColor: "#2563EB", flexDirection: "row", justifyContent: "center", alignItems: "center",
    height: 50, borderRadius: 12, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  closeText: { color: "#0EA5E9", fontSize: 16, fontWeight: "600" },
  modalItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  modalItemText: { fontSize: 16, color: "#334155" },
  selectedModalItemText: { color: "#0EA5E9", fontWeight: "700" },
});

export default EditDriverProfileScreen;















