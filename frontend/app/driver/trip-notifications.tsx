// app/trip-notifications.tsx

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, Image, Alert } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, Bell, Clock, ChevronRight, MapPin, Package, Truck } from "lucide-react-native";
import { api, Notification } from "../../utils/api";

const TripNotificationsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const driverId = params.driverId as string;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [driverId])
  );

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getDriverNotifications(driverId);
      if (res.ok && res.data) {
        // Sort pending first, then by date
        const sorted = res.data.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setNotifications(sorted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Alerts</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card, 
                (item.status === 'pending' || item.type === 'termination') && styles.cardPending,
                item.type === 'termination' && { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' }
              ]}
              onPress={async () => {
                if (item.type === 'termination') {
                  Alert.alert("Termination Notice", item.message);
                  if (!item.read) {
                    await api.markNotificationAsRead(item._id);
                    fetchNotifications();
                  }
                  return;
                }
                // NAVIGATE TO THE TRIP CONFIRMATION PAGE
                router.push({
                  pathname: "/manager/trip-assignment-detail",
                  params: { notificationId: item._id, driverId }
                } as any);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.vehicleIconContainer, item.type === 'termination' && { backgroundColor: '#FEE2E2' }]}>
                    {item.type === 'termination' ? (
                      <Bell size={20} color="#EF4444" />
                    ) : item.vehicleId?.profilePhoto ? (
                      <Image source={{ uri: api.getImageUrl(item.vehicleId.profilePhoto)! }} style={styles.vehicleImage} />
                    ) : (
                      <Truck size={20} color="#2563EB" />
                    )}
                  </View>
                  <Text style={[styles.tripId, item.type === 'termination' && { color: '#991B1B' }]}>
                    {item.type === 'termination' ? "Account Notice" : `Trip #${item.tripId}`}
                  </Text>
                </View>
                {!item.read && item.type === 'termination' && (
                  <View style={styles.unreadDot} />
                )}
                <View style={[styles.badge, item.status === 'pending' ? styles.badgePending : styles.badgeDone]}>
                  <Text style={[styles.badgeText, item.status === 'pending' ? styles.textPending : styles.textDone]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.message, item.type === 'termination' && { color: '#B91C1C', fontWeight: '500' }]}>{item.message}</Text>
              
              {/* Parcels and Weight Info - Only for trips */}
              {item.type !== 'termination' && item.parcelIds && item.parcelIds.length > 0 && (
                <>
                  <View style={styles.infoRow}>
                    <Package size={14} color="#64748B" />
                    <Text style={styles.infoText}>
                      {item.parcelIds.length} parcel(s) • {item.parcelIds.reduce((sum, p) => sum + (p.weight || 0), 0).toFixed(1)}kg
                    </Text>
                  </View>
                  <View style={styles.destinationContainer}>
                    <MapPin size={14} color="#2563EB" />
                    <Text style={styles.destinationText} numberOfLines={2}>
                      {item.parcelIds.map(p => p.recipient?.address || 'Unknown').join(' → ')}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.cardFooter}>
                <Clock size={14} color="#94A3B8" />
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  cardPending: { borderColor: "#3B82F6", borderLeftWidth: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tripId: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  message: { fontSize: 14, color: "#64748B", marginBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  infoText: { fontSize: 13, color: "#64748B" },
  destinationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  destinationText: { fontSize: 13, color: "#1E40AF", flex: 1, fontWeight: "500" },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  date: { fontSize: 12, color: "#94A3B8" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePending: { backgroundColor: "#EFF6FF" },
  badgeDone: { backgroundColor: "#F1F5F9" },
  badgeText: {},
  textPending: { fontSize: 10, fontWeight: "700", color: "#2563EB" },
  textDone: { fontSize: 10, fontWeight: "700", color: "#64748B" },
  vehicleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: 'hidden'
  },
  vehicleImage: { width: 36, height: 36 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginRight: 8,
  },
});

export default TripNotificationsScreen;

