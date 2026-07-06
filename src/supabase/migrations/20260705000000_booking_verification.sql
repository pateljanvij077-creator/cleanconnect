-- Alter bookings table to add tracking columns and status check constraints
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS work_duration INTEGER;

-- Drop and recreate bookings status check constraint to allow 'arrived' and 'finishing'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'arrived'::text, 'started'::text, 'finishing'::text, 'completed'::text, 'cancelled'::text]));

-- Drop existing table and function if they exist to apply clean changes
DROP FUNCTION IF EXISTS verify_booking_code(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
DROP POLICY IF EXISTS "Homeowners manage own verification codes" ON public.booking_verification_codes;
DROP POLICY IF EXISTS "Homeowners and Workers manage verification codes" ON public.booking_verification_codes;
DROP TABLE IF EXISTS public.booking_verification_codes CASCADE;

-- Create temporary verification codes table
CREATE TABLE public.booking_verification_codes (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    hashed_code TEXT NOT NULL,
    expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    code_type TEXT NOT NULL CHECK (code_type IN ('start', 'finish')),
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.booking_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy for managing codes (Homeowners and Workers)
-- Accommodates both:
-- 1. b.worker_id / b.homeowner_id matching auth.uid() directly (reviewer's layout)
-- 2. b.worker_id / b.homeowner_id mapping to workers.id / homeowners.id whose user_id matches auth.uid() (actual schema)
CREATE POLICY "Homeowners and Workers manage verification codes" ON public.booking_verification_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = booking_verification_codes.booking_id 
            AND (
                b.homeowner_id = auth.uid() OR 
                b.worker_id = auth.uid() OR
                EXISTS (SELECT 1 FROM homeowners h WHERE h.id = b.homeowner_id AND h.user_id = auth.uid()) OR
                EXISTS (SELECT 1 FROM workers w WHERE w.id = b.worker_id AND w.user_id = auth.uid())
            )
        )
    );

-- Helper function to calculate distance using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 double precision,
    lon1 double precision,
    lat2 double precision,
    lon2 double precision
) RETURNS double precision AS $$
DECLARE
    r double precision := 6371000; -- Earth radius in meters
    dlat double precision;
    dlon double precision;
    a double precision;
    c double precision;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN 99999999;
    END IF;
    
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon/2) * sin(dlon/2);
         
     c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main verification function
