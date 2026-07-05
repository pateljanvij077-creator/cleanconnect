-- Alter bookings table to add tracking columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS work_duration INTEGER;

-- Create temporary verification codes table
CREATE TABLE IF NOT EXISTS public.booking_verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    hashed_code TEXT NOT NULL,
    expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    code_type TEXT NOT NULL CHECK (code_type IN ('start', 'finish')),
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.booking_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy for managing codes
CREATE POLICY "Homeowners manage own verification codes" ON public.booking_verification_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM bookings b
            JOIN homeowners h ON b.homeowner_id = h.id
            WHERE b.id = booking_verification_codes.booking_id 
            AND h.user_id = auth.uid()
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
BEGIN
    -- Compute the SHA-256 hash of the entered code
    v_entered_hash := encode(digest(p_entered_code, 'sha256'), 'hex');

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

    -- Check expiration
    IF v_code_record.expiry_time < v_now THEN
        DELETE FROM booking_verification_codes WHERE id = v_code_record.id;
        
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
        VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
            jsonb_build_object('error', 'Code expired', 'type', v_code_record.code_type));
            
        RETURN jsonb_build_object('success', false, 'message', 'The code has expired.');
    END IF;

    -- Get booking details
    SELECT * INTO v_booking_record FROM bookings WHERE id = p_booking_id;

    -- Distance check (100 meters limit)
    v_distance := calculate_distance(
        v_booking_record.latitude, v_booking_record.longitude,
        p_cleaner_lat, p_cleaner_lng
    );

    IF v_distance > 100 THEN
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
        VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
            jsonb_build_object(
                'error', 'Distance limit exceeded',
                'distance_meters', v_distance,
                'type', v_code_record.code_type,
                'gps', jsonb_build_object('lat', p_cleaner_lat, 'lng', p_cleaner_lng)
            )
        );
        RETURN jsonb_build_object('success', false, 'message', 'You must be within 100 meters of the booking location.');
    END IF;

    -- Code type specific checks and updates
    IF v_code_record.code_type = 'start' THEN
        -- Verify scheduled window (1 hour early to 2 hours late allowed)
        IF v_now < (v_booking_record.service_date + v_booking_record.service_time) - INTERVAL '1 hour' OR
           v_now > (v_booking_record.service_date + v_booking_record.service_time) + (v_booking_record.hours * INTERVAL '1 hour') + INTERVAL '2 hours' THEN
            
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
