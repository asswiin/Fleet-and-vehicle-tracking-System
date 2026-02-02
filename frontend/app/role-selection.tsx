import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { useState, FC } from "react";
import { useRouter } from "expo-router";
import { User, Briefcase, Truck, MapPin, Building2, ChevronDown } from "lucide-react-native";

type Role = "admin" | "manager" | "driver" | null;

const DISTRICTS = [
  "Kozhikode",
  "Kannur",
  "Malappuram",
  "Ernakulam",
  "Kottayam",
  "Thrissur",
  "Thiruvananthapuram",
  "Palakkad",
];

const RoleSelectionScreen: FC = () => {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedDistrict("");
    setBranchName("");
    setShowDistrictDropdown(false);
  };

  const handleContinue = () => {
    if (!selectedRole) return;
    if (!selectedDistrict) return;
    if ((selectedRole === "manager" || selectedRole === "driver") && !branchName.trim()) return;

    // Navigate to login with the selected role info
    router.push({
      pathname: "login" as any,
      params: {
        role: selectedRole,
        state: "Kerala",
        district: selectedDistrict,
        branch: (selectedRole === "manager" || selectedRole === "driver") ? branchName : "",
      },
    });
  };

  const isFormValid = () => {
    if (!selectedRole || !selectedDistrict) return false;
    if ((selectedRole === "manager" || selectedRole === "driver") && !branchName.trim()) return false;
    return true;
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
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

        {/* Role Selection */}
        <Text style={styles.sectionTitle}>Select Your Role</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === "admin" && styles.roleCardSelected,
            ]}
            onPress={() => handleRoleSelect("admin")}
          >
            <View style={[styles.roleIconContainer, selectedRole === "admin" && styles.roleIconSelected]}>
              <User size={28} color={selectedRole === "admin" ? "#fff" : "#312E81"} />
            </View>
            <Text style={[styles.roleText, selectedRole === "admin" && styles.roleTextSelected]}>
              Admin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === "manager" && styles.roleCardSelected,
            ]}
            onPress={() => handleRoleSelect("manager")}
          >
            <View style={[styles.roleIconContainer, selectedRole === "manager" && styles.roleIconSelected]}>
              <Briefcase size={28} color={selectedRole === "manager" ? "#fff" : "#312E81"} />
            </View>
            <Text style={[styles.roleText, selectedRole === "manager" && styles.roleTextSelected]}>
              Manager
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === "driver" && styles.roleCardSelected,
            ]}
            onPress={() => handleRoleSelect("driver")}
          >
            <View style={[styles.roleIconContainer, selectedRole === "driver" && styles.roleIconSelected]}>
              <Truck size={28} color={selectedRole === "driver" ? "#fff" : "#312E81"} />
            </View>
            <Text style={[styles.roleText, selectedRole === "driver" && styles.roleTextSelected]}>
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location Section - Shown when a role is selected */}
        {selectedRole && (
          <View style={styles.locationSection}>
            {/* State - Default Kerala */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>State</Text>
              <View style={styles.inputWrapper}>
                <MapPin size={20} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.stateText}>Kerala</Text>
              </View>
            </View>

            {/* District Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>District</Text>
              <TouchableOpacity
                style={styles.dropdownWrapper}
                onPress={() => setShowDistrictDropdown(!showDistrictDropdown)}
              >
                <MapPin size={20} color="#64748B" style={styles.inputIcon} />
                <Text style={[styles.dropdownText, !selectedDistrict && styles.placeholderText]}>
                  {selectedDistrict || "Select District"}
                </Text>
                <ChevronDown size={20} color="#64748B" />
              </TouchableOpacity>

              {showDistrictDropdown && (
                <View style={styles.dropdownList}>
                  {DISTRICTS.map((district) => (
                    <TouchableOpacity
                      key={district}
                      style={[
                        styles.dropdownItem,
                        selectedDistrict === district && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedDistrict(district);
                        setShowDistrictDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedDistrict === district && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {district}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Branch Name - For Manager and Driver */}
            {(selectedRole === "manager" || selectedRole === "driver") && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Branch Name</Text>
                <View style={styles.inputWrapper}>
                  <Building2 size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter branch name"
                    placeholderTextColor="#94A3B8"
                    value={branchName}
                    onChangeText={setBranchName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueButton, !isFormValid() && styles.disabledButton]}
              onPress={handleContinue}
              disabled={!isFormValid()}
            >
              <Text style={styles.continueButtonText}>Continue to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
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
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandSmallRed: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: -4,
  },
  brandBigRed: {
    color: "#DC2626",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  brandBlueBig: {
    color: "#312E81",
    fontSize: 26,
    fontWeight: "800",
    fontStyle: "italic",
  },
  brandAmpersand: {
    color: "#312E81",
    fontSize: 24,
    fontStyle: "italic",
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
  },
  brandSubtitle: {
    color: "#312E81",
    fontSize: 18,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  roleCardSelected: {
    borderColor: "#312E81",
    backgroundColor: "#EEF2FF",
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  roleIconSelected: {
    backgroundColor: "#312E81",
  },
  roleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  roleTextSelected: {
    color: "#312E81",
  },
  locationSection: {
    marginTop: 8,
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
  stateText: {
    flex: 1,
    fontSize: 15,
    color: "#334155",
    fontWeight: "500",
  },
  dropdownWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    color: "#334155",
  },
  placeholderText: {
    color: "#94A3B8",
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItemSelected: {
    backgroundColor: "#EEF2FF",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#334155",
  },
  dropdownItemTextSelected: {
    color: "#312E81",
    fontWeight: "600",
  },
  continueButton: {
    backgroundColor: "#312E81",
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
    opacity: 0.5,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default RoleSelectionScreen;
