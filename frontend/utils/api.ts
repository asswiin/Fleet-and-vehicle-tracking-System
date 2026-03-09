

import Constants from "expo-constants";

// ==========================================
// 1. Interfaces & Types
// ==========================================

interface ApiResponse<T = any> {
  ok: boolean;
  status: number | null;
  data: T | null;
  error: string | null;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "driver";
  status?: "Active" | "Resigned";
  dob?: string;
  place?: string;
  profilePhoto?: string;
  address?: {
    house?: string;
    street?: string;
    city?: string;
    district?: string;
    state?: string;
  };
}

export interface Vehicle {
  [x: string]: any;
  _id: string;
  regNumber: string;
  model: string;
  type: string;
  weight?: string;
  status?: "Active" | "Sold" | "On-trip" | "In-Service";
  insuranceDate?: string;
  pollutionDate?: string;
  taxDate?: string;
  profilePhoto?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "driver";
}

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
}

interface CreateManagerData {
  name: string;
  email: string;
  phone: string;
  place: string;
  dob: string;
  address: {
    house: string;
    street: string;
    city: string;
    district: string;
    state: string;
  };
}

export interface Driver {
  _id: string;
  name: string;
  mobile: string;
  license: string;
  email?: string;
  status: string;
  driverStatus?: string; // e.g., 'available', 'pending', 'On-trip'
  gender?: "male" | "female" | "other";
  dob?: string;
  address?: {
    house?: string;
    street?: string;
    city?: string;
    district?: string;
    state?: string;
    zip?: string;
  };
  // NEW FIELDS
  profilePhoto?: string;
  licensePhoto?: string;
  createdAt?: string;
  isAvailable?: boolean;
  currentTripId?: string;
  punchHistory?: Array<{
    date: string;
    punchInTime?: string;
    punchOutTime?: string;
  }>;
}

export interface RegisterDriverData {
  name: string;
  mobile: string;
  email: string;
  license: string;
  gender: string;
  dob: string;
  address: {
    house: string;
    street: string;
    city: string;
    district: string;
    state: string;
    zip: string;
  };
}

export interface OngoingTrip {
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
  };
  progress?: number;
  trip: Trip;
  totalDistance?: number;
  totalDuration?: number;
}

export interface Parcel {
  _id: string;
  trackingId?: string;
  sender?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  recipient?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  weight?: number;
  type?: string;
  status?: string;
  paymentAmount?: number;
  date?: string;
  tripId?: string;
  assignedDriver?: string | {
    _id: string;
    name: string;
    mobile?: string;
    driverStatus?: string;
  };
  assignedVehicle?: string | {
    _id: string;
    regNumber: string;
    model?: string;
    type?: string;
  };
  declinedDriverId?: string;
  declinedDriverName?: string;
  deliveryLocation?: {
    latitude: number;
    longitude: number;
    order?: number;
    locationName?: string;
  };
}

export interface Notification {
  _id: string;
  driverId: string;
  vehicleId: {
    _id: string;
    regNumber: string;
    model: string;
    type: string;
    profilePhoto?: string;
  };
  parcelIds: Array<{
    _id: string;
    trackingId: string;
    recipient: {
      name: string;
      address: string;
    };
    weight: number;
    type: string;
  }>;
  tripId: string;
  type: string;
  status: string;
  recipientType: "driver" | "manager";
  message: string;
  read: boolean;
  createdAt: string;
  expiresAt: string;
  startLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocations?: Array<{
    locationName?: string;
    latitude: number;
    longitude: number;
    order?: number;
    parcelId?: string;
  }>;
  deliveredParcelId?: string | DeliveredParcel;
  declinedDriverId?: {
    _id: string;
    name: string;
    mobile?: string;
  };
}

export interface DeliveredParcel {
  _id: string;
  tripId: string;
  tripObjectId?: string;
  driver: {
    _id: string;
    name: string;
  };
  vehicle: {
    _id: string;
    regNumber: string;
    model: string;
    type: string;
  };
  trackId: string;
  parcelDetails: {
    weight: number;
    type: string;
    amount?: number;
  };
  sender?: {
    name: string;
    phone?: string;
    address: string;
  };
  recipient: {
    name: string;
    phone?: string;
    address: string;
  };
  deliveryLocation?: {
    latitude: number;
    longitude: number;
    locationName: string;
  };
  reachedTime: string;
  notes?: string;
}


