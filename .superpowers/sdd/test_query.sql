BEGIN;

-- Set session auth to match the assigned cleaner's user_id ('2a7bfbad-456c-45f5-af96-7fbc0c94538a')
-- for the worker '9191e180-e92c-4416-b1dd-8c063f070c52'
SELECT set_config('request.jwt.claims', '{"sub": "2a7bfbad-456c-45f5-af96-7fbc0c94538a"}', true);

DO $$
DECLARE
    v_booking_id UUID := 'ce623762-3fe0-4c8e-af53-f362ff3dc243';
    v_code_id UUID;
    v_res JSONB;
    v_log RECORD;
    v_dist DOUBLE PRECISION;
BEGIN
    RAISE NOTICE 'Starting tests...';

    -- Test 1: calculate_distance function
    -- Distance between (12.9716, 77.5946) and (12.9720, 77.5950)
    v_dist := calculate_distance(12.9716, 77.5946, 12.9720, 77.5950);
    RAISE NOTICE 'Distance (expected ~60-70m): % meters', v_dist;
    IF v_dist < 50 OR v_dist > 100 THEN
        RAISE EXCEPTION 'calculate_distance failed: got %', v_dist;
    END IF;

    -- Setup mock booking coordinates and scheduled time for tests
    UPDATE bookings 
    SET latitude = 12.9716,
        longitude = 77.5946,
        service_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE,
        service_time = (NOW() AT TIME ZONE 'Asia/Kolkata')::TIME,
        hours = 2,
        status = 'arrived', -- Default to arrived for start code verification
        worker_id = '9191e180-e92c-4416-b1dd-8c063f070c52'
    WHERE id = v_booking_id;

    -- Clear old codes and logs for this booking first
    DELETE FROM booking_verification_codes WHERE booking_id = v_booking_id;
    DELETE FROM activity_logs WHERE entity_id = v_booking_id;

    -- Test 2: verify_booking_code - invalid code
    -- Insert a code
    INSERT INTO booking_verification_codes (booking_id, hashed_code, expiry_time, code_type)
    VALUES (v_booking_id, encode(digest('123456', 'sha256'), 'hex'), NOW() + interval '10 minutes', 'start')
    RETURNING id INTO v_code_id;

    -- Call verify with wrong code
    v_res := verify_booking_code(v_booking_id, 'wrongcode', 12.9716, 77.5946);
    RAISE NOTICE 'Invalid code result: %', v_res;
    IF (v_res->>'success')::boolean = true OR (v_res->>'message') != 'Invalid security code.' THEN
        RAISE EXCEPTION 'Test 2 failed: expected failure for invalid code';
    END IF;

    SELECT * INTO v_log FROM activity_logs WHERE entity_id = v_booking_id AND action = 'verification_failed' AND metadata->>'error' = 'Invalid security code';
    IF v_log IS NULL THEN
        RAISE EXCEPTION 'Test 2 failed: activity log not found for invalid code';
    END IF;

    -- Test 3: verify_booking_code - distance limit check removed (should succeed even if far away)
    v_res := verify_booking_code(v_booking_id, '123456', 13.9716, 78.5946);
    RAISE NOTICE 'Distance limit result (expected success): %', v_res;
    IF (v_res->>'success')::boolean = false OR (v_res->>'message') != 'Verification successful.' THEN
        RAISE EXCEPTION 'Test 3 failed: expected success since distance limit check is removed';
    END IF;

    SELECT * INTO v_log FROM activity_logs WHERE entity_id = v_booking_id AND action = 'verification_success' AND metadata->>'type' = 'start';
    IF v_log IS NULL THEN
        RAISE EXCEPTION 'Test 3 failed: activity log not found for success';
    END IF;

    -- Re-insert code and restore booking status to arrived for subsequent tests
    DELETE FROM booking_verification_codes WHERE booking_id = v_booking_id;
    INSERT INTO booking_verification_codes (booking_id, hashed_code, expiry_time, code_type)
    VALUES (v_booking_id, encode(digest('123456', 'sha256'), 'hex'), NOW() + interval '10 minutes', 'start')
    RETURNING id INTO v_code_id;
    UPDATE bookings SET status = 'arrived', check_in_time = NULL, check_in_lat = NULL, check_in_lng = NULL WHERE id = v_booking_id;

    -- Test 3a: verify_booking_code - distance check skipped when cleaner coordinates are NULL
    -- Calling with NULL cleaner coordinates should skip distance check and succeed
    v_res := verify_booking_code(v_booking_id, '123456', NULL, NULL);
    RAISE NOTICE 'NULL cleaner coordinates result (expected success): %', v_res;
    IF (v_res->>'success')::boolean = false OR (v_res->>'message') != 'Verification successful.' THEN
        RAISE EXCEPTION 'Test 3a failed: expected success when skipping distance check';
    END IF;

    -- Verify that gps_missing log was created
    SELECT * INTO v_log FROM activity_logs WHERE entity_id = v_booking_id AND action = 'gps_missing';
    IF v_log IS NULL OR (v_log.metadata->>'gps_missing')::boolean = false THEN
        RAISE EXCEPTION 'Test 3a failed: gps_missing log not found or incorrect metadata';
    END IF;

    -- Verify database check_in details are null
    IF NOT EXISTS (SELECT 1 FROM bookings WHERE id = v_booking_id AND status = 'started' AND check_in_lat IS NULL AND check_in_lng IS NULL) THEN
        RAISE EXCEPTION 'Test 3a failed: booking check-in coordinates should be null';
    END IF;

    -- Re-insert code and restore booking status to arrived for subsequent tests
    DELETE FROM booking_verification_codes WHERE booking_id = v_booking_id;
    INSERT INTO booking_verification_codes (booking_id, hashed_code, expiry_time, code_type)
    VALUES (v_booking_id, encode(digest('123456', 'sha256'), 'hex'), NOW() + interval '10 minutes', 'start')
    RETURNING id INTO v_code_id;
    UPDATE bookings SET status = 'arrived', check_in_time = NULL, check_in_lat = NULL, check_in_lng = NULL WHERE id = v_booking_id;

    -- Test 4: verify_booking_code - expired code
    -- Set expiry to past
    UPDATE booking_verification_codes SET expiry_time = NOW() - interval '1 minute' WHERE id = v_code_id;

    v_res := verify_booking_code(v_booking_id, '123456', 12.9716, 77.5946);
    RAISE NOTICE 'Expired code result: %', v_res;
    IF (v_res->>'success')::boolean = true OR (v_res->>'message') != 'The code has expired.' THEN
        RAISE EXCEPTION 'Test 4 failed: expected failure for expired code';
    END IF;

    -- Check that expired code was deleted
    IF EXISTS (SELECT 1 FROM booking_verification_codes WHERE id = v_code_id) THEN
        RAISE EXCEPTION 'Test 4 failed: expired code was not deleted';
    END IF;

    SELECT * INTO v_log FROM activity_logs WHERE entity_id = v_booking_id AND action = 'verification_failed' AND metadata->>'error' = 'Code expired';
    IF v_log IS NULL THEN
        RAISE EXCEPTION 'Test 4 failed: activity log not found for expired code';
    END IF;

    -- Test 5: verify_booking_code - outside scheduled window
    -- Re-insert valid code
    INSERT INTO booking_verification_codes (booking_id, hashed_code, expiry_time, code_type)
    VALUES (v_booking_id, encode(digest('123456', 'sha256'), 'hex'), NOW() + interval '10 minutes', 'start')
    RETURNING id INTO v_code_id;

    -- Shift service date to past
    UPDATE bookings SET service_date = CURRENT_DATE - 5 WHERE id = v_booking_id;

    v_res := verify_booking_code(v_booking_id, '123456', 12.9716, 77.5946);
    RAISE NOTICE 'Outside window result: %', v_res;
    IF (v_res->>'success')::boolean = true OR (v_res->>'message') NOT LIKE 'You can only start%' THEN
        RAISE EXCEPTION 'Test 5 failed: expected failure for outside window';
    END IF;

    SELECT * INTO v_log FROM activity_logs WHERE entity_id = v_booking_id AND action = 'verification_failed' AND metadata->>'error' = 'Outside scheduled window';
    IF v_log IS NULL THEN
        RAISE EXCEPTION 'Test 5 failed: activity log not found for outside window';
    END IF;

    -- Restore service date
    UPDATE bookings SET service_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE WHERE id = v_booking_id;

    -- Test 6: verify_booking_code - booking status check (must be arrived to start)
    UPDATE bookings SET status = 'accepted' WHERE id = v_booking_id;
    v_res := verify_booking_code(v_booking_id, '123456', 12.9716, 77.5946);
    RAISE NOTICE 'Booking status check result (start): %', v_res;
    IF (v_res->>'success')::boolean = true OR (v_res->>'message') NOT LIKE 'Booking status must be arrived%' THEN
        RAISE EXCEPTION 'Test 6 failed: expected failure since status is accepted, not arrived';
    END IF;

    -- Restore status to arrived
    UPDATE bookings SET status = 'arrived' WHERE id = v_booking_id;

    -- Test 7: verify_booking_code - unauthorized cleaner check
    -- Set session auth to random user
    PERFORM set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000000"}', true);

    v_res := verify_booking_code(v_booking_id, '123456', 12.9716, 77.5946);
    RAISE NOTICE 'Unauthorized cleaner result: %', v_res;
    IF (v_res->>'success')::boolean = true OR (v_res->>'message') != 'Unauthorized: You are not the assigned cleaner.' THEN
        RAISE EXCEPTION 'Test 7 failed: expected failure for unauthorized cleaner';
    END IF;

    -- Restore session auth to assigned cleaner
    PERFORM set_config('request.jwt.claims', '{"sub": "2a7bfbad-456c-45f5-af96-7fbc0c94538a"}', true);

    -- Test 8: verify_booking_code - successful start verification
    v_res := verify_booking_code(v_booking_id, '123456', 12.9716, 77.5946);
    RAISE NOTICE 'Successful start result: %', v_res;
    IF (v_res->>'success')::boolean = false OR (v_res->>'message') != 'Verification successful.' THEN
        RAISE EXCEPTION 'Test 8 failed: expected success for start verification';
    END IF;

    -- Check database updates
    IF NOT EXISTS (SELECT 1 FROM bookings WHERE id = v_booking_id AND status = 'started' AND check_in_time IS NOT NULL AND check_in_lat = 12.9716 AND check_in_lng = 77.5946) THEN
        RAISE EXCEPTION 'Test 8 failed: booking was not updated correctly';
    END IF;

    -- Check code deleted
    IF EXISTS (SELECT 1 FROM booking_verification_codes WHERE id = v_code_id) THEN
        RAISE EXCEPTION 'Test 8 failed: verified code was not deleted';
    END IF;

    -- Check log created
    SELECT * INTO v_log FROM activity_logs WHERE entity_id = v_booking_id AND action = 'verification_success' AND metadata->>'type' = 'start';
    IF v_log IS NULL THEN
        RAISE EXCEPTION 'Test 8 failed: activity log not found for start success';
    END IF;

    -- Test 9: verify_booking_code - booking status check (must be finishing to complete)
    -- Insert a finish code
    INSERT INTO booking_verification_codes (booking_id, hashed_code, expiry_time, code_type)
    VALUES (v_booking_id, encode(digest('654321', 'sha256'), 'hex'), NOW() + interval '10 minutes', 'finish')
    RETURNING id INTO v_code_id;

    -- Calling finish verification when status is 'started' (should fail since it must be 'finishing')
    v_res := verify_booking_code(v_booking_id, '654321', 12.9716, 77.5946);
    RAISE NOTICE 'Booking status check result (finish): %', v_res;
    IF (v_res->>'success')::boolean = true OR (v_res->>'message') NOT LIKE 'Booking status must be finishing%' THEN
        RAISE EXCEPTION 'Test 9 failed: expected failure since status is started, not finishing';
    END IF;

    -- Test 10: verify_booking_code - successful finish verification
    -- Update status to finishing and backdate check-in time by 2 hours
    UPDATE bookings 
    SET status = 'finishing',
        check_in_time = NOW() - interval '2 hours' 
    WHERE id = v_booking_id;

    v_res := verify_booking_code(v_booking_id, '654321', 12.9716, 77.5946);
    RAISE NOTICE 'Successful finish result: %', v_res;
    IF (v_res->>'success')::boolean = false OR (v_res->>'message') != 'Verification successful.' THEN
        RAISE EXCEPTION 'Test 10 failed: expected success for finish verification';
    END IF;

    -- Check database updates
    IF NOT EXISTS (SELECT 1 FROM bookings WHERE id = v_booking_id AND status = 'completed' AND check_out_time IS NOT NULL AND check_out_lat = 12.9716 AND check_out_lng = 77.5946 AND work_duration >= 7190 AND work_duration <= 7210) THEN
        RAISE EXCEPTION 'Test 10 failed: booking was not completed correctly';
    END IF;

    -- Check code deleted
    IF EXISTS (SELECT 1 FROM booking_verification_codes WHERE id = v_code_id) THEN
        RAISE EXCEPTION 'Test 10 failed: verified code was not deleted';
    END IF;

    -- Check log created with duration
    SELECT * INTO v_log FROM activity_logs WHERE entity_id = v_booking_id AND action = 'verification_success' AND metadata->>'type' = 'finish';
    IF v_log IS NULL OR (v_log.metadata->>'duration_seconds')::integer < 7190 THEN
        RAISE EXCEPTION 'Test 10 failed: activity log not found or incorrect metadata for finish success';
    END IF;

    RAISE NOTICE 'All tests passed successfully!';
END $$;

ROLLBACK;
