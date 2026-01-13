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
  status?: "Active" | "Sold" | "On-trip" | "In-Service";
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

// ==========================================
// 2. Network Configuration
// ==========================================

const getApiUrl = (): string => {
  // Dynamically detect IP using Expo constants
  const hostUri = Constants.expoConfig?.hostUri;
  
  if (hostUri) {
    const ipAddress = hostUri.split(':')[0];
    return `http://${ipAddress}:5000`; 
  }

  // Fallback: Localhost
  return "http://localhost:5000";
};

const API_BASE_URL = getApiUrl();

// Debugging: Log the URL being used so you know where requests are going
console.log("🚀 API Base URL set to:", API_BASE_URL);

// Centralized API call wrapper
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
    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      // Handle cases where backend returns { user: ... } vs just the object
      data: data.user ? data.user : data, 
      error: !response.ok ? data?.message || "Request failed" : null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error";
    // Log URL to help debug connection issues
    console.log(`❌ Connection Failed: ${url}`); 
    console.log(`Error Details: ${errorMessage}`);
    return {
      ok: false,
      status: null,
      data: null,
      error: errorMessage,
    };
  }
};

// ==========================================
// 3. API Methods
// ==========================================

export const api = {
  // --- USERS ---
  getUsers: () => apiCall<User[]>("/api/users"),
  
  getUser: (id: string) => apiCall<User>(`/api/users/${id}`),
  
  createUser: (data: RegisterData) =>
    apiCall<User>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  
  updateUser: (id: string, data: Partial<User>) =>
    apiCall<User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Mark user as Resigned
  updateUserStatus: (id: string, status: string) =>
    apiCall<User>(`/api/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteUser: (id: string) =>
    apiCall<void>(`/api/users/${id}`, { method: "DELETE" }),

  // --- AUTH ---
  login: (email: string, password: string) =>
    apiCall<LoginResponse>("/api/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: RegisterData) =>
    apiCall<User>("/api/users/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createManager: (data: CreateManagerData) =>
    apiCall<User>("/api/users/create-manager", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- VEHICLES ---
  getVehicles: () => apiCall<Vehicle[]>("/api/vehicles"),
  
  getVehicle: (id: string) => apiCall<Vehicle>(`/api/vehicles/${id}`),
  
  registerVehicle: (data: Partial<Vehicle>) =>
    apiCall<Vehicle>("/api/vehicles/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  updateVehicleStatus: (id: string, status: string) =>
    apiCall<Vehicle>(`/api/vehicles/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export default api;