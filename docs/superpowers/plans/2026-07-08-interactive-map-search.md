# Interactive Map-Based Worker Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable, interactive Leaflet map to the Homeowner Dashboard that displays nearby available cleaners, styled with premium avatar pin markers and custom details popups.

**Architecture:** Create a self-contained `WorkerMap` component using `react-leaflet` to encapsulate Leaflet rendering, custom marker icons, and popup details. Modify `Dashboard.jsx` to maintain a view toggle state and conditionally switch display between the list grid and the interactive map.

**Tech Stack:** React, react-leaflet, Leaflet, framer-motion, Lucide React icons.

## Global Constraints

- **No placeholders**: Show complete code blocks in the tasks.
- **Dry/Yagni**: Keep components focused on map presentation; filters remain on the dashboard.
- **Leaflet Cache Bug**: MapContainer should invalidate size upon layout adjustments to prevent gray, unrendered tiles.
- **Free open-source tiles**: Fetch mapping tiles from OpenStreetMap (OSM) without API credentials.

---

### Task 1: Create the WorkerMap Component

Create the map visualization component that accepts the homeowner coordinates, current search radius, and filtered worker profiles, plotting them with premium styled pins.

**Files:**
- Create: `src/components/maps/WorkerMap.jsx`

**Interfaces:**
- Consumes:
  - `homeowner`: `{ latitude, longitude, society_name }`
  - `workers`: Array of `{ id, full_name, avatar_url, selfie_url, rating, pricing_per_hour, distance, availability_status, worker_type }`
  - `maxDistance`: Number (max travel radius, e.g. 15)
  - `onBook`: Function `(workerId) => void`
  - `onViewProfile`: Function `(workerId) => void`

- [ ] **Step 1: Write the WorkerMap component implementation**

Write the complete code for `src/components/maps/WorkerMap.jsx` including custom SVG markers for the homeowner and cleaner pins:

```jsx
import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Helper component to update map view when homeowner location updates
function ChangeMapView({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 13)
    }
  }, [center, map])
  return null
}

// Invalidate Leaflet map size on mount/resize to fix rendering bugs
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 300)
    return () => clearTimeout(timer)
  }, [map])
  return null
}

// Custom markers using premium HTML/CSS
const createHomeownerIcon = () => {
  return L.divIcon({
    className: 'custom-homeowner-pin',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: #3b82f6;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: -3px;
          left: -3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 3px solid #3b82f6;
          animation: pulse-ring 1.8s infinite ease-in-out;
          pointer-events: none;
        "></div>
      </div>
      <style>
        @keyframes pulse-ring {
          0% { transform: scale(0.9); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

const createWorkerIcon = (avatarUrl, isAvailable) => {
  const badgeColor = isAvailable ? '#10b981' : '#f59e0b'
  const imgUrl = avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=cleaner'
  
  return L.divIcon({
    className: 'custom-worker-pin',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 3px solid ${badgeColor};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        background: #1e293b;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: transform 0.2s ease;
      ">
        <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${badgeColor};
        border: 2px solid #ffffff;
        position: absolute;
        bottom: 0;
        right: 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 10;
      "></div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  })
}

export default function WorkerMap({ homeowner, workers, maxDistance, onBook, onViewProfile }) {
  const [center, setCenter] = useState([20.5937, 78.9629]) // Default India center
  const homeownerLat = homeowner?.latitude ? parseFloat(homeowner.latitude) : null
  const homeownerLng = homeowner?.longitude ? parseFloat(homeowner.longitude) : null

  useEffect(() => {
    if (homeownerLat && homeownerLng) {
      setCenter([homeownerLat, homeownerLng])
    }
  }, [homeownerLat, homeownerLng])

  return (
    <div style={{ 
      height: '500px', 
      width: '100%', 
      borderRadius: '24px', 
      overflow: 'hidden', 
      border: '1px solid var(--border-glass)',
      position: 'relative',
      zIndex: 1
    }}>
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ChangeMapView center={center} />
        <MapResizer />

        {/* Homeowner Marker */}
        {homeownerLat && homeownerLng && (
          <>
            <Marker 
              position={[homeownerLat, homeownerLng]} 
              icon={createHomeownerIcon()}
            >
              <Popup>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  📍 My Home Address<br/>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{homeowner?.society_name || 'Society Location'}</span>
                </div>
              </Popup>
            </Marker>
            
            {/* Proximity Circle */}
            <Circle
              center={[homeownerLat, homeownerLng]}
              radius={maxDistance * 1000} // Radius in meters
              pathOptions={{
                color: 'rgba(59, 130, 246, 0.4)',
                fillColor: 'rgba(59, 130, 246, 0.1)',
                fillOpacity: 0.2,
                weight: 1.5
              }}
            />
          </>
        )}

        {/* Workers Markers */}
        {workers.map((w) => {
          const lat = w.latitude ? parseFloat(w.latitude) : null
          const lng = w.longitude ? parseFloat(w.longitude) : null
          if (!lat || !lng) return null

          const isAvailable = w.availability_status === 'available'

          return (
            <Marker 
              key={w.id} 
              position={[lat, lng]} 
              icon={createWorkerIcon(w.selfie_url || w.avatar_url, isAvailable)}
            >
              <Popup>
                <div style={{
                  minWidth: '180px',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <img 
                      src={w.selfie_url || w.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=cleaner'} 
                      alt={w.full_name} 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{w.full_name}</h4>
                      <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'capitalize' }}>
                        {w.worker_type?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                    <span style={{ color: '#334155' }}>★ {Number(w.rating || 0).toFixed(1)} rating</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{w.pricing_per_hour}/hr</span>
                  </div>

                  {w.distance !== undefined && w.distance !== Infinity && (
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      📍 Approx. {w.distance.toFixed(1)} km away
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button 
                      onClick={() => onBook(w.id)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, padding: '4px 6px', fontSize: '11px', minHeight: 'auto', height: '26px' }}
                    >
                      Book
                    </button>
                    <button 
                      onClick={() => onViewProfile(w.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, padding: '4px 6px', fontSize: '11px', minHeight: 'auto', height: '26px' }}
                    >
                      Profile
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit Task 1**

```bash
git add src/components/maps/WorkerMap.jsx
git commit -m "feat: add WorkerMap component with custom Leaflet markers"
```

---

### Task 2: Integrate WorkerMap into Dashboard

Integrate the `WorkerMap` component into the homeowner [Dashboard.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/pages/homeowner/Dashboard.jsx) and add the floating view toggle control.

**Files:**
- Modify: `src/pages/homeowner/Dashboard.jsx`

- [ ] **Step 1: Modify Dashboard.jsx**

Edit [Dashboard.jsx](file:///c:/Users/Shyam/Desktop/cleanconnect/src/pages/homeowner/Dashboard.jsx) to import `WorkerMap`, track toggle state, and render the map instead of the card grid when `viewMode === 'map'`.

Modify imports (around line 14):
```javascript
import WorkerMap from '../../components/maps/WorkerMap'
```

Add the `viewMode` state inside the `HomeOwnerDashboard` component (around line 29):
```javascript
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
```

Update the render logic to conditionally render `WorkerMap` or the worker card grid (around line 215):
```jsx
        {/* Workers Feed Grid / Map View */}
        {loading ? (
          <div className="grid-3">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="card glass flex-center" style={{ padding: '3rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🧹</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Workers Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '360px' }}>
              Try broadening your search filters or manual location coordinates to see more cleaners nearby.
            </p>
          </div>
        ) : viewMode === 'map' ? (
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Nearby Matched Cleaners on Map ({filteredWorkers.length})
            </h4>
            <WorkerMap
              homeowner={homeowner}
              workers={filteredWorkers}
              maxDistance={maxDistance}
              onBook={handleBooking}
              onViewProfile={handleViewProfile}
            />
          </div>
        ) : (
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Nearby Matched Cleaners ({filteredWorkers.length})
            </h4>
            <motion.div layout className="grid-3">
              <AnimatePresence mode="popLayout">
                {filteredWorkers.map((w, idx) => (
                  <motion.div
                    key={w.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15, delay: idx * 0.04 }}
                  >
                    <WorkerCard 
                      worker={w}
                      distance={w.distance}
                      isFavorited={favList.includes(w.id)}
                      onFavoriteToggle={handleFavoriteToggle}
                      onBook={handleBooking}
                      onViewProfile={handleViewProfile}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* Floating Toggle Button */}
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className="btn btn-primary"
            style={{
              boxShadow: '0 8px 30px rgba(124, 58, 237, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '30px',
              backdropFilter: 'blur(8px)',
              background: 'rgba(124, 58, 237, 0.95)',
              fontSize: '14px',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {viewMode === 'list' ? (
              <>🗺️ Map View</>
            ) : (
              <>📋 List View</>
            )}
          </button>
        </div>
```

- [ ] **Step 2: Commit Task 2**

```bash
git add src/pages/homeowner/Dashboard.jsx
git commit -m "feat: integrate WorkerMap on Dashboard with a floating action toggle button"
```

---

## Plan Verification

1. Run the local dev server using `npm run dev`.
2. Login as a homeowner and navigate to `/homeowner/dashboard`.
3. Check that the floating button **"🗺️ Map View"** appears at the bottom.
4. Click the button to switch to map view:
   * Verify the Leaflet map renders correctly.
   * Verify the blue home pin resides at the homeowner's set location.
   * Verify a transparent blue circle bounds the search distance.
   * Verify cleaners are plotted as circular avatars with availability status badges.
5. Click a cleaner pin, check that the details popup opens, and verify clicking "Profile" goes to their details and "Book" goes to the scheduler page.
6. Toggle the rating filter (e.g. 4.5 ★) and verify cleaner pins on the map update instantly.
