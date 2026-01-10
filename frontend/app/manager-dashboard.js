import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  LogOut,
  Truck,
  MapPin,
  Package,
  Bell,
  User,
  Clock
} from "lucide-react-native";

export default function ManagerDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get the name passed from Login, or default to "Manager"
  const managerName = params.userName || "Manager";

  const handleLogout = () => {
    // Navigate back to Login Screen
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{new Date().toDateString()}</Text>
            <Text style={styles.greeting}>Hello, {managerName}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
             {/* Using Logout Icon for now, can be profile image */}
            <LogOut size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: "#EFF6FF" }]}>
              <Truck size={24} color="#0EA5E9" />
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Active Trips</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#F0FDF4" }]}>
              <Package size={24} color="#22C55E" />
              <Text style={styles.statNumber}>45</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FEF2F2" }]}>
              <Clock size={24} color="#EF4444" />
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Delayed</Text>
            </View>
          </View>

          {/* Action Grid */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Truck size={28} color="#fff" />
              </View>
              <Text style={styles.actionText}>Manage Drivers</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: "#8B5CF6" }]}>
                <MapPin size={28} color="#fff" />
              </View>
              <Text style={styles.actionText}>Track Vehicles</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: "#F59E0B" }]}>
                <Bell size={28} color="#fff" />
              </View>
              <Text style={styles.actionText}>Alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: "#10B981" }]}>
                <User size={28} color="#fff" />
              </View>
              <Text style={styles.actionText}>My Profile</Text>
            </TouchableOpacity>

          </View>

          {/* Recent Activity List Placeholder */}
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
                <View style={styles.dot} />
                <View>
                    <Text style={styles.activityText}>Driver John started trip #1023</Text>
                    <Text style={styles.activityTime}>10 mins ago</Text>
                </View>
            </View>
            <View style={styles.activityItem}>
                <View style={[styles.dot, {backgroundColor: "#22C55E"}]} />
                <View>
                    <Text style={styles.activityText}>Delivery #990 Completed</Text>
                    <Text style={styles.activityTime}>1 hour ago</Text>
                </View>
            </View>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10
  },
  date: { fontSize: 13, color: "#64748B", fontWeight: "600", textTransform: "uppercase" },
  greeting: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  profileBtn: {
    width: 45, height: 45, borderRadius: 25, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.05, shadowRadius:5, elevation:2
  },
  content: { paddingBottom: 50 },
  
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  statCard: {
    width: "31%", padding: 15, borderRadius: 16, alignItems: "center", justifyContent: "center"
  },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginTop: 8 },
  statLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 15 },
  
  actionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  actionCard: {
    width: "48%", backgroundColor: "#fff", padding: 20, borderRadius: 20, marginBottom: 15,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity:0.03, shadowRadius:10, elevation:2
  },
  actionIcon: {
    width: 50, height: 50, borderRadius: 15, backgroundColor: "#0EA5E9",
    justifyContent: "center", alignItems: "center", marginBottom: 12
  },
  actionText: { fontSize: 14, fontWeight: "600", color: "#334155" },

  activityList: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  activityItem: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0EA5E9", marginRight: 15 },
  activityText: { fontSize: 14, color: "#334155", fontWeight: "500" },
  activityTime: { fontSize: 12, color: "#94A3B8" }
});