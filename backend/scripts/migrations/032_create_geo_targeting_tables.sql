-- Migration 032: Create geo-targeting tables (regions, countries, cities)
-- This migration creates tables for proper geographical data management

-- ============================================
-- REGIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COUNTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2 code (e.g., ZA, KE, UG)
    currency_code VARCHAR(10) NOT NULL, -- ISO 4217 code (e.g., ZAR, KES, UGX)
    currency_symbol VARCHAR(10) NOT NULL,
    currency_name VARCHAR(50) NOT NULL,
    phone_code VARCHAR(10), -- e.g., +27, +254, +256
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_capital BOOLEAN DEFAULT false,
    is_major_city BOOLEAN DEFAULT true,
    population INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_id, name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_countries_region_id ON countries(region_id);
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);
CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);

-- ============================================
-- SEED REGIONS
-- ============================================
INSERT INTO regions (name, code, description) VALUES
('Southern Africa', 'southern-africa', 'Southern African countries'),
('East Africa', 'east-africa', 'East African countries'),
('West Africa', 'west-africa', 'West African countries'),
('North Africa', 'north-africa', 'North African countries'),
('Central Africa', 'central-africa', 'Central African countries'),
('North America', 'north-america', 'North American countries'),
('Europe', 'europe', 'European countries'),
('Asia', 'asia', 'Asian countries'),
('Oceania', 'oceania', 'Oceania countries')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED COUNTRIES (with correct currency information)
-- ============================================
INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code) 
SELECT r.id, 'South Africa', 'ZA', 'ZAR', 'R', 'South African Rand', '+27'
FROM regions r WHERE r.code = 'southern-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code) 
SELECT r.id, 'Kenya', 'KE', 'KES', 'KSh', 'Kenyan Shilling', '+254'
FROM regions r WHERE r.code = 'east-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code) 
SELECT r.id, 'Uganda', 'UG', 'UGX', 'USh', 'Ugandan Shilling', '+256'
FROM regions r WHERE r.code = 'east-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code) 
SELECT r.id, 'Tanzania', 'TZ', 'TZS', 'TSh', 'Tanzanian Shilling', '+255'
FROM regions r WHERE r.code = 'east-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code) 
SELECT r.id, 'Ethiopia', 'ET', 'ETB', 'Br', 'Ethiopian Birr', '+251'
FROM regions r WHERE r.code = 'east-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code) 
SELECT r.id, 'Rwanda', 'RW', 'RWF', 'FRw', 'Rwandan Franc', '+250'
FROM regions r WHERE r.code = 'east-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code)
SELECT r.id, 'Ghana', 'GH', 'GHS', 'GH₵', 'Ghanaian Cedi', '+233'
FROM regions r WHERE r.code = 'west-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code)
SELECT r.id, 'Nigeria', 'NG', 'NGN', '₦', 'Nigerian Naira', '+234'
FROM regions r WHERE r.code = 'west-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code)
SELECT r.id, 'United States', 'US', 'USD', '$', 'US Dollar', '+1'
FROM regions r WHERE r.code = 'north-america'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code)
SELECT r.id, 'United Kingdom', 'GB', 'GBP', '£', 'British Pound', '+44'
FROM regions r WHERE r.code = 'europe'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code)
SELECT r.id, 'Botswana', 'BW', 'BWP', 'P', 'Botswana Pula', '+267'
FROM regions r WHERE r.code = 'southern-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code)
SELECT r.id, 'Zimbabwe', 'ZW', 'USD', '$', 'US Dollar', '+263'
FROM regions r WHERE r.code = 'southern-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code)
SELECT r.id, 'Namibia', 'NA', 'NAD', '$', 'Namibian Dollar', '+264'
FROM regions r WHERE r.code = 'southern-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

INSERT INTO countries (region_id, name, code, currency_code, currency_symbol, currency_name, phone_code)
SELECT r.id, 'Mozambique', 'MZ', 'MZN', 'MT', 'Mozambican Metical', '+258'
FROM regions r WHERE r.code = 'southern-africa'
ON CONFLICT (code) DO UPDATE SET
    currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    currency_name = EXCLUDED.currency_name;

-- ============================================
-- SEED CITIES (with correct country mappings)
-- ============================================

-- South Africa cities
INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Johannesburg', 'Gauteng', false, true, -26.2041, 28.0473
FROM countries c WHERE c.code = 'ZA'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Cape Town', 'Western Cape', true, true, -33.9249, 18.4241
FROM countries c WHERE c.code = 'ZA'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Durban', 'KwaZulu-Natal', false, true, -29.8587, 31.0218
FROM countries c WHERE c.code = 'ZA'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Pretoria', 'Gauteng', true, true, -25.7479, 28.2293
FROM countries c WHERE c.code = 'ZA'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Port Elizabeth', 'Eastern Cape', false, true, -33.9608, 25.6022
FROM countries c WHERE c.code = 'ZA'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Sandton', 'Gauteng', false, true, -26.1076, 28.0567
FROM countries c WHERE c.code = 'ZA'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Rosebank', 'Gauteng', false, true, -26.1467, 28.0406
FROM countries c WHERE c.code = 'ZA'
ON CONFLICT (country_id, name) DO NOTHING;

