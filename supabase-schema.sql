-- ============================================
-- QR Digital Menu System — Database Schema
-- Run this in your JioBase SQL Editor
-- ============================================

-- 1. Restaurants Table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Restaurant',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns safely if they don't exist
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';

-- 2. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Main Course',
  type TEXT NOT NULL DEFAULT 'veg' CHECK (type IN ('veg', 'non-veg')),
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_vegan BOOLEAN DEFAULT false,
  is_gluten_free BOOLEAN DEFAULT false,
  has_egg BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  stock_count INT DEFAULT -1,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Safe migration
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_count INT DEFAULT -1;

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  table_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  applied_promo TEXT DEFAULT '',
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  payment_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Safe migration
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS applied_promo TEXT;
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS payment_id TEXT DEFAULT '';
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0;
-- Values: 'online' | 'cash' | 'counter'

-- Indexes for running-bill session lookup (table + restaurant + status + time)
CREATE INDEX IF NOT EXISTS idx_orders_session
  ON orders(restaurant_id, table_number, status, created_at DESC);


-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- 5. Special Offers Table
CREATE TABLE IF NOT EXISTS special_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT 'Offer',
  promo_code TEXT DEFAULT '',
  color_theme TEXT NOT NULL DEFAULT 'orange-red',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Advanced promo conditions (Safe Migration)
ALTER TABLE IF EXISTS special_offers ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage';
ALTER TABLE IF EXISTS special_offers ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE IF EXISTS special_offers ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE IF EXISTS special_offers ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 6. Reservations Table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  time TEXT NOT NULL,
  party_size INT NOT NULL DEFAULT 2,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Reservations: customers can insert, owner can read/update/delete
DROP POLICY IF EXISTS "Public can insert reservations" ON reservations;
CREATE POLICY "Public can insert reservations" ON reservations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owner can read reservations" ON reservations;
CREATE POLICY "Owner can read reservations" ON reservations FOR SELECT
  USING (EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = reservations.restaurant_id AND restaurants.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owner can update reservations" ON reservations;
CREATE POLICY "Owner can update reservations" ON reservations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = reservations.restaurant_id AND restaurants.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owner can delete reservations" ON reservations;
CREATE POLICY "Owner can delete reservations" ON reservations FOR DELETE
  USING (EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = reservations.restaurant_id AND restaurants.owner_id = auth.uid()));

-- Orders: public can UPDATE too (for payment_status after Razorpay)
DROP POLICY IF EXISTS "Public can update order payment" ON orders;
CREATE POLICY "Public can update order payment" ON orders FOR UPDATE
  USING (true) WITH CHECK (true);


-- Public read access (customers can view menus and offers)
DROP POLICY IF EXISTS "Public can read restaurants" ON restaurants;
CREATE POLICY "Public can read restaurants"
  ON restaurants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read menu items" ON menu_items;
CREATE POLICY "Public can read menu items"
  ON menu_items FOR SELECT
  USING (true);

-- Owner can insert their own restaurant
DROP POLICY IF EXISTS "Owner can insert restaurant" ON restaurants;
CREATE POLICY "Owner can insert restaurant"
  ON restaurants FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owner can update their own restaurant
DROP POLICY IF EXISTS "Owner can update own restaurant" ON restaurants;
CREATE POLICY "Owner can update own restaurant"
  ON restaurants FOR UPDATE
  USING (auth.uid() = owner_id);

-- Owner can insert menu items for their restaurant
DROP POLICY IF EXISTS "Owner can insert menu items" ON menu_items;
CREATE POLICY "Owner can insert menu items"
  ON menu_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_items.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Owner can update their menu items
DROP POLICY IF EXISTS "Owner can update own menu items" ON menu_items;
CREATE POLICY "Owner can update own menu items"
  ON menu_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_items.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Owner can delete their menu items
DROP POLICY IF EXISTS "Owner can delete own menu items" ON menu_items;
CREATE POLICY "Owner can delete own menu items"
  ON menu_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = menu_items.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- SPECIAL OFFERS POLICIES

-- Public can read active offers
DROP POLICY IF EXISTS "Public can read active offers" ON special_offers;
CREATE POLICY "Public can read active offers"
  ON special_offers FOR SELECT
  USING (true);

-- Owner can insert offers for their restaurant
DROP POLICY IF EXISTS "Owner can insert offers" ON special_offers;
CREATE POLICY "Owner can insert offers"
  ON special_offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = special_offers.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Owner can update their offers
DROP POLICY IF EXISTS "Owner can update own offers" ON special_offers;
CREATE POLICY "Owner can update own offers"
  ON special_offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = special_offers.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Owner can delete their offers
DROP POLICY IF EXISTS "Owner can delete own offers" ON special_offers;
CREATE POLICY "Owner can delete own offers"
  ON special_offers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = special_offers.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- ORDERS POLICIES

-- Public can insert orders (customers placing orders)
DROP POLICY IF EXISTS "Public can insert orders" ON orders;
CREATE POLICY "Public can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Public can insert order items
DROP POLICY IF EXISTS "Public can insert order items" ON order_items;
CREATE POLICY "Public can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- Owner can read their restaurant's orders
DROP POLICY IF EXISTS "Owner can read own orders" ON orders;
CREATE POLICY "Owner can read own orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Owner can update their restaurant's orders (change status)
DROP POLICY IF EXISTS "Owner can update own orders" ON orders;
CREATE POLICY "Owner can update own orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = orders.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Owner can read their restaurant's order items
DROP POLICY IF EXISTS "Owner can read own order items" ON order_items;
CREATE POLICY "Owner can read own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN restaurants ON restaurants.id = orders.restaurant_id
      WHERE orders.id = order_items.order_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- 4. Storage bucket (run from Supabase dashboard or API)
-- Create a public bucket called 'dish-images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('dish-images', 'dish-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to dish images
DROP POLICY IF EXISTS "Public can view dish images" ON storage.objects;
CREATE POLICY "Public can view dish images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dish-images');

-- Allow authenticated users to upload dish images
DROP POLICY IF EXISTS "Authenticated users can upload dish images" ON storage.objects;
CREATE POLICY "Authenticated users can upload dish images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dish-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their dish images
DROP POLICY IF EXISTS "Authenticated users can update dish images" ON storage.objects;
CREATE POLICY "Authenticated users can update dish images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'dish-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete dish images
DROP POLICY IF EXISTS "Authenticated users can delete dish images" ON storage.objects;
CREATE POLICY "Authenticated users can delete dish images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dish-images' AND auth.role() = 'authenticated');

-- 5. Create dynamic_charges table
CREATE TABLE IF NOT EXISTS dynamic_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'flat')),
    value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default CGST and SGST if the table is empty
INSERT INTO dynamic_charges (name, type, value, is_active)
SELECT 'CGST', 'percentage', 2.5, true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_charges WHERE name = 'CGST');

INSERT INTO dynamic_charges (name, type, value, is_active)
SELECT 'SGST', 'percentage', 2.5, true
WHERE NOT EXISTS (SELECT 1 FROM dynamic_charges WHERE name = 'SGST');
