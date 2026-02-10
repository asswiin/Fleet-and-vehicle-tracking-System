# Quick Start - Manager Profile Photo Feature

## What Was Implemented

Manager profile picture upload functionality with full database integration and UI display across the application.

## Files Modified

### Backend (3 files)
1. **backend/models/User.js**
   - Added `profilePhoto` field to store image path

2. **backend/routes/userRoutes.js**
   - Added Multer configuration for file uploads
   - Created new PUT endpoint `/api/users/:id/profile` with image upload support
   - Handles both JSON and multipart/form-data requests

### Frontend (4 files)
1. **frontend/utils/api.ts**
   - Added `profilePhoto` to User interface
   - Added `updateUserProfileWithImage()` method for image uploads

2. **frontend/app/edit-manager-profile.tsx**
   - Added image picker UI (Camera icon + photo preview)
   - Integrated `expo-image-picker` library
   - Handles image selection and removal
   - Conditional upload logic (image optional)

3. **frontend/app/admin-dashboard.tsx**
   - Shows manager profile photos in the list
   - Falls back to initial letter avatar if no photo

4. **frontend/app/manager-details.tsx**
   - Displays large profile photo in manager details view
   - Shows placeholder avatar if no photo exists

## How to Use

### Upload a Manager Profile Photo:
1. Go to Admin Dashboard
2. Find a manager in the "Current Managers" list
3. Click the manager to open their details
4. Click the "Edit" button (pencil icon)
5. In the edit screen, tap the "Add Photo" section
6. Select an image from your device
7. Complete the form fields as needed
8. Tap "Save Profile" button
9. Photo is uploaded and displayed immediately

### View Manager Photos:
- **Admin Dashboard**: Managers list shows 40x40px profile photos
- **Manager Details**: Large 80x80px profile photo with status badge

### Database Verification:
```javascript
// The profilePhoto field in User collection contains:
"profilePhoto": "uploads/user-1705686400000-123456789.jpg"
```

## Image Upload Flow

```
Admin selects photo
        ↓
Image picker opens (device library)
        ↓
Admin selects image
        ↓
Preview shows with remove option
        ↓
Admin clicks Save
        ↓
FormData sent to backend: /api/users/:id/profile
        ↓
Backend saves image to uploads/ folder
        ↓
Backend stores path in database
        ↓
Frontend refreshes and displays image
```

## Features

✅ Image picker with preview
✅ Optional image upload (existing managers without photos still work)
✅ Database storage of image paths
✅ Professional UI with camera overlay
✅ Remove photo option
✅ Fallback avatar display
✅ Responsive image sizing
✅ Error handling and validation

## Testing Checklist

- [ ] Upload photo for a manager
- [ ] Verify photo appears in admin dashboard list
- [ ] Click manager to view details with large photo
- [ ] Edit manager and remove photo
- [ ] Verify removal works on refresh
- [ ] Edit manager without changing photo
- [ ] Test with different image formats (jpg, png)
- [ ] Check uploads folder contains image files
- [ ] Verify database stores correct file path

## Common Tasks

### Find uploaded images:
```
/backend/uploads/
```

### Check database for profile photos:
```javascript
// MongoDB query
db.users.find({ role: "manager", profilePhoto: { $exists: true, $ne: "" } })
```

### Clear all profile photos (if needed):
```javascript
// MongoDB query to remove all profile photos
db.users.updateMany(
  { role: "manager" },
  { $set: { profilePhoto: "" } }
)
```

## Dependencies Added/Used

- **expo-image-picker**: Image selection from device library
- **multer**: Backend file upload handling
- **React Native Image component**: Display images

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Photo not saving | Check `/backend/uploads` folder exists and has write permissions |
| Photo not displaying | Verify `profilePhoto` field in database, check API URL format |
| Image picker crashes | Ensure permissions granted, check Expo version |
| Upload fails with 500 error | Check backend logs, verify FormData formatting |
| Old photo still showing | Clear cache, refresh browser/app |

## API Reference

### Update Manager Profile with Image
```
PUT /api/users/:id/profile
Content-Type: multipart/form-data

Form Fields:
- name (text)
- email (text)
- phone (text)
- dob (text)
- place (text)
- address (JSON string)
- profilePhoto (file - optional)
```

### Get Manager Details
```
GET /api/users/:id

Response includes:
{
  "_id": "...",
  "name": "...",
  "email": "...",
  "profilePhoto": "uploads/user-xxx-xxx.jpg",
  ...
}
```

## Notes

- Images stored in `uploads/` directory at backend root
- Filenames use timestamp + random number for uniqueness
- Image quality optimized to 0.8 to reduce file size
- Profile photo is optional - managers without photos show initial letter
- All changes are backward compatible with existing data
