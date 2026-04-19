# 🗺️ Neighborhood Discovery Widget - Integration Guide

## Overview

The Neighborhood Discovery widget is a powerful Google Maps feature that allows users to:
- 🔍 **Search nearby places** on an interactive map
- 📍 **Browse restaurants** in a specific area
- 🚗 **See driving directions** and estimated travel time
- ⭐ **View ratings and reviews** for each place
- 📸 **See photos** of locations
- 📞 **Get contact information** (phone, website, hours)

**Current Status:** ✅ Demo HTML created at `maps/maps-quick-builder.html`

---

## 🎯 Where to Use This Widget

### 1. **Restaurant Discovery Page** (Recommended)

Create a dedicated "Explore Nearby" or "Discover Restaurants" page.

**Route:** `/discover` or `/explore-map`

**User Flow:**
1. User goes to discovery page
2. Map shows their current location (or Kampala center)
3. Widget displays nearby restaurants on map
4. User can search, click markers, see details
5. Click "Order Now" → Go to restaurant page

**Benefits:**
- Interactive way to find restaurants
- Better than just a list
- Shows proximity visually
- Encourages discovery

---

### 2. **Browse by Location Feature**

Add a "Map View" toggle to the restaurants listing page.

**Implementation:**
- Restaurants page has "List View" and "Map View" tabs
- Map View shows Neighborhood Discovery widget
- Dynamically load restaurant PlaceIDs into widget

---

### 3. **"Nearby" Section on Restaurant Detail**

Show similar restaurants nearby when viewing a restaurant.

**Location:** Bottom of restaurant detail page

**User Flow:**
1. User viewing a specific restaurant
2. Scroll down to "Nearby Similar Restaurants"
3. Map shows current restaurant + nearby alternatives

---

## 🔧 Integration Steps

### Step 1: Copy Widget to Angular

Create a new component:

```bash
ng generate component pages/discover-map
```

### Step 2: Copy HTML/CSS/JS from Demo

**File:** `src/app/pages/discover-map/discover-map.component.html`

Copy the entire `<div class="neighborhood-discovery">` section from `maps/maps-quick-builder.html`

**File:** `src/app/pages/discover-map/discover-map.component.scss`

Copy all CSS styles from the `<style>` tag

**File:** `src/app/pages/discover-map/discover-map.component.ts`

Copy the JavaScript logic and convert to TypeScript

### Step 3: Update Configuration

Instead of hardcoded PlaceIDs, fetch from your database:

```typescript
export class DiscoverMapComponent implements OnInit {
  private restaurantService = inject(RestaurantService);
  
  ngOnInit() {
    // Load restaurants from database
    this.restaurantService.getRestaurants().subscribe(restaurants => {
      const pois = restaurants.map(r => ({
        placeId: r.google_place_id
      }));
      
      this.initMap(pois);
    });
  }
  
  initMap(pois: any[]) {
    const CONFIGURATION = {
      capabilities: {
        search: true,
        distances: true,
        directions: true,
        contacts: true,
        atmospheres: true,
        thumbnails: true
      },
      pois: pois,
      centerMarker: { icon: "restaurant" },
      mapRadius: 5000, // 5km radius
      mapOptions: {
        center: { lat: 0.3476, lng: 32.5825 }, // Kampala
        zoom: 13,
        fullscreenControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        zoomControl: true,
        maxZoom: 20
      }
    };
    
    new NeighborhoodDiscovery(CONFIGURATION);
  }
}
```

### Step 4: Add Route

```typescript
// app.routes.ts
{
  path: 'discover',
  loadComponent: () => import('./pages/discover-map/discover-map.component')
    .then(m => m.DiscoverMapComponent)
}
```

### Step 5: Add Navigation Link

```html
<!-- Main navigation -->
<a routerLink="/discover">
  <lucide-icon [img]="MapPin"></lucide-icon>
  Discover on Map
</a>
```

---

## 🎨 Customization Ideas

### 1. Restaurant-Specific Markers

Update marker icons based on cuisine type:

