

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
  driverStatus?: "Active" | "On-trip" | "Off-duty";
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
    address?: string;
  };
  weight?: number;
  type?: string;
  status?: string;
  paymentAmount?: number;
  date?: string;
  tripId?: string;
  assignedDriver?: string;
  assignedVehicle?: string;
}

export interface Notification {
  _id: string;
  driverId: string;
  vehicleId: {
    _id: string;
    regNumber: string;
    model: string;
    type: string;
  };
  parcelIds: Array<{
    _id: string;
    trackingId: string;
    recipient: {
      name: string;
      address: string;
    };
    weight: number;
  }>;
  tripId: string;
  type: string;
  status: string;
  message: string;
  read: boolean;
  createdAt: string;
  expiresAt: string;
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
  updateUserProfileWithImage: async (id: string, formData: FormData) => {
    const url = `${API_BASE_URL}/api/users/${id}/profile`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        body: formData,
        // DO NOT set Content-Type header here; fetch handles multipart boundary automatically
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

  // DRIVERS
  getDrivers: () => apiCall("/api/drivers"),
  getDriver: (id: string) => apiCall(`/api/drivers/${id}`),
  createDriver: (data: any) => apiCall("/api/drivers/register", { method: "POST", body: JSON.stringify(data) }),
  updateDriver: (id: string, data: any) => apiCall(`/api/drivers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  punchDriver: (id: string) => apiCall(`/api/drivers/${id}/punch`, { method: "POST" }),
  punchOutDriver: (id: string) => apiCall(`/api/drivers/${id}/punch-out`, { method: "POST" }),
  getPunchHistory: (id: string) => apiCall(`/api/drivers/${id}/punch-history`, { method: "GET" }),
  checkLicenseExists: (license: string, excludeId?: string) => 
    apiCall(`/api/drivers/check-license/${license}${excludeId ? `?excludeId=${excludeId}` : ''}`),

  // DRIVER IMAGE UPLOAD (Special Handling)
  updateDriverProfileWithImage: async (id: string, formData: FormData) => {
    const url = `${API_BASE_URL}/api/drivers/${id}`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        body: formData,
        // DO NOT set Content-Type header here; fetch handles multipart boundary automatically
      });
      return await handleResponse(response);
    } catch (error: any) {
      return { ok: false, status: 500, data: null, error: error.message };
    }
  },
  // PARCELS
  getParcels: () => apiCall<Parcel[]>("/api/parcels"),
  getParcel: (id: string) => apiCall<Parcel>(`/api/parcels/${id}`),
  createParcel: (data: any) => apiCall("/api/parcels", { method: "POST", body: JSON.stringify(data) }),
  updateParcel: (id: string, data: any) => apiCall(`/api/parcels/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateParcelStatus: (id: string, status: string) =>
    apiCall(`/api/parcels/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  deleteParcel: (id: string) => apiCall(`/api/parcels/${id}`, { method: "DELETE" }),

  // NOTIFICATIONS
  createNotification: (data: {
    driverId: string;
    vehicleId: string;
    parcelIds: string[];
    tripId: string;
    message: string;
  }) => apiCall("/api/notifications", { method: "POST", body: JSON.stringify(data) }),
  
  getDriverNotifications: (driverId: string) => 
    apiCall<Notification[]>(`/api/notifications/driver/${driverId}`),
  
  getUnreadNotificationCount: (driverId: string) => 
    apiCall<{ count: number }>(`/api/notifications/driver/${driverId}/unread-count`),
  
  getNotification: (id: string) => 
    apiCall<Notification>(`/api/notifications/${id}`),
  
  markNotificationAsRead: (id: string) => 
    apiCall(`/api/notifications/${id}/read`, { method: "PATCH" }),
  
  updateNotificationStatus: (id: string, status: string) => 
    apiCall(`/api/notifications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  
  deleteNotification: (id: string) => 
    apiCall(`/api/notifications/${id}`, { method: "DELETE" }),
};
   

export default api;