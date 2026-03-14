# 🔄 Automated Data Ingestion Architecture for Itiyum Platform

## 🎯 **CRITICAL PROBLEM**

**Current State**: Business owners must manually enter ALL data (menu items, reviews, photos, bookings, etc.)
**User Expectation**: Data should be automatically imported from existing sources
**Solution**: Multi-source automated data ingestion system

---

## 📊 **DATA SOURCES BY COMPONENT**

### 1. **Business Profile Data**
**What's Needed**: Name, address, phone, hours, description, photos

**Automated Sources**:
- ✅ **Google My Business API** - Primary source (90% of businesses)
- ✅ **Yelp Fusion API** - Secondary source
- ✅ **Facebook Places API** - Social data
- ✅ **Website Scraping** - Fallback for businesses with websites
- ⚠️ Manual Entry - Last resort

### 2. **Menu Items**
**What's Needed**: Item name, description, price, category, photos, dietary info

**Automated Sources**:
- ✅ **POS System Integrations** (Square, Toast, Clover, Lightspeed)
- ✅ **Website Scraping** - Extract menu from business website
- ✅ **Google My Business** - Menu data (if available)
- ✅ **PDF/Image Upload + OCR** - Parse menu PDFs/images
- ✅ **CSV/Excel Import** - Bulk upload
- ⚠️ Manual Entry - Last resort

### 3. **Reviews & Ratings**
**What's Needed**: Review text, rating, reviewer name, date, response

**Automated Sources**:
- ✅ **Google My Business API** - Sync Google reviews
- ✅ **Yelp Fusion API** - Sync Yelp reviews
- ✅ **TripAdvisor API** - Sync TripAdvisor reviews
- ✅ **Facebook Graph API** - Sync Facebook reviews
- ✅ **OpenTable API** - Restaurant reviews
- ⚠️ Manual Entry - For direct customer feedback

### 4. **Bookings/Reservations**
**What's Needed**: Customer name, date, time, party size, status

**Automated Sources**:
- ✅ **OpenTable API** - Restaurant reservations
- ✅ **Resy API** - Restaurant reservations
- ✅ **Google Calendar API** - Appointment bookings
- ✅ **Square Appointments API** - Service bookings
- ✅ **Email Parsing** - Parse confirmation emails
- ⚠️ Manual Entry - Walk-ins

### 5. **Photos**
**What's Needed**: Business photos, menu item photos, interior/exterior

**Automated Sources**:
- ✅ **Google My Business API** - Customer photos
- ✅ **Instagram API** - Social media photos
- ✅ **Facebook Graph API** - Facebook photos
- ✅ **Website Scraping** - Extract images from website
- ⚠️ Manual Upload - Professional photos

### 6. **Analytics/Insights**
**What's Needed**: Views, clicks, bookings, revenue, trends

**Automated Sources**:
- ✅ **Google Analytics API** - Website traffic
- ✅ **Google My Business API** - Search/view metrics
- ✅ **POS System APIs** - Sales data
- ✅ **Social Media APIs** - Engagement metrics
- ✅ **Internal Tracking** - Platform activity

---

## 🔧 **IMPLEMENTATION PHASES**

### **Phase 1: Quick Wins (Week 1-2)** 🚀
**Goal**: Get 80% of data automatically with minimal effort

#### 1.1 Google My Business Integration (Priority #1)
- **Why**: 90% of businesses have GMB profiles
- **What We Get**: Business info, reviews, photos, hours, Q&A
- **Implementation**: 
  - OAuth2 authentication
  - Sync business profile on signup
  - Daily sync for reviews/photos
  - Webhook for real-time updates

#### 1.2 Website Scraping (Priority #2)
- **Why**: Most businesses have websites with menus
- **What We Get**: Menu items, photos, business info
- **Implementation**:
  - User provides website URL
  - Puppeteer/Playwright scraper
  - AI-powered content extraction (GPT-4 Vision)
  - Manual review before import

#### 1.3 CSV/Excel Import (Priority #3)
- **Why**: Easy for businesses to export from existing systems
- **What We Get**: Menu items, customer data
- **Implementation**:
  - Template download
  - Drag-and-drop upload
  - Column mapping UI
  - Validation + preview before import

### **Phase 2: POS Integrations (Week 3-4)** 💳
**Goal**: Real-time menu and sales data

#### 2.1 Square Integration
- Menu items sync
- Sales data
- Customer data
- Inventory levels

#### 2.2 Toast Integration
- Menu management
- Order history
- Customer preferences

#### 2.3 Clover Integration
- Menu sync
- Transaction data
- Customer insights

### **Phase 3: Review Aggregation (Week 5-6)** ⭐
**Goal**: Centralize all reviews in one place

#### 3.1 Multi-Platform Review Sync
- Google My Business
- Yelp
- TripAdvisor
- Facebook
- OpenTable

#### 3.2 Review Management
- Unified inbox
- AI-powered response suggestions
- Sentiment analysis
- Auto-response for common feedback

