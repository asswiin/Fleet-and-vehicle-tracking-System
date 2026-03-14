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
  ScrollView,
  StatusBar,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import React from "react";
import { 
  ChevronLeft, 
  Search, 
  ChevronRight, 
  User, 
  UserX, 
  Plus,
  MapPin,
  Mail,
  Filter,
  Users,
} from "lucide-react-native";
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
  const fetchData = async () => {
    try {
      setLoading(true);
      const usersRes = await api.getUsers();

      if (usersRes.ok && usersRes.data) {
        const allManagers = usersRes.data.filter((user: UserType) => user.role === "manager");
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
      fetchData();
    }, [])
  );

  const displayData = useMemo(() => {
    let sourceList = selectedTab === "Active" ? activeManagers : resignedManagers;

    if (!searchText) return sourceList;

    const term = searchText.toLowerCase();
    return sourceList.filter(
      (m) =>
        (m.name?.toLowerCase().includes(term)) ||
        (m.email?.toLowerCase().includes(term)) ||
        (m.place?.toLowerCase().includes(term))
    );
  }, [selectedTab, activeManagers, resignedManagers, searchText]);

  const handleManagerClick = (manager: UserType) => {
    router.push({
      pathname: "/admin/manager-details" as any,
      params: { user: JSON.stringify(manager) },
    });
  };

  const renderItem = ({ item }: { item: UserType }) => {
    const isResigned = selectedTab === "Resigned" || item.status === "Resigned";
    const profilePhoto = item.profilePhoto;

    return (
      <TouchableOpacity
        style={[styles.managerCard, isResigned && styles.resignedCard]}
        onPress={() => handleManagerClick(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            {profilePhoto ? (
              <Image
                source={{ uri: api.getImageUrl(profilePhoto) || undefined }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, isResigned && styles.resignedAvatar]}>
                {isResigned ? (
                  <UserX size={24} color="#EF4444" />
                ) : (
                  <Text style={styles.initialText}>
                    {item.name ? item.name.charAt(0).toUpperCase() : "U"}
                  </Text>
                )}
              </View>
            )}
            {!isResigned && <View style={styles.onlineStatus} />}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.managerName, isResigned && styles.resignedName]} numberOfLines={1}>
                {item.name}
              </Text>
              {isResigned && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Inactive</Text>
                </View>
              )}
            </View>

            <View style={styles.detailsRow}>
              <Mail size={12} color="#94A3B8" />
              <Text style={styles.managerEmail} numberOfLines={1}>
                {item.email}
              </Text>
            </View>

            {item.place && (
              <View style={styles.detailsRow}>
                <MapPin size={12} color="#94A3B8" />
                <Text style={styles.managerLocation} numberOfLines={1}>
                  {item.place}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.arrowContainer}>
            <ChevronRight size={18} color="#CBD5E1" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <ChevronLeft size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Managers Directory</Text>
            <TouchableOpacity 
              style={styles.iconBtn}
              onPress={() => router.push("/admin/add-manager")}
            >
              <Plus size={24} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchWrapper}>
              <Search size={18} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${selectedTab.toLowerCase()} managers...`}
                placeholderTextColor="#94A3B8"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Filter size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsWrapper}>
            <View style={styles.tabBar}>
              {[
                { id: "Active", label: "Active", count: activeManagers.length },
                { id: "Resigned", label: "Resigned", count: resignedManagers.length }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, selectedTab === tab.id && styles.activeTabItem]}
                  onPress={() => setSelectedTab(tab.id as any)}
                >
                  <View style={styles.tabContent}>
                    <Text style={[styles.tabLabel, selectedTab === tab.id && styles.activeTabLabel]}>
                      {tab.label}
                    </Text>
                    <View style={[styles.countBadge, selectedTab === tab.id && styles.activeCountBadge]}>
                      <Text style={[styles.countText, selectedTab === tab.id && styles.activeCountText]}>
                        {tab.count}
                      </Text>
                    </View>
                  </View>
                  {selectedTab === tab.id && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Content List */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loaderText}>Syncing Directory...</Text>
            </View>
          ) : (
            <FlatList
              data={displayData}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Search size={32} color="#CBD5E1" />
                  </View>
                  <Text style={styles.emptyTitle}>No Managers Found</Text>
                  <Text style={styles.emptySub}>
                    Try adjusting your search for {selectedTab.toLowerCase()} managers.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/admin/add-manager")}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safeArea: { flex: 1 },
  header: {
    backgroundColor: "#fff",
    paddingBottom: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: "#1E293B", fontWeight: "500" },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  tabsWrapper: { paddingBottom: 0 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 32 },
  tabItem: { paddingVertical: 12, position: 'relative' },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabLabel: { fontSize: 14, fontWeight: "700", color: "#94A3B8" },
  activeTabLabel: { color: "#6366F1" },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeCountBadge: { backgroundColor: '#EEF2FF' },
  countText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  activeCountText: { color: '#6366F1' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#6366F1",
    borderRadius: 3,
  },
  content: { flex: 1 },
  listContainer: { padding: 20, paddingBottom: 100 },
  managerCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  resignedCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    opacity: 0.8,
  },
  cardContent: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { position: 'relative', marginRight: 16 },
  avatarImg: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#F1F5F9" },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  resignedAvatar: { backgroundColor: "#F1F5F9" },
  initialText: { fontSize: 20, fontWeight: "800", color: "#6366F1" },
  onlineStatus: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#fff",
  },
  infoContainer: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  managerName: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  resignedName: { color: "#64748B", textDecorationLine: "line-through" },
  statusBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "700", color: "#94A3B8" },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  managerEmail: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  managerLocation: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  arrowContainer: { marginLeft: 10 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 12, fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  emptyContainer: { flex: 1, alignItems: "center", paddingTop: 100 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
});

export default ManagersListScreen;
