import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState, FC } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Lock, User, Eye, EyeOff, MapPin, ArrowLeft } from "lucide-react-native";
import { api } from "../../utils/api";

// Project configuration - Kozhikode district, Mukkam branch
const PROJECT_DISTRICT = "Kozhikode";
const PROJECT_BRANCH = "Mukkam";

const LoginScreen: FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    role: string;
    state: string;
    district: string;
    branch: string;
  }>();

  const selectedRole = params.role || "";
  const selectedDistrict = params.district || "";
  const selectedBranch = params.branch || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await api.login(email, password);

      if (response.ok) {
        const data = response.data;
        // Capture User ID (handle _id or id)
        const userId = data._id || data.id;

        // Validate role matches the selected role from role-selection
        if (selectedRole && data?.role !== selectedRole) {
          Alert.alert(
            "Access Denied",
            `You selected "${selectedRole}" but your account is registered as "${data?.role}". Please go back and select the correct role.`
          );
          setLoading(false);
          return;
        }

        if (data?.role === "admin") {
          // Admin access: Check if selected district matches Kozhikode for this project
          if (selectedDistrict !== PROJECT_DISTRICT) {
            Alert.alert(
              "Access Denied",
              `This application is configured for ${PROJECT_DISTRICT} district. You selected ${selectedDistrict}. Please contact the administrator for ${selectedDistrict} district.`
            );
            setLoading(false);
            return;
          }
          router.replace({ 
            pathname: "/admin/admin-dashboard" as any,
            params: { 
              role: selectedRole,
              district: selectedDistrict,
            },
          });
        } else if (data?.role === "manager") {
          // Manager access: Check district AND branch
          if (selectedDistrict !== PROJECT_DISTRICT || selectedBranch.toLowerCase() !== PROJECT_BRANCH.toLowerCase()) {
            Alert.alert(
              "Access Denied",
              `This application is configured for ${PROJECT_DISTRICT} district, ${PROJECT_BRANCH} branch. You selected ${selectedDistrict} district, ${selectedBranch} branch. Please contact the administrator for your location.`
            );
            setLoading(false);
            return;
          }
          router.replace({
            pathname: "/manager/manager-dashboard" as any,
            // Pass Name AND ID
            params: { 
              userName: data.name, 
              userId: userId,
              role: selectedRole,
              district: selectedDistrict,
              branch: selectedBranch,
            },
          });
        } 
        else if (data?.role === "driver") {
          // Driver access: Check district AND branch
          if (selectedDistrict !== PROJECT_DISTRICT || selectedBranch.toLowerCase() !== PROJECT_BRANCH.toLowerCase()) {
            Alert.alert(
              "Access Denied",
              `This application is configured for ${PROJECT_DISTRICT} district, ${PROJECT_BRANCH} branch. You selected ${selectedDistrict} district, ${selectedBranch} branch. Please contact the administrator for your location.`
            );
            setLoading(false);
            return;
          }
          router.replace({
            pathname: "/driver/driver-dashboard" as any, 
            params: { 
              userName: data.name, 
              userId: userId,
              role: selectedRole,
              district: selectedDistrict,
              branch: selectedBranch,
            },
          });
        } else {
          Alert.alert("Access Denied", "Role not recognized.");
        }
      } else {
        Alert.alert("Login Failed", response.error || "Invalid credentials");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.headerContainer}>
            <Text style={styles.brandSmallRed}>SREE</Text>
            <Text style={styles.brandBigRed}>GOKULAM</Text>
            <View style={styles.brandRow}>
              <Text style={styles.brandBlueBig}>SPEED</Text>
              <Text style={styles.brandAmpersand}> & </Text>
              <Text style={styles.brandBlueBig}>SAFE</Text>
            </View>
            <Text style={styles.brandSubtitle}>COURIER SERVICE</Text>
          </View>

          {/* Show selected location info */}
          {selectedRole && (
            <View style={styles.locationInfo}>
              <View style={styles.locationRow}>
                <MapPin size={16} color="#312E81" />
                <Text style={styles.locationText}>
                  {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} - Kerala, {selectedDistrict}
                  {selectedBranch ? `, ${selectedBranch}` : ""}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your ID"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748B" />
                  ) : (
                    <Eye size={20} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/shared/role-selection" as any)}
              disabled={loading}
            >
              <ArrowLeft size={18} color="#64748B" />
              <Text style={styles.backButtonText}>Change Role/Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, paddingVertical: 40, paddingHorizontal: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, marginBottom: 30 },
  headerContainer: { alignItems: "center", marginBottom: 32 },
  brandSmallRed: { color: "#DC2626", fontSize: 12, fontWeight: "bold", marginBottom: -4 },
  brandBigRed: { color: "#DC2626", fontSize: 32, fontWeight: "900", letterSpacing: 0.5, marginBottom: 2 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  brandBlueBig: { color: "#312E81", fontSize: 26, fontWeight: "800", fontStyle: "italic" },
  brandAmpersand: { color: "#312E81", fontSize: 24, fontStyle: "italic", fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif' },
  brandSubtitle: { color: "#312E81", fontSize: 18, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  locationInfo: { backgroundColor: "#EEF2FF", borderRadius: 8, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#C7D2FE" },
  locationRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  locationText: { marginLeft: 8, fontSize: 14, color: "#312E81", fontWeight: "600" },
  formContainer: { width: "100%" },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#1E293B", marginBottom: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, height: 50, paddingHorizontal: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#334155", height: "100%" },
  eyeIcon: { padding: 4 },
  loginButton: { backgroundColor: "#312E81", height: 50, borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 10, shadowColor: "#312E81", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  disabledButton: { opacity: 0.7 },
  loginButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, paddingVertical: 8 },
  backButtonText: { color: "#64748B", fontSize: 14, fontWeight: "500", marginLeft: 6 },
});

export default LoginScreen;