CREATE OR REPLACE FUNCTION verify_booking_code(
    p_booking_id UUID,
    p_entered_code TEXT,
    p_cleaner_lat DOUBLE PRECISION,
    p_cleaner_lng DOUBLE PRECISION
) RETURNS JSONB AS $$
DECLARE
    v_code_record RECORD;
    v_booking_record RECORD;
    v_distance DOUBLE PRECISION;
    v_entered_hash TEXT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_duration INTEGER;
    v_expired_type TEXT;
    v_scheduled_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Compute the SHA-256 hash of the entered code
    v_entered_hash := encode(digest(p_entered_code, 'sha256'), 'hex');

    -- Check if the entered code exists but is expired
    SELECT code_type INTO v_expired_type 
    FROM booking_verification_codes 
    WHERE booking_id = p_booking_id 
      AND hashed_code = v_entered_hash 
      AND expiry_time < v_now;

    -- Delete expired codes for the booking at the very beginning of the function
    DELETE FROM booking_verification_codes WHERE booking_id = p_booking_id AND expiry_time < v_now;

    -- If the entered code was expired, log and return error
    IF v_expired_type IS NOT NULL THEN
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
        VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
            jsonb_build_object('error', 'Code expired', 'type', v_expired_type));
            
        RETURN jsonb_build_object('success', false, 'message', 'The code has expired.');
    END IF;

    -- Find active code
    SELECT * INTO v_code_record 
    FROM booking_verification_codes
    WHERE booking_id = p_booking_id
      AND hashed_code = v_entered_hash
      AND used = false;

    IF v_code_record IS NULL THEN
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
        VALUES (
            auth.uid(), 
            'verification_failed', 
            'booking', 
            p_booking_id, 
            jsonb_build_object(
                'error', 'Invalid security code',
                'gps', jsonb_build_object('lat', p_cleaner_lat, 'lng', p_cleaner_lng)
            )
        );
        RETURN jsonb_build_object('success', false, 'message', 'Invalid security code.');
    END IF;

    -- Get booking details
    SELECT * INTO v_booking_record FROM bookings WHERE id = p_booking_id;

    -- Check authorization: worker_id must match auth.uid()
    -- Accommodates both worker_id = auth.uid() directly or mapping via workers table
    IF v_booking_record.worker_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM workers w 
        WHERE w.id = v_booking_record.worker_id 
          AND w.user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: You are not the assigned cleaner.');
    END IF;

    -- Distance check (conditional on coordinates availability)
    -- Removed 100 meters limit check as per request
    IF v_booking_record.latitude IS NOT NULL AND v_booking_record.longitude IS NOT NULL 
       AND p_cleaner_lat IS NOT NULL AND p_cleaner_lng IS NOT NULL THEN
        v_distance := calculate_distance(
            v_booking_record.latitude, v_booking_record.longitude,
            p_cleaner_lat, p_cleaner_lng
        );
    ELSE
        v_distance := NULL;
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
        VALUES (auth.uid(), 'gps_missing', 'booking', p_booking_id, 
            jsonb_build_object(
                'gps_missing', true,
                'type', v_code_record.code_type,
                'gps', jsonb_build_object('lat', p_cleaner_lat, 'lng', p_cleaner_lng)
            )
        );
    END IF;

    -- Code type specific checks and updates
    IF v_code_record.code_type = 'start' THEN
        -- Check booking status
        IF v_booking_record.status != 'arrived' THEN
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
            VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
                jsonb_build_object('error', 'Invalid booking status', 'status', v_booking_record.status, 'type', 'start'));
            RETURN jsonb_build_object('success', false, 'message', 'Booking status must be arrived to start cleaning.');
        END IF;

        -- Combine service_date and service_time and interpret as Asia/Kolkata timezone
        v_scheduled_start := (v_booking_record.service_date + v_booking_record.service_time) AT TIME ZONE 'Asia/Kolkata';

        IF v_scheduled_start IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Invalid scheduled service date or time.');
        END IF;

        -- Verify scheduled window (1 hour early to 2 hours late allowed)
        IF v_now < v_scheduled_start - INTERVAL '1 hour' OR
           v_now > v_scheduled_start + INTERVAL '2 hours' THEN
            
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
            VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
                jsonb_build_object('error', 'Outside scheduled window', 'type', 'start'));
                
            RETURN jsonb_build_object('success', false, 'message', 'You can only start within the scheduled booking window.');
        END IF;

        UPDATE bookings 
        SET status = 'started',
            check_in_time = v_now,
            check_in_lat = p_cleaner_lat,
            check_in_lng = p_cleaner_lng,
            updated_at = v_now
        WHERE id = p_booking_id;

    ELSIF v_code_record.code_type = 'finish' THEN
        -- Check booking status
        IF v_booking_record.status != 'finishing' THEN
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
            VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
                jsonb_build_object('error', 'Invalid booking status', 'status', v_booking_record.status, 'type', 'finish'));
            RETURN jsonb_build_object('success', false, 'message', 'Booking status must be finishing to complete cleaning.');
        END IF;

        v_duration := EXTRACT(EPOCH FROM (v_now - v_booking_record.check_in_time))::INTEGER;

        UPDATE bookings 
        SET status = 'completed',
            check_out_time = v_now,
            check_out_lat = p_cleaner_lat,
            check_out_lng = p_cleaner_lng,
            work_duration = v_duration,
            updated_at = v_now
        WHERE id = p_booking_id;
    END IF;

    -- Delete verified code
    DELETE FROM booking_verification_codes WHERE id = v_code_record.id;

    -- Write successful audit log (metadata only, no code)
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (
        auth.uid(), 
        'verification_success', 
        'booking', 
        p_booking_id, 
        jsonb_build_object(
            'type', v_code_record.code_type,
            'gps', jsonb_build_object('lat', p_cleaner_lat, 'lng', p_cleaner_lng),
            'duration_seconds', v_duration
        )
    );

    RETURN jsonb_build_object('success', true, 'message', 'Verification successful.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;
