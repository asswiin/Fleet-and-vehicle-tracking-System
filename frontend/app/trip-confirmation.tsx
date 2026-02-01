import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Truck,
  Package,
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react-native";
import { api, Notification } from "../utils/api";

const { width } = Dimensions.get("window");

const TripConfirmationScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const notificationId = params.notificationId as string;

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchNotificationDetails();
  }, []);

  const fetchNotificationDetails = async () => {
    setLoading(true);
    try {
      const response = await api.getNotification(notificationId);
      if (response.ok && response.data) {
        setNotification(response.data);
        // Mark as read
        await api.markNotificationAsRead(notificationId);
      } else {
        Alert.alert("Error", "Failed to load trip details");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching notification:", error);
      Alert.alert("Error", "Failed to load trip details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!notification) return;
    
    setProcessing(true);
    try {
      const response = await api.updateNotificationStatus(notificationId, "accepted");
      if (response.ok) {
        Alert.alert(
          "Trip Accepted! ✓", 
          `Vehicle and driver status updated.\n${notification.parcelIds.length} parcel(s) marked as "In Transit".\n\nYou can now start your journey.`, 
          [
            {
              text: "OK",
              onPress: () => {
                router.push({
                  pathname: "/driver-dashboard",
                  params: { userId: params.driverId }
                } as any);
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", "Failed to accept trip");
      }
    } catch (error) {
      console.error("Error accepting trip:", error);
      Alert.alert("Error", "Failed to accept trip");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Trip",
      "Are you sure you want to decline this trip assignment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              const response = await api.updateNotificationStatus(notificationId, "declined");
              if (response.ok) {
                Alert.alert("Trip Declined", "The trip has been declined.", [
                  {
                    text: "OK",
                    onPress: () => {
                      router.push({
                        pathname: "/driver-dashboard",
                        params: { userId: params.driverId }
                      } as any);
                    },
                  },
                ]);
              } else {
                Alert.alert("Error", "Failed to decline trip");
              }
            } catch (error) {
              console.error("Error declining trip:", error);
              Alert.alert("Error", "Failed to decline trip");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Trip details not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalWeight = notification.parcelIds.reduce((sum, p) => {
    const weight = parseFloat(String(p.weight)) || 0;
    return sum + weight;
  }, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Assignment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trip ID Header */}
        <View style={styles.tripIdCard}>
          <View style={styles.priorityBadge}>
            <Clock size={16} color="#fff" />
            <Text style={styles.priorityText}>NEW ASSIGNMENT</Text>
          </View>
          <Text style={styles.tripId}>{notification.tripId}</Text>
          <Text style={styles.tripMessage}>{notification.message}</Text>
        </View>

        {/* Vehicle Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Truck size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.label}>Registration</Text>
              <Text style={styles.value}>{notification.vehicleId.regNumber}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <Text style={styles.label}>Model</Text>
              <Text style={styles.value}>{notification.vehicleId.model}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{notification.vehicleId.type}</Text>
            </View>
          </View>
        </View>

        {/* Parcels Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>
              Parcels ({notification.parcelIds.length})
            </Text>
          </View>
          {notification.parcelIds.map((parcel, index) => (
            <View key={parcel._id} style={styles.parcelCard}>
              <View style={styles.parcelHeader}>
                <View style={styles.parcelNumber}>
                  <Text style={styles.parcelNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.parcelInfo}>
                  <Text style={styles.parcelTracking}>
                    {parcel.trackingId}
                  </Text>
                  <View style={styles.destinationRow}>
                    <MapPin size={14} color="#64748B" />
                    <Text style={styles.destination}>{parcel.recipient?.name || "Unknown"}</Text>
                  </View>
                </View>
                <View style={styles.weightBadge}>
                  <Text style={styles.weightText}>{parcel.weight} kg</Text>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.totalWeightCard}>
            <Text style={styles.totalWeightLabel}>Total Weight</Text>
            <Text style={styles.totalWeightValue}>{totalWeight.toFixed(2)} kg</Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <AlertCircle size={20} color="#2563EB" />
          <Text style={styles.infoText}>
            Please review the trip details carefully before accepting
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {notification.status === "pending" && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
            disabled={processing}
          >
            <Text style={styles.declineButtonText}>
              {processing ? "Processing..." : "Decline"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAccept}
            disabled={processing}
          >
            <CheckCircle size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>
              {processing ? "Processing..." : "Accept & Start"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#64748B" },
  
  tripIdCard: {
    backgroundColor: "#667eea",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  priorityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  tripId: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  tripMessage: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: { fontSize: 14, color: "#64748B", fontWeight: "500" },
  value: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },

  parcelCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  parcelHeader: { flexDirection: "row", alignItems: "center" },
  parcelNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  parcelNumberText: { fontSize: 14, fontWeight: "700", color: "#2563EB" },
  parcelInfo: { flex: 1 },
  parcelTracking: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  destinationRow: { flexDirection: "row", alignItems: "center" },
  destination: { fontSize: 13, color: "#64748B", marginLeft: 4 },
  weightBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  weightText: { fontSize: 12, fontWeight: "600", color: "#475569" },

  totalWeightCard: {
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalWeightLabel: { fontSize: 16, fontWeight: "600", color: "#1E40AF" },
  totalWeightValue: { fontSize: 20, fontWeight: "700", color: "#1E40AF" },

  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    marginLeft: 12,
    lineHeight: 18,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  button: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  declineButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#EF4444",
  },
  declineButtonText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 16,
  },
  acceptButton: {
    backgroundColor: "#10B981",
    gap: 8,
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default TripConfirmationScreen;
