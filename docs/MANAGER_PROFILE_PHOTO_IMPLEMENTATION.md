# Manager Profile Photo Upload Implementation

## Overview
Successfully implemented manager profile picture upload functionality across the entire application stack (backend, frontend UI, database, and dashboard).

## Changes Made

### 1. Backend Changes

#### a) Database Model - [backend/models/User.js](backend/models/User.js)
- ✅ Added `profilePhoto` field to User schema
- Stores the file path of the uploaded profile image
- Default value is empty string

```javascript
profilePhoto: {
  type: String,
  default: "",
}
```

#### b) Image Upload Handler - [backend/routes/userRoutes.js](backend/routes/userRoutes.js)
- ✅ Added Multer configuration for file uploads
- Multer storage configured to save images in `uploads/` directory
- Filenames generated with timestamp and random value: `user-TIMESTAMP-RANDOM.jpg`

**New Endpoints:**
- **PUT `/api/users/:id/profile`** - Updates user profile with optional image upload
  - Accepts multipart/form-data
  - Supports conditional file upload (image is optional)
  - Handles JSON form data parsing

**Features:**
- Multipart form data handling with `handleUserUpload` middleware
- Conditional middleware that only activates for multipart requests
- Automatic directory creation if uploads folder doesn't exist

### 2. Frontend API Layer - [frontend/utils/api.ts](frontend/utils/api.ts)

#### a) Updated User Interface
- ✅ Added `profilePhoto?: string` field to User interface
```typescript
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "driver";
  status?: "Active" | "Resigned";
  dob?: string;
  place?: string;
  profilePhoto?: string;  // NEW FIELD
  address?: { ... };
}
```

#### b) New API Method
- ✅ Added `updateUserProfileWithImage` method
```typescript
updateUserProfileWithImage: async (id: string, formData: FormData) => {
  // Sends multipart/form-data to backend
  // Used when manager profile photo is being uploaded
}
```

### 3. Edit Manager Profile Screen - [frontend/app/edit-manager-profile.tsx](frontend/app/edit-manager-profile.tsx)

#### New Features Added:
- ✅ Image picker integration using `expo-image-picker`
- ✅ Profile photo preview with camera overlay
- ✅ Ability to remove selected image
- ✅ Conditional upload logic (image optional)

#### Key Additions:
1. **State Management:**
   - `selectedImage` state to track selected photo URI

2. **Image Picker Handler:**
   - `handlePickImage()` function
   - Requests media library permissions
   - Allows image editing with 1:1 aspect ratio
   - Quality set to 0.8 for optimization

3. **Upload Logic in `handleUpdate()`:**
   - If image selected: Uses `updateUserProfileWithImage` with FormData
   - If no image: Uses standard `updateUser` with JSON
   - Automatically handles both scenarios

4. **UI Components:**
   - Profile photo section with circular avatar (120x120px)
   - Camera icon overlay
   - "Add Photo" placeholder when no image
   - Remove button to clear selected image
   - Displays existing profile photo from database

5. **Styling:**
   - Professional circular profile photo container
   - Camera overlay with blue background
   - Remove button with error styling
   - Responsive design matching app theme

### 4. Admin Dashboard - [frontend/app/admin-dashboard.tsx](frontend/app/admin-dashboard.tsx)

#### Updated Features:
- ✅ Manager list now displays profile photos
- ✅ Falls back to placeholder avatar if no photo exists

**Changes:**
- Conditional rendering: Shows actual image if `profilePhoto` exists, otherwise shows initial letter placeholder
- Image styling: 40x40px circular images with border
- Seamless integration with existing list item design

### 5. Manager Details Screen - [frontend/app/manager-details.tsx](frontend/app/manager-details.tsx)

#### Enhanced Profile Display:
- ✅ Large profile photo display (80x80px) in the profile card
- ✅ Falls back to initial letter if no photo available
- ✅ Professional presentation matching driver details screen

**Implementation:**
- Conditional rendering for image vs. placeholder
- Maintains existing status indicators
- Photo updates when navigating back from edit screen
- Works with both resigned and active managers

## User Flow

### Manager Profile Photo Upload Flow:
1. Admin clicks "Edit" on manager in admin dashboard
2. Edit manager profile screen opens
3. Manager photo section shows current photo or "Add Photo" placeholder
4. Admin taps photo area to open image picker
5. Admin selects image from device library
6. Image preview appears with overlay
7. Admin can remove image with remove button
8. Admin taps "Save" button
9. If image selected: FormData with image sent to `/api/users/:id/profile`
10. If no image: JSON update sent to `/api/users/:id`
11. Backend processes upload and saves path to database
12. Dashboard refreshes and shows new profile photo

