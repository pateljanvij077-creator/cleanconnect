import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Navigation } from 'lucide-react'
import { getCurrentPosition, reverseGeocode } from '../../utils/gps'
import { toast } from 'react-hot-toast'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon bug in Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Map controller to adjust view dynamically
function ChangeView({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 16)
    }
  }, [center, map])
  return null
}

// Auto resizer component to invalidate Leaflet cache on center change
function MapResizer({ center }) {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 200)
    return () => clearTimeout(timer)
  }, [map, center])
  return null
}

// Map events handler to allow pinning by clicking
function MapEventsHandler({ onPinLocation }) {
  useMapEvents({
    click(e) {
      onPinLocation(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

export default function LocationPicker({ lat, lng, onLocationChange }) {
  const defaultCenter = [20.5937, 78.9629] // India center fallback
  const [center, setCenter] = useState(lat && lng ? [lat, lng] : defaultCenter)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat && lng) {
      setCenter([lat, lng])
    }
  }, [lat, lng])

  const handleMarkerDragEnd = async (event) => {
    const marker = event.target
    if (marker) {
      const position = marker.getLatLng()
      await handleLocationUpdate(position.lat, position.lng)
    }
  }

  const handleLocationUpdate = async (latitude, longitude) => {
    setLoading(true)
    try {
      const geoData = await reverseGeocode(latitude, longitude)
      onLocationChange({
        latitude,
        longitude,
        address: geoData?.display_name || '',
        rawGeoData: geoData
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to get address for pinned location')
    } finally {
      setLoading(false)
    }
  }

  const handleGetCurrentLocation = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const coords = await getCurrentPosition()
      setCenter([coords.lat, coords.lng])
      await handleLocationUpdate(coords.lat, coords.lng)
      toast.success('Current location detected!')
    } catch (err) {
      toast.error(err.message || 'Permission denied. Please pin manually.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="form-label" style={{ margin: 0 }}>Pin Location on Map</span>
        <button 
          type="button"
          onClick={handleGetCurrentLocation}
          className="btn btn-secondary btn-sm"
          disabled={loading}
          style={{ gap: '4px' }}
        >
          <Navigation size={14} /> Detect Current Location
        </button>
      </div>

      <div style={{ 
        height: '280px', 
        width: '100%', 
        borderRadius: 'var(--radius-md)', 
        overflow: 'hidden',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        zIndex: 1
      }}>
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, backdropFilter: 'blur(4px)'
          }}>
            <div className="spinner" />
          </div>
        )}
        
        <MapContainer 
          center={center} 
          zoom={lat && lng ? 16 : 5} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={center} />
          <MapResizer center={center} />
          <MapEventsHandler onPinLocation={handleLocationUpdate} />
          {lat && lng && (
            <Marker 
              position={[lat, lng]} 
              draggable={true}
              eventHandlers={{ dragend: handleMarkerDragEnd }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}
