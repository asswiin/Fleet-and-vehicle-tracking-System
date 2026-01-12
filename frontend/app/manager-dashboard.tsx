import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react"; // 1. Import useState
import {
  Search,
  Bell,
  Truck,
  Clock,
  Package,
  Wrench,
  AlertTriangle,
  MessageSquare, // Kept existing imports
  Map,
  LayoutGrid,
  Navigation,
  User,
  Car,
  Settings,
  ArrowUpRight,
  LogOut, // 2. Import LogOut icon
} from "lucide-react-native";

const { width } = Dimensions.get("window");

interface RouteParams {
  userName?: string;
}

const ManagerDashboard = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // State for the settings popup menu
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Dynamic Name Logic
  const displayName = params.userName || "Manager";

  // 3. Logout Function
  const handleLogout = () => {
    setShowSettingsMenu(false);
    router.replace("/"); // Navigate back to Login
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          // 4. Close menu on scroll
          onScroll={() => setShowSettingsMenu(false)}
          scrollEventThrottle={16}
        >
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar} />
              <View>
                <Text style={styles.headerTitle}>Dashboard</Text>
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
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* 5. FLOATING SETTINGS MENU */}
      {showSettingsMenu && (
        <View style={styles.settingsMenu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.menuItemText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation Buttons */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowSettingsMenu(false)}>
          <LayoutGrid size={24} color="#2563EB" fill="#2563EB" fillOpacity={0.1} />
          <Text style={[styles.navLabel, { color: "#2563EB" }]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => setShowSettingsMenu(false)}>
          <Map size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Trips</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setShowSettingsMenu(false);
            router.push("register-driver" as any);
          }}
        >
          <User size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Drivers</Text>
        </TouchableOpacity>
        
         <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setShowSettingsMenu(false);
            router.push({
              pathname: "vehicle-list",
              params: { userRole: "manager" } // <--- CRITICAL: Enables "Mark as Sold"
            } as any);
          }}
        >
          <Car size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Vehicle</Text>
        </TouchableOpacity>
        
        {/* 6. Settings Button Toggles Menu */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setShowSettingsMenu(!showSettingsMenu)}
        >
          <Settings size={24} color={showSettingsMenu ? "#2563EB" : "#9CA3AF"} />
          <Text style={[styles.navLabel, showSettingsMenu && { color: "#2563EB" }]}>Settings</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: "#E5E7EB" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  headerSubtitle: { fontSize: 13, color: "#6B7280" },
  headerRight: { flexDirection: "row", gap: 16 },
  iconBtn: { position: "relative" as const },
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
    zIndex: 20,
  },
  navItem: { alignItems: "center" },
  navLabel: { fontSize: 10, fontWeight: "600", color: "#9CA3AF", marginTop: 4 },

  // 7. Styles for the Floating Menu
  settingsMenu: {
    position: 'absolute',
    bottom: 85, // Adjust based on your bottom nav height
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    width: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 30, // Above everything
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#EF4444', // Red for Logout
    fontWeight: '600',
  }
});

export default ManagerDashboard;
















