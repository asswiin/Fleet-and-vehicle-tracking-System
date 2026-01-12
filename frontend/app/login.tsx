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
import { Truck, Lock, User, Eye, EyeOff, Headphones } from "lucide-react-native";
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
        // ✅ CHECK ROLE AND NAVIGATE ACCORDINGLY
        if (data?.user.role === "admin") {
          router.replace({pathname: "admin-dashboard" as any});
        } else if (data?.user.role === "manager") {
          console.log("Logging in as:", data.user.name);
          // Pass the user name to the dashboard if needed
          router.replace({
            pathname: "manager-dashboard" as any,
            params: { userName: data.user.name }  // Handle both naming conventions
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
          
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Truck size={32} color="#0096FF" fill="#0096FF" strokeWidth={0} />
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="user@logistics.com"
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
                <Text style={styles.loginButtonText}>Sign In Securely</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Link */}
        <TouchableOpacity style={styles.footerLink}>
          <Headphones size={16} color="#64748B" style={{ marginRight: 8 }} />
          <Text style={styles.footerText}>Contact Support</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFF6FF",
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
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBackground: {
    width: 80,
    height: 80,
    backgroundColor: "#E0F2FE",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
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
    backgroundColor: "#0EA5E9",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    marginTop: 20,
  },
  footerText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default LoginScreen;

















