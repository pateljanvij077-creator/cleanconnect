# Worker Job Map Integration Spec

We are adding a map feature to the worker dashboard, specifically within the booking requests and upcoming jobs page. This allows workers to view the homeowner's location and their own location relative to the job before/after accepting it.

## Proposed Changes

### Component Design

We will create a new route map component to display worker and homeowner pins with a connecting dashed path line.

#### [NEW] [JobRouteMap.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/components/maps/JobRouteMap.jsx)
A map component that:
- Receives homeowner location (`homeownerLat`, `homeownerLng`, `homeownerAvatar`, `homeownerName`, `address`).
- Receives worker location (`workerLat`, `workerLng`, `workerAvatar`).
- Renders homeowner home pin and worker cleaner pin.
- Draws a custom dashed route line between worker and homeowner using Leaflet's `<Polyline>`.
- Automatically adjusts zoom/center to fit both markers.

#### [MODIFY] [BookingRequests.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/pages/worker/BookingRequests.jsx)
- Import `JobRouteMap`.
- Add an toggle state `showMapMap` (dictionary keyed by booking ID) to expand the map for a specific booking.
- Render a toggle button "🗺️ View Location on Map" next to the address.
- If toggled, display the `JobRouteMap` inside the booking request card.

#### [MODIFY] [UpcomingJobs.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/pages/worker/UpcomingJobs.jsx)
- Import `JobRouteMap`.
- Add a toggle state `showMapMap` (dictionary keyed by booking ID).
- Render a toggle button "🗺️ View Route on Map" on the active job card.
- If toggled, render the `JobRouteMap` showing cleaner's live or registered location and homeowner's address.

## Verification Plan

### Manual Verification
1. Login as a homeowner and request a booking.
2. Login as a worker and go to "Booking Requests".
3. Verify that the "View Location on Map" button appears on the request card.
4. Click the button and check that the map shows both the worker and homeowner pins, connected by a dashed route line.
5. Accept the booking.
6. Go to "Upcoming Jobs" on the worker panel and verify the same map can be toggled on the active job card.
