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
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Search, MapPin, Package, CheckCircle2, Circle, Box, X, MapPinIcon, User, Weight, Layers, AlertTriangle, RotateCcw, Truck, UserX } from "lucide-react-native";
import { api, type Parcel, type Driver } from "../../utils/api";

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
  const params = useLocalSearchParams();
  
  // Get manager info from params
  const managerId = params.managerId as string;
  
  const [parcels, setParcels] = useState<ParcelWithRecipient[]>([]);
  const [declinedParcels, setDeclinedParcels] = useState<ParcelWithRecipient[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<ParcelWithRecipient[]>([]);
  const [filteredDeclinedParcels, setFilteredDeclinedParcels] = useState<ParcelWithRecipient[]>([]);
  const [selectedParcels, setSelectedParcels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalWeight, setTotalWeight] = useState(0);
  const [selectedParcelDetail, setSelectedParcelDetail] = useState<ParcelWithRecipient | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'declined'>('new');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedDeclinedParcel, setSelectedDeclinedParcel] = useState<ParcelWithRecipient | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [selectedNewDriver, setSelectedNewDriver] = useState<string>("");
  const [reassignLoading, setReassignLoading] = useState(false);

  // Fetch data
  React.useEffect(() => {
    fetchParcels();
    fetchDeclinedParcels();
    fetchAvailableDrivers();
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

  const fetchDeclinedParcels = async () => {
    try {
      const response = await api.getDeclinedParcels();
      if (response.ok && response.data) {
        setDeclinedParcels(response.data);
        setFilteredDeclinedParcels(response.data);
      }
    } catch (error) {
      console.error("Error fetching declined parcels:", error);
    }
  };

  const fetchAvailableDrivers = async () => {
    try {
      const driversResponse = await api.getDrivers();
      if (driversResponse.ok && driversResponse.data) {
        // Filter available drivers using same logic as assign-trip and reassign-driver:
        // 1. Account Status must be Active
        // 2. Must be Punched In (isAvailable === true) 
        // 3. driverStatus not "On-trip", "Accepted", or "pending"
        const allDrivers = Array.isArray(driversResponse.data) 
          ? driversResponse.data 
          : (driversResponse.data as any).data || [];
        const availableDriversList = allDrivers.filter((driver: Driver) => 
          driver.status === "Active" && 
          driver.isAvailable === true &&
          driver.driverStatus !== "On-trip" && 
          driver.driverStatus !== "Accepted" &&
          driver.driverStatus !== "pending"
        );
        setAvailableDrivers(availableDriversList);
      }
    } catch (error) {
      console.error("Error fetching available drivers:", error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredParcels(parcels);
      setFilteredDeclinedParcels(declinedParcels);
    } else {
      const filteredRegular = parcels.filter(
        (p) =>
          p.trackingId?.toLowerCase().includes(query.toLowerCase()) ||
          p.recipient?.name?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredParcels(filteredRegular);

      const filteredDeclined = declinedParcels.filter(
        (p) =>
          p.trackingId?.toLowerCase().includes(query.toLowerCase()) ||
          p.recipient?.name?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredDeclinedParcels(filteredDeclined);
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
      params: { 
        parcelIds: JSON.stringify(selectedIds), 
        totalWeight: totalWeight.toString(),
        managerId: managerId 
      },
    } as any);
  };

  const handleReassignTrip = async () => {
    if (!selectedDeclinedParcel || !selectedNewDriver) {
      Alert.alert("Missing Selection", "Please select a driver");
      return;
    }

    setReassignLoading(true);
    try {
      const response = await api.reassignTrip(selectedDeclinedParcel.tripId!, {
        newDriverId: selectedNewDriver,
        managerId: managerId
      });

      if (response.ok) {
        Alert.alert("Success", "Trip has been reassigned to the new driver. The same vehicle will be used.");
        setShowReassignModal(false);
        setSelectedDeclinedParcel(null);
        setSelectedNewDriver("");
        fetchDeclinedParcels(); // Refresh declined parcels
      } else {
        Alert.alert("Error", "Failed to reassign trip");
      }
    } catch (error) {
      console.error("Error reassigning trip:", error);
      Alert.alert("Error", "Failed to reassign trip");
    } finally {
      setReassignLoading(false);
    }
  };

  const renderParcelItem = ({ item }: { item: ParcelWithRecipient }) => {
    const isSelected = selectedParcels.has(item._id);
    const isDeclined = activeTab === 'declined';

    // Parse city, district and state from address
    const addressParts = item.recipient?.address?.split(',') || [];
    const city = addressParts[2]?.trim() || "---";
    const district = addressParts[3]?.trim() || "---";
    const state = addressParts[4]?.trim() || "---";

    return (
      <View style={[styles.parcelCard, isSelected && styles.parcelCardSelected]}>
        {/* Checkbox Circle - Click to Select (only for new parcels) */}
        {!isDeclined && (
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
        )}

        {/* Parcel Info */}
        <TouchableOpacity
          style={styles.parcelInfoContainer}
          onPress={() => setSelectedParcelDetail(item)}
        >
          <View style={styles.parcelInfo}>
            <View style={styles.parcelHeader}>
              <Text style={styles.parcelName}>
                {item.trackingId || "Parcel"}
              </Text>
              {isDeclined && (
                <View style={styles.declinedBadge}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <Text style={styles.declinedText}>Declined</Text>
                </View>
              )}
            </View>
            
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
              <View style={styles.detailItem}>
                <Weight size={14} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.detailText}>{item.weight || 0} kg</Text>
              </View>
              <View style={styles.detailItem}>
                <Package size={14} color="#6B7280" style={{ marginRight: 4 }} />
                <Text style={styles.detailText}>{item.type || "Package"}</Text>
              </View>
            </View>

            {/* Declined driver info */}
            {isDeclined && (
              <View style={styles.declinedInfo}>
                <View style={styles.declinedDriverInfo}>
                  <UserX size={16} color="#DC2626" />
                  <Text style={styles.declinedDriverText}>
                    Declined by: {item.declinedDriverName}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.reassignButton}
                  onPress={() => {
                    setSelectedDeclinedParcel(item);
                    setShowReassignModal(true);
                  }}
                >
                  <RotateCcw size={16} color="#2563EB" />
                  <Text style={styles.reassignButtonText}>Reassign</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Parcels</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Package size={20} color={activeTab === 'new' ? "#2563EB" : "#6B7280"} />
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            New Parcels ({filteredParcels.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'declined' && styles.activeTab]}
          onPress={() => setActiveTab('declined')}
        >
          <AlertTriangle size={20} color={activeTab === 'declined' ? "#DC2626" : "#6B7280"} />
          <Text style={[styles.tabText, activeTab === 'declined' && styles.activeTabText]}>
            Declined ({filteredDeclinedParcels.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by tracking ID or recipient name"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading parcels...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'new' ? filteredParcels : filteredDeclinedParcels}
          keyExtractor={(item) => item._id}
          renderItem={renderParcelItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'new' ? 'No new parcels available' : 'No declined parcels'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'new' 
                  ? 'All parcels are either assigned or delivered' 
                  : 'No parcels have been declined by drivers'}
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom Action Bar (only for new parcels) */}
      {activeTab === 'new' && selectedParcels.size > 0 && (
        <View style={styles.bottomActionBar}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedParcels.size} parcel{selectedParcels.size > 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.weightText}>Total: {totalWeight} kg</Text>
          </View>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reassign Modal — driver only, vehicle stays the same */}
      <Modal visible={showReassignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reassign Driver</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowReassignModal(false);
                  setSelectedDeclinedParcel(null);
                  setSelectedNewDriver("");
                }}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedDeclinedParcel && (
              <>
                <Text style={styles.modalSubtitle}>
                  Reassigning: {selectedDeclinedParcel.trackingId}
                </Text>

                {/* Vehicle Info — read-only, already assigned */}
                <View style={styles.vehicleInfoCard}>
                  <Truck size={20} color="#2563EB" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.vehicleInfoLabel}>Assigned Vehicle (unchanged)</Text>
                    <Text style={styles.vehicleInfoValue}>
                      {selectedDeclinedParcel.assignedVehicle
                        ? `${(selectedDeclinedParcel.assignedVehicle as any).regNumber} • ${(selectedDeclinedParcel.assignedVehicle as any).model} - ${(selectedDeclinedParcel.assignedVehicle as any).type}`
                        : "Vehicle assigned"}
                    </Text>
                  </View>
                </View>

                {/* Declined driver info */}
                <View style={styles.declinedDriverCard}>
                  <UserX size={20} color="#DC2626" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.declinedDriverLabel}>Declined by</Text>
                    <Text style={styles.declinedDriverValue}>
                      {selectedDeclinedParcel.declinedDriverName || "Unknown"}
                    </Text>
                  </View>
                </View>

                {/* Driver Selection — only thing manager needs to pick */}
                <Text style={styles.sectionTitle}>Select New Driver</Text>
                <ScrollView style={styles.selectionList} showsVerticalScrollIndicator={false}>
                  {availableDrivers.length === 0 ? (
                    <View style={{ padding: 20, alignItems: "center" }}>
                      <Text style={{ color: "#6B7280" }}>No available drivers</Text>
                    </View>
                  ) : (
                    availableDrivers.map((driver) => (
                      <TouchableOpacity
                        key={driver._id}
                        style={[
                          styles.selectionItem,
                          selectedNewDriver === driver._id && styles.selectedItem
                        ]}
                        onPress={() => setSelectedNewDriver(driver._id)}
                      >
                        <View style={styles.driverInfo}>
                          <User size={20} color="#374151" />
                          <View style={styles.driverDetails}>
                            <Text style={styles.driverName}>{driver.name}</Text>
                            <Text style={styles.driverMobile}>{driver.mobile}</Text>
                          </View>
                        </View>
                        {selectedNewDriver === driver._id && (
                          <CheckCircle2 size={20} color="#2563EB" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowReassignModal(false);
                      setSelectedDeclinedParcel(null);
                      setSelectedNewDriver("");
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      !selectedNewDriver && styles.disabledButton
                    ]}
                    onPress={handleReassignTrip}
                    disabled={!selectedNewDriver || reassignLoading}
                  >
                    {reassignLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Reassign Driver</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Parcel Detail Modal */}
      <Modal visible={!!selectedParcelDetail} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Parcel Details</Text>
              <TouchableOpacity onPress={() => setSelectedParcelDetail(null)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedParcelDetail && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Tracking ID</Text>
                  <Text style={styles.detailValue}>{selectedParcelDetail.trackingId}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Recipient</Text>
                  <Text style={styles.detailValue}>{selectedParcelDetail.recipient?.name}</Text>
                  <Text style={styles.detailValue}>{selectedParcelDetail.recipient?.address}</Text>
                  <Text style={styles.detailValue}>{selectedParcelDetail.recipient?.phone}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Parcel Info</Text>
                  <Text style={styles.detailValue}>Weight: {selectedParcelDetail.weight} kg</Text>
                  <Text style={styles.detailValue}>Type: {selectedParcelDetail.type}</Text>
                  <Text style={styles.detailValue}>Amount: ₹{selectedParcelDetail.paymentAmount}</Text>
                </View>

                {selectedParcelDetail.sender && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Sender</Text>
                    <Text style={styles.detailValue}>{selectedParcelDetail.sender.name}</Text>
                    <Text style={styles.detailValue}>{selectedParcelDetail.sender.address}</Text>
                    <Text style={styles.detailValue}>{selectedParcelDetail.sender.phone}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerRight: {
    width: 24,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#2563EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  parcelCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    padding: 12,
  },
  parcelCardSelected: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  checkboxContainer: {
    marginRight: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  checkboxChecked: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    borderRadius: 12,
  },
  parcelInfoContainer: {
    flex: 1,
  },
  parcelInfo: {
    flex: 1,
  },
  parcelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  parcelName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  declinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  declinedText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "500",
    color: "#DC2626",
  },
  parcelDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  destinationItem: {
    flex: 2,
  },
  destinationLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 4,
  },
  destinationText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  declinedInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  declinedDriverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  declinedDriverText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
  },
  reassignButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reassignButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  weightText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  nextButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  detailModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
    marginTop: 16,
  },
  selectionList: {
    maxHeight: 120,
    marginBottom: 10,
  },
  selectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  selectedItem: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  driverDetails: {
    marginLeft: 12,
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  driverMobile: {
    fontSize: 12,
    color: "#6B7280",
  },
  vehicleInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vehicleDetails: {
    marginLeft: 12,
    flex: 1,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  vehicleModel: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  detailSection: {
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  vehicleInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  vehicleInfoLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  vehicleInfoValue: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "600",
    marginTop: 2,
  },
  declinedDriverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  declinedDriverLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  declinedDriverValue: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 2,
  },
});

export default SelectingParcelScreen;