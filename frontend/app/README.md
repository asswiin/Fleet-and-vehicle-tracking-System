# App Directory Organization

This directory is organized by user roles to improve code maintainability and navigation.

## 📁 Directory Structure

```
app/
├── admin/          # Admin-only features
├── manager/        # Manager-specific features  
├── driver/         # Driver-specific features
├── shared/         # Common/shared components
├── _layout.tsx     # Root layout component
└── index.tsx       # App entry point
```

## 🔑 Role-Based Access

### Admin Features (`/admin`)
- **Dashboard**: `admin-dashboard.tsx`
- **User Management**: 
  - `add-manager.tsx` - Add new managers
  - `managers-list.tsx` - View all managers
  - `manager-details.tsx` - Manager details view
  - `drivers-list.tsx` - View all drivers
  - `drivers-details.tsx` - Driver details view
  - `register-driver.tsx` - Register new drivers
- **Fleet Management**:
  - `vehicle-list.tsx` - View all vehicles
  - `vehicle-details.tsx` - Vehicle details view
  - `register-vehicle.tsx` - Add new vehicles
  - `edit-vehicle.tsx` - Edit vehicle information

### Manager Features (`/manager`)
- **Dashboard**: `manager-dashboard.tsx`
- **Profile Management**: 
  - `manager-profile.tsx` - View profile
  - `edit-manager-profile.tsx` - Edit profile
- **Parcel Management**:
  - `parcel-list.tsx` - View all parcels
  - `parcel-details.tsx` - Parcel details view
  - `add-parcel.tsx` - Add new parcels
  - `edit-parcel.tsx` - Edit parcel information
  - `selecting-parcel.tsx` - Select parcels for trips
- **Trip Management**:
  - `assign-trip.tsx` - Assign trips to drivers
  - `trip-assignment-detail.tsx` - Trip assignment details
  - `trip-confirmation.tsx` - Confirm trip assignments
  - `trip-summary.tsx` - View trip summaries

### Driver Features (`/driver`)
- **Dashboard**: `driver-dashboard.tsx`
- **Profile Management**: 
  - `driver-profile.tsx` - View profile
  - `edit-driver-profile.tsx` - Edit profile
- **Trip Operations**:
  - `active-trip.tsx` - Current active trip
  - `trip-notifications.tsx` - Trip notifications
  - `select-location.tsx` - Location selection
  - `select-vehicle.tsx` - Vehicle selection
- **Time Tracking**:
  - `punching.tsx` - Clock in/out functionality
  - `punching-history.tsx` - View punch history

### Shared Components (`/shared`)
- **Authentication**: 
  - `login.tsx` - User login
  - `signup.tsx` - User registration
  - `role-selection.tsx` - Role selection after login
- **Common**: 
  - `home.tsx` - Home/landing page

## 🛣️ Routing

Each role-based folder maintains its own navigation structure while sharing common authentication flows.

## 📝 Notes

- `_layout.tsx` remains at the root as it handles global layout
- `index.tsx` serves as the app entry point
- Shared components are accessible to all roles
- Role-specific features are isolated in their respective directories