export interface Trip {
  _id: string;
  tripId: string;
  driverId: {
    _id: string;
    name: string;
    mobile?: string;
    profilePhoto?: string;
  };
  vehicleId: {
    _id: string;
    regNumber: string;
    model?: string;
    type?: string;
    capacity?: string;
    profilePhoto?: string;
  };
  parcelIds: Array<{
    _id: string;
    trackingId: string;
    weight?: number;
    type?: string;
    status?: string;
    recipient: {
      name: string;
      address: string;
    };
  }>;
  status: string;
  startLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryDestinations: Array<{
    parcelId?: string;
    latitude: number;
    longitude: number;
    locationName: string;
    deliveryStatus: string;
    order: number;
    notes?: string;
    deliveredAt?: string;
  }>;
  sos: boolean;
  liveProgress?: number;
  totalWeight?: number;
  assignedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}


// ==========================================
// 2. Network Configuration
// ==========================================

// Auto-detect local backend IP if available, fallback to production
const debuggerHost = Constants.expoConfig?.hostUri || "";
const localhost = debuggerHost.split(":")[0];

// You can manually override this if needed
const DEV_URL = localhost ? `http://${localhost}:5000` : "http://localhost:5000";
const PROD_URL = "https://fleet-vehicle-backend.vercel.app";

// Set to TRUE for production, FALSE for local testing
const IS_PRODUCTION = true;

export const API_BASE_URL = IS_PRODUCTION ? PROD_URL : DEV_URL;

console.log("🚀 API Base URL:", API_BASE_URL);

// 2. Helper to handle responses safely
const handleResponse = async (response: Response) => {
  const text = await response.text(); // Get raw text first

  try {
    const data = JSON.parse(text); // Try to parse as JSON
    return {
      ok: response.ok,
      status: response.status,
      data: data.data || data.user || data,
      error: !response.ok ? data?.message || "Request failed" : null,
    };
  } catch (e) {
    // If JSON parse fails, it means we got HTML (Error page)
    console.error("❌ API JSON Parse Error. Raw Response:", text);
    return {
      ok: false,
      status: response.status,
      data: null,
      error: "Server error (Invalid JSON response). Check console for details.",
    };
  }
};

const apiCall = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return await handleResponse(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error";
    console.log(`❌ Connection Failed: ${url}`, errorMessage);
    return { ok: false, status: null, data: null, error: errorMessage };
  }
};

