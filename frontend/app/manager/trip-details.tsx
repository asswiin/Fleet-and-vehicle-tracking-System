import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, Edit2, Truck, User, Package, MapPin } from "lucide-react-native";
import { api, type Trip } from "../../utils/api";

const TripDetailsScreen = () => {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchTripDetails();
    }, [tripId])
  );

  const fetchTripDetails = async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const response = await api.getTrip(tripId);
      if (response.ok && response.data) {
        setTrip(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: "/manager/edit-trip",
      params: { tripId: tripId, tripData: JSON.stringify(trip) }
    } as any);
  };

  if (loading || !trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
          <Edit2 size={20} color="#2563EB" />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Trip Info */}
        <View style={styles.infoCard}>
          <Text style={styles.label}>Trip ID</Text>
          <Text style={styles.value}>{trip.tripId}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: trip.status === 'declined' ? '#EF4444' : '#10B981' }]}> 
            {trip.status.toUpperCase()}
          </Text>
        </View>

        {/* Assigned Resources */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Assigned Resources</Text>
          <View style={styles.resourceCard}>
            <View style={styles.resourceRow}>
              <User size={24} color="#64748B" />
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceLabel}>Driver</Text>
                <Text style={styles.resourceValue}>{trip.driverId?.name || "Unassigned"}</Text>
                <Text style={styles.resourceSub}>{trip.driverId?.phone}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.resourceRow}>
              <Truck size={24} color="#64748B" />
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceLabel}>Vehicle</Text>
                <Text style={styles.resourceValue}>{trip.vehicleId?.regNumber || "Unassigned"}</Text>
                <Text style={styles.resourceSub}>{trip.vehicleId?.model}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Destinations Section */}
        {trip.deliveryDestinations && trip.deliveryDestinations.length > 0 && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Destinations</Text>
            {trip.deliveryDestinations.map((dest, idx) => (
              <View key={idx} style={styles.destinationCard}>
                <View style={styles.row}>
                  <MapPin size={16} color="#2563EB" />
                  <Text style={styles.destinationName}>{dest.locationName}</Text>
                </View>
                <Text style={styles.destinationDetail}>Order: <Text style={styles.destinationValue}>{dest.order}</Text></Text>
                <Text style={styles.destinationDetail}>Status: <Text style={styles.destinationValue}>{dest.deliveryStatus}</Text></Text>
                {dest.latitude && dest.longitude && (
                  <Text style={styles.destinationDetail}>Coords: <Text style={styles.destinationValue}>{dest.latitude}, {dest.longitude}</Text></Text>
                )}
                {dest.notes && <Text style={styles.destinationDetail}>Notes: <Text style={styles.destinationValue}>{dest.notes}</Text></Text>}
              </View>
            ))}
          </View>
        )}

        {/* Parcels Section */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Parcels ({trip.parcelIds.length})</Text>
          {trip.parcelIds.map((parcel, index) => (
            <View key={index} style={styles.parcelCard}>
              {/* Tracking ID */}
              <View style={styles.row}>
                <Package size={16} color="#2563EB" />
                <Text style={styles.parcelText}>{parcel.trackingId}</Text>
              </View>
              {/* Weight & Type */}
              <View style={styles.row}>
                <Text style={styles.resourceLabel}>Weight:</Text>
                <Text style={styles.parcelSubText}>{parcel.weight ? `${parcel.weight} kg` : 'N/A'}</Text>
              </View>
              {/* Destination */}
              <View style={styles.row}>
                <MapPin size={16} color="#64748B" />
                <Text style={styles.resourceLabel}>Destination:</Text>
                <Text style={styles.parcelSubText} numberOfLines={1}>{parcel.recipient?.address || 'N/A'}</Text>
              </View>
              {/* Sender Details */}
              {(parcel as any).sender && (
                <View style={{marginTop: 4}}>
                  <Text style={styles.resourceLabel}>Sender:</Text>
                  <Text style={styles.parcelSubText}>Name: {(parcel as any).sender.name}</Text>
                  <Text style={styles.parcelSubText}>Phone: {(parcel as any).sender.phone}</Text>
                  <Text style={styles.parcelSubText}>Address: {(parcel as any).sender.address}</Text>
                </View>
              )}
              {/* Receiver Details */}
              {parcel.recipient && (
                <View style={{marginTop: 4}}>
                  <Text style={styles.resourceLabel}>Receiver:</Text>
                  <Text style={styles.parcelSubText}>Name: {parcel.recipient.name}</Text>
                  {(parcel.recipient as any).phone && <Text style={styles.parcelSubText}>Phone: {(parcel.recipient as any).phone}</Text>}
                  <Text style={styles.parcelSubText}>Address: {parcel.recipient.address}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  backBtn: { padding: 4 },
  editBtn: { flexDirection: "row", alignItems: "center", padding: 8, backgroundColor: "#EFF6FF", borderRadius: 8 },
  editText: { color: "#2563EB", fontWeight: "600", marginLeft: 4 },
  content: { padding: 20 },
  infoCard: { backgroundColor: "#fff", padding: 20, borderRadius: 16, marginBottom: 20 },
  label: { fontSize: 12, color: "#64748B", textTransform: "uppercase", fontWeight: "600" },
  value: { fontSize: 18, color: "#0F172A", fontWeight: "700", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 12 },
  resourceCard: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 20 },
  resourceRow: { flexDirection: "row", alignItems: "center" },
  resourceInfo: { marginLeft: 16 },
  resourceLabel: { fontSize: 12, color: "#64748B" },
  resourceValue: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  resourceSub: { fontSize: 12, color: "#94A3B8" },
  parcelCard: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: "column", gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  parcelText: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  parcelSubText: { fontSize: 12, color: "#64748B", flex: 1 },
  sectionBox: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20 },
  destinationCard: { backgroundColor: "#F8FAFC", padding: 12, borderRadius: 12, marginBottom: 8 },
  destinationName: { fontSize: 14, fontWeight: "600", color: "#0F172A", marginLeft: 8 },
  destinationDetail: { fontSize: 12, color: "#64748B", marginTop: 4 },
  destinationValue: { fontWeight: "600", color: "#0F172A" },
});

export default TripDetailsScreen;