-- Kenya cities (Mombasa is in Kenya, NOT South Africa!)
INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Nairobi', 'Nairobi County', true, true, -1.2864, 36.8172
FROM countries c WHERE c.code = 'KE'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Mombasa', 'Mombasa County', false, true, -4.0435, 39.6682
FROM countries c WHERE c.code = 'KE'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Kisumu', 'Kisumu County', false, true, -0.0917, 34.7680
FROM countries c WHERE c.code = 'KE'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Nakuru', 'Nakuru County', false, true, -0.3031, 36.0800
FROM countries c WHERE c.code = 'KE'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Eldoret', 'Uasin Gishu County', false, true, 0.5143, 35.2698
FROM countries c WHERE c.code = 'KE'
ON CONFLICT (country_id, name) DO NOTHING;

-- Uganda cities
INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Kampala', 'Central Region', true, true, 0.3476, 32.5825
FROM countries c WHERE c.code = 'UG'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Entebbe', 'Central Region', false, true, 0.0564, 32.4795
FROM countries c WHERE c.code = 'UG'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Jinja', 'Eastern Region', false, true, 0.4244, 33.2040
FROM countries c WHERE c.code = 'UG'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Mbale', 'Eastern Region', false, true, 1.0820, 34.1753
FROM countries c WHERE c.code = 'UG'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Gulu', 'Northern Region', false, true, 2.7747, 32.2990
FROM countries c WHERE c.code = 'UG'
ON CONFLICT (country_id, name) DO NOTHING;

-- Tanzania cities
INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Dar es Salaam', 'Dar es Salaam Region', false, true, -6.7924, 39.2083
FROM countries c WHERE c.code = 'TZ'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Dodoma', 'Dodoma Region', true, true, -6.1630, 35.7516
FROM countries c WHERE c.code = 'TZ'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Arusha', 'Arusha Region', false, true, -3.3869, 36.6830
FROM countries c WHERE c.code = 'TZ'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Mwanza', 'Mwanza Region', false, true, -2.5164, 32.9175
FROM countries c WHERE c.code = 'TZ'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Mbeya', 'Mbeya Region', false, true, -8.9094, 33.4606
FROM countries c WHERE c.code = 'TZ'
ON CONFLICT (country_id, name) DO NOTHING;

-- Ethiopia cities
INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Addis Ababa', 'Addis Ababa', true, true, 9.0320, 38.7469
FROM countries c WHERE c.code = 'ET'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Dire Dawa', 'Dire Dawa', false, true, 9.5930, 41.8661
FROM countries c WHERE c.code = 'ET'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Mekelle', 'Tigray', false, true, 13.4967, 39.4753
FROM countries c WHERE c.code = 'ET'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Gondar', 'Amhara', false, true, 12.6000, 37.4667
FROM countries c WHERE c.code = 'ET'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Hawassa', 'SNNPR', false, true, 7.0500, 38.4667
FROM countries c WHERE c.code = 'ET'
ON CONFLICT (country_id, name) DO NOTHING;

-- Ghana cities
INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Accra', 'Greater Accra', true, true, 5.6037, -0.1870
FROM countries c WHERE c.code = 'GH'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Kumasi', 'Ashanti', false, true, 6.6885, -1.6244
FROM countries c WHERE c.code = 'GH'
ON CONFLICT (country_id, name) DO NOTHING;

-- United States cities
INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'New York', 'New York', false, true, 40.7128, -74.0060
FROM countries c WHERE c.code = 'US'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Los Angeles', 'California', false, true, 34.0522, -118.2437
FROM countries c WHERE c.code = 'US'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Chicago', 'Illinois', false, true, 41.8781, -87.6298
FROM countries c WHERE c.code = 'US'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Houston', 'Texas', false, true, 29.7604, -95.3698
FROM countries c WHERE c.code = 'US'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Phoenix', 'Arizona', false, true, 33.4484, -112.0740
FROM countries c WHERE c.code = 'US'
ON CONFLICT (country_id, name) DO NOTHING;

-- United Kingdom cities
INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'London', 'England', true, true, 51.5074, -0.1278
FROM countries c WHERE c.code = 'GB'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Manchester', 'England', false, true, 53.4808, -2.2426
FROM countries c WHERE c.code = 'GB'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Birmingham', 'England', false, true, 52.4862, -1.8904
FROM countries c WHERE c.code = 'GB'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Leeds', 'England', false, true, 53.8008, -1.5491
FROM countries c WHERE c.code = 'GB'
ON CONFLICT (country_id, name) DO NOTHING;

INSERT INTO cities (country_id, name, state_province, is_capital, is_major_city, latitude, longitude)
SELECT c.id, 'Glasgow', 'Scotland', false, true, 55.8642, -4.2518
FROM countries c WHERE c.code = 'GB'
ON CONFLICT (country_id, name) DO NOTHING;

