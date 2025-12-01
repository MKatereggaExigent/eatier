# Google Maps API Setup Guide

## Overview
The Itiyum platform now uses Google Maps API to provide address autocomplete and geocoding functionality for business registration. This ensures accurate location data for all restaurants on the platform.

## What You Need to Do

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API** (for address autocomplete)
   - **Geocoding API** (for converting addresses to coordinates)
   - **Maps JavaScript API** (for the map interface)

4. Create an API key:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **API Key**
   - Copy the generated API key

5. (Optional but recommended) Restrict your API key:
   - Click on the API key you just created
   - Under **Application restrictions**, select **HTTP referrers**
   - Add `http://localhost:4200/*` for development
   - Add your production domain when deploying (e.g., `https://itiyum.com/*`)
   - Under **API restrictions**, select **Restrict key**
   - Select only the APIs you enabled above

### 2. Add the API Key to Your Environment

Update the file `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3001/api',
  googleMapsApiKey: 'YOUR_ACTUAL_API_KEY_HERE' // Replace with your real API key
};
```

Also update `backend/.env`:

```
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

### 3. Restart the Application

After adding your API key, restart the application:

```bash
./launch_entire_product.sh
```

## Features Implemented

### 1. Address Autocomplete on Registration
When a Business Owner registers, they can now:
- Type their restaurant address
- See autocomplete suggestions from Google Maps
- Select the correct address
- Automatically populate:
  - Formatted address
  - Country
  - Latitude and longitude (stored in database)
  - Google Place ID (for future reference)

### 2. Real Data Display on Restaurant List
The restaurant list page now shows:
- Real restaurant count from database
- Real cuisine types from registered businesses
- "New" badge instead of "N/A" for restaurants without reviews
- "Address setup required" for businesses without addresses
- Proper handling of missing data (no more placeholders)

### 3. Database Schema Updates
The `businesses` table now includes:
- `latitude` (DECIMAL(10, 8))
- `longitude` (DECIMAL(11, 8))
- `formatted_address` (TEXT)
- `place_id` (VARCHAR(255))

## Testing the Feature

1. Navigate to http://localhost:4200/register
2. Select "Business Owner" as the role
3. Fill in the business information
4. In the "Business Address" field, start typing an address
5. You should see autocomplete suggestions appear
6. Select an address from the dropdown
7. The country field should auto-populate
8. Complete registration
9. The restaurant will now have accurate location data

## Cost Considerations

Google Maps API has a free tier:
- **$200 free credit per month**
- Places Autocomplete: $2.83 per 1,000 requests (after free tier)
- Geocoding API: $5.00 per 1,000 requests (after free tier)

For a production application, monitor your usage and set up billing alerts.

## Troubleshooting

### "This page can't load Google Maps correctly"
- Check that your API key is correct
- Verify that the required APIs are enabled
- Check browser console for specific error messages

### Autocomplete not showing suggestions
- Ensure your API key has Places API enabled
- Check that the API key is not restricted to exclude your domain
- Verify the API key is correctly set in `environment.ts`

### "RefererNotAllowedMapError"
- Add your domain to the API key's HTTP referrer restrictions
- For local development, add `http://localhost:4200/*`

## Next Steps

After setting up Google Maps:
1. Test the registration flow with a real restaurant address
2. Verify the address appears correctly on the restaurant list
3. Consider adding a map view to show restaurant locations
4. Implement distance calculation from user's location
5. Add address editing functionality for existing businesses