## Database Diagram
```
User Collection
├── _id: ObjectId
├── name: String
├── email: String
├── phone: String
├── profilePhoto: String  ← NEW
├── address: Object
├── role: String
├── status: String
├── createdAt: Date
└── updatedAt: Date
```

## File Structure
```
uploads/
├── user-1705686400000-123456789.jpg
├── user-1705686450000-987654321.jpg
└── ...

backend/models/User.js (Updated)
backend/routes/userRoutes.js (Updated)
backend/controllers/userController.js (Existing)

frontend/utils/api.ts (Updated)
frontend/app/edit-manager-profile.tsx (Updated)
frontend/app/admin-dashboard.tsx (Updated)
frontend/app/manager-details.tsx (Updated)
```

## API Endpoints Summary

| Method | Endpoint | Purpose | Body |
|--------|----------|---------|------|
| PUT | `/api/users/:id` | Update user without image (JSON) | `{ name, email, phone, dob, place, address }` |
| PUT | `/api/users/:id/profile` | Update user with optional image | FormData with fields + profilePhoto file |
| GET | `/api/users/:id` | Get user details (shows profilePhoto) | - |
| GET | `/api/users` | List all users (includes profilePhoto) | - |

## Database Query Examples

```javascript
// Fetch manager with profile photo
db.users.findById(managerId);
// Returns: { ..., profilePhoto: "uploads/user-xxx-xxx.jpg", ... }

// Update profile with photo
db.users.findByIdAndUpdate(managerId, {
  name, email, phone, dob, address,
  profilePhoto: "uploads/user-xxx-xxx.jpg"
});
```

## Testing Instructions

### 1. Edit Manager Profile with Photo:
- Navigate to admin dashboard
- Click edit on any manager
- Tap the photo area
- Select an image from gallery
- Complete the form
- Click Save
- Verify photo appears in admin dashboard list

### 2. View Manager Details:
- Click on manager name in dashboard
- Verify profile photo displays in manager details screen
- Edit and remove photo
- Navigate back and verify removal

### 3. Verify Database:
- Check uploads/ folder for image files
- Query user in database for profilePhoto field
- Verify path is stored correctly

## Error Handling

✅ **Image Picker:**
- Permission denied handling
- Picker cancellation handling
- Image selection validation

✅ **Upload:**
- Network error handling
- Validation error handling
- Form data parsing errors

✅ **Display:**
- Missing image graceful fallback
- Invalid image path handling
- Null/undefined checks

## Security Considerations

1. ✅ File size validation handled by Multer (can be configured)
2. ✅ Image type validation (media type options set in picker)
3. ✅ Unique filenames prevent overwrites
4. ✅ Path sanitization with forward slash normalization
5. ⚠️ Consider adding: File size limits in Multer config
6. ⚠️ Consider adding: Allowed file type validation on backend

## Performance Notes

- Image quality set to 0.8 to reduce upload size
- 1:1 aspect ratio maintains consistent display
- Lazy loading of images in lists
- Efficient FormData handling

## Future Enhancements

1. Add image cropping/editing UI
2. Implement image compression on backend
3. Add image deletion API endpoint
4. Support multiple profile images/gallery
5. Add image storage to cloud (S3, Azure Blob)
6. Implement image CDN for faster delivery
7. Add batch profile photo upload for managers

## Compatibility

- ✅ React Native (Expo)
- ✅ TypeScript
- ✅ MongoDB
- ✅ Node.js/Express
- ✅ Multer for file uploads
- ✅ expo-image-picker library

## Troubleshooting

### Photo not appearing after upload:
1. Check uploads folder exists in backend root
2. Verify `profilePhoto` field is being saved to database
3. Check `api.getImageUrl()` is formatting path correctly
4. Verify backend and frontend have same base URL

### Image picker not working:
1. Ensure permissions are granted on device
2. Check expo-image-picker version compatibility
3. Test with different image sources (camera vs gallery)

### Upload fails:
1. Check disk space available
2. Verify folder permissions (666 for files, 777 for directory)
3. Check network connectivity
4. Verify FormData formatting matches backend expectations
