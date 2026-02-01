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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Truck,
  Package,
  MapPin,
  CheckCircle,
  X,
  HelpCircle,
  Clock,
} from "lucide-react-native";
import { api, Notification } from "../utils/api";

const TripAssignmentDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const notificationId = params.notificationId as string;
  const driverId = params.driverId as string;

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
          `You have accepted this trip.\n\nVehicle: ${notification.vehicleId?.regNumber}\nParcels: ${notification.parcelIds?.length || 0}\n\n✅ Your status is now "On-trip"\n✅ Vehicle status updated to "On-trip"\n\nYou can now start your journey.`,
          [
            {
              text: "Start Trip",
              onPress: () => {
                router.push({
                  pathname: "/driver-dashboard",
                  params: { userId: driverId },
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
                    onPress: () => router.back(),
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Trip details not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalWeight = notification.parcelIds?.reduce((sum, p) => {
    const weight = parseFloat(String(p.weight)) || 0;
    return sum + weight;
  }, 0) || 0;

  const isAlreadyProcessed = notification.status !== "pending";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {/* Gradient Header */}
      <View style={styles.gradientHeader}>
        {/* Top Bar */}
        <SafeAreaView>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.priorityBadge}>
              <Clock size={14} color="#fff" />
              <Text style={styles.priorityText}>PRIORITY</Text>
            </View>

            <TouchableOpacity style={styles.helpButton}>
              <HelpCircle size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Title */}
        <Text style={styles.headerTitle}>New Trip Assignment</Text>
        <Text style={styles.tripIdHeader}>ID: #{notification.tripId}</Text>
      </View>

      {/* Content Card */}
      <View style={styles.contentCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Map Placeholder */}
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              {/* Simulated map with route */}
              <View style={styles.mapRoute}>
                <View style={styles.startPoint} />
                <View style={styles.routeLine} />
                <View style={styles.endPoint} />
              </View>
            </View>
            <View style={styles.distanceBadge}>
              <MapPin size={14} color="#2563EB" />
              <Text style={styles.distanceText}>4.2 mi</Text>
            </View>
          </View>

          {/* Destination */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: "#DBEAFE" }]}>
              <MapPin size={20} color="#2563EB" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>DESTINATION</Text>
              <Text style={styles.detailValue}>
                {notification.parcelIds?.[0]?.recipient?.address || "Multiple destinations"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Vehicle Required */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: "#F3E8FF" }]}>
              <Truck size={20} color="#9333EA" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>VEHICLE REQUIRED</Text>
              <Text style={styles.detailValue}>
                {notification.vehicleId?.regNumber || "Vehicle"} - {notification.vehicleId?.model || ""}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Parcel Details */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: "#FEF3C7" }]}>
              <Package size={20} color="#D97706" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>PARCEL DETAILS</Text>
              <Text style={styles.detailValue}>
                Weight: {totalWeight > 0 ? `${totalWeight.toFixed(1)}kg` : "--kg"}
              </Text>
              <Text style={styles.detailSubtext}>
                {notification.parcelIds?.length || 0} parcel(s) • Handle with care
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Bottom Buttons */}
      {!isAlreadyProcessed ? (
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.acceptButtonText}>ACCEPT & START</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            disabled={processing}
          >
            <X size={20} color="#64748B" />
            <Text style={styles.declineButtonText}>DECLINE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomButtons}>
          <View style={[
            styles.statusBanner,
            notification.status === "accepted" ? styles.acceptedBanner : styles.declinedBanner
          ]}>
            <Text style={styles.statusBannerText}>
              Trip {notification.status === "accepted" ? "Accepted ✓" : "Declined"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
  },

  // Gradient Header
  gradientHeader: {
    paddingBottom: 60,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: "#667eea",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  priorityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  helpButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginTop: 8,
  },
  tripIdHeader: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 8,
  },

  // Content Card
  contentCard: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -40,
    marginHorizontal: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  scrollContent: {
    padding: 20,
  },

  // Map
  mapContainer: {
    height: 160,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapRoute: {
    flexDirection: "row",
    alignItems: "center",
    width: "60%",
  },
  startPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#2563EB",
    marginHorizontal: 8,
    borderStyle: "dashed",
  },
  endPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
  },
  distanceBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  // Detail Rows
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailSubtext: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Bottom Buttons
  bottomButtons: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#fff",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  declineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  declineButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "700",
  },

  // Status Banner
  statusBanner: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  acceptedBanner: {
    backgroundColor: "#D1FAE5",
  },
  declinedBanner: {
    backgroundColor: "#FEE2E2",
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
});

export default TripAssignmentDetailScreen;
