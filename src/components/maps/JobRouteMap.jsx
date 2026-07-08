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
  // 1. Coordinates with robust defaults to ensure the map always renders
  const hLat = homeownerLat ? parseFloat(homeownerLat) : 23.0225 // fallback to Ahmedabad center
  const hLng = homeownerLng ? parseFloat(homeownerLng) : 72.5714
  
  const wLat = workerLat ? parseFloat(workerLat) : hLat - 0.015 // default cleaner starts southwest
  const wLng = workerLng ? parseFloat(workerLng) : hLng - 0.015

  const [center, setCenter] = useState([(wLat + hLat) / 2, (wLng + hLng) / 2])
  
  // 2. Simulated real-time movement state
  const [simulatedLat, setSimulatedLat] = useState(wLat)
  const [simulatedLng, setSimulatedLng] = useState(wLng)

  useEffect(() => {
    setCenter([(wLat + hLat) / 2, (wLng + hLng) / 2])
  }, [wLat, wLng, hLat, hLng])

  useEffect(() => {
    let pct = 0
    const interval = setInterval(() => {
      pct += 0.5 // Increment step
      if (pct > 100) {
        pct = 0 // Restart route loop to simulate continuous transit
      }
      const currentLat = wLat + (hLat - wLat) * (pct / 100)
      const currentLng = wLng + (hLng - wLng) * (pct / 100)
      setSimulatedLat(currentLat)
      setSimulatedLng(currentLng)
    }, 80) // Smooth movement updates

    return () => clearInterval(interval)
  }, [wLat, wLng, hLat, hLng])

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

        {/* Homeowner Marker (Destination) */}
        <Marker position={[hLat, hLng]} icon={createHomeownerIcon(homeownerAvatar)}>
          <Popup>
            <div style={{ fontSize: '11px', color: '#0f172a' }}>
              <strong>🏡 Homeowner: {homeownerName || 'Client'}</strong><br/>
              <span style={{ color: '#64748b' }}>{address || 'Service Location'}</span>
            </div>
          </Popup>
        </Marker>

        {/* Worker Marker (Simulated Active Travel Pin) */}
        <Marker position={[simulatedLat, simulatedLng]} icon={createWorkerIcon(workerAvatar)}>
          <Popup>
            <div style={{ fontSize: '11px', color: '#0f172a' }}>
              <strong>🧹 Cleaner (On the Way)</strong>
            </div>
          </Popup>
        </Marker>
        
        {/* Dash Path Line */}
        <Polyline
          positions={[[wLat, wLng], [hLat, hLng]]}
          pathOptions={{
            color: 'var(--primary)',
            weight: 3,
            dashArray: '6, 12',
            opacity: 0.8
          }}
        />
      </MapContainer>
    </div>
  )
}
