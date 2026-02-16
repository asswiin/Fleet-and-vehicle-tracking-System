

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
  _id: string;
  regNumber: string;
  model: string;
  type: string;
  weight?: string;
  capacity?: string;
  status?: "Active" | "Sold" | "On-trip" | "In-Service" | "Maintenance";
  currentTripId?: string;
  insuranceDate?: string;
  pollutionDate?: string;
  taxDate?: string;
  vehiclePhotos?: string[];
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
  driverStatus?: "offline" | "available" | "pending" | "Accepted" | "On-trip" | "Off-duty";
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
  // Can be string ID or populated object
  assignedDriver?: string | {
    _id: string;
    name: string;
    mobile?: string;
    email?: string;
    profilePhoto?: string;
    driverStatus?: string;
  };
  // Delivery location coordinates
  deliveryLocation?: {
    latitude?: number;
    longitude?: number;
    order?: number;
    locationName?: string; // Destination name given during trip assignment
  };
  // Can be string ID or populated object
  assignedVehicle?: string | {
    _id: string;
    regNumber: string;
    model?: string;
    type?: string;
    status?: string;
  };
  // Properties for declined parcels
  declinedDriverId?: string;
  declinedDriverName?: string;
  assignedVehicleId?: string;
}

export interface Notification {
  _id: string;
  driverId?: string;
  managerId?: string;
  recipientType?: "driver" | "manager";
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
    deliveryLocation?: {
      latitude?: number;
      longitude?: number;
      order?: number;
    };
  }>;
  tripId: string;
  type: string;
  status: string;
  message: string;
  read: boolean;
  createdAt: string;
  expiresAt: string;
  // For manager notifications about declined trips
  declinedDriverId?: {
    _id: string;
    name: string;
    mobile?: string;
  };
  assignedBy?: string;
  // Delivery route information
  deliveryLocations?: Array<{
    parcelId: string;
    latitude: number;
    longitude: number;
    order: number;
    locationName?: string;
  }>;
  startLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

// Trip interface for storing assigned trips
export interface Trip {
  _id: string;
  tripId: string;
  driverId: {
    _id: string;
    name: string;
    phone: string;
    email: string;
    profilePhoto?: string;
  };
  vehicleId: {
    _id: string;
    regNumber: string;
    model: string;
    type: string;
    capacity: number;
  };
  parcelIds: Array<{
    _id: string;
    trackingId: string;
    weight: number;
    recipient: {
      name: string;
      email?: string;
      address: string;
    };
    type?: string;
    status: string;
  }>;
  status: string;
  startLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryDestinations: Array<{
    parcelId: string;
    latitude: number;
    longitude: number;
    locationName: string;
    order: number;
    deliveryStatus: string;
    deliveredAt?: string;
    notes?: string;
  }>;
  assignedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  assignedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  totalWeight: number;
  totalDistance?: number;
  estimatedDuration?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  sos?: boolean;
}


// ==========================================
// 2. Network Configuration
// ==========================================

