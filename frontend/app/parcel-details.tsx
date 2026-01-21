import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { 
  Package, 
  ArrowLeft, 
  MapPin, 
  User, 
  IndianRupee,
  Calendar,
  Weight,
  FileText,
  ChevronRight
} from "lucide-react-native";
import { api, type Parcel } from "../utils/api";

const ParcelDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const parcelId = params.parcelId as string;
  
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadParcelDetails = useCallback(async () => {
    if (!parcelId) {
      setError("No parcel ID provided");
      return;
    }
    
    setLoading(true);
    setError(null);
    const response = await api.getParcel(parcelId);
    if (response.ok && response.data) {
      setParcel(response.data);
    } else {
      setError(response.error || "Failed to load parcel details");
      setParcel(null);
    }
    setLoading(false);
  }, [parcelId]);

  useFocusEffect(
    useCallback(() => {
      loadParcelDetails();
    }, [loadParcelDetails])
  );

  const handleStatusUpdate = async (newStatus: string) => {
    if (!parcelId) return;
    
    Alert.alert(
      "Update Status",
      `Change status to "${newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            const response = await api.updateParcelStatus(parcelId, newStatus);
            if (response.ok) {
              Alert.alert("Success", "Status updated successfully");
              loadParcelDetails();
            } else {
              Alert.alert("Error", response.error || "Failed to update status");
            }
          },
        },
      ]
    );
  };

  const renderStatus = (status?: string) => {
    const label = status || "Pending";
    const isDelivered = label === "Delivered";
    const isInTransit = label === "In Transit";
    
    return (
      <View style={[
        styles.statusBadge, 
        isDelivered && styles.statusDelivered,
        isInTransit && styles.statusInTransit
      ]}>
        <Text style={[
          styles.statusText, 
          isDelivered && styles.statusTextDelivered,
          isInTransit && styles.statusTextInTransit
        ]}>
          {label}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parcel Details</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !parcel) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parcel Details</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.centerContainer}>
          <Package size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Error loading parcel</Text>
          <Text style={styles.errorSubtitle}>{error || "Parcel not found"}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadParcelDetails}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parcel Details</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tracking ID Card */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Package size={24} color="#2563EB" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.trackingLabel}>Tracking ID</Text>
              <Text style={styles.trackingId}>{parcel.trackingId}</Text>
            </View>
            {renderStatus(parcel.status)}
          </View>
        </View>

        {/* Sender Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
              <User size={18} color="#2563EB" />
            </View>
            <Text style={styles.sectionTitle}>Sender Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{parcel.sender?.name || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{parcel.sender?.phone || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={[styles.detailValue, { flex: 1 }]}>{parcel.sender?.address || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Recipient Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <MapPin size={18} color="#D97706" />
            </View>
            <Text style={styles.sectionTitle}>Recipient Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{parcel.recipient?.name || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{parcel.recipient?.phone || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={[styles.detailValue, { flex: 1 }]}>{parcel.recipient?.address || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Package Specifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Package size={18} color="#166534" />
            </View>
            <Text style={styles.sectionTitle}>Package Details</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <Weight size={16} color="#64748B" />
                <Text style={styles.specLabel}>Weight</Text>
                <Text style={styles.specValue}>{parcel.weight ? `${parcel.weight} kg` : "N/A"}</Text>
              </View>
              <View style={styles.specItem}>
                <FileText size={16} color="#64748B" />
                <Text style={styles.specLabel}>Type</Text>
                <Text style={styles.specValue}>{parcel.type || "N/A"}</Text>
              </View>
            </View>
            <View style={styles.specRow}>
              <View style={styles.specItem}>
                <IndianRupee size={16} color="#64748B" />
                <Text style={styles.specLabel}>Amount</Text>
                <Text style={styles.specValue}>₹{parcel.paymentAmount || "0"}</Text>
              </View>
              <View style={styles.specItem}>
                <Calendar size={16} color="#64748B" />
                <Text style={styles.specLabel}>Date</Text>
                <Text style={styles.specValue}>
                  {parcel.date ? new Date(parcel.date).toLocaleDateString() : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Update Actions */}
        <View style={styles.section}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleStatusUpdate("In Transit")}
          >
            <Text style={styles.actionButtonText}>Mark as In Transit</Text>
            <ChevronRight size={18} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleStatusUpdate("Delivered")}
          >
            <Text style={styles.actionButtonText}>Mark as Delivered</Text>
            <ChevronRight size={18} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  content: { padding: 16 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  trackingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  trackingHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  trackingLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trackingId: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  specItem: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    marginHorizontal: 4,
  },
  specLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 6,
    textTransform: "uppercase",
  },
  specValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "700",
    marginTop: 2,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  statusText: { color: "#1D4ED8", fontSize: 12, fontWeight: "700" },
  statusDelivered: { backgroundColor: "#ECFDF3", borderColor: "#BBF7D0" },
  statusTextDelivered: { color: "#15803D" },
  statusInTransit: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  statusTextInTransit: { color: "#D97706" },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#DC2626",
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ParcelDetailsScreen;
