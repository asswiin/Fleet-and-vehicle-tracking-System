import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Search, MapPin, Package, CheckCircle2, Circle, Box, X, MapPinIcon, User, Weight, Layers } from "lucide-react-native";
import { api, type Parcel } from "../../utils/api";

interface Recipient {
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
}

interface ParcelWithRecipient extends Parcel {
  recipient?: Recipient;
  dimensions?: string;
  fragile?: boolean;
  description?: string;
  specialInstructions?: string;
}

const SelectingParcelScreen = () => {
  const router = useRouter();
  const [parcels, setParcels] = useState<ParcelWithRecipient[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<ParcelWithRecipient[]>([]);
  const [selectedParcels, setSelectedParcels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalWeight, setTotalWeight] = useState(0);
  const [selectedParcelDetail, setSelectedParcelDetail] = useState<ParcelWithRecipient | null>(null);

  // Fetch parcels
  React.useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async () => {
    setLoading(true);
    try {
      const response = await api.getParcels();
      if (response.ok && response.data) {
        // Filter only "Booked" status parcels for assignment
        const bookedParcels = response.data.filter((p: Parcel) => p.status === "Booked" || !p.status);
        setParcels(bookedParcels);
        setFilteredParcels(bookedParcels);
      }
    } catch (error) {
      console.error("Error fetching parcels:", error);
      Alert.alert("Error", "Failed to load parcels");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredParcels(parcels);
    } else {
      const filtered = parcels.filter(
        (p) =>
          p.trackingId?.toLowerCase().includes(query.toLowerCase()) ||
          p.recipient?.name?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredParcels(filtered);
    }
  };

  const toggleParcelSelection = (parcelId: string, weight: number) => {
    const newSelected = new Set(selectedParcels);
    if (newSelected.has(parcelId)) {
      newSelected.delete(parcelId);
      setTotalWeight((prev) => prev - weight);
    } else {
      newSelected.add(parcelId);
      setTotalWeight((prev) => prev + weight);
    }
    setSelectedParcels(newSelected);
  };

  const handleNext = () => {
    if (selectedParcels.size === 0) {
      Alert.alert("No Selection", "Please select at least one parcel");
      return;
    }

    const selectedIds = Array.from(selectedParcels);
    router.push({
      pathname: "/driver/select-vehicle",
      params: { parcelIds: JSON.stringify(selectedIds), totalWeight: totalWeight.toString() },
    } as any);
  };

  const renderParcelItem = ({ item }: { item: ParcelWithRecipient }) => {
    const isSelected = selectedParcels.has(item._id);

    // Parse city, district and state from address
    const addressParts = item.recipient?.address?.split(',') || [];
    const city = addressParts[2]?.trim() || "---";
    const district = addressParts[3]?.trim() || "---";
    const state = addressParts[4]?.trim() || "---";

    return (
      <View style={[styles.parcelCard, isSelected && styles.parcelCardSelected]}>
        {/* Checkbox Circle - Click to Select */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleParcelSelection(item._id, item.weight || 0)}
        >
          {isSelected ? (
            <View style={styles.checkboxChecked}>
              <CheckCircle2 size={24} color="#2563EB" />
            </View>
          ) : (
            <Circle size={24} color="#D1D5DB" />
          )}
        </TouchableOpacity>

        {/* Parcel Info - Click to View Details */}
        <TouchableOpacity
          style={styles.parcelInfoContainer}
          onPress={() => setSelectedParcelDetail(item)}
        >
          <View style={styles.parcelInfo}>
            <Text style={styles.parcelName}>
              {item.trackingId || "Parcel"}
            </Text>
            
            {/* Destination */}
            <View style={styles.parcelDetailsRow}>
              <View style={[styles.detailItem, styles.destinationItem]}>
                <MapPin size={16} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.destinationLabel}>Destination:</Text>
                <Text style={styles.destinationText} numberOfLines={1}>
                  {city}, {district}, {state}
                </Text>
              </View>
            </View>
            
            {/* Weight and Type */}
            <View style={styles.parcelDetailsRow}>
              <View style={[styles.detailItem, styles.weightItem]}>
                <Package size={16} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.weightLabel}>Weight:</Text>
                <Text style={styles.weightText}>{item.weight || "---"} kg</Text>
              </View>
              <View style={[styles.detailItem, styles.typeItem]}>
                <Box size={16} color="#7C3AED" style={{ marginRight: 4 }} />
                <Text style={styles.typeLabel}>Type:</Text>
                <Text style={styles.typeText}>{item.type || "---"}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Parcels</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Parcels</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Tracking ID..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Parcel List */}
      <FlatList
        data={filteredParcels}
        keyExtractor={(item) => item._id}
        renderItem={renderParcelItem}
        scrollEnabled={true}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Parcels Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? "Try a different search" : "No available parcels to assign"}
            </Text>
          </View>
        }
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.totalWeightBox}>
          <Text style={styles.totalWeightLabel}>TOTAL WEIGHT</Text>
          <Text style={styles.totalWeightValue}>{totalWeight.toFixed(2)} kg</Text>
        </View>
        <TouchableOpacity
          style={[styles.nextButton, selectedParcels.size === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={selectedParcels.size === 0}
        >
          <Text style={styles.nextButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>

      {/* Parcel Detail Modal */}
      <Modal
        visible={selectedParcelDetail !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedParcelDetail(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedParcelDetail(null)}>
              <X size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Parcel Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedParcelDetail && (
              <>
                {/* Tracking ID */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Tracking Information</Text>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Tracking ID</Text>
                    <Text style={styles.detailValue}>{selectedParcelDetail.trackingId}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: selectedParcelDetail.status === "Booked" ? "#DBEAFE" : "#FEF2F2" }]}>
                      <Text style={[styles.statusText, { color: selectedParcelDetail.status === "Booked" ? "#0C4A6E" : "#991B1B" }]}>
                        {selectedParcelDetail.status || "Booked"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Recipient Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Recipient Information</Text>
                  <View style={styles.detailBox}>
                    <View style={styles.iconRow}>
                      <User size={18} color="#6366F1" style={{ marginRight: 8 }} />
                      <Text style={styles.detailLabel}>Recipient Name</Text>
                    </View>
                    <Text style={styles.detailValue}>{selectedParcelDetail.recipient?.name || "---"}</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <View style={styles.iconRow}>
                      <MapPinIcon size={18} color="#DC2626" style={{ marginRight: 8 }} />
                      <Text style={styles.detailLabel}>Delivery Address</Text>
                    </View>
                    <Text style={styles.detailValue}>{selectedParcelDetail.recipient?.address || "---"}</Text>
                  </View>
                  {selectedParcelDetail.recipient?.phone && (
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>{selectedParcelDetail.recipient?.phone}</Text>
                    </View>
                  )}
                  {selectedParcelDetail.recipient?.email && (
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{selectedParcelDetail.recipient?.email}</Text>
                    </View>
                  )}
                </View>

                {/* Parcel Specifications */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Parcel Specifications</Text>
                  <View style={styles.specRow}>
                    <View style={[styles.detailBox, styles.specBox]}>
                      <View style={styles.iconRow}>
                        <Weight size={18} color="#059669" style={{ marginRight: 8 }} />
                        <Text style={styles.detailLabel}>Weight</Text>
                      </View>
                      <Text style={styles.detailValue}>{selectedParcelDetail.weight || "---"} kg</Text>
                    </View>
                    <View style={[styles.detailBox, styles.specBox]}>
                      <View style={styles.iconRow}>
                        <Layers size={18} color="#7C3AED" style={{ marginRight: 8 }} />
                        <Text style={styles.detailLabel}>Type</Text>
                      </View>
                      <Text style={styles.detailValue}>{selectedParcelDetail.type || "---"}</Text>
                    </View>
                  </View>
                  {selectedParcelDetail.dimensions && (
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>Dimensions</Text>
                      <Text style={styles.detailValue}>{selectedParcelDetail.dimensions}</Text>
                    </View>
                  )}
                  {selectedParcelDetail.fragile && (
                    <View style={[styles.detailBox, styles.fragileBadge]}>
                      <Text style={styles.fragileText}>⚠️ FRAGILE - Handle with care</Text>
                    </View>
                  )}
                </View>

                {/* Additional Details */}
                {selectedParcelDetail.description && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.detailBox}>
                      <Text style={styles.detailValue}>{selectedParcelDetail.description}</Text>
                    </View>
                  </View>
                )}

                {selectedParcelDetail.specialInstructions && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Special Instructions</Text>
                    <View style={[styles.detailBox, styles.instructionBox]}>
                      <Text style={styles.detailValue}>{selectedParcelDetail.specialInstructions}</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Modal Footer - Selection Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.selectButton,
                selectedParcelDetail && selectedParcels.has(selectedParcelDetail._id) && styles.selectButtonSelected
              ]}
              onPress={() => {
                if (selectedParcelDetail) {
                  toggleParcelSelection(selectedParcelDetail._id, selectedParcelDetail.weight || 0);
                }
              }}
            >
              <Text style={[
                styles.selectButtonText,
                selectedParcelDetail && selectedParcels.has(selectedParcelDetail._id) && styles.selectButtonTextSelected
              ]}>
                {selectedParcelDetail && selectedParcels.has(selectedParcelDetail._id) ? "✓ Selected" : "Select Parcel"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
  },
  listContent: { paddingHorizontal: 16, paddingVertical: 8 },
  parcelCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 90,
  },
  parcelCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F0F9FF",
  },
  checkboxContainer: { marginRight: 12 },
  checkboxChecked: { width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  parcelInfoContainer: { flex: 1 },
  parcelInfo: { flex: 1 },
  parcelName: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 6 },
  parcelDetailsRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  detailItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  detailText: { fontSize: 12, color: "#64748B" },
  
  // Color-coded destination styles
  destinationItem: { backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  destinationLabel: { fontSize: 11, fontWeight: "600", color: "#DC2626", marginRight: 4 },
  destinationText: { fontSize: 12, fontWeight: "700", color: "#991B1B", flex: 1 },
  
  // Color-coded weight styles
  weightItem: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6 },
  weightLabel: { fontSize: 11, fontWeight: "600", color: "#059669", marginRight: 4 },
  weightText: { fontSize: 12, fontWeight: "700", color: "#047857" },
  
  // Color-coded type styles
  typeItem: { backgroundColor: "#FAF5FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeLabel: { fontSize: 11, fontWeight: "600", color: "#7C3AED", marginRight: 4 },
  typeText: { fontSize: 12, fontWeight: "700", color: "#5B21B6" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: "#64748B", marginTop: 4 },
  footer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalWeightBox: { flex: 1 },
  totalWeightLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", textTransform: "uppercase" },
  totalWeightValue: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginTop: 4 },
  nextButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: { opacity: 0.5, backgroundColor: "#94A3B8" },
  nextButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  modalContent: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  detailSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  detailBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  specBox: { flex: 1 },
  specRow: { flexDirection: "row", gap: 10 },
  detailLabel: { fontSize: 12, fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginTop: 6 },
  iconRow: { flexDirection: "row", alignItems: "center" },
  statusBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignSelf: "flex-start" },
  statusText: { fontSize: 12, fontWeight: "600" },
  fragileBadge: { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" },
  fragileText: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  instructionBox: { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" },
  modalFooter: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#D1D5DB",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  selectButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  selectButtonTextSelected: {
    color: "#fff",
  },
});

export default SelectingParcelScreen;