### **Phase 4: Booking Integrations (Week 7-8)** 📅
**Goal**: Sync reservations from all platforms

#### 4.1 Reservation Platform Sync
- OpenTable
- Resy
- Google Reserve
- Square Appointments

#### 4.2 Email Parsing
- Gmail API integration
- Parse confirmation emails
- Extract booking details
- Auto-create bookings

### **Phase 5: Social Media & Photos (Week 9-10)** 📸
**Goal**: Automatic photo collection

#### 5.1 Social Media Integration
- Instagram Business API
- Facebook Graph API
- Auto-import tagged photos
- Customer photo permissions

#### 5.2 AI-Powered Photo Organization
- Auto-categorize (food, interior, exterior, team)
- Quality scoring
- Duplicate detection
- Auto-tagging

---

## 🛠️ **TECHNICAL ARCHITECTURE**

### Backend Services Structure
```
backend/
├── services/
│   ├── integrations/
│   │   ├── google-my-business.service.js
│   │   ├── yelp.service.js
│   │   ├── square.service.js
│   │   ├── toast.service.js
│   │   ├── opentable.service.js
│   │   ├── instagram.service.js
│   │   └── facebook.service.js
│   ├── scrapers/
│   │   ├── website-scraper.service.js
│   │   ├── menu-extractor.service.js
│   │   └── photo-extractor.service.js
│   ├── importers/
│   │   ├── csv-importer.service.js
│   │   ├── excel-importer.service.js
│   │   └── pdf-parser.service.js
│   └── sync/
│       ├── sync-scheduler.service.js
│       ├── sync-manager.service.js
│       └── conflict-resolver.service.js
├── routes/
│   └── integrations.js
└── jobs/
    ├── daily-sync.job.js
    ├── review-sync.job.js
    └── photo-sync.job.js
```

### Database Schema Additions
```sql
-- Integration Connections
CREATE TABLE integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  integration_type VARCHAR(50) NOT NULL, -- 'google_my_business', 'yelp', 'square', etc.
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'error'
  credentials JSONB, -- Encrypted OAuth tokens
  settings JSONB, -- Sync preferences
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync History
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES integration_connections(id),
  sync_type VARCHAR(50), -- 'reviews', 'menu', 'photos', 'bookings'
  status VARCHAR(20), -- 'success', 'partial', 'failed'
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Imported Data Tracking
CREATE TABLE imported_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  source_type VARCHAR(50), -- 'google_my_business', 'website_scrape', 'csv_import'
  source_id VARCHAR(255), -- External ID from source
  data_type VARCHAR(50), -- 'menu_item', 'review', 'photo', 'booking'
  local_id UUID, -- ID in our database
  raw_data JSONB, -- Original data from source
  import_status VARCHAR(20), -- 'pending', 'approved', 'rejected'
  imported_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP
);
```

---

## 🎯 **ONBOARDING FLOW (AUTOMATED)**

### Step 1: Business Signup
1. User creates account
2. **Wizard asks**: "Do you have a Google My Business profile?"
   - ✅ Yes → OAuth connect → Auto-import everything
   - ❌ No → Continue to manual setup

### Step 2: Data Import Options
**Show user a checklist**:
- [ ] Connect Google My Business (Recommended - 2 minutes)
- [ ] Connect Yelp (Optional - 1 minute)
- [ ] Import from website (Provide URL - 5 minutes)
- [ ] Connect POS system (Square/Toast/Clover - 3 minutes)
- [ ] Upload menu CSV/Excel (2 minutes)
- [ ] Enter manually (30+ minutes)

### Step 3: Review & Approve
- Show preview of imported data
- User can edit/approve/reject items
- Click "Publish" to go live

**Result**: Business goes from 0 to fully populated in **5-10 minutes** instead of hours!

---

## 📈 **SUCCESS METRICS**

| Metric | Before (Manual) | After (Automated) | Improvement |
|--------|----------------|-------------------|-------------|
| **Time to First Menu** | 30-60 min | 2-5 min | **90% faster** |
| **Data Accuracy** | 70% | 95% | **+25%** |
| **User Completion Rate** | 30% | 85% | **+55%** |
| **Reviews Collected** | 0 | 100+ | **∞** |
| **Photos Collected** | 5 | 50+ | **10x** |

---

## 🚀 **IMMEDIATE NEXT STEPS**

### This Week (Priority 1)
1. **Google My Business Integration** (2-3 days)
   - OAuth setup
   - Profile sync
   - Review sync
   - Photo sync

2. **Website Scraper** (2-3 days)
   - Basic scraper with Puppeteer
   - Menu extraction
   - Photo extraction

3. **CSV Import** (1 day)
   - Template creation
   - Upload UI
   - Validation logic

### Next Week (Priority 2)
4. **Square POS Integration** (3-4 days)
5. **Yelp Integration** (2 days)
6. **Review Aggregation Dashboard** (2 days)

---

**This architecture ensures businesses can populate their entire profile in minutes, not hours!** 🎉

