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
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { api } from "../../utils/api";
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
} from "lucide-react-native";

const { width } = Dimensions.get("window");

const VehicleDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId: string; userRole: string; userName: string }>();

  const userRole = params.userRole || "admin";
  const vehicleId = params.vehicleId;

  const [vehicle, setVehicle] = useState<any>({});
  const [loading, setLoading] = useState(true);

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

  const handleMarkAsSold = async () => {
    Alert.alert("Confirm Sale", "Are you sure you want to mark this vehicle as sold?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm Sold", style: "destructive", onPress: async () => {
          if (!vehicle._id) return;
          try {
            setLoading(true);
            const res = await api.updateVehicleStatus(vehicle._id, "Sold");
            if (res.ok) fetchVehicle();
          } catch (e) { Alert.alert("Error", "Action failed"); } finally { setLoading(false); }
        }
      }
    ]);
  };

  const handleEdit = () => {
    router.push({
      pathname: "/admin/edit-vehicle",
      params: { vehicleData: JSON.stringify(vehicle) }
    } as any);
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
          {vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0 ? (
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
            {(userRole === 'manager' || userRole === 'admin') && (
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
            <SpecItem icon={Tag} label="Brand" value={vehicle.brand || "N/A"} />
          </View>

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
            />
            <DocRow
              icon={AlertCircle}
              label="Pollution Control"
              date={getPollutionDate()}
              status={getExpiryStatus(getPollutionDate())}
            />
            <DocRow
              icon={Tag}
              label="Road Tax Payment"
              date={getTaxDate()}
              status={getExpiryStatus(getTaxDate())}
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
                    userName: params.userName
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

const DocRow = ({ icon: Icon, label, date, status, isLast }: any) => {
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

  const formattedDate = date ? parseDateLocal(date)?.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : 'Not Set';

  return (
    <View style={[styles.docRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.docIconCircle, { backgroundColor: status.bg }]}>
        <status.icon size={18} color={status.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.docLabelName}>{label}</Text>
        <Text style={styles.docDateVal}>Expires: {formattedDate}</Text>
      </View>
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
});

export default VehicleDetailsScreen;


