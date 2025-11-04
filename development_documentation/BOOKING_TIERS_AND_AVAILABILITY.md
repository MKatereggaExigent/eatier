# Booking Tiers and Availability Management System

## 📋 Overview

This document describes the enhanced booking system with **tier-based reservations** and **availability management** to prevent double-bookings and create revenue opportunities.

---

## 🎯 Business Value

### Revenue Drivers
1. **Tiered Pricing**: Generate revenue from reservation fees
   - Basic: $0 (Free)
   - Standard: $5
   - Premium: $15
   - Priority: $25

2. **Customer Segmentation**: Different service levels for different customers
   - VIP customers get priority access
   - Premium customers get better cancellation policies
   - Standard customers get enhanced features

3. **Capacity Optimization**: Maximize restaurant utilization
   - Prevent double-bookings
   - Allocate capacity across tiers
   - Manage waitlists for fully booked slots

---

## 🏗️ Architecture

### Database Schema

#### 1. **booking_tier** (ENUM)
```sql
CREATE TYPE booking_tier AS ENUM ('basic', 'standard', 'premium', 'priority');
```

#### 2. **bookings** table (Enhanced)
New columns added:
- `booking_tier` - The tier level of the booking
- `tier_price` - Price paid for the tier
- `booking_reference` - Unique booking reference code
- `contact_name`, `contact_phone`, `contact_email` - Contact information
- `table_preferences`, `occasion` - Additional booking details
- `confirmed_at`, `cancelled_at`, `cancellation_reason` - Status tracking

#### 3. **business_capacity_settings** table
Stores capacity and pricing configuration for each business:
- Total capacity and table count
- Slot duration and buffer time
- Tier pricing (basic, standard, premium, priority)
- Tier capacity allocation percentages
- Cancellation and refund policies per tier

#### 4. **booking_time_slots** table
Tracks available time slots per business per day:
- Slot date and time
- Capacity per tier (basic, standard, premium, priority)
- Current bookings per tier
- Availability status
- Block status (manually blocked by business)

#### 5. **booking_waitlist** table
Manages customers waiting for fully booked slots:
- Preferred date and time
- Party size and tier
- Contact information
- Notification and expiration tracking

#### 6. **booking_tier_benefits** table
Defines benefits and features for each tier:
- Tier name, description, color, icon
- Benefits list (JSON array)
- Priority level
- Feature flags (cancellation, modification, table preference, etc.)

---

## 🔧 Backend API Endpoints

### Booking Availability Routes (`/api/booking-availability`)

#### 1. **GET /tiers**
Get all booking tier information with benefits
```json
{
  "tiers": [
    {
      "tier": "basic",
      "tier_name": "Basic",
      "tier_description": "Standard reservation with basic features",
      "tier_color": "#6B7280",
      "tier_icon": "🍽️",
      "benefits": ["Make reservations", "Email confirmation", "24h cancellation"],
      "priority_level": 1,
      "allows_cancellation": true,
      "gets_table_preference": false
    },
    // ... other tiers
  ]
}
```

#### 2. **GET /business/:businessId/settings**
Get capacity settings for a business
```json
{
  "settings": {
    "total_capacity": 50,
    "tables_count": 10,
    "slot_duration_minutes": 90,
    "basic_tier_price": 0.00,
    "standard_tier_price": 5.00,
    "premium_tier_price": 15.00,
    "priority_tier_price": 25.00,
    "enable_tier_system": true
  }
}
```

#### 3. **GET /business/:businessId/slots?date=YYYY-MM-DD&tier=basic**
Get available time slots for a business on a specific date
```json
{
  "slots": [
    {
      "id": "uuid",
      "slot_date": "2025-10-20",
      "slot_time": "18:00:00",
      "slot_end_time": "19:30:00",
      "total_capacity": 50,
      "basic_capacity": 20,
      "basic_booked": 5,
      "tier_available": 15,
      "is_tier_available": true,
      "is_available": true,
      "is_blocked": false
    },
    // ... more slots
  ]
}
```

#### 4. **POST /check**
Check if a specific slot is available for booking
```json
// Request
{
  "businessId": "uuid",
  "date": "2025-10-20",
  "time": "18:00:00",
  "tier": "premium",
  "partySize": 4
}

// Response
{
  "is_available": true,
  "slot": { /* slot details */ }
}
```

#### 5. **POST /waitlist**
Add customer to waitlist for a fully booked slot
```json
// Request
{
  "businessId": "uuid",
  "userId": "uuid",
  "preferredDate": "2025-10-20",
  "preferredTime": "18:00:00",
  "partySize": 4,
  "tier": "premium",
  "contactName": "John Doe",
  "contactPhone": "+1234567890",
  "contactEmail": "john@example.com"
}

// Response
{
  "message": "Added to waitlist successfully",
  "waitlist": { /* waitlist entry */ }
}
```

### Enhanced Bookings Route (`/api/bookings`)

#### **POST /** (Enhanced)
Create new booking with tier support
```json
// Request
{
  "businessId": "uuid",
  "userId": "uuid",
  "bookingDate": "2025-10-20",
  "bookingTime": "18:00:00",
  "partySize": 4,
  "bookingTier": "premium",  // NEW
  "contactName": "John Doe",
  "contactPhone": "+1234567890",
  "contactEmail": "john@example.com",
  "specialRequests": "Window seat please",
  "tablePreferences": "Quiet area",
  "occasion": "Anniversary"
}

// Response
{
  "id": "uuid",
  "booking_reference": "BK12345678",
  "booking_tier": "premium",
  "tier_price": 15.00,
  "total_amount": 15.00,
  "status": "pending",
  // ... other booking details
}
```

