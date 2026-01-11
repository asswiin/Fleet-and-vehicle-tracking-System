import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Search,
  Bell,
  Truck,
  Clock,
  Package,
  Wrench,
  AlertTriangle,
  MessageSquare,
  Map,
  LayoutGrid,
  Navigation,
  User,
  Car,
  Settings,
  ArrowUpRight
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function ManagerDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 1. DYNAMIC NAME LOGIC
  // This grabs the name passed from login.js. If null, defaults to "Manager".
 const displayName = params.userName || "Manager"; 

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image 
                source={{ uri: "" }} 
                style={styles.avatar} 
              />
              <View>
                <Text style={styles.headerTitle}>Dashboard</Text>
                {/* Display Dynamic Name */}
                <Text style={styles.headerSubtitle}>Welcome back, {displayName}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconBtn}>
                <Search size={24} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Bell size={24} color="#374151" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={[styles.statCard, styles.blueCard]}>
              <View style={styles.statHeader}>
                <Truck size={24} color="rgba(255,255,255,0.8)" />
                <View style={styles.statBadgeBlue}>
                  <ArrowUpRight size={16} color="#fff" />
                  <Text style={styles.statBadgeText}> --</Text>
                </View>
              </View>
              <Text style={styles.statLabelWhite}>Active Trips</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.statCard, styles.purpleCard]}>
              <View style={styles.statHeader}>
                <Clock size={24} color="rgba(255,255,255,0.8)" />
                <View style={styles.statBadgePurple}>
                  <Text style={styles.statBadgeText}>--</Text>
                </View>
              </View>
              <Text style={styles.statLabelWhite}>On Time Rate</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: "#E0F2FE" }]}>
                <Package size={24} color="#0284C7" />
              </View>
              <Text style={styles.actionLabel}>Parcel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: "#F3E8FF" }]}>
                <Navigation size={24} color="#9333EA" />
              </View>
              <Text style={styles.actionLabel}>Assign Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: "#FFEDD5" }]}>
                <Wrench size={24} color="#EA580C" />
              </View>
              <Text style={styles.actionLabel}>Repairs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: "#FEE2E2" }]}>
                <AlertTriangle size={24} color="#DC2626" />
              </View>
              <Text style={styles.actionLabel}>Alerts</Text>
            </TouchableOpacity>
          </View>

          {/* Active Deliveries */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Deliveries</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* <View style={styles.deliveryCard}>
            <View style={styles.deliveryHeader}>
              <View style={styles.vehicleInfo}>
                <View style={styles.vehicleIconBox}>
                  <Truck size={24} color="#4B5563" />
                </View>
                <View>
                  <Text style={styles.vehicleName}>Vehicle 1</Text>
                  <Text style={styles.vehicleDriver}>Driver</Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>IN TRANSIT</Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>--:-- PM</Text>
                <Text style={styles.timeText}>--%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: "60%" }]} />
                <View style={[styles.progressKnob, { left: "58%" }]} />
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.outlineButton}>
                <MessageSquare size={20} color="#374151" style={{ marginRight: 8 }} />
                <Text style={styles.outlineButtonText}>Message</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.filledButton}>
                <Map size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.filledButtonText}>Track</Text>
              </TouchableOpacity>
            </View>
          </View> */}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* 2. NAVIGATION BUTTONS */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <LayoutGrid size={24} color="#2563EB" fill="#2563EB" fillOpacity={0.1} />
          <Text style={[styles.navLabel, { color: "#2563EB" }]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Map size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>go</Text>
        </TouchableOpacity>
        
        {/* DRIVER BUTTON -> Navigate to Register Driver */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push("/register-driver")}
        >
          <User size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Drivers</Text>
        </TouchableOpacity>
        
        {/* VEHICLE BUTTON -> Navigate to Register Vehicle */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push("/register-vehicle")}
        >
          <Car size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Vehicle</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Settings size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  headerSubtitle: { fontSize: 13, color: "#6B7280" },
  headerRight: { flexDirection: "row", gap: 16 },
  iconBtn: { position: "relative" },
  notificationDot: { position: "absolute", top: -2, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#F9FAFB" },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  statCard: { width: (width - 50) / 2, height: 140, borderRadius: 20, padding: 16, justifyContent: "space-between" },
  blueCard: { backgroundColor: "#2563EB" },
  purpleCard: { backgroundColor: "#A855F7" },
  statHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statBadgeBlue: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statBadgePurple: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  statLabelWhite: { color: "#fff", fontSize: 16, fontWeight: "500" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  actionGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  actionItem: { alignItems: "center", width: "22%" },
  actionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  viewAllText: { color: "#2563EB", fontWeight: "600", fontSize: 14 },
  deliveryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  deliveryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  vehicleInfo: { flexDirection: "row", alignItems: "center" },
  vehicleIconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginRight: 12 },
  vehicleName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  vehicleDriver: { fontSize: 13, color: "#6B7280" },
  statusBadge: { backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: "#2563EB", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  progressSection: { marginBottom: 20 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  timeText: { fontSize: 13, color: "#6B7280" },
  progressBarBg: { height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, position: "relative" },
  progressBarFill: { height: 6, backgroundColor: "#2563EB", borderRadius: 3 },
  progressKnob: { position: "absolute", top: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff", borderWidth: 3, borderColor: "#2563EB" },
  cardActions: { flexDirection: "row", gap: 12 },
  outlineButton: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  outlineButtonText: { color: "#374151", fontWeight: "600", fontSize: 15 },
  filledButton: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#2563EB" },
  filledButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  navItem: { alignItems: "center" },
  navLabel: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", marginTop: 4 },
});