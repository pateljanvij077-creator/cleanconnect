-- CleanConnect Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Homeowners Table
CREATE TABLE IF NOT EXISTS homeowners (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Workers Table
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    experience_years INTEGER DEFAULT 0,
    hourly_rate NUMERIC DEFAULT 0.00,
    worker_type TEXT DEFAULT 'both', -- 'home_cleaning', 'office_cleaning', 'both'
    verification_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    is_verified BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    availability_status TEXT DEFAULT 'available',
    is_subscription_active BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    upi_qr_url TEXT,
    rating NUMERIC DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Worker Locations
CREATE TABLE IF NOT EXISTS worker_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    location_name TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    radius_km NUMERIC DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Worker Documents (KYC)
CREATE TABLE IF NOT EXISTS worker_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL, -- 'aadhaar', 'pan'
    doc_url TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homeowner_id UUID REFERENCES homeowners(id) ON DELETE SET NULL,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'cancelled'
    service_date DATE NOT NULL,
    service_time TIME NOT NULL,
    hours NUMERIC DEFAULT 2,
    total_price NUMERIC NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    call_confirmed BOOLEAN DEFAULT false,
    cancelled_by UUID REFERENCES auth.users(id),
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 6. Favorites
CREATE TABLE IF NOT EXISTS favorites (
    homeowner_id UUID REFERENCES homeowners(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    PRIMARY KEY (homeowner_id, worker_id)
);

-- 7. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    homeowner_id UUID REFERENCES homeowners(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 8. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'completed',
    payment_method TEXT DEFAULT 'upi',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Set up Row Level Security (RLS) - FOR DEVELOPMENT ONLY (Allow All)
-- Warning: In a production app, you should restrict these policies.

ALTER TABLE homeowners ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access to homeowners" ON homeowners FOR SELECT USING (true);
CREATE POLICY "Allow all write access to homeowners" ON homeowners FOR ALL USING (true);

CREATE POLICY "Allow all read access to workers" ON workers FOR SELECT USING (true);
CREATE POLICY "Allow all write access to workers" ON workers FOR ALL USING (true);

CREATE POLICY "Allow all read access to worker_locations" ON worker_locations FOR SELECT USING (true);
CREATE POLICY "Allow all write access to worker_locations" ON worker_locations FOR ALL USING (true);

CREATE POLICY "Allow all read access to worker_documents" ON worker_documents FOR SELECT USING (true);
CREATE POLICY "Allow all write access to worker_documents" ON worker_documents FOR ALL USING (true);

CREATE POLICY "Allow all read access to bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow all write access to bookings" ON bookings FOR ALL USING (true);

CREATE POLICY "Allow all read access to favorites" ON favorites FOR SELECT USING (true);
CREATE POLICY "Allow all write access to favorites" ON favorites FOR ALL USING (true);

CREATE POLICY "Allow all read access to reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Allow all write access to reviews" ON reviews FOR ALL USING (true);

CREATE POLICY "Allow all read access to payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Allow all write access to payments" ON payments FOR ALL USING (true);

-- Create Storage Buckets (if you use Supabase Storage for docs/photos)
-- Note: You might need to run these via the dashboard UI if SQL errors out
INSERT INTO storage.buckets (id, name, public) VALUES ('worker-photos', 'worker-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('aadhaar-docs', 'aadhaar-docs', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('pan-docs', 'pan-docs', true) ON CONFLICT DO NOTHING;

-- Storage Policies for worker-photos
CREATE POLICY "Allow public select access to worker-photos" ON storage.objects FOR SELECT USING (bucket_id = 'worker-photos');
CREATE POLICY "Allow authenticated uploads to worker-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'worker-photos');
CREATE POLICY "Allow authenticated updates to worker-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'worker-photos');
CREATE POLICY "Allow authenticated deletes to worker-photos" ON storage.objects FOR DELETE USING (bucket_id = 'worker-photos');

-- Storage Policies for aadhaar-docs
CREATE POLICY "Allow public select access to aadhaar-docs" ON storage.objects FOR SELECT USING (bucket_id = 'aadhaar-docs');
CREATE POLICY "Allow authenticated uploads to aadhaar-docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'aadhaar-docs');
CREATE POLICY "Allow authenticated updates to aadhaar-docs" ON storage.objects FOR UPDATE USING (bucket_id = 'aadhaar-docs');

-- Storage Policies for pan-docs
CREATE POLICY "Allow public select access to pan-docs" ON storage.objects FOR SELECT USING (bucket_id = 'pan-docs');
CREATE POLICY "Allow authenticated uploads to pan-docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pan-docs');
CREATE POLICY "Allow authenticated updates to pan-docs" ON storage.objects FOR UPDATE USING (bucket_id = 'pan-docs');

-- 9. Permissions & Roles
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    base_rate NUMERIC NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access to permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Admin full access on permissions" ON public.permissions FOR ALL USING (public.is_admin());

CREATE POLICY "Allow all read access to role_permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Admin full access on role_permissions" ON public.role_permissions FOR ALL USING (public.is_admin());

CREATE POLICY "Allow all read access to service_categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admin full access on service_categories" ON public.service_categories FOR ALL USING (public.is_admin());

CREATE POLICY "Admin full access on roles" ON public.roles FOR ALL USING (public.is_admin());

-- 10. Database Archiving
CREATE TABLE IF NOT EXISTS public.archived_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL,
    booking_data JSONB NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.archived_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access to archived_bookings" ON public.archived_bookings FOR SELECT USING (true);
CREATE POLICY "Admin full access on archived_bookings" ON public.archived_bookings FOR ALL USING (public.is_admin());


