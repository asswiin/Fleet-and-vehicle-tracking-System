import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import React from "react";
import { api } from "../utils/api";
import type { User } from "../utils/api";
import {
  Users,
  Truck,
  Car,
  DollarSign,
  Plus,
  Home,
  Settings,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react-native";

interface Stats {
  managers: number;
  drivers: number;
  vehicles: number;
  revenue: number;
}

const AdminDashboard: React.FC = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<User[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  const [stats, setStats] = useState<Stats>({
    managers: 0,
    drivers: 0,
    vehicles: 0,
    revenue: 0,
  });

  // Function to Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();

      if (response.ok && response.data) {
        const managerList = response.data.filter((user) => user.role === "manager");
        setManagers(managerList);
        setStats({
          managers: managerList.length,
          drivers: 0,
          vehicles: 0,
          revenue: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // ✅ LOGOUT FUNCTION
  const handleLogout = () => {
    // 1. Close the modal
    setShowSettings(false);
    
    // 2. Navigate back to Login. 
    // using 'replace' ensures the user cannot swipe back to the dashboard.
    // Use "/" if your login is index.js, or "/login" if it is login.js
    router.replace("/"); 
  };

  const handleAddManager = () => {
    router.push("add-manager" as any);
  };

  const handleManagerClick = (manager: User) => {
    router.push({
      pathname: "manager-details" as any,
      params: { user: JSON.stringify(manager) }
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.headerTitle}>Logistics Overview</Text>
          </View>
          <View style={styles.profileContainer}>
            <Image
              source={{ uri: "" }} 
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: "#E0F2FE" }]}>
              <Users size={24} color="#0EA5E9" />
            </View>
            <Text style={styles.cardLabel}>Total Managers</Text>
            <Text style={styles.cardValue}>{stats.managers}</Text>
          </View>
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: "#FFEDD5" }]}>
              <Truck size={24} color="#F97316" />
            </View>
            <Text style={styles.cardLabel}>Total Drivers</Text>
            <Text style={styles.cardValue}>{stats.drivers}</Text>
          </View>
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: "#F3E8FF" }]}>
              <Car size={24} color="#A855F7" />
            </View>
            <Text style={styles.cardLabel}>Total Vehicles</Text>
            <Text style={styles.cardValue}>{stats.vehicles}</Text>
          </View>
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: "#DCFCE7" }]}>
              <DollarSign size={24} color="#22C55E" />
            </View>
            <Text style={styles.cardLabel}>Monthly Rev</Text>
            <Text style={styles.cardValue}>$0</Text>
          </View>
        </View>

        {/* Managers List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Managers</Text>
          <Text style={styles.viewAllText}>{managers.length} Active</Text>
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#0EA5E9" />
          ) : managers.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#94A3B8", marginTop: 20 }}>
              No managers found. Add one!
            </Text>
          ) : (
            managers.map((manager) => (
              <TouchableOpacity 
                key={manager._id} 
                style={styles.listItem}
                onPress={() => handleManagerClick(manager)}
              >
                <View style={styles.listItemLeft}>
                  <View style={styles.listAvatarPlaceholder}>
                    <Text style={{ color: "#64748B", fontWeight: "bold" }}>
                      {manager.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.listItemName}>{manager.name}</Text>
                    <Text style={styles.listItemSub}>{manager.email}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#CBD5E1" />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddManager}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      {/* ✅ SETTINGS MODAL */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* ✅ LOGOUT BUTTON inside Modal */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color="#EF4444" style={{ marginRight: 12 }} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
            
            <Text style={styles.versionText}>App Version 1.0.0</Text>
          </View>
        </View>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Home size={24} color="#0EA5E9" fill="#0EA5E9" fillOpacity={0.2} />
          <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push("managers-list" as any)} 
        >
          <Users size={24} color="#94A3B8" />
          <Text style={styles.navText}>Managers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Truck size={24} color="#94A3B8" />
          <Text style={styles.navText}>Drivers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Car size={24} color="#94A3B8" />
          <Text style={styles.navText}>Vehicles</Text>
        </TouchableOpacity>
        
        {/* Settings Button opens Modal */}
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setShowSettings(true)}
        >
          <Settings size={24} color="#94A3B8" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting: { fontSize: 14, color: "#64748B", marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#0F172A" },
  profileContainer: { position: 'relative' as const },
  avatar: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: "#fff", backgroundColor: "#E2E8F0" },
  onlineDot: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "#F8FAFC" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  card: { width: "48%", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, alignItems: "flex-start" as const },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  cardLabel: { fontSize: 13, color: "#64748B", marginBottom: 8, fontWeight: "500" },
  cardValue: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  viewAllText: { color: "#64748B", fontSize: 14, fontWeight: "500" },
  listContainer: { gap: 12 },
  listItem: { backgroundColor: "#fff", padding: 16, borderRadius: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  listItemLeft: { flexDirection: "row", alignItems: "center" },
  listAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", marginRight: 12 },
  listItemName: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  listItemSub: { fontSize: 12, color: "#94A3B8" },
  fab: { position: "absolute", bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#0EA5E9", justifyContent: "center", alignItems: "center", shadowColor: "#0EA5E9", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, zIndex: 10 },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  navItem: { alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 10, marginTop: 4, color: "#94A3B8", fontWeight: "500" },
  activeNavText: { color: "#0EA5E9", fontWeight: "600" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2", // Light red bg
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444", // Red text
  },
  versionText: {
    textAlign: "center",
    marginTop: 20,
    color: "#94A3B8",
    fontSize: 12,
  }
});

export default AdminDashboard;