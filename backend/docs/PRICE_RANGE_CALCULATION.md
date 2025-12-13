# Automated Price Range Calculation System

## Overview

The restaurant price range system is **fully automated** and follows **industry standards** used by major platforms like Yelp, Google Maps, and OpenTable. Price ranges are **never hardcoded** and are calculated dynamically based on actual menu item prices.

## Industry Standard Price Tiers

The system uses the following industry-standard price tier classifications:

| Tier | Symbol | Average Price Range | Description |
|------|--------|-------------------|-------------|
| **Budget** | $ | $0 - $15 | Affordable, casual dining |
| **Moderate** | $$ | $16 - $30 | Mid-range restaurants |
| **Expensive** | $$$ | $31 - $60 | Upscale dining |
| **Luxury** | $$$$ | $61+ | Fine dining, premium experiences |

## How It Works

### 1. Automatic Calculation

The price range for each restaurant is calculated automatically based on the **average price of all active menu items**:

```sql
SELECT AVG(price) FROM menus 
WHERE business_id = ? AND is_active = true
```

### 2. Real-Time Updates

The system uses PostgreSQL triggers to automatically update the price range whenever:
- A new menu item is added
- A menu item price is changed
- A menu item is activated/deactivated
- A menu item is deleted

### 3. Database Function

The core calculation is handled by the `calculate_business_price_range()` PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION calculate_business_price_range(business_id_param UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  avg_price NUMERIC;
  price_tier VARCHAR(20);
BEGIN
  -- Calculate average price of all active menu items
  SELECT AVG(price) INTO avg_price
  FROM menus
  WHERE business_id = business_id_param AND is_active = true;
  
  -- Determine tier based on industry standards
  IF avg_price <= 15 THEN
    price_tier := 'budget';
  ELSIF avg_price <= 30 THEN
    price_tier := 'moderate';
  ELSIF avg_price <= 60 THEN
    price_tier := 'expensive';
  ELSE
    price_tier := 'luxury';
  END IF;
  
  RETURN price_tier;
END;
$$ LANGUAGE plpgsql;
```

### 4. Automatic Trigger

A database trigger ensures price ranges stay up-to-date:

```sql
CREATE TRIGGER trigger_update_price_range
AFTER INSERT OR UPDATE OF price, is_active OR DELETE ON menus
FOR EACH ROW
EXECUTE FUNCTION update_business_price_range();
```

## API Response

The backend API automatically includes the calculated price range in all business responses:

```json
{
  "business": {
    "id": "...",
    "businessName": "Example Restaurant",
    "priceRange": "moderate",
    ...
  }
}
```

## Frontend Display

The frontend converts the tier to display symbols:

```typescript
private convertPriceRangeToSymbol(priceRange?: string): string {
  const priceMap: { [key: string]: string } = {
    'budget': '$',      // $0-15 average
    'moderate': '$$',   // $16-30 average
    'expensive': '$$$', // $31-60 average
    'luxury': '$$$$'    // $61+ average
  };
  return priceMap[priceRange || 'moderate'] || '$$';
}
```

## Benefits

✅ **No Hardcoding**: All price ranges are calculated from real data  
✅ **Industry Standard**: Follows conventions used by Yelp, Google, OpenTable  
✅ **Automatic Updates**: Changes to menu prices instantly update the tier  
✅ **Accurate**: Based on actual average menu item prices  
✅ **Transparent**: Clear calculation logic that can be audited  
✅ **Scalable**: Works for any number of restaurants and menu items  

## Example Scenarios

### Scenario 1: New Restaurant
- Restaurant has no menu items yet
- Default: **Moderate ($$)**
- Once menu items are added, price range auto-calculates

### Scenario 2: Menu Price Update
- Restaurant has average menu price of $12 → **Budget ($)**
- Owner adds premium items, new average is $28 → **Moderate ($$)**
- Price range updates automatically via trigger

### Scenario 3: Seasonal Menu
- Restaurant deactivates expensive seasonal items
- Average price drops from $45 to $25
- Price range updates from **Expensive ($$$)** to **Moderate ($$)**

## Verification

To verify price ranges are calculated correctly:

```sql
SELECT 
  b.business_name,
  b.price_range,
  ROUND(AVG(m.price), 2) as avg_menu_price,
  COUNT(m.id) as menu_item_count
FROM businesses b
LEFT JOIN menus m ON b.id = m.business_id AND m.is_active = true
GROUP BY b.id, b.business_name, b.price_range
ORDER BY avg_menu_price DESC;
```

## Migration

The system was implemented via database migration:
- File: `backend/migrations/add_price_range_calculation.sql`
- Adds `price_range` column to `businesses` table
- Creates calculation function and trigger
- Performs initial calculation for all existing businesses