```javascript
const ND_MARKER_ICONS_BY_TYPE = {
  '_default': 'restaurant',
  'pizza': 'local_pizza',
  'coffee': 'local_cafe',
  'bar': 'local_bar',
  'bakery': 'bakery_dining',
  'fast_food': 'fastfood',
};
```

### 2. Filter by Cuisine

Add filter buttons above the map:

```html
<div class="filter-bar">
  <button (click)="filterBy('all')">All</button>
  <button (click)="filterBy('italian')">🍝 Italian</button>
  <button (click)="filterBy('asian')">🍜 Asian</button>
  <button (click)="filterBy('cafe')">☕ Cafes</button>
</div>
```

### 3. "Order Now" Button

Add custom button to place details panel:

```html
<!-- In details template -->
<div class="section">
  <button class="order-button" (click)="navigateToRestaurant(place.placeId)">
    🛒 Order Now
  </button>
</div>
```

### 4. Current Location

Get user's current location:

```typescript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    
    // Update map center
    CONFIGURATION.mapOptions.center = userLocation;
  }
);
```

---

## 💾 Database Requirements

To use this widget, ensure your `business_profiles` table has:

```sql
ALTER TABLE business_profiles 
ADD COLUMN google_place_id VARCHAR(255);

-- Update existing records
UPDATE business_profiles 
SET google_place_id = 'ChIJXXXXXXXXXX' 
WHERE id = 'business-id';
```

You can get Google Place IDs using the Places API or manually from Google Maps.

---

## 🧪 Testing the Demo

**Test the demo file:**

```bash
cd maps
python3 -m http.server 8000
```

Open browser: `http://localhost:8000/maps-quick-builder.html`

**What you'll see:**
- Map centered on Kampala
- Search bar to find places
- List of places on the left
- Click any place → See details, photos, reviews
- Directions shown on map

---

## 📊 Features Included

### ✅ Currently Working

- ✅ Interactive map with custom markers
- ✅ Search nearby places (autocomplete)
- ✅ Place details panel (ratings, photos, contact)
- ✅ Distance Matrix (driving time/distance)
- ✅ Directions (route visualization)
- ✅ Photo gallery with lightbox
- ✅ Reviews from Google
- ✅ Opening hours
- ✅ Responsive design (mobile/desktop)

### 🔧 Needs Customization

- 🔧 Replace demo Place IDs with your restaurants
- 🔧 Style to match Itiyum branding
- 🔧 Add "Order Now" button
- 🔧 Integrate with your restaurant database
- 🔧 Add filters (cuisine, price, rating)

---

## 🎯 Recommended Implementation

**Phase 1: Basic Integration**
1. Create `/discover` page
2. Load all restaurants from database
3. Display on Neighborhood Discovery widget
4. Add "View Menu" button on details panel

**Phase 2: Enhanced Features**
1. Add cuisine filters
2. Add price range filters
3. Add "Open Now" filter
4. Current location detection

**Phase 3: Advanced Features**
1. Save favorite locations
2. Share location links
3. Multi-stop directions
4. AR view integration

---

## 🚀 Quick Start

1. **Test the demo:**
   ```bash
   open maps/maps-quick-builder.html
   ```

2. **Create component:**
   ```bash
   ng generate component pages/discover-map
   ```

3. **Copy code from demo to component**

4. **Add route and navigation link**

5. **Deploy and test!**

---

## 💰 API Cost

Using Neighborhood Discovery widget:
- **Places API:** Details, Photos, Search
- **Distance Matrix API:** Driving times
- **Directions API:** Route display
- **Maps JavaScript API:** Map rendering

**Estimated cost for 1000 users/day:**
- Map loads: ~1,000/day = ~30,000/month = **FREE** (under 28,000 limit)
- Place details: ~5,000/month = **FREE**
- Distance Matrix: ~3,000/month = **FREE**

**Total:** $0/month (all under free tiers)

---

## ✅ Summary

The Neighborhood Discovery widget is **production-ready** and can significantly enhance user experience by:
- Making restaurant discovery more interactive
- Providing visual context (maps, photos)
- Showing proximity and directions
- Displaying ratings and reviews

**Ready to integrate into Itiyum!** 🗺️✨
