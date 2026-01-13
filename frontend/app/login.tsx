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
import { useRouter } from "expo-router";
import { Lock, User, Eye, EyeOff, Globe } from "lucide-react-native";
import { api } from "../utils/api";

const LoginScreen: FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    // Basic Client-side validation
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await api.login(email, password);

      if (response.ok) {
        const data = response.data;
        if (data?.role === "admin") {
          router.replace({ pathname: "admin-dashboard" as any });
        } else if (data?.role === "manager") {
          router.replace({
            pathname: "manager-dashboard" as any,
            params: { userName: data.name },
          });
        } else {
          Alert.alert("Access Denied", "Driver/User app is under development.");
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
        {/* Main Card */}
        <View style={styles.card}>
          
          {/* BRANDING HEADER SECTION */}
          <View style={styles.headerContainer}>
            <Text style={styles.brandSmallRed}>SREE</Text>
            <Text style={styles.brandBigRed}>GOKULAM</Text>
            
            <View style={styles.brandRow}>
              {/* Note: The 'lines' effect in the logo font requires a custom font file. 
                  We use italic/bold to approximate the style. */}
              <Text style={styles.brandBlueBig}>SPEED</Text>
              <Text style={styles.brandAmpersand}> & </Text>
              <Text style={styles.brandBlueBig}>SAFE</Text>
            </View>
            
            <Text style={styles.brandSubtitle}>COURIER SERVICE</Text>
          
          </View>

          {/* Form Section */}
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
          </View>
        </View>

        {/* Footer Link / Website */}
        <TouchableOpacity style={styles.footerLink}>
          <Globe size={16} color="#15803d" style={{ marginRight: 8 }} />
          
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9", // Light grey background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 30,
  },
  
  // --- BRANDING STYLES START ---
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandSmallRed: {
    color: "#DC2626", // Red
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: -4, // Pull GOKULAM closer
  },
  brandBigRed: {
    color: "#DC2626", // Red
    fontSize: 32,
    fontWeight: "900", // Extra Bold
    letterSpacing: 0.5,
    marginBottom: 2,
    // Note: To match the logo exactly, you'd usually use an Image component
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  brandBlueBig: {
    color: "#312E81", // Deep Indigo/Navy
    fontSize: 26,
    fontWeight: "800", // Heavy Bold
    fontStyle: "italic", // Adds the dynamic feel
  },
  brandAmpersand: {
    color: "#312E81",
    fontSize: 24,
    fontStyle: "italic",
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif', // Attempt to look like script
  },
  brandSubtitle: {
    color: "#312E81", // Deep Indigo
    fontSize: 18,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  brandTagline: {
    color: "#333333", // Dark Grey/Black
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  // --- BRANDING STYLES END ---

  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#334155",
    height: "100%",
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: "#312E81", // Updated to match brand Navy Blue
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#312E81",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footerLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  websiteText: {
    color: "#15803d", // Green
    fontSize: 14,
    fontWeight: "700",
  },
});

export default LoginScreen;