// 3. API Methods
const api = {
  getImageUrl: (path?: string) => {
    if (!path) return null;
    // If it's already a base64 string, return as is
    if (path.startsWith("data:")) return path;
    const cleanPath = path.replace(/\\/g, "/");
    return `${API_BASE_URL}/${cleanPath}`;
  },

  // USERS
  getUsers: () => apiCall("/api/users"),
  getUser: (id: string) => apiCall(`/api/users/${id}`),
  createUser: (data: any) => apiCall("/api/users", { method: "POST", body: JSON.stringify(data) }),

  // Ensure this PUT call matches the backend route
  updateUser: (id: string, data: any) =>
    apiCall(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // USER PROFILE IMAGE UPLOAD (Special Handling for Managers)
  updateUserProfileWithImage: async (id: string, payload: any) => {
    const url = `${API_BASE_URL}/api/users/${id}/profile`;
    const isFormData = payload instanceof FormData;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: isFormData ? {} : { "Content-Type": "application/json" },
        body: isFormData ? payload : JSON.stringify(payload),
      });
      return await handleResponse(response);
    } catch (error: any) {
      return { ok: false, status: 500, data: null, error: error.message };
    }
  },

  updateUserStatus: (id: string, status: string) =>
    apiCall(`/api/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  createManager: (data: any) => apiCall("/api/users/create-manager", { method: "POST", body: JSON.stringify(data) }),

  // AUTH
  login: (email: string, password: string) =>
    apiCall("/api/users/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data: any) =>
    apiCall("/api/users/register", { method: "POST", body: JSON.stringify(data) }),

  // VEHICLES
  getVehicles: () => apiCall("/api/vehicles"),
  getVehicle: (id: string) => apiCall(`/api/vehicles/${id}`),
  registerVehicle: (data: any) => apiCall("/api/vehicles/register", { method: "POST", body: JSON.stringify(data) }),
  updateVehicle: (id: string, data: any) => apiCall(`/api/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateVehicleStatus: (id: string, status: string) =>
    apiCall(`/api/vehicles/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  sellVehicle: (id: string, data: { buyerName: string, buyerAddress: string, buyerContact: string, saleDate: string, salePrice: string }) =>
    apiCall(`/api/vehicles/${id}/sell`, { method: "POST", body: JSON.stringify(data) }),
  getVehicleAlertsSummary: () => apiCall("/api/vehicles/alerts/summary"),

  // VEHICLE SERVICES
  createVehicleService: (data: any) => apiCall("/api/vehicle-services", { method: "POST", body: JSON.stringify(data) }),
  updateVehicleService: (id: string, data: any) => apiCall(`/api/vehicle-services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  getVehicleServiceHistory: (vehicleId: string) => apiCall(`/api/vehicle-services/vehicle/${vehicleId}`),
  getAllVehicleServices: () => apiCall("/api/vehicle-services"),
  getServiceAlertsCount: () => apiCall("/api/vehicle-services/alerts/count"),
  markVehicleServicesAsRead: () => apiCall("/api/vehicle-services/mark-all-read", { method: "POST" }),
  updateServiceStatus: (id: string, status: string) => apiCall(`/api/vehicle-services/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // DRIVERS
  getDrivers: () => apiCall("/api/drivers"),
  getDriver: (id: string) => apiCall(`/api/drivers/${id}`),
  createDriver: (data: any) => apiCall("/api/drivers/register", { method: "POST", body: JSON.stringify(data) }),
  updateDriver: (id: string, data: any) => apiCall(`/api/drivers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  punchDriver: (id: string) => {
    const now = new Date();
    return apiCall(`/api/drivers/${id}/punch`, {
      method: "POST",
      body: JSON.stringify({
        localDate: { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
      })
    });
  },
  punchOutDriver: (id: string) => {
    const now = new Date();
    return apiCall(`/api/drivers/${id}/punch-out`, {
      method: "POST",
      body: JSON.stringify({
        localDate: { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
      })
    });
  },
  getPunchHistory: (id: string) => apiCall(`/api/drivers/${id}/punch-history`, { method: "GET" }),
  checkLicenseExists: (license: string, excludeId?: string) =>
    apiCall(`/api/drivers/check-license/${license}${excludeId ? `?excludeId=${excludeId}` : ''}`),

  // DRIVER IMAGE UPLOAD (Special Handling)
  updateDriverProfileWithImage: async (id: string, payload: any) => {
    const url = `${API_BASE_URL}/api/drivers/${id}`;
    const isFormData = payload instanceof FormData;

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: isFormData ? {} : { "Content-Type": "application/json" },
        body: isFormData ? payload : JSON.stringify(payload),
      });
      return await handleResponse(response);
    } catch (error: any) {
      return { ok: false, status: 500, data: null, error: error.message };
    }
  },
  // PARCELS
  getParcels: () => apiCall<Parcel[]>("/api/parcels"),
  getParcel: (id: string) => apiCall<Parcel>(`/api/parcels/${id}`),
  getParcelByTrackingId: (trackingId: string) => apiCall<Parcel>(`/api/parcels/tracking/${trackingId}`),
  createParcel: (data: any) => apiCall("/api/parcels", { method: "POST", body: JSON.stringify(data) }),
  updateParcel: (id: string, data: any) => apiCall(`/api/parcels/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateParcelStatus: (id: string, status: string) =>
    apiCall(`/api/parcels/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  deleteParcel: (id: string) => apiCall(`/api/parcels/${id}`, { method: "DELETE" }),

  // TRIPS
  getAllTrips: () => apiCall("/api/trips"),
  getTrip: (id: string) => apiCall(`/api/trips/${id}`),
  getOngoingTrips: () => apiCall<OngoingTrip[]>("/api/trips/ongoing-list"),
  getOngoingTrip: (id: string) => apiCall<OngoingTrip>(`/api/trips/ongoing/${id}`),
  getActiveTrip: (driverId: string) => apiCall(`/api/trips/driver/${driverId}/active`),
  getDriverHistory: (driverId: string) => apiCall(`/api/trips/history/driver/${driverId}`),
  getVehicleHistory: (vehicleId: string) => apiCall(`/api/trips/history/vehicle/${vehicleId}`),
  getAllHistory: () => apiCall("/api/trips/history/all"),
  getDeclinedParcels: () => apiCall("/api/trips/declined/parcels"),
  getDeclinedCount: () => apiCall("/api/trips/declined/count"),
  createTrip: (data: any) => apiCall("/api/trips", { method: "POST", body: JSON.stringify(data) }),
  startJourney: (id: string) => apiCall(`/api/trips/${id}/start-journey`, { method: "POST" }),
  updateTripStatus: (id: string, status: string) => apiCall(`/api/trips/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  updateDeliveryStatus: (tripId: string, parcelId: string, status: string) => apiCall(`/api/trips/${tripId}/delivery/${parcelId}`, { method: "PATCH", body: JSON.stringify({ deliveryStatus: status }) }),
  reassignTrip: (tripId: string, data: any) => apiCall(`/api/trips/reassign/${tripId}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateTripResources: (id: string, data: any) => apiCall(`/api/trips/${id}/resources`, { method: "PATCH", body: JSON.stringify(data) }),
  updateTripLocation: (id: string, data: any) => apiCall(`/api/trips/${id}/location`, { method: "PATCH", body: JSON.stringify(data) }),
  toggleSOS: (id: string, sos: boolean, data?: any) => apiCall(`/api/trips/${id}/sos`, { method: "PATCH", body: JSON.stringify({ sos, ...data }) }),
  completeReturnTrip: (id: string) => apiCall(`/api/trips/${id}/complete-return`, { method: "POST" }),


  // NOTIFICATIONS
  createNotification: (data: {
    driverId: string;
    vehicleId: string;
    parcelIds: string[];
    tripId: string;
    message: string;
    assignedBy?: string;
    startLocation?: any;
    deliveryLocations?: any[];
  }) => apiCall("/api/notifications", { method: "POST", body: JSON.stringify(data) }),

  getDriverNotifications: (driverId: string) =>
    apiCall<Notification[]>(`/api/notifications/driver/${driverId}`),

  getUnreadNotificationCount: (driverId: string) =>
    apiCall<{ count: number }>(`/api/notifications/driver/${driverId}/unread-count`),

  getNotification: (id: string) =>
    apiCall<Notification>(`/api/notifications/${id}`),

  markNotificationAsRead: (id: string) =>
    apiCall(`/api/notifications/${id}/read`, { method: "PATCH" }),

  getManagerNotifications: (managerId: string) =>
    apiCall<Notification[]>(`/api/notifications/manager/${managerId}`),

  getManagerUnreadNotificationCount: (managerId: string) =>
    apiCall<{ count: number }>(`/api/notifications/manager/${managerId}/unread-count`),

  updateNotificationStatus: (id: string, status: string) =>
    apiCall(`/api/notifications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  reassignDriver: (notificationId: string, data: any) =>
    apiCall(`/api/notifications/${notificationId}/reassign-driver`, { method: "POST", body: JSON.stringify(data) }),

  // EXPENSES
  getExpenses: () => apiCall("/api/expenses"),
  getTripExpenses: (tripId: string) => apiCall(`/api/expenses/trip/${tripId}`),
  createExpense: (data: any) => apiCall("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
  deleteExpense: (id: string) => apiCall(`/api/expenses/${id}`, { method: "DELETE" }),
};

export { api };
export default api;