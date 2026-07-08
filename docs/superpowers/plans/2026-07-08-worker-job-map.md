# Worker Job Map Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a route map displaying cleaner and homeowner locations connected by a route path line, and integrate it into the worker's Booking Requests and Upcoming Jobs.

**Architecture:** Create a `JobRouteMap` component rendering Leaflet pins and a connecting Polyline path. Integrate this as a collapsible section in the job cards on `BookingRequests.jsx` and `UpcomingJobs.jsx`.

**Tech Stack:** React, react-leaflet, Leaflet, Lucide React icons.

## Global Constraints

- **No placeholders**: Show complete code blocks in the tasks.
- **TDD / DRY**: Reuse Leaflet features.
- **Collapsible sections**: Default maps to hidden, rendering only when toggled to optimize performance and prevent excessive tile requests.

---

### Task 1: Create the JobRouteMap Component

Create the map routing component showing homeowner & worker location pins connected by a dashed Polyline.

**Files:**
- Create: `src/components/maps/JobRouteMap.jsx`

- [ ] **Step 1: Write JobRouteMap.jsx**

Write the complete code for `src/components/maps/JobRouteMap.jsx`:

```jsx
import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Helper component to center view dynamically
function ChangeMapView({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 12)
    }
  }, [center, map])
  return null
}

// Invalidate Leaflet cache on mount
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 200)
    return () => clearTimeout(timer)
  }, [map])
  return null
}

const createHomeownerIcon = (avatarUrl) => {
  const imgUrl = avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=homeowner'
  return L.divIcon({
    className: 'custom-homeowner-pin',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid #3b82f6;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        background: #1e293b;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  })
}

const createWorkerIcon = (avatarUrl) => {
  const imgUrl = avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=cleaner'
  return L.divIcon({
    className: 'custom-worker-pin',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid #10b981;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        background: #1e293b;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  })
}

export default function JobRouteMap({ workerLat, workerLng, homeownerLat, homeownerLng, workerAvatar, homeownerAvatar, homeownerName, address }) {
  const [center, setCenter] = useState([20.5937, 78.9629])

  const wLat = workerLat ? parseFloat(workerLat) : null
  const wLng = workerLng ? parseFloat(workerLng) : null
  const hLat = homeownerLat ? parseFloat(homeownerLat) : null
  const hLng = homeownerLng ? parseFloat(homeownerLng) : null

  useEffect(() => {
    if (wLat && wLng && hLat && hLng) {
      setCenter([(wLat + hLat) / 2, (wLng + hLng) / 2])
    } else if (hLat && hLng) {
      setCenter([hLat, hLng])
    }
  }, [wLat, wLng, hLat, hLng])

  if (!hLat || !hLng) {
    return (
      <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '12px' }}>
        Location coordinates unavailable for this booking.
      </div>
    )
  }

  return (
    <div style={{ 
      height: '240px', 
      width: '100%', 
      borderRadius: '16px', 
      overflow: 'hidden', 
      border: '1px solid var(--border-glass)',
      position: 'relative',
      zIndex: 1,
      marginTop: '0.75rem'
    }}>
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeMapView center={center} />
        <MapResizer />

        {/* Homeowner Marker */}
        <Marker position={[hLat, hLng]} icon={createHomeownerIcon(homeownerAvatar)}>
          <Popup>
            <div style={{ fontSize: '11px', color: '#0f172a' }}>
              <strong>🏡 Homeowner: {homeownerName}</strong><br/>
              <span style={{ color: '#64748b' }}>{address}</span>
            </div>
          </Popup>
        </Marker>

        {/* Worker Marker */}
        {wLat && wLng && (
          <>
            <Marker position={[wLat, wLng]} icon={createWorkerIcon(workerAvatar)}>
              <Popup>
                <div style={{ fontSize: '11px', color: '#0f172a' }}>
                  <strong>🧹 My Location</strong>
                </div>
              </Popup>
            </Marker>
            
            <Polyline
              positions={[[wLat, wLng], [hLat, hLng]]}
              pathOptions={{
                color: 'var(--primary)',
                weight: 3,
                dashArray: '5, 10',
                opacity: 0.8
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit Task 1**

```bash
git add src/components/maps/JobRouteMap.jsx
git commit -m "feat: add JobRouteMap component for worker travel routing visualization"
```

---

### Task 2: Integrate JobRouteMap in BookingRequests.jsx

Add a map toggle button and map container on every booking request card.

**Files:**
- Modify: `src/pages/worker/BookingRequests.jsx`

- [ ] **Step 1: Modify BookingRequests.jsx**

Edit [BookingRequests.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/pages/worker/BookingRequests.jsx) to add map toggling logic and render the `JobRouteMap`.

Modify imports (around line 10):
```javascript
import JobRouteMap from '../../components/maps/JobRouteMap'
import { MapPin } from 'lucide-react'
```

Add map toggle state inside the component:
```javascript
  const [showMapMap, setShowMapMap] = useState({}) // keyed by booking ID
```

Add a map toggle button right under the address:
```jsx
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        📍 <strong>Address:</strong> {r.address}
                      </p>
                      
                      {/* Map Toggle Button */}
                      {(r.latitude || r.homeowners?.latitude) && (
                        <button 
                          onClick={() => setShowMapMap(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', fontSize: '12px', marginTop: '0.25rem', gap: '4px', height: 'auto', minHeight: 'auto' }}
                        >
                          <MapPin size={12} color="var(--primary)" /> 
                          {showMapMap[r.id] ? 'Hide Location Map' : 'View Location on Map'}
                        </button>
                      )}

                      {showMapMap[r.id] && (
                        <JobRouteMap
                          workerLat={worker?.latitude}
                          workerLng={worker?.longitude}
                          homeownerLat={r.latitude || r.homeowners?.latitude}
                          homeownerLng={r.longitude || r.homeowners?.longitude}
                          workerAvatar={worker?.selfie_url || worker?.avatar_url}
                          homeownerAvatar={r.homeowners?.avatar_url}
                          homeownerName={r.homeowners?.full_name}
                          address={r.address}
                        />
                      )}
```

- [ ] **Step 2: Commit Task 2**

```bash
git add src/pages/worker/BookingRequests.jsx
git commit -m "feat: integrate JobRouteMap into BookingRequests cards"
```

---

### Task 3: Integrate JobRouteMap in UpcomingJobs.jsx

Add a map toggle button and map container on every upcoming job card.

**Files:**
- Modify: `src/pages/worker/UpcomingJobs.jsx`

- [ ] **Step 1: Modify UpcomingJobs.jsx**

Edit [UpcomingJobs.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/pages/worker/UpcomingJobs.jsx) to add map toggling and render the `JobRouteMap`.

Modify imports (around line 10):
```javascript
import JobRouteMap from '../../components/maps/JobRouteMap'
```

Add map toggle state inside the component:
```javascript
  const [showMapMap, setShowMapMap] = useState({}) // keyed by booking ID
```

Add map toggle button right under the address:
```jsx
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        📍 <strong>Address:</strong> {j.address}
                      </p>
                      
                      {/* Map Toggle Button */}
                      {(j.latitude || j.homeowners?.latitude) && (
                        <button 
                          onClick={() => setShowMapMap(prev => ({ ...prev, [j.id]: !prev[j.id] }))}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', fontSize: '12px', marginTop: '0.25rem', gap: '4px', height: 'auto', minHeight: 'auto' }}
                        >
                          <Play size={12} color="var(--primary)" style={{ transform: 'rotate(90deg)' }} /> 
                          {showMapMap[j.id] ? 'Hide Route Map' : 'View Route on Map'}
                        </button>
                      )}

                      {showMapMap[j.id] && (
                        <JobRouteMap
                          workerLat={worker?.latitude}
                          workerLng={worker?.longitude}
                          homeownerLat={j.latitude || j.homeowners?.latitude}
                          homeownerLng={j.longitude || j.homeowners?.longitude}
                          workerAvatar={worker?.selfie_url || worker?.avatar_url}
                          homeownerAvatar={j.homeowners?.avatar_url}
                          homeownerName={j.homeowners?.full_name}
                          address={j.address}
                        />
                      )}
```

- [ ] **Step 2: Commit Task 3**

```bash
git add src/pages/worker/UpcomingJobs.jsx
git commit -m "feat: integrate JobRouteMap into UpcomingJobs cards"
```

---

## Plan Verification

1. Run `npm run build` to verify compiling is clean.
2. Login as worker, open booking requests or active jobs, click the view map/route buttons, verify maps render and show pins.
