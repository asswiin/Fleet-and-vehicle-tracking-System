import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle as LucideCircle,
  MapPin, 
  RefreshCw, 
} from "lucide-react-native";
import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { api, Driver } from "../../utils/api";
import { MapView, Marker, Circle, PROVIDER_DEFAULT, isMapAvailable, WebMapFallback } from "../../components/MapViewWrapper";

type MapViewType = typeof MapView;

// ==================================================
// 📍 CONFIGURATION
// ==================================================
const OFFICE_LOCATION = {
  latitude: 11.312394,
  longitude: 75.951408,
  name: "College Location"
};
const WAREHOUSE_LOCATION = {
  latitude:11.6239440, 
  longitude: 76.0707980,
  name: "Home Location"
};
const ALLOWED_RADIUS_METERS = 500; 
// ==================================================

interface PunchRecord {
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
}

const PunchingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const driverId = params.driverId as string;
  const mapRef = useRef<MapViewType>(null);

  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [punchHistory, setPunchHistory] = useState<PunchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // --- LOCATION STATE ---
  const [currentAddress, setCurrentAddress] = useState<string>("Fetching location...");
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);
  const [isInsideOffice, setIsInsideOffice] = useState<boolean | null>(null);
  const [nearestLocation, setNearestLocation] = useState<string | null>(null);

  useEffect(() => {
    fetchDriver();
    fetchPunchHistory();
    getCurrentLocation(); 
  }, []);

  const fetchDriver = async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      const res = await api.getDriver(driverId);
      if (res.ok && res.data) setDriverData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPunchHistory = async () => {
    if (!driverId) return;
    try {
      const res = await api.getPunchHistory(driverId);
      if (res.ok && res.data) {
        const history = Array.isArray(res.data) ? res.data : [];
        setPunchHistory(history);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- 🌍 LOCATION LOGIC ---

  const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const isWithinAllowedLocation = (lat: number, lon: number): { isAllowed: boolean; location: string | null } => {
    const distToOffice = getDistanceFromLatLonInMeters(lat, lon, OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude);
    const distToWarehouse = getDistanceFromLatLonInMeters(lat, lon, WAREHOUSE_LOCATION.latitude, WAREHOUSE_LOCATION.longitude);
    
    const minDistance = Math.min(distToOffice, distToWarehouse);
    const location = distToOffice < distToWarehouse ? OFFICE_LOCATION.name : WAREHOUSE_LOCATION.name;
    
    return {
      isAllowed: minDistance <= ALLOWED_RADIUS_METERS,
      location: minDistance <= ALLOWED_RADIUS_METERS ? location : null
    };
  };

  const getCurrentLocation = async () => {
    setIsLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentAddress("Permission Denied");
        setIsLocationLoading(false);
        return;
      }

      // Use Balanced accuracy with timeout for faster location fetch
      // High accuracy can take 30+ seconds on some devices
      let location;
      try {
        location = await Promise.race([
          Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 10000)
          )
        ]);
      } catch (timeoutError) {
        // If balanced accuracy times out, try with lower accuracy
        console.log("Trying with lower accuracy...");
        location = await Location.getLastKnownPositionAsync();
        if (!location) {
          location = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Low 
          });
        }
      }
      
      if (!location) {
        setCurrentAddress("Could not get location");
        setIsLocationLoading(false);
        return;
      }
      
      const newCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setCurrentCoords(newCoords);

      // Calculate distances to both locations
      const distToOffice = getDistanceFromLatLonInMeters(
        location.coords.latitude,
        location.coords.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );
      const distToWarehouse = getDistanceFromLatLonInMeters(
        location.coords.latitude,
        location.coords.longitude,
        WAREHOUSE_LOCATION.latitude,
        WAREHOUSE_LOCATION.longitude
      );
      
      const minDistance = Math.min(distToOffice, distToWarehouse);
      const nearestLoc = distToOffice < distToWarehouse ? OFFICE_LOCATION.name : WAREHOUSE_LOCATION.name;
      
      setDistanceToOffice(minDistance);
      setNearestLocation(nearestLoc);
      setIsInsideOffice(minDistance <= ALLOWED_RADIUS_METERS);

      // Animate map to new location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...newCoords,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }

      // Reverse Geocode
      let addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (addressResponse.length > 0) {
        const addr = addressResponse[0];
        const formatted = [addr.street, addr.city, addr.region].filter(Boolean).join(", ");
        setCurrentAddress(formatted || "Unknown Location");
      } else {
        setCurrentAddress("Address not found");
      }

    } catch (error) {
      console.log(error);
      setCurrentAddress("GPS Unavailable");
    } finally {
      setIsLocationLoading(false);
    }
  };

  const verifyLocationForPunch = async (): Promise<boolean> => {
    try {
      // Use Balanced accuracy with timeout for faster verification
      let location;
      try {
        location = await Promise.race([
          Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 10000)
          )
        ]);
      } catch (timeoutError) {
        // Fallback to last known position or low accuracy
        location = await Location.getLastKnownPositionAsync();
        if (!location) {
          location = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Low 
          });
        }
      }
      
      if (!location) {
        Alert.alert("GPS Error", "Could not get your location. Please try again.");
        return false;
      }
      
      const distToOffice = getDistanceFromLatLonInMeters(
        location.coords.latitude,
        location.coords.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );
      
      const distToWarehouse = getDistanceFromLatLonInMeters(
        location.coords.latitude,
        location.coords.longitude,
        WAREHOUSE_LOCATION.latitude,
        WAREHOUSE_LOCATION.longitude
      );

      const minDistance = Math.min(distToOffice, distToWarehouse);
      const location_name = distToOffice < distToWarehouse ? OFFICE_LOCATION.name : WAREHOUSE_LOCATION.name;

      if (minDistance > ALLOWED_RADIUS_METERS) {
        Alert.alert(
          "Out of Range",
          `You are ${Math.round(minDistance)}m away from ${location_name}.\nMust be within ${ALLOWED_RADIUS_METERS}m of either location.`
        );
        return false;
      }
      return true;
    } catch (e) {
      Alert.alert("GPS Error", "Could not verify location.");
      return false;
    }
  };

  // -------------------------

  const isSameDay = (d1: Date, d2String: string) => {
    if (!d2String) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2String);
    
    // Compare using local date components to handle timezone differences properly
    // Both dates are compared in their local representation
    const d1Year = date1.getFullYear();
    const d1Month = date1.getMonth();
    const d1Day = date1.getDate();
    
    const d2Year = date2.getFullYear();
    const d2Month = date2.getMonth();
    const d2Day = date2.getDate();
    
    return d1Year === d2Year && d1Month === d2Month && d1Day === d2Day;
  };

  const isPunchedInOnDate = (date: Date): boolean => {
    return punchHistory.some((record) => isSameDay(date, record.date) && !!record.punchInTime);
  };

  const isPunchedOutOnDate = (date: Date): boolean => {
    return punchHistory.some((record) => isSameDay(date, record.date) && !!record.punchOutTime);
  };

  const getPunchInTimeForDate = (date: Date): string | null => {
    const record = punchHistory.find((r) => isSameDay(date, r.date));
    if (record?.punchInTime) {
      return new Date(record.punchInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
    return null;
  };

  const getPunchOutTimeForDate = (date: Date): string | null => {
    const record = punchHistory.find((r) => isSameDay(date, r.date));
    if (record?.punchOutTime) {
      return new Date(record.punchOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }
    return null;
  };

  const handlePunch = async () => {
    if (!driverId) return;
    setPunchLoading(true);

    const isValid = await verifyLocationForPunch();
    if (!isValid) {
      setPunchLoading(false);
      return;
    }

    try {
      const res = await api.punchDriver(driverId);
      if (res.ok) {
        await fetchPunchHistory(); 
        await fetchDriver();
        Alert.alert("Success", "Punched in successfully!");
      } else {
        Alert.alert("Info", res.error || "Could not punch in");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to punch in");
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!driverId) return;
    setPunchLoading(true);

    const isValid = await verifyLocationForPunch();
    if (!isValid) {
      setPunchLoading(false);
      return;
    }

    try {
      const res = await api.punchOutDriver(driverId);
      if (res.ok) {
        await fetchPunchHistory();
        await fetchDriver();
        Alert.alert("Success", "Punched out successfully! Shift Ended.");
      } else {
        Alert.alert("Info", res.error || "Could not punch out");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to punch out");
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePrevDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    if (newDate > new Date()) setSelectedDate(new Date());
    else setSelectedDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const driverName = driverData?.name || "Driver";
  const initials = driverName.substring(0, 2).toUpperCase();
  const dateDisplay = selectedDate.toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "short", day: "numeric",
  });

  const punchedIn = isPunchedInOnDate(selectedDate);
  const punchedOut = isPunchedOutOnDate(selectedDate);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
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
        <Text style={styles.headerTitle}>Punching Record</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Driver Header */}
        <View style={styles.driverCard}>
          <View style={styles.avatar}>
            {driverData?.profilePhoto ? (
              <Image source={{ uri: api.getImageUrl(driverData.profilePhoto) || "" }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.driverDetail}>{driverData?.license || "License"}</Text>
        </View>

        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={handlePrevDate} style={styles.dateButton}>
            <ChevronLeft size={24} color="#2563EB" />
          </TouchableOpacity>
          <View style={styles.dateInfo}>
            <Text style={styles.dateText}>{dateDisplay}</Text>
            {isToday(selectedDate) && <Text style={styles.todayBadge}>Today</Text>}
          </View>
          <TouchableOpacity onPress={handleNextDate} disabled={isToday(selectedDate)} style={[styles.dateButton, isToday(selectedDate) && { opacity: 0.5 }]}>
            <ChevronRight size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* MAP VIEW CARD */}
        {isToday(selectedDate) && (
          <View style={styles.mapCard}>
             <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>Verification Location</Text>
                <TouchableOpacity onPress={getCurrentLocation} disabled={isLocationLoading}>
                    {isLocationLoading ? <ActivityIndicator size="small" color="#2563EB"/> : <RefreshCw size={16} color="#2563EB" />}
                </TouchableOpacity>
             </View>
             
             <View style={styles.mapContainer}>
                {!isMapAvailable ? (
                  <WebMapFallback style={styles.map} />
                ) : currentCoords ? (
                  <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={{
                      ...currentCoords,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    {/* Office Marker */}
                    <Marker coordinate={OFFICE_LOCATION} title={OFFICE_LOCATION.name} pinColor="red" />
                    
                    {/* Office Allowed Radius */}
                    <Circle 
                      center={OFFICE_LOCATION} 
                      radius={ALLOWED_RADIUS_METERS} 
                      fillColor="rgba(239, 68, 68, 0.1)" 
                      strokeColor="rgba(239, 68, 68, 0.5)" 
                    />

                    {/* Warehouse Marker */}
                    <Marker coordinate={WAREHOUSE_LOCATION} title={WAREHOUSE_LOCATION.name} pinColor="orange" />
                    
                    {/* Warehouse Allowed Radius */}
                    <Circle 
                      center={WAREHOUSE_LOCATION} 
                      radius={ALLOWED_RADIUS_METERS} 
                      fillColor="rgba(249, 115, 22, 0.1)" 
                      strokeColor="rgba(249, 115, 22, 0.5)" 
                    />

                    {/* Driver Position */}
                    <Marker coordinate={currentCoords} title="You" pinColor="blue" />
                  </MapView>
                ) : (
                  <View style={styles.mapPlaceholder}>
                     <ActivityIndicator size="large" color="#94A3B8" />
                     <Text style={{color:"#94A3B8", marginTop: 10}}>Loading Map...</Text>
                  </View>
                )}
             </View>
             
             <View style={styles.addressContainer}>
                <MapPin size={16} color="#64748B" style={{marginRight: 6}} />
                <Text style={styles.addressText} numberOfLines={1}>{currentAddress}</Text>
             </View>
          </View>
        )}

        {/* Location Status Card */}
        {isInsideOffice !== null && isToday(selectedDate) && (
          <View style={[
            styles.locationStatusCard,
            isInsideOffice ? styles.locationInsideCard : styles.locationOutsideCard
          ]}>
            <View style={styles.locationStatusContent}>
              <View style={[
                styles.locationStatusIcon,
                isInsideOffice ? styles.locationInsideIcon : styles.locationOutsideIcon
              ]}>
                <MapPin size={24} color={isInsideOffice ? "#10B981" : "#EF4444"} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[
                  styles.locationStatusTitle,
                  isInsideOffice ? { color: "#10B981" } : { color: "#EF4444" }
                ]}>
                  {isInsideOffice ? "Inside Allowed Area" : "Outside Allowed Area"}
                </Text>
                <Text style={styles.locationStatusDistance}>
                  {distanceToOffice ? `${Math.round(distanceToOffice)}m from ${nearestLocation}` : "Calculating..."} • {isInsideOffice ? "✓ Can Punch" : "✗ Cannot Punch"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Status Card */}
        <View style={[
          styles.statusCard,
          punchedOut ? styles.statusCompleted : punchedIn ? styles.statusPunched : styles.statusNotPunched
        ]}>
          <View style={styles.statusContent}>
            {punchedOut ? (
              <>
                <CheckCircle size={48} color="#10B981" strokeWidth={1.5} />
                <Text style={styles.statusTitle}>Shift Completed</Text>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>In: {getPunchInTimeForDate(selectedDate)}</Text>
                  <Text style={styles.timeLabel}>Out: {getPunchOutTimeForDate(selectedDate)}</Text>
                </View>
              </>
            ) : punchedIn ? (
              <>
                <CheckCircle size={48} color="#F59E0B" strokeWidth={1.5} />
                <Text style={styles.statusTitle}>Punched In</Text>
                <Text style={styles.punchTimeText}>At {getPunchInTimeForDate(selectedDate)}</Text>
              </>
            ) : (
              <>
                <LucideCircle size={48} color="#CBD5E1" strokeWidth={1.5} />
                <Text style={styles.statusTitle}>Not Punched</Text>
                <Text style={styles.statusSubtitle}>You must be inside the blue circle</Text>
              </>
            )}
          </View>
        </View>

        {isToday(selectedDate) && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.punchButton,
                (punchLoading || punchedIn) && styles.punchButtonDisabled,
                { flex: 1, marginRight: 10 },
              ]}
              onPress={handlePunch}
              disabled={punchLoading || punchedIn}
              activeOpacity={0.8}
            >
              {punchLoading && !punchedIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.punchButtonText}>
                   {punchedIn ? "PUNCHED IN" : "PUNCH IN"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.punchOutButton,
                (punchLoading || !punchedIn || punchedOut) && styles.punchOutButtonDisabled,
                { flex: 1, marginLeft: 10 },
              ]}
              onPress={handlePunchOut}
              disabled={punchLoading || !punchedIn || punchedOut}
              activeOpacity={0.8}
            >
              {punchLoading && punchedIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.punchOutButtonText}>
                   {punchedOut ? "SHIFT ENDED" : "PUNCH OUT"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  container: { flex: 1 },
  driverCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#2563EB",
    justifyContent: "center", alignItems: "center", marginBottom: 16,
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40, resizeMode: "cover" },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#fff" },
  driverName: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  driverDetail: { fontSize: 14, color: "#64748B" },
  dateSelector: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  dateButton: { padding: 8 },
  dateInfo: { alignItems: "center", flex: 1 },
  dateText: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  todayBadge: { fontSize: 11, fontWeight: "600", color: "#10B981", marginTop: 4 },

  // Location Status Card Styles
  locationStatusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  locationInsideCard: {
    backgroundColor: "#ECFDF5",
    borderLeftColor: "#10B981",
  },
  locationOutsideCard: {
    backgroundColor: "#FEF2F2",
    borderLeftColor: "#EF4444",
  },
  locationStatusContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  locationInsideIcon: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  locationOutsideIcon: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  locationStatusTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  locationStatusDistance: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  // Map Styles
  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  mapTitle: { fontSize: 13, fontWeight: "700", color: "#64748B", textTransform: "uppercase" },
  mapContainer: {
    height: 200,
    width: "100%",
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9"
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  addressText: {
    fontSize: 13,
    color: "#334155",
    flex: 1
  },

  statusCard: {
    borderRadius: 16, padding: 24, marginBottom: 24, alignItems: "center", justifyContent: "center", minHeight: 180,
  },
  statusPunched: { backgroundColor: "#ECFDF5", borderLeftWidth: 4, borderLeftColor: "#10B981" },
  statusCompleted: { backgroundColor: "#DBEAFE", borderLeftWidth: 4, borderLeftColor: "#0EA5E9" },
  statusNotPunched: { backgroundColor: "#F8FAFC", borderLeftWidth: 4, borderLeftColor: "#CBD5E1" },
  statusContent: { alignItems: "center" },
  statusTitle: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginTop: 12, marginBottom: 4 },
  statusSubtitle: { fontSize: 14, color: "#64748B", textAlign: "center" },
  punchTimeText: { fontSize: 14, color: "#10B981", fontWeight: "600" },
  timeRow: { marginTop: 8, alignItems: "center" },
  timeLabel: { fontSize: 13, color: "#475569", fontWeight: "500", marginTop: 4 },
  buttonContainer: { flexDirection: "row", marginBottom: 16 },
  punchButton: {
    backgroundColor: "#2563EB", borderRadius: 12, padding: 16, alignItems: "center", justifyContent: "center",
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  punchButtonDisabled: { opacity: 0.5, backgroundColor: "#94A3B8" },
  punchButtonText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  punchOutButton: {
    backgroundColor: "#EF4444", borderRadius: 12, padding: 16, alignItems: "center", justifyContent: "center",
    shadowColor: "#EF4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  punchOutButtonDisabled: { opacity: 0.5, backgroundColor: "#94A3B8" },
  punchOutButtonText: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
});

export default PunchingScreen;