// Use local backend for development, deployed URL for production
const API_BASE_URL = "https://fleet-vehicle-backend.vercel.app";
// const API_BASE_URL = "http://172.20.10.5:5000"; // Local IP for testing
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
export const api = {
  getImageUrl: (path?: string) => {
    if (!path) return null;
    // If the path is already a base64 data URI, return it directly
    if (path.startsWith('data:image')) {
      return path;
    }
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

  // USER PROFILE IMAGE UPLOAD (Base64 for Vercel compatibility)
  updateUserProfileWithImage: async (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    place?: string;
    dob?: string;
    address?: any;
    profilePhotoBase64?: string;
  }) => {
    return apiCall(`/api/users/${id}/profile`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
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

  // DRIVERS
  getDrivers: () => apiCall("/api/drivers"),
  getDriver: (id: string) => apiCall(`/api/drivers/${id}`),
  createDriver: (data: any) => apiCall("/api/drivers/register", { method: "POST", body: JSON.stringify(data) }),
  updateDriver: (id: string, data: any) => apiCall(`/api/drivers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  punchDriver: (id: string) => {
    // Send client's LOCAL date components to fix timezone issues
    // Using year/month/day ensures the server stores the correct date
    const now = new Date();
    const localDate = {
      year: now.getFullYear(),
      month: now.getMonth(), // 0-indexed
      day: now.getDate()
    };
    return apiCall(`/api/drivers/${id}/punch`, {
      method: "POST",
      body: JSON.stringify({ localDate })
    });
  },
  punchOutDriver: (id: string) => {
    // Send client's LOCAL date components to fix timezone issues
    const now = new Date();
    const localDate = {
      year: now.getFullYear(),
      month: now.getMonth(), // 0-indexed
      day: now.getDate()
    };
    return apiCall(`/api/drivers/${id}/punch-out`, {
      method: "POST",
      body: JSON.stringify({ localDate })
    });
  },
  getPunchHistory: (id: string) => apiCall(`/api/drivers/${id}/punch-history`, { method: "GET" }),
  checkLicenseExists: (license: string, excludeId?: string) =>
    apiCall(`/api/drivers/check-license/${license}${excludeId ? `?excludeId=${excludeId}` : ''}`),

  // DRIVER PROFILE UPDATE with Base64 Image Support (Vercel Compatible)
  updateDriverProfileWithImage: async (id: string, data: {
    name: string;
    email: string;
    mobile: string;
    license?: string;
    gender?: string;
    dob?: string;
    address?: any;
    profilePhotoBase64?: string;
    licensePhotoBase64?: string;
  }) => {
    return apiCall(`/api/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },
  // PARCELS
  getParcels: () => apiCall<Parcel[]>("/api/parcels"),
  getParcel: (id: string) => apiCall<Parcel>(`/api/parcels/${id}`),
  getParcelByTrackingId: (trackingId: string) => apiCall<Parcel>(`/api/parcels/track/${trackingId}`),
  createParcel: (data: any) => apiCall("/api/parcels", { method: "POST", body: JSON.stringify(data) }),
  updateParcel: (id: string, data: any) => apiCall(`/api/parcels/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateParcelStatus: (id: string, status: string) =>
    apiCall(`/api/parcels/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  deleteParcel: (id: string) => apiCall(`/api/parcels/${id}`, { method: "DELETE" }),

  // NOTIFICATIONS
  createNotification: (data: {
    driverId?: string;
    managerId?: string;
    recipientType?: "driver" | "manager";
    vehicleId: string;
    parcelIds: string[];
    tripId: string;
    message: string;
    type?: string;
    assignedBy?: string;
    deliveryLocations?: Array<{
      parcelId: string;
      latitude: number;
      longitude: number;
      order: number;
      locationName?: string;
    }>;
    startLocation?: {
      latitude: number;
      longitude: number;
      address: string;
    } | null;
  }) => apiCall("/api/notifications", { method: "POST", body: JSON.stringify(data) }),

  getDriverNotifications: (driverId: string) =>
    apiCall<Notification[]>(`/api/notifications/driver/${driverId}`),

  getUnreadNotificationCount: (driverId: string) =>
    apiCall<{ count: number }>(`/api/notifications/driver/${driverId}/unread-count`),

  // MANAGER NOTIFICATIONS
  getManagerNotifications: (managerId: string) =>
    apiCall<Notification[]>(`/api/notifications/manager/${managerId}`),

  getManagerUnreadCount: (managerId: string) =>
    apiCall<{ count: number }>(`/api/notifications/manager/${managerId}/unread-count`),

  reassignDriver: (notificationId: string, data: { newDriverId: string, vehicleId: string }) =>
    apiCall(`/api/notifications/${notificationId}/reassign-driver`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  getNotification: (id: string) =>
    apiCall<Notification>(`/api/notifications/${id}`),

  markNotificationAsRead: (id: string) =>
    apiCall(`/api/notifications/${id}/read`, { method: "PATCH" }),

  updateNotificationStatus: (id: string, status: string) =>
    apiCall(`/api/notifications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  deleteNotification: (id: string) =>
    apiCall(`/api/notifications/${id}`, { method: "DELETE" }),

  // TRIPS
  createTrip: (data: {
    tripId: string;
    driverId: string;
    vehicleId: string;
    parcelIds: string[];
    startLocation?: {
      latitude: number;
      longitude: number;
      address: string;
    } | null;
    deliveryDestinations: Array<{
      parcelId: string;
      latitude: number;
      longitude: number;
      locationName: string;
      order: number;
    }>;
    assignedBy?: string;
    totalWeight?: number;
    notes?: string;
  }) => apiCall("/api/trips", { method: "POST", body: JSON.stringify(data) }),

  getAllTrips: () => apiCall<Trip[]>("/api/trips"),

  getTrip: (id: string) => apiCall<Trip>(`/api/trips/${id}`),

  getTripByTripId: (tripId: string) => apiCall<Trip>(`/api/trips/by-trip-id/${tripId}`),

  getDriverTrips: (driverId: string, status?: string) =>
    apiCall<Trip[]>(`/api/trips/driver/${driverId}${status ? `?status=${status}` : ''}`),

  getActiveTrip: (driverId: string) =>
    apiCall<Trip>(`/api/trips/driver/${driverId}/active`),

  updateTripStatus: (id: string, status: string) =>
    apiCall(`/api/trips/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  startJourney: (tripId: string) =>
    apiCall(`/api/trips/${tripId}/start-journey`, { method: "POST" }),

  updateDeliveryStatus: (tripId: string, parcelId: string, deliveryStatus: string, notes?: string) =>
    apiCall(`/api/trips/${tripId}/delivery/${parcelId}`, {
      method: "PATCH",
      body: JSON.stringify({ deliveryStatus, notes })
    }),


  // Update Trip Resources (Driver/Vehicle)
  updateTripResources: (tripId: string, data: { driverId?: string; vehicleId?: string }) =>
    apiCall(`/api/trips/${tripId}/resources`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),


  deleteTrip: (id: string) =>
    apiCall(`/api/trips/${id}`, { method: "DELETE" }),

  // Get declined parcels for reassignment
  getDeclinedParcels: () =>
    apiCall<Parcel[]>("/api/trips/declined/parcels"),

  // Reassign trip to new driver (vehicle stays the same)
  reassignTrip: (tripId: string, data: {
    newDriverId: string;
    managerId: string;
  }) => apiCall(`/api/trips/reassign/${tripId}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  }),
  // Get currently ongoing trips (filtered by backend)
  getOngoingTrips: () => apiCall<any[]>("/api/trips/ongoing-list"),

  // Get specific ongoing trip details for live tracking
  getOngoingTrip: (tripId: string) => apiCall<any>(`/api/trips/ongoing/${tripId}`),

  // Update trip live location (called by driver app)
  updateTripLocation: (tripId: string, data: { latitude: number, longitude: number, address?: string, progress?: number }) =>
    apiCall(`/api/trips/${tripId}/location`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  toggleSOS: (id: string, sos: boolean, location?: { latitude?: number, longitude?: number, address?: string }) =>
    apiCall(`/api/trips/${id}/sos`, {
      method: "PATCH",
      body: JSON.stringify({ sos, ...location })
    }),
};




