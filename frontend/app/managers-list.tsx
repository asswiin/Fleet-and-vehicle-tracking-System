import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import React from "react";
import { ChevronLeft, Search, ChevronRight, User } from "lucide-react-native";
import { api } from "../utils/api";
import type { User as UserType } from "../utils/api";

const ManagersListScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<UserType[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filteredManagers, setFilteredManagers] = useState<UserType[]>([]);

  // Fetch Data
  const fetchManagers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();

      if (response.ok && response.data) {
        const managerList = response.data.filter((user) => user.role === "manager");
        setManagers(managerList);
        setFilteredManagers(managerList);
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

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text) {
      const filtered = managers.filter(
        (m) =>
          m.name.toLowerCase().includes(text.toLowerCase()) ||
          m.email.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredManagers(filtered);
    } else {
      setFilteredManagers(managers);
    }
  };

  // ✅ FIX: specific path to manager-details
  const handleManagerClick = (manager: UserType) => {
    router.push({
      pathname: "/manager-details", // Removed "(tabs)" to match flat structure
      params: { user: JSON.stringify(manager) },
    });
  };

  const renderItem = ({ item }: { item: UserType }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleManagerClick(item)}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : "U"}
          </Text>
        </View>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.location} numberOfLines={1}>
            {item.place || "No location"}
          </Text>
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
          <Text style={styles.headerTitle}>All Managers</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search managers..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0EA5E9" />
          </View>
        ) : (
          <FlatList
            data={filteredManagers}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.center}>
                <User size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No managers found</Text>
              </View>
            }
          />
        )}
      </View>
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
    marginTop: 30, // Added margin for status bar
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
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
  avatarText: { fontSize: 20, fontWeight: "700", color: "#0EA5E9" },
  name: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  email: { fontSize: 13, color: "#64748B", marginTop: 2 },
  location: { fontSize: 12, color: "#94A3B8", marginTop: 2, marginRight: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 },
  emptyText: { color: "#94A3B8", fontSize: 16, marginTop: 10 },
});

export default ManagersListScreen;