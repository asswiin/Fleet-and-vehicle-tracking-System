import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { api } from "../../utils/api";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  ChevronLeft,
  Truck,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  History,
  Tag,
  Edit2,
  Calendar,
  Layers,
  Weight,
  Wrench,
  Ban,
  ExternalLink,
  User,
  MapPin,
  Phone,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

const VehicleDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId: string; userRole: string; userName: string }>();

  const userRole = params.userRole || "admin";
  const vehicleId = params.vehicleId;

  const [vehicle, setVehicle] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateType, setSelectedDateType] = useState<'insurance' | 'pollution' | 'tax' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());

  const fetchVehicle = async () => {
    if (!vehicleId) return;
    try {
      const res = await api.getVehicle(vehicleId);
      if (res.ok && res.data) {
        setVehicle(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicle();
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      fetchVehicle();
    }, [vehicleId])
  );

  const parseDate = (dateInput?: string): Date | null => {
    if (!dateInput) return null;
    if (dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) return date;
    return null;
  };

  const formatDateForDisplay = (dateInput?: string) => {
    const date = parseDate(dateInput);
    if (!date) return "Not Set";
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getRemainingTime = (dateInput?: string) => {
    const date = parseDate(dateInput);
    if (!date) return "Not Set";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return "Expired";

    let years = date.getFullYear() - today.getFullYear();
    let months = date.getMonth() - today.getMonth();
    let days = date.getDate() - today.getDate();

    if (days < 0) {
      months--;
      const lastDay = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
      days += lastDay;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (days > 0) parts.push(`${days}d`);

    return parts.length > 0 ? parts.join(' ') : 'Today';
  };

  const getExpiryStatus = (dateInput?: string) => {
    const date = parseDate(dateInput);
    if (!date) return { text: "Not Set", color: "#94A3B8", bg: "#F1F5F9", icon: AlertCircle };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return { text: "Expired", color: "#EF4444", bg: "#FEF2F2", icon: AlertTriangle };

    const tenDaysFromNow = new Date(today);
    tenDaysFromNow.setDate(today.getDate() + 10);

    if (date <= tenDaysFromNow) return { text: "Near Expiry", color: "#F59E0B", bg: "#FFFBEB", icon: AlertTriangle };

    return { text: "Valid", color: "#10B981", bg: "#ECFDF5", icon: FileCheck };
  };

  const hasExpiringDocs = () => {
    return (
      getExpiryStatus(getInsuranceDate()).text !== "Valid" ||
      getExpiryStatus(getPollutionDate()).text !== "Valid" ||
      getExpiryStatus(getTaxDate()).text !== "Valid"
    );
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'Active': return { label: 'Available', color: '#10B981', bg: '#ECFDF5' };
      case 'On-trip': return { label: 'On Trip', color: '#0EA5E9', bg: '#F0F9FF' };
      case 'In-Service': return { label: 'In Service', color: '#F59E0B', bg: '#FFFBEB' };
      case 'Sold': return { label: 'Sold', color: '#EF4444', bg: '#FEF2F2' };
      default: return { label: 'Inactive', color: '#94A3B8', bg: '#F8FAFC' };
    }
  };

  const statusConfig = getStatusConfig(vehicle.status);
  const getTaxDate = () => vehicle.taxExpiry || vehicle.taxDate || vehicle.roadTaxExpiry;
  const getInsuranceDate = () => vehicle.insuranceExpiry || vehicle.insuranceDate || vehicle.insurance_date;
  const getPollutionDate = () => vehicle.pollutionExpiry || vehicle.pollutionDate || vehicle.pollution_date;
  const getCapacity = () => vehicle.capacity || vehicle.weight || vehicle.weightCapacity;

  const handleMarkAsSold = () => {
    router.push({
      pathname: "/manager/sale-form" as any,
      params: {
        vehicleId: vehicle._id,
        vehicleReg: vehicle.regNumber,
        vehicleModel: vehicle.model,
      },
    });
  };

  const handleEdit = () => {
    router.push({
      pathname: "/admin/edit-vehicle",
      params: { vehicleData: JSON.stringify(vehicle) }
    } as any);
  };

  const handleEditDocument = (docType: 'insurance' | 'pollution' | 'tax') => {
    setSelectedDateType(docType);
    setTempDate(new Date());
    setShowDatePicker(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setTempDate(date);
  };

  const handleConfirmDate = async (dateToConfirm?: Date) => {
    if (!selectedDateType) return;

    const finalDate = dateToConfirm || tempDate;
    const formattedDateForDisplay = finalDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const formattedDateForBackend = finalDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).split('/').join('/'); // DD/MM/YYYY format

    try {
      const updateData: any = {};
      if (selectedDateType === 'insurance') updateData.insuranceDate = formattedDateForBackend;
      else if (selectedDateType === 'pollution') updateData.pollutionDate = formattedDateForBackend;
      else if (selectedDateType === 'tax') updateData.taxDate = formattedDateForBackend;

      const res = await api.updateVehicle(vehicle._id, updateData);
      if (res.ok) {
        Alert.alert('Success', `Document date successfully updated to ${formattedDateForDisplay}`);
        fetchVehicle();
        setShowDatePicker(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update document date');
    }
  };

  const handleMarkAsService = () => {
    router.push({
      pathname: "/manager/report-vehicle-service" as any,
      params: {
        vehicleId: vehicle._id,
        vehicleReg: vehicle.regNumber,
        reporterName: params.userName || "Manager",
        reporterRole: "Manager",
      },
    });
  };

  if (loading && !vehicle.regNumber) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header & Gallery Section */}
        <View style={styles.heroSection}>
          {vehicle.profilePhoto ? (
            <Image 
              source={{ uri: api.getImageUrl(vehicle.profilePhoto)! }} 
              style={styles.heroImage} 
            />
          ) : vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {vehicle.vehiclePhotos.map((photo: string, i: number) => (
                <Image key={i} source={{ uri: api.getImageUrl(photo)! }} style={styles.heroImage} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.heroPlaceholder}>
              <Truck size={80} color="rgba(255,255,255,0.2)" />
            </View>
          )}

          <View style={styles.heroOverlayHeader}>
            <TouchableOpacity style={styles.glassCircle} onPress={() => router.back()}>
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            {(userRole === 'manager' || userRole === 'admin') && vehicle.status !== "Sold" && (
              <TouchableOpacity style={styles.glassCircle} onPress={handleEdit}>
                <Edit2 size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroTitleBox}>
            <View style={[styles.statusTag, { backgroundColor: statusConfig.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
            <Text style={styles.regNumberHero}>{vehicle.regNumber}</Text>
            <Text style={styles.modelHero}>{vehicle.model || "Unknown Model"}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {hasExpiringDocs() && (
            <View style={styles.warningBanner}>
              <View style={styles.warningIconCircle}>
                <AlertTriangle size={20} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Action Required</Text>
                <Text style={styles.warningSub}>Document(s) expiring soon or expired.</Text>
              </View>
            </View>
          )}

          {/* Specifications Card */}
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.gridContainer}>
            <SpecItem icon={Layers} label="Type" value={vehicle.type || "N/A"} />
            <SpecItem icon={Weight} label="Payload" value={getCapacity() ? `${getCapacity()} Kg` : "N/A"} />
            <SpecItem icon={Calendar} label="Reg Date" value={vehicle.createdAt ? formatDateForDisplay(vehicle.createdAt) : "N/A"} />
          </View>

          {/* Vehicle Photos Gallery */}
          {vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Vehicle Gallery</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.photoGallery}
              >
                {vehicle.vehiclePhotos.map((photo: string, index: number) => (
                  <View key={index} style={styles.photoGalleryItem}>
                    <Image 
                      source={{ uri: api.getImageUrl(photo)! }} 
                      style={styles.galleryImage}
                    />
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Document Management */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Compliance Docs</Text>
          </View>

          <View style={styles.docListCard}>
            <DocRow
              icon={FileCheck}
              label="Insurance Policy"
              date={getInsuranceDate()}
              status={getExpiryStatus(getInsuranceDate())}
              onEdit={() => handleEditDocument('insurance')}
              showEdit={userRole === 'manager' || userRole === 'admin'}
            />
            <DocRow
              icon={AlertCircle}
              label="Pollution Control"
              date={getPollutionDate()}
              status={getExpiryStatus(getPollutionDate())}
              onEdit={() => handleEditDocument('pollution')}
              showEdit={userRole === 'manager' || userRole === 'admin'}
            />
            <DocRow
              icon={Tag}
              label="Road Tax Payment"
              date={getTaxDate()}
              status={getExpiryStatus(getTaxDate())}
              onEdit={() => handleEditDocument('tax')}
              showEdit={userRole === 'manager' || userRole === 'admin'}
              isLast
            />
          </View>

          {/* Business Insights */}
          <Text style={styles.sectionTitle}>Fleet Activity</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.activityButton}
              onPress={() => {
                router.push({
                  pathname: "/manager/vehicle-history" as any,
                  params: { vehicleId: vehicle._id, vehicleReg: vehicle.regNumber, vehicleModel: vehicle.model }
                });
              }}
            >
              <View style={[styles.actIconBox, { backgroundColor: '#E0F2FE' }]}>
                <History size={22} color="#0369A1" />
              </View>
              <Text style={styles.actLabel}>Trip History</Text>
              <ChevronLeft size={16} color="#94A3B8" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.activityButton}
              onPress={() => {
                router.push({
                  pathname: "/manager/vehicle-service-history" as any,
                  params: {
                    vehicleId: vehicle._id,
                    vehicleReg: vehicle.regNumber,
                    vehicleModel: vehicle.model,
                    userName: params.userName,
                    vehicleStatus: vehicle.status,
                  }
                });
              }}
            >
              <View style={[styles.actIconBox, { backgroundColor: '#F0F9FF' }]}>
                <Wrench size={22} color="#0EA5E9" />
              </View>
              <Text style={styles.actLabel}>Maintenance</Text>
              <ChevronLeft size={16} color="#94A3B8" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          </View>

          {/* Sale details if Sold */}
          {vehicle.status === "Sold" && vehicle.saleDetails && (
            <>
              <Text style={styles.sectionTitle}>Sale Information</Text>
              <View style={styles.docListCard}>
                <View style={styles.docRow}>
                  <View style={[styles.docIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <User size={18} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docLabelName}>Buyer Name</Text>
                    <Text style={styles.docDateVal}>{vehicle.saleDetails.buyerName || 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.docRow}>
                  <View style={[styles.docIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <MapPin size={18} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docLabelName}>Buyer Address</Text>
                    <Text style={styles.docDateVal}>{vehicle.saleDetails.buyerAddress || 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.docRow}>
                  <View style={[styles.docIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <Phone size={18} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docLabelName}>Buyer contact</Text>
                    <Text style={styles.docDateVal}>{vehicle.saleDetails.buyerContact || 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.docRow}>
                  <View style={[styles.docIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <Calendar size={18} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docLabelName}>Sale Date</Text>
                    <Text style={styles.docDateVal}>{formatDateForDisplay(vehicle.saleDetails.saleDate)}</Text>
                  </View>
                </View>
                <View style={[styles.docRow, { borderBottomWidth: 0 }]}>
                  <View style={[styles.docIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <Tag size={18} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docLabelName}>Sale Price</Text>
                    <Text style={styles.docDateVal}>₹{vehicle.saleDetails.salePrice || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Management Actions */}
          {userRole === "manager" && vehicle.status !== "Sold" && (
            <View style={styles.managementFrame}>
              <TouchableOpacity style={styles.primaryAction} onPress={handleMarkAsService}>
                <Wrench size={20} color="#fff" />
                <Text style={styles.primaryActionText}>Report Service Required</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryAction} onPress={handleMarkAsSold}>
                <Ban size={20} color="#EF4444" />
                <Text style={styles.secondaryActionText}>Mark Vehicle as Decommissioned</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>Internal ID: {vehicle._id?.slice(-8).toUpperCase()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal for iOS */}
      <Modal
        visible={showDatePicker && Platform.OS === 'ios'}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerModalContainer}>
          <View style={styles.datePickerContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {selectedDateType === 'insurance' ? 'Update Insurance' : selectedDateType === 'pollution' ? 'Update Pollution' : 'Update Road Tax'}
              </Text>
              <Text style={styles.datePickerSelectedPreview}>
                Selected: {tempDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={new Date(new Date().getFullYear() + 10, 11, 31)}
            />
            <View style={styles.datePickerActions}>
              <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerConfirm} onPress={() => handleConfirmDate()}>
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker for Android */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setTempDate(date);
              // Pass the date directly to avoid stale closure state issues
              setTimeout(() => handleConfirmDate(date), 100);
            }
          }}
          maximumDate={new Date(new Date().getFullYear() + 10, 11, 31)}
        />
      )}
    </SafeAreaView>
  );
};

const SpecItem = ({ icon: Icon, label, value }: any) => (
  <View style={styles.specBox}>
    <View style={styles.specIconFrame}>
      <Icon size={18} color="#6366F1" />
    </View>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={styles.specValue}>{value}</Text>
  </View>
);

const DocRow = ({ icon: Icon, label, date, status, isLast, onEdit, showEdit }: any) => {
  const parseDateLocal = (dateInput?: string): Date | null => {
    if (!dateInput) return null;
    if (dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  const getRemainingTimeLocal = (dateInput?: string) => {
    const expiryDate = parseDateLocal(dateInput);
    if (!expiryDate) return "Not Set";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryDate < today) return "Expired";

    let years = expiryDate.getFullYear() - today.getFullYear();
    let months = expiryDate.getMonth() - today.getMonth();
    let days = expiryDate.getDate() - today.getDate();

    if (days < 0) {
      months--;
      const lastDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 0).getDate();
      days += lastDay;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (days > 0) parts.push(`${days}d`);

    return parts.length > 0 ? parts.join(' ') : 'Today';
  };

  const formattedDate = date ? parseDateLocal(date)?.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : 'Not Set';

  const remainingTime = getRemainingTimeLocal(date);

  return (
    <View style={[styles.docRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.docIconCircle, { backgroundColor: status.bg }]}>
        <status.icon size={18} color={status.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.docLabelName}>{label}</Text>
        <Text style={styles.docDateVal}>Expires: {formattedDate}</Text>
        {remainingTime !== 'Not Set' && (
          <Text style={[styles.docRemainingTime, { color: status.color }]}>
            {remainingTime === 'Expired' ? 'Expired' : `${remainingTime} remaining`}
          </Text>
        )}
      </View>
      {showEdit && (
        <TouchableOpacity style={styles.docEditBtn} onPress={onEdit}>
          <Edit2 size={16} color="#6366F1" />
        </TouchableOpacity>
      )}
      <View style={[styles.docStatusBadge, { backgroundColor: status.bg }]}>
        <Text style={[styles.docStatusText, { color: status.color }]}>{status.text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroSection: {
    height: 380,
    backgroundColor: "#1E293B",
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: 380,
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: width,
    height: 380,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlayHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  glassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTitleBox: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  regNumberHero: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modelHero: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  contentContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  warningIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  warningSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specBox: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  specIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
  },
  docListCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  docIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  docLabelName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  docDateVal: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  docRemainingTime: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  docStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  docStatusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  docEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionGrid: {
    gap: 12,
  },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  managementFrame: {
    marginTop: 32,
    gap: 12,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    height: 56,
    borderRadius: 20,
    gap: 10,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    gap: 10,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  footerInfo: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  photoGallery: {
    marginBottom: 24,
  },
  photoGalleryItem: {
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  galleryImage: {
    width: 160,
    height: 140,
    resizeMode: 'cover',
  },
  datePickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  datePickerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  datePickerSelectedPreview: {
    fontSize: 14,
    color: '#0EA5E9',
    marginTop: 4,
    fontWeight: '600',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  datePickerCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  datePickerConfirm: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default VehicleDetailsScreen;


