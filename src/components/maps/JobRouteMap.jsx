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
