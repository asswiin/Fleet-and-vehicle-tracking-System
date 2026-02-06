import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, Bell, Clock, User, Truck } from "lucide-react-native";
import { api, type Notification } from "../../utils/api";

const ManagerNotificationsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const managerId = params.managerId as string;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!managerId) return;
    
    try {
      const response = await api.getManagerNotifications(managerId);
      if (response.ok && response.data) {
        // Sort by created date, newest first
        const sortedNotifications = response.data.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(sortedNotifications);
      }
    } catch (error) {
      console.error("Error fetching manager notifications:", error);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [managerId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleReassignDriver = async (notification: Notification) => {
    if (notification.type !== "driver_declined" || notification.status !== "pending") {
      Alert.alert("Error", "This notification cannot be reassigned");
      return;
    }

    // Navigate to driver reassignment screen
    router.push({
      pathname: "/manager/reassign-driver",
      params: {
        notificationId: notification._id,
        tripId: notification.tripId,
        declinedDriverName: notification.declinedDriverId?.name || "Unknown",
        vehicleId: notification.vehicleId._id,
        parcelCount: notification.parcelIds?.length || 0,
        managerId: managerId,
      }
    } as any);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isDeclined = item.type === "driver_declined";
    const canReassign = isDeclined && item.status === "pending";

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.read && styles.unreadCard,
          canReassign && styles.actionableCard
        ]}
        onPress={() => {
          if (!item.read) {
            markAsRead(item._id);
          }
          if (canReassign) {
            handleReassignDriver(item);
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            {isDeclined ? (
              <View style={styles.declinedBadge}>
                <Text style={styles.declinedBadgeText}>DRIVER DECLINED</Text>
              </View>
            ) : (
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>INFO</Text>
              </View>
            )}
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.tripId}>Trip {item.tripId}</Text>
        </View>

        <Text style={styles.message}>{item.message}</Text>

        {isDeclined && item.declinedDriverId && (
          <View style={styles.declinedDriverInfo}>
            <User size={16} color="#DC2626" />
            <Text style={styles.declinedDriverText}>
              Driver: {item.declinedDriverId.name}
            </Text>
            {item.declinedDriverId.mobile && (
              <Text style={styles.driverPhone}> • {item.declinedDriverId.mobile}</Text>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.tripDetails}>
            <View style={styles.detailItem}>
              <Truck size={14} color="#64748B" />
              <Text style={styles.detailText}>{item.vehicleId.regNumber}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>
                {item.parcelIds?.length || 0} parcels
              </Text>
            </View>
          </View>
          
          <View style={styles.timeContainer}>
            <Clock size={12} color="#9CA3AF" />
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {canReassign && (
          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Tap to reassign driver</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Bell size={24} color="#64748B" />
      </View>

      {notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Bell size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You'll receive notifications when drivers decline trips
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    maxWidth: 250,
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    borderColor: "#3B82F6",
    backgroundColor: "#FEFEFF",
  },
  actionableCard: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  declinedBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  declinedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  infoBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  tripId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  message: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  declinedDriverInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  declinedDriverText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#DC2626",
  },
  driverPhone: {
    fontSize: 12,
    color: "#991B1B",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripDetails: {
    flexDirection: "row",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: "#F59E0B",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
});

export default ManagerNotificationsScreen;