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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker"; // Import ImagePicker
import { api, Driver } from "../utils/api";
import { ChevronLeft, Save, MapPin, Camera, Upload } from "lucide-react-native";

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

  // --- IMAGE STATE ---
  const initialProfileUri = initialData?.profilePhoto ? api.getImageUrl(initialData.profilePhoto) : null;
  const initialLicenseUri = initialData?.licensePhoto ? api.getImageUrl(initialData.licensePhoto) : null;

  const [profileImageUri, setProfileImageUri] = useState<string | null>(initialProfileUri);
  const [licenseImageUri, setLicenseImageUri] = useState<string | null>(initialLicenseUri);

  const [newProfileAsset, setNewProfileAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [newLicenseAsset, setNewLicenseAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // --- IMAGE PICKER FUNCTION ---
  const pickImage = async (type: 'profile' | 'license') => {
    // Request Permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images!');
      return;
    }

    // Launch Gallery
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
        setNewProfileAsset(asset);     
      } else {
        setLicenseImageUri(asset.uri);
        setNewLicenseAsset(asset);
      }
    }
  };

  // --- SUBMIT HANDLER ---
  const handleUpdate = async () => {
    if (!initialData?._id) return;
    
    if (!form.name || !form.email || !form.mobile) {
      Alert.alert("Error", "Name, Email and Mobile are required.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("mobile", form.mobile);
      formData.append("address", JSON.stringify(form.address));

      if (newProfileAsset) {
        // @ts-ignore
        formData.append("profilePhoto", {
          uri: newProfileAsset.uri,
          name: `profile_${Date.now()}.jpg`,
          type: "image/jpeg", 
        });
      }

      if (newLicenseAsset) {
        // @ts-ignore
        formData.append("licensePhoto", {
          uri: newLicenseAsset.uri,
          name: `license_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
      }

      const response = await api.updateDriverProfileWithImage(initialData._id, formData);

      if (response.ok) {
        Alert.alert("Success", "Profile updated successfully", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Update Failed", response.error || "Could not update profile");
      }
    } catch (error) {
      console.error(error);
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
          
          {/* --- PROFILE PHOTO SECTION --- */}
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

          {/* --- LICENSE PHOTO SECTION --- */}
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
                {/* Overlay Icon */}
                <View style={styles.editIconOverlay}>
                   <Camera size={16} color="#2563EB" />
                </View>
             </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* --- ADDRESS SECTION --- */}
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

  sectionHeaderContainer: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 15 },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginLeft: 8 },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#1E293B"
  },
  row: { flexDirection: "row" },
  
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 15 },
  
  saveBtn: {
    backgroundColor: "#2563EB", flexDirection: "row", justifyContent: "center", alignItems: "center",
    height: 50, borderRadius: 12, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" }
});

export default EditDriverProfileScreen;