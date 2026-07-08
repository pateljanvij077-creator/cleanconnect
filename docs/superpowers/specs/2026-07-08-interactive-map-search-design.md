# Interactive Map-Based Worker Search Spec

We are adding an interactive map view to the homeowner dashboard. This will allow homeowners to visualize the geographic locations of matched cleaners relative to their own location.

## User Review Required

- **Leaflet Package**: The project already has `leaflet` and `react-leaflet` installed in `package.json`. No new npm installations are needed.
- **Privacy & Coordinates**: Worker pins will be plotted using their live or registered location coordinates. If coords are not set, they won't appear on the map.
- **Fixed Search**: As decided, the search remains centered on the homeowner's set location (updated via the location modal). Dragging the map does not change the search center automatically; instead, changing the location via the dashboard's location bar re-centers the map.

## Proposed Changes

### Component Design

We will design the map rendering logic in a separate component to preserve code isolation and keep the main dashboard readable.

#### [NEW] [WorkerMap.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/components/maps/WorkerMap.jsx)
A reusable Leaflet map component that:
- Receives homeowner profile (`latitude`, `longitude`, `society_name`).
- Receives the filtered list of matched workers.
- Renders a Map centered on the homeowner.
- Draws a blue home pin with a circular radius showing the max search distance.
- Draws green/orange markers for available/busy cleaners.
- Displays a custom-styled popup on marker click with worker details (avatar, name, rating, rate) and action buttons: "Book Now" and "View Profile".

#### [MODIFY] [Dashboard.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/pages/homeowner/Dashboard.jsx)
- Import the new `WorkerMap` component.
- Add a state variable `viewMode` (`'list'` or `'map'`, defaults to `'list'`).
- Add a floating toggle button to switch between list and map views.
- Under the dashboard filters, render `WorkerMap` if `viewMode === 'map'`, passing the `filteredWorkers` array and `homeowner` profile.
- Synchronize map resizing by triggering Leaflet's `invalidateSize()` when switching views.

## Verification Plan

### Manual Verification
1. Login as a homeowner.
2. Observe the new "View on Map" toggle button on the dashboard.
3. Click the toggle button to swap from list view to map view.
4. Verify the map renders correctly centered around the homeowner's coordinate, with a search radius circle.
5. Verify matched workers are plotted as pins at their coordinates.
6. Click a worker pin and verify the popup shows details and correct action buttons.
7. Click the filters (e.g. adjust rating or type) and verify map pins update in real time.
