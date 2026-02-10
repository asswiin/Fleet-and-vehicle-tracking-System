# Google Maps Directions API Setup

## Overview
The Select Location screen now uses Google Directions API to display:
- **Exact road routes** (not just straight lines)
- **Real distance in kilometers** (calculated from actual road paths)
- **Accurate travel time** (based on actual driving conditions)

This matches Google Maps behavior exactly.

## Setup Instructions

### 1. Get Google Directions API Key

#### Option A: Google Cloud Console (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (if needed)
3. Enable these APIs:
   - **Directions API**
   - **Maps SDK for Android** (for native maps)
   - **Geocoding API** (optional, for address lookup)
4. Create an **API Key** under Credentials
5. Restrict the key to Android applications for security

#### Option B: Firebase Console (Alternative)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Settings > Project Settings
4. Find your Web API Key (can be used as fallback)

### 2. Add API Key to Your Project

#### In `frontend/app/select-location.tsx`:
Find this line (line 33):
```tsx
const GOOGLE_DIRECTIONS_API_KEY = "YOUR_GOOGLE_DIRECTIONS_API_KEY";
```

Replace with your actual API key:
```tsx
const GOOGLE_DIRECTIONS_API_KEY = "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
```

Or use environment variables for better security:
```tsx
const GOOGLE_DIRECTIONS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || "YOUR_GOOGLE_DIRECTIONS_API_KEY";
```

Then add to `.env` or `.env.local`:
```
EXPO_PUBLIC_GOOGLE_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Test the Integration

1. Run your app
2. Navigate to "Select Delivery Locations" screen
3. Select locations (e.g., Malappuram and Kochi from the predefined list)
4. The map will show:
   - Blue polyline route following actual roads
   - **Distance** in kilometers (e.g., "28.3 km")
   - **Time** in hours/minutes (e.g., "1h 15m")
   - Numbered markers for each stop

### 4. Data Displayed

The route info card at the bottom-left shows:
- **Total Distance**: Actual road distance from starting point through all stops
- **Est. Time**: Actual travel time at current traffic conditions
- **Stops**: Number of delivery locations

## How It Works

### Route Fetching Flow:
1. User selects delivery locations
2. `fetchRoute()` is called with all waypoints
3. Google Directions API request is sent with:
   - Origin (Starting Point/Warehouse)
   - Waypoints (All delivery locations in order)
   - Destination (Last delivery location)
4. API Response contains:
   - `overview_polyline.points` - Encoded route path
   - `legs[].distance.value` - Distance in meters
   - `legs[].duration.value` - Time in seconds
5. Data is decoded and stored:
   - Polyline is decoded for map display
   - Total distance is summed from all legs
   - Total duration is summed from all legs
6. Map displays the route with accurate metrics

### Fallback Mode:
If the API key is not set or API fails:
- Uses **Haversine formula** to calculate straight-line distance
- Estimates time at 40 km/h average speed
- Still shows route polyline (fallback to direct coordinates)

## API Pricing

Google Directions API is a **paid service** under Google Maps Platform:
- **Directions requests**: ~$0.005 per request (after free tier)
- **First 28,500 requests per month**: FREE
- **Payment required** after free tier exceeded

### Cost Optimization Tips:
1. Cache routes when possible
2. Use lower precision for testing
3. Optimize request frequency
4. Consider using only for final route (before trip start)

## Security Considerations

1. **API Key Restrictions**: Set restrictions in Google Cloud Console
   - Restrict to Android apps
   - Limit to specific bundle IDs
   - Restrict to Directions API only

2. **Environment Variables**: Store sensitive keys in `.env`
   - Never commit actual API keys to version control
   - Use `EXPO_PUBLIC_` prefix for keys that need to be in client code

3. **Rate Limiting**: Implement rate limiting to prevent abuse

## Examples

### Example 1: Malappuram to Kochi
- **Starting Point**: Warehouse (11.312, 75.955)
- **Stop 1**: Malappuram (11.051, 76.071)
- **Stop 2**: Kochi (9.931, 76.267)
- **Total Distance**: ~130 km
- **Est. Time**: ~2h 45m

### Example 2: Multiple Stops (Thrissur → Ernakulam → Thiruvananthapuram)
- **Starting Point**: Warehouse
- **Stop 1**: Thrissur (10.528, 76.214)
- **Stop 2**: Ernakulam (9.982, 76.300)
- **Stop 3**: Thiruvananthapuram (8.524, 76.937)
- **Total Distance**: ~210 km
- **Est. Time**: ~4h 30m

## Troubleshooting

### Issue: "Map not available"
- Check if MapView component is properly imported
- Ensure `isMapAvailable` is true
- Check device permissions for location

### Issue: Distance shows "0.0 km"
- Verify API key is set correctly
- Check if locations have coordinates set
- Look for API errors in console logs

### Issue: Takes too long to load
- First request takes longer (API call)
- Subsequent requests use cached data
- Consider pre-loading routes for frequent locations

### Issue: CORS/Network Error
- Verify API key permissions allow Directions API
- Check internet connection
- Check Android manifest for internet permission

## Related Code

- **Component**: `frontend/app/select-location.tsx`
- **Functions**:
  - `fetchRoute()` - Main API call
  - `decodePolyline()` - Decodes encoded route
  - `formatDuration()` - Formats seconds to readable time
  - `calculateFallbackDistance()` - Fallback calculation

## Additional Resources

- [Google Directions API Docs](https://developers.google.com/maps/documentation/directions)
- [Google Cloud Console](https://console.cloud.google.com/)
- [React Native Maps Documentation](https://github.com/react-native-maps/react-native-maps)
- [Expo Maps Documentation](https://docs.expo.dev/guides/maps/)
