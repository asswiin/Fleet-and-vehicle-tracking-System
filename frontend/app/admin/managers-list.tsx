import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import React from "react";
import { ChevronLeft, Search, ChevronRight, User, UserX } from "lucide-react-native";
import { api } from "../../utils/api";
import type { User as UserType } from "../../utils/api";

const ManagersListScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [activeManagers, setActiveManagers] = useState<UserType[]>([]);
  const [resignedManagers, setResignedManagers] = useState<UserType[]>([]);
  
  // UI State
  const [selectedTab, setSelectedTab] = useState<"Active" | "Resigned">("Active");
  const [searchText, setSearchText] = useState("");

  // Fetch Data
  const fetchManagers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();

      if (response.ok && response.data) {
        // Filter for managers only
        const allManagers = response.data.filter((user: UserType) => user.role === "manager");

        // Split into Active and Resigned based on status
        // specific logic: If status is "Resigned", they go to resigned list. 
        // Otherwise (Active, null, undefined) they stay in Active list.
        const active = allManagers.filter((m: UserType) => m.status !== "Resigned");
        const resigned = allManagers.filter((m: UserType) => m.status === "Resigned");

        setActiveManagers(active);
        setResignedManagers(resigned);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchManagers();
    }, [])
  );

  // Filter based on Search Text AND Selected Tab
  const getDisplayData = () => {
    const sourceList = selectedTab === "Active" ? activeManagers : resignedManagers;

    if (!searchText) return sourceList;

    return sourceList.filter(
      (m) =>
        m.name.toLowerCase().includes(searchText.toLowerCase()) ||
        m.email.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const handleManagerClick = (manager: UserType) => {
    router.push({
      pathname: "/admin/manager-details" as any,
      params: { user: JSON.stringify(manager) },
    });
  };

  const renderItem = ({ item }: { item: UserType }) => (
    <TouchableOpacity
      style={[styles.card, selectedTab === "Resigned" && styles.cardResigned]}
      onPress={() => handleManagerClick(item)}
    >
      <View style={styles.cardLeft}>
        {selectedTab === "Resigned" ? (
          <View style={[styles.avatar, styles.avatarResigned]}>
            <UserX size={24} color="#EF4444" />
          </View>
        ) : item.profilePhoto ? (
          <Image
            source={{ uri: api.getImageUrl(item.profilePhoto) || undefined }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name ? item.name.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>
        )}
        <View>
          <Text style={[styles.name, selectedTab === "Resigned" && styles.textResigned]}>
            {item.name}
          </Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.location} numberOfLines={1}>
            {item.place || "No location"}
          </Text>
          {selectedTab === "Resigned" && (
            <View style={styles.resignedBadge}>
              <Text style={styles.resignedBadgeText}>Resigned</Text>
            </View>
          )}
        </View>
      </View>
      <ChevronRight size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Managers Directory</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Tab Navigation Bar */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, selectedTab === "Active" && styles.activeTab]}
            onPress={() => setSelectedTab("Active")}
          >
            <Text style={[styles.tabText, selectedTab === "Active" && styles.activeTabText]}>
              All Managers
            </Text>
            {selectedTab === "Active" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, selectedTab === "Resigned" && styles.activeTab]}
            onPress={() => setSelectedTab("Resigned")}
          >
            <Text style={[styles.tabText, selectedTab === "Resigned" && styles.activeTabText]}>
              Resigned
            </Text>
            {selectedTab === "Resigned" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${selectedTab === "Active" ? "active" : "resigned"} managers...`}
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0EA5E9" />
          </View>
        ) : (
          <FlatList
            data={getDisplayData()}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.center}>
                {selectedTab === "Active" ? (
                  <User size={48} color="#CBD5E1" />
                ) : (
                  <UserX size={48} color="#CBD5E1" />
                )}
                <Text style={styles.emptyText}>
                  No {selectedTab.toLowerCase()} managers found
                </Text>
              </View>
            }
          />
        )}
      </View>
      {/* FAB - Add Manager Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push("/admin/add-manager")}
      >
        <Text style={styles.fabPlus}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 30,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
  
  /* Tab Navigation Styles */
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeTab: {
    // Background color can be changed if needed
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#0EA5E9",
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: "60%",
    backgroundColor: "#0EA5E9",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 20,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, height: "100%", color: "#0F172A", fontSize: 15 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardResigned: {
    backgroundColor: "#F1F5F9", // Slightly greyed out for resigned
    opacity: 0.9,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  avatarResigned: {
    backgroundColor: "#FEE2E2", // Light red bg
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#0EA5E9" },
  name: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  textResigned: {
    color: "#64748B",
    textDecorationLine: "line-through",
  },
  email: { fontSize: 13, color: "#64748B", marginTop: 2 },
  location: { fontSize: 12, color: "#94A3B8", marginTop: 2, marginRight: 10 },
  
  resignedBadge: {
    marginTop: 4,
    backgroundColor: "#FEE2E2",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resignedBadgeText: {
    fontSize: 10,
    color: "#EF4444",
    fontWeight: "700",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  emptyText: { color: "#94A3B8", fontSize: 16, marginTop: 10 },

  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0EA5E9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPlus: { color: "#fff", fontSize: 28, fontWeight: "700", lineHeight: 30 },
});

export default ManagersListScreen;

