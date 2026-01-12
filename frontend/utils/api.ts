// import Constants from "expo-constants";

// // Type definitions
// interface ApiResponse<T = any> {
//   ok: boolean;
//   status: number | null;
//   data: T | null;
//   error: string | null;
// }

// // 1. UPDATE: Added 'status' to the User interface
// export interface User {
//   _id: string;
//   name: string;
//   email: string;
//   phone?: string;
//   role: "admin" | "manager" | "driver";
//   status?: "Active" | "Resigned"; 
//   dob?: string;
//   place?: string;
//   address?: {
//     house?: string;
//     street?: string;
//     city?: string;
//     district?: string;
//     state?: string;
//   };
// }

// export interface Vehicle {
//   _id: string;
//   regNumber: string;
//   model: string;
//   type: string;
//   weight?: string;
//   status?: "Active" | "Sold" | "On-trip" | "In-Service";
//   insuranceDate?: string;
//   pollutionDate?: string;
//   taxDate?: string;
// }

// interface LoginCredentials {
//   email: string;
//   password: string;
// }

// interface LoginResponse {
//   user: User;
//   token?: string;
// }

// interface RegisterData {
//   fullName: string;
//   email: string;
//   password: string;
// }

// interface CreateManagerData {
//   name: string;
//   email: string;
//   phone: string;
//   place: string;
//   dob: string;
//   address: {
//     house: string;
//     street: string;
//     city: string;
//     district: string;
//     state: string;
//   };
// }

// // Get API base URL from Expo constants or fallback
// const getApiUrl = (): string => {
//   // Try to get from app.json extra config first
//   const extra = Constants.expoConfig?.extra;
//   if (extra?.apiUrl) {
//     return extra.apiUrl;
//   }

//   // Fallback: Extract IP from debugger host (development)
//   if (__DEV__ && Constants.debuggerHost) {
//     const debuggerHost = Constants.debuggerHost.split(":")[0];
//     return `http://${debuggerHost}:5000`;
//   }

//   // Production or last resort fallback
//   return "http://localhost:5000";
// };

// const API_BASE_URL = getApiUrl();

// // Centralized API call function
// const apiCall = async <T = any>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<ApiResponse<T>> => {
//   const url = `${API_BASE_URL}${endpoint}`;
//   const config: RequestInit = {
//     ...options,
//     headers: {
//       "Content-Type": "application/json",
//       ...options.headers,
//     },
//   };

//   try {
//     const response = await fetch(url, config);
//     const data = await response.json();

//     return {
//       ok: response.ok,
//       status: response.status,
//       data: data.user ? data.user : data, // Handle backend returning { user: ... } or just [...]
//       error: !response.ok ? data?.message || "Request failed" : null,
//     };
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : "Network error";
//     return {
//       ok: false,
//       status: null,
//       data: null,
//       error: errorMessage,
//     };
//   }
// };

// // API endpoints
// export const api = {
//   // Users
//   getUsers: () => apiCall<User[]>("/api/users"),
//   getUser: (id: string) => apiCall<User>(`/api/users/${id}`),
//   createUser: (data: RegisterData) =>
//     apiCall<User>("/api/users", { method: "POST", body: JSON.stringify(data) }),
//   updateUser: (id: string, data: Partial<User>) =>
//     apiCall<User>(`/api/users/${id}`, {
//       method: "PUT",
//       body: JSON.stringify(data),
//     }),
    
//   // 2. UPDATE: Added this function to handle Resignation
//   updateUserStatus: (id: string, status: string) =>
//     apiCall<User>(`/api/users/${id}/status`, {
//       method: "PATCH",
//       body: JSON.stringify({ status }),
//     }),

//   deleteUser: (id: string) =>
//     apiCall<void>(`/api/users/${id}`, { method: "DELETE" }),

//   // Auth
//   login: (email: string, password: string) =>
//     apiCall<LoginResponse>("/api/users/login", {
//       method: "POST",
//       body: JSON.stringify({ email, password }),
//     }),
//   register: (data: RegisterData) =>
//     apiCall<User>("/api/users/register", {
//       method: "POST",
//       body: JSON.stringify(data),
//     }),
//   createManager: (data: CreateManagerData) =>
//     apiCall<User>("/api/users/create-manager", {
//       method: "POST",
//       body: JSON.stringify(data),
//     }),

//   // Vehicles
//   getVehicles: () => apiCall<Vehicle[]>("/api/vehicles"),
//   getVehicle: (id: string) => apiCall<Vehicle>(`/api/vehicles/${id}`),
//   registerVehicle: (data: Partial<Vehicle>) =>
//     apiCall<Vehicle>("/api/vehicles/register", {
//       method: "POST",
//       body: JSON.stringify(data),
//     }),
//   updateVehicleStatus: (id: string, status: string) =>
//     apiCall<Vehicle>(`/api/vehicles/${id}/status`, {
//       method: "PATCH",
//       body: JSON.stringify({ status }),
//     }),
// };

// export default api;
















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
  user: User;
  token?: string;
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
  // Option A: If defined in app.json (Best for production)
  const extra = Constants.expoConfig?.extra;
  if (extra?.apiUrl) {
    return extra.apiUrl;
  }

  // Option B: Hardcoded IP (BEST FOR TESTING ON PHONE)
  // ⚠️ REPLACE THIS IP WITH YOUR COMPUTER'S IPv4 ADDRESS ⚠️
  // Windows: run 'ipconfig' | Mac: run 'ifconfig'
  return "http://172.20.10.5:5000"; 
  
  // Option C: Dynamic (Often fails on Android/Physical devices)
  /*
  if (__DEV__ && Constants.debuggerHost) {
    const debuggerHost = Constants.debuggerHost.split(":")[0];
    return `http://${debuggerHost}:5000`;
  }
  return "http://localhost:5000";
  */
};

const API_BASE_URL = getApiUrl();

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
    console.log(`Failed connecting to: ${url}`); 
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