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
