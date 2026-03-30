-- ============================================================
-- MIGRATION: Add features from QR_based_ordering to Qr final
-- Run this in your Supabase SQL editor
-- Generated: 2026-03-27
-- ============================================================

-- 1. Ensure the 'offers' table exists (from QR_based_ordering schema)
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,           -- 'percentage', 'flat', 'free_item'
    min_order_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_value DECIMAL(10, 2),       -- Used for percentage or flat amount
    free_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    is_auto_apply BOOLEAN DEFAULT true,
    promo_code VARCHAR(50),              -- Used when is_auto_apply = false
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_redemptions_total INTEGER,
    max_redemptions_per_user INTEGER,
    total_redemptions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage their offers' AND tablename = 'offers') THEN
        CREATE POLICY "Admins can manage their offers" ON public.offers
            FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view active offers' AND tablename = 'offers') THEN
        CREATE POLICY "Public can view active offers" ON public.offers
            FOR SELECT USING (is_active = true);
    END IF;
END $$;

-- 2. Add applied_offer_id to orders table and other missing columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS applied_offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'starter';

-- 3. Add 'tables' table (for per-table QR codes with proper UUIDs)
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    table_number VARCHAR(50) NOT NULL,
    qr_code_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage their tables' AND tablename = 'tables') THEN
        CREATE POLICY "Admins can manage their tables" ON public.tables
            FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view tables' AND tablename = 'tables') THEN
        CREATE POLICY "Public can view tables" ON public.tables FOR SELECT USING (true);
    END IF;
END $$;

-- 4. Add missing columns to the 'restaurants' table
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS is_accepting_orders BOOLEAN DEFAULT true;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Add missing columns and dietary tags to menu_items (from Qr final)
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Uncategorized';
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'veg';
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_veg BOOLEAN DEFAULT true;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_gluten_free BOOLEAN DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS has_egg BOOLEAN DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_spicy BOOLEAN DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS stock_count INT DEFAULT -1;

-- 6. Ensure 'reservations' table exists (from Qr final)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    date DATE NOT NULL,
    time TEXT NOT NULL,
    party_size INT NOT NULL DEFAULT 2,
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert reservations' AND tablename = 'reservations') THEN
        CREATE POLICY "Public can insert reservations" ON public.reservations FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage reservations' AND tablename = 'reservations') THEN
        CREATE POLICY "Admins can manage reservations" ON public.reservations
            FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 7. Ensure 'dynamic_charges' table exists (for CGST/SGST)
CREATE TABLE IF NOT EXISTS public.dynamic_charges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'flat')),
    value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dynamic_charges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read charges' AND tablename = 'dynamic_charges') THEN
        CREATE POLICY "Public can read charges" ON public.dynamic_charges FOR SELECT USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage charges' AND tablename = 'dynamic_charges') THEN
        CREATE POLICY "Admins can manage charges" ON public.dynamic_charges
            FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 8. Sponsored/Featured items (billboard section)
CREATE TABLE IF NOT EXISTS public.sponsored_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
    label TEXT DEFAULT 'Featured',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, menu_item_id)
);

ALTER TABLE public.sponsored_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read sponsored' AND tablename = 'sponsored_items') THEN
        CREATE POLICY "Anyone can read sponsored" ON public.sponsored_items FOR SELECT USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage sponsored' AND tablename = 'sponsored_items') THEN
        CREATE POLICY "Admins manage sponsored" ON public.sponsored_items
            FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
    END IF;
END $$;

-- 9. Enable Realtime on orders and order_items (safe, skips if already added)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;
END $$;

-- 9. Ensure menu-images storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access to menu-images' AND tablename = 'objects') THEN
        CREATE POLICY "Public Access to menu-images" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth Upload to menu-images' AND tablename = 'objects') THEN
        CREATE POLICY "Auth Upload to menu-images" ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- 10. Fix order_items missing 'name' column (Required for placing orders)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- 11. Fix restaurants missing 'address' column (Required for registration)
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS address TEXT;