**Validation**:
- Checks slot availability before creating booking
- Returns error if slot is not available for the selected tier
- Automatically calculates tier price based on business settings
- Generates unique booking reference

---

## 🎨 Frontend Integration

### TypeScript Interfaces

```typescript
export interface BookingTier {
  tier: 'basic' | 'standard' | 'premium' | 'priority';
  tier_name: string;
  tier_description: string;
  tier_color: string;
  tier_icon: string;
  benefits: string[];
  priority_level: number;
  allows_cancellation: boolean;
  allows_modification: boolean;
  gets_confirmation_priority: boolean;
  gets_table_preference: boolean;
  gets_special_requests: boolean;
}

export interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  slot_end_time: string;
  total_capacity: number;
  tier_capacity: number;
  tier_booked: number;
  tier_available: number;
  is_tier_available: boolean;
  is_available: boolean;
  is_blocked: boolean;
}
```

### Service Methods

```typescript
// Get all booking tiers
getBookingTiers(): Observable<BookingTier[]>

// Get business capacity settings
getBusinessCapacitySettings(businessId: string): Observable<BusinessCapacitySettings>

// Get available time slots
getAvailableSlots(businessId: string, date: string, tier: string): Observable<TimeSlot[]>

// Check slot availability
checkSlotAvailability(businessId: string, date: string, time: string, tier: string, partySize: number): Observable<{is_available: boolean, slot: TimeSlot}>

// Add to waitlist
addToWaitlist(businessId: string, userId: string, ...): Observable<any>

// Create booking with tier
createBooking(bookingRequest: BookingRequest): Observable<Booking>
```

---

## 🚀 Usage Examples

### Example 1: Display Booking Tiers

```typescript
this.bookingsService.getBookingTiers().subscribe(tiers => {
  this.availableTiers = tiers;
  // Display tiers in UI with pricing and benefits
});
```

### Example 2: Check Availability Before Booking

```typescript
this.bookingsService.checkSlotAvailability(
  businessId,
  '2025-10-20',
  '18:00:00',
  'premium',
  4
).subscribe(result => {
  if (result.is_available) {
    // Proceed with booking
  } else {
    // Show waitlist option
  }
});
```

### Example 3: Create Booking with Tier

```typescript
const bookingRequest: BookingRequest = {
  restaurantId: businessId,
  bookingDate: '2025-10-20',
  bookingTime: '18:00:00',
  partySize: 4,
  bookingTier: 'premium',  // Selected tier
  contactName: 'John Doe',
  contactPhone: '+1234567890',
  contactEmail: 'john@example.com'
};

this.bookingsService.createBooking(bookingRequest).subscribe(
  booking => {
    console.log('Booking created:', booking.booking_reference);
  },
  error => {
    if (error.error.code === 'SLOT_NOT_AVAILABLE') {
      // Offer waitlist option
    }
  }
);
```

---

## 📊 Tier Comparison

| Feature | Basic | Standard | Premium | Priority |
|---------|-------|----------|---------|----------|
| **Price** | $0 | $5 | $15 | $25 |
| **Advance Booking** | 7 days | 14 days | 30 days | 60 days |
| **Cancellation Window** | 24 hours | 12 hours | 6 hours | 2 hours |
| **Refund** | 0% | 50% | 75% | 100% |
| **Capacity Allocation** | 40% | 30% | 20% | 10% |
| **Table Preference** | ❌ | ✅ | ✅ | ✅ |
| **Special Requests** | ❌ | ❌ | ✅ | ✅ |
| **Priority Confirmation** | ❌ | ❌ | ✅ | ✅ |
| **Modifications** | ❌ | 1 time | Unlimited | Unlimited |

---

## 🔄 Automatic Slot Management

### Slot Generation
- Slots are automatically generated when first requested for a date
- Default slots: 11:00 AM to 10:00 PM (every 30 minutes)
- Capacity is allocated based on business settings

### Capacity Updates
- Database trigger automatically updates slot capacity when bookings are created or cancelled
- Prevents race conditions and double-bookings
- Real-time availability tracking

---

## ✅ Next Steps

### Frontend Implementation
1. **Update Booking Form** - Add tier selection UI
2. **Show Availability Calendar** - Display available/booked slots
3. **Tier Comparison Modal** - Help customers choose the right tier
4. **Waitlist UI** - Allow customers to join waitlist for full slots
5. **Booking Confirmation** - Show tier benefits and pricing

### Business Owner Features
1. **Capacity Management** - Allow businesses to configure capacity settings
2. **Slot Blocking** - Allow businesses to block specific time slots
3. **Tier Pricing** - Allow businesses to set custom tier prices
4. **Waitlist Management** - Notify customers when slots become available

### Admin Features
1. **Platform Analytics** - Track tier adoption and revenue
2. **Business Performance** - Monitor booking patterns across tiers
3. **Capacity Optimization** - Recommend optimal capacity allocation

---

## 🎉 Summary

The booking tier and availability system is now fully implemented with:

✅ **Database Schema** - All tables and triggers created  
✅ **Backend API** - Complete REST API for tiers and availability  
✅ **Frontend Service** - TypeScript interfaces and service methods  
✅ **Availability Checking** - Prevent double-bookings  
✅ **Tier-Based Pricing** - Revenue generation through tiers  
✅ **Waitlist Management** - Handle fully booked slots  
✅ **Automatic Slot Generation** - Dynamic time slot creation  

**Ready for frontend UI implementation!** 🚀

