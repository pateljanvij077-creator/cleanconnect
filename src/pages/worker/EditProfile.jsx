import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase/client'
import { 
  getWorkerLocations, 
  addWorkerLocation, 
  removeWorkerLocation, 
  uploadWorkerPhoto, 
  uploadUpiQr 
} from '../../services/workers'
import { getStates, getCities, getAreas, findOrCreateState, findOrCreateCity, findOrCreateArea } from '../../services/locations'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Trash2, Plus, FileUp, QrCode, MapPin } from 'lucide-react'
import { getCurrentPosition, getLocationDetails } from '../../utils/gps'
import LocationPicker from '../../components/maps/LocationPicker'

export default function EditProfile() {
  const navigate = useNavigate()
  const { worker, user, refreshProfile } = useAuth()

  // Form fields
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState(1)
  const [pricingPerHour, setPricingPerHour] = useState(150)
  const [pricingPerDay, setPricingPerDay] = useState(800)
  const [pricingNote, setPricingNote] = useState('')
  const [phone2, setPhone2] = useState('')
  const [languages, setLanguages] = useState([])
  const [newLanguage, setNewLanguage] = useState('')
  
  const [saving, setSaving] = useState(false)

  // Photo uploads
  const [avatarFile, setAvatarFile] = useState(null)
  const [upiFile, setUpiFile] = useState(null)

  // Locations manager lists
  const [locations, setLocations] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [areas, setAreas] = useState([])
  const [selLoc, setSelLoc] = useState({ stateId: '', cityId: '', areaId: '', societyName: '' })
  const [travelRadius, setTravelRadius] = useState(10)
  const [maxSelectableSocieties, setMaxSelectableSocieties] = useState(10)

  // Primary Location states
  const [primaryLat, setPrimaryLat] = useState(null)
  const [primaryLng, setPrimaryLng] = useState(null)
  const [primaryAddress, setPrimaryAddress] = useState('')
  const [primaryStateId, setPrimaryStateId] = useState('')
  const [primaryCityId, setPrimaryCityId] = useState('')
  const [primaryAreaId, setPrimaryAreaId] = useState('')
  const [primaryStateName, setPrimaryStateName] = useState('')
  const [primaryCityName, setPrimaryCityName] = useState('')
  const [primaryAreaName, setPrimaryAreaName] = useState('')
  const [primarySocietyName, setPrimarySocietyName] = useState('')
  
  const [primaryCities, setPrimaryCities] = useState([])
  const [primaryAreas, setPrimaryAreas] = useState([])

  // Fetch max_selectable_societies on mount
  useEffect(() => {
    supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'max_selectable_societies')
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.value) {
          setMaxSelectableSocieties(Number(data.value))
        }
      })
  }, [])

  useEffect(() => {
    if (worker) {
      setFullName(worker.full_name || '')
      setBio(worker.bio || '')
      setExperience(worker.experience_years || 1)
      setPricingPerHour(worker.pricing_per_hour || 150)
      setPricingPerDay(worker.pricing_per_day || 800)
      setPricingNote(worker.pricing_note || '')
      setPhone2(worker.phone2 || '')
      setLanguages(worker.languages || [])
      setTravelRadius(worker.travel_radius || 10)

      // Load locations
      getWorkerLocations(worker.id).then(locs => {
        setLocations(locs)
        const primary = locs.find(l => l.is_primary)
        if (primary) {
          setPrimaryLat(primary.latitude || worker.latitude || null)
          setPrimaryLng(primary.longitude || worker.longitude || null)
          setPrimaryAddress(primary.address || '')
          setPrimaryStateId(primary.state_id || '')
          setPrimaryCityId(primary.city_id || '')
          setPrimaryAreaId(primary.area_id || '')
          setPrimaryStateName(primary.state_name || '')
          setPrimaryCityName(primary.city_name || '')
          setPrimaryAreaName(primary.area_name || '')
          setPrimarySocietyName(primary.society_name || '')
        } else {
          setPrimaryLat(worker.latitude || null)
          setPrimaryLng(worker.longitude || null)
          setPrimaryCityName(worker.current_city || '')
          setPrimaryAreaName(worker.current_area || '')
        }
      })
    }

    // Load initial states list
    getStates().then(setStates)
  }, [worker])

  // Load cities on location state change
  useEffect(() => {
    if (selLoc.stateId) {
      getCities(selLoc.stateId).then(setCities)
    }
  }, [selLoc.stateId])

  // Load areas on city change
  useEffect(() => {
    if (selLoc.cityId) {
      getAreas(selLoc.cityId).then(setAreas)
    }
  }, [selLoc.cityId])

  // Load primary cities on primary state change
  useEffect(() => {
    if (primaryStateId) {
      getCities(primaryStateId).then(setPrimaryCities)
    } else {
      setPrimaryCities([])
    }
  }, [primaryStateId])

  // Load primary areas on primary city change
  useEffect(() => {
    if (primaryCityId) {
      getAreas(primaryCityId).then(setPrimaryAreas)
    } else {
      setPrimaryAreas([])
    }
  }, [primaryCityId])

  const handlePrimaryLocationChange = async (coords) => {
    setPrimaryLat(coords.latitude)
    setPrimaryLng(coords.longitude)
    setPrimaryAddress(coords.address)
    
    try {
      const details = await getLocationDetails(coords.latitude, coords.longitude)
      if (details.state) {
        const resolvedState = await findOrCreateState(details.state)
        setPrimaryStateId(resolvedState.id)
        setPrimaryStateName(resolvedState.name)
        
        // Refresh states dropdown list
        const updatedStates = await getStates()
        setStates(updatedStates)
        
        if (details.city) {
          const resolvedCity = await findOrCreateCity(details.city, resolvedState.id)
          setPrimaryCityId(resolvedCity.id)
          setPrimaryCityName(resolvedCity.name)
          
          if (details.area) {
            const resolvedArea = await findOrCreateArea(details.area, resolvedCity.id)
            setPrimaryAreaId(resolvedArea.id)
            setPrimaryAreaName(resolvedArea.name)
          }
        }
      }
      setPrimarySocietyName(details.society || 'All Societies')
    } catch (err) {
      console.error('Error resolving coordinates:', err)
    }
  }

  const handlePrimaryStateChange = (e) => {
    const id = e.target.value
    setPrimaryStateId(id)
    const st = states.find(s => s.id === id)
    setPrimaryStateName(st ? st.name : '')
    setPrimaryCityId('')
    setPrimaryCityName('')
    setPrimaryAreaId('')
    setPrimaryAreaName('')
  }

  const handlePrimaryCityChange = (e) => {
    const id = e.target.value
    setPrimaryCityId(id)
    const ct = primaryCities.find(c => c.id === id)
    setPrimaryCityName(ct ? ct.name : '')
    setPrimaryAreaId('')
    setPrimaryAreaName('')
  }

  const handlePrimaryAreaChange = (e) => {
    const id = e.target.value
    setPrimaryAreaId(id)
    const ar = primaryAreas.find(a => a.id === id)
    setPrimaryAreaName(ar ? ar.name : '')
  }

  const handleDetectLocation = async () => {
    toast.loading('Detecting location...', { id: 'gps-profile' })
    try {
      const coords = await getCurrentPosition()
      const details = await getLocationDetails(coords.lat, coords.lng)
      
      if (!details.state || !details.city || !details.area) {
        throw new Error('Could not resolve location details from GPS')
      }

      // 1. Find or create State
      const resolvedState = await findOrCreateState(details.state)
      
      // Refresh states dropdown list
      const updatedStates = await getStates()
      setStates(updatedStates)

      // 2. Find or create City
      const resolvedCity = await findOrCreateCity(details.city, resolvedState.id)
      
      // Refresh cities dropdown list
      const updatedCities = await getCities(resolvedState.id)
      setCities(updatedCities)

      // 3. Find or create Area
      const resolvedArea = await findOrCreateArea(details.area, resolvedCity.id)
      
      // Refresh areas dropdown list
      const updatedAreas = await getAreas(resolvedCity.id)
      setAreas(updatedAreas)

      setSelLoc({
        stateId: resolvedState.id,
        cityId: resolvedCity.id,
        areaId: resolvedArea.id,
        societyName: details.society || 'All Societies',
        latitude: coords.lat,
        longitude: coords.lng,
        address: details.address || ''
      })

      toast.success('Location auto-detected and filled!', { id: 'gps-profile' })
    } catch (err) {
      console.error(err)
      if (err.code === 1) {
        toast.error('Geolocation permission denied. Please allow location permissions in your browser settings.', { id: 'gps-profile' })
      } else {
        toast.error(err.message || 'Failed to detect location. Please select manually.', { id: 'gps-profile' })
      }
    }
  }

  const handleAddLocation = async () => {
    if (!selLoc.stateId || !selLoc.cityId || !selLoc.areaId) {
      toast.error('Select State, City and Area')
      return
    }

    // Limit society selection count
    const isAddingSociety = selLoc.societyName && selLoc.societyName !== 'All Societies'
    if (isAddingSociety) {
      const selectedSocietiesCount = locations.filter(loc => loc.society_name && loc.society_name !== 'All Societies').length
      if (selectedSocietiesCount >= maxSelectableSocieties) {
        toast.error(`Maximum selectable societies limit reached (${maxSelectableSocieties})`)
        return
      }
    }

    const stateObj = states.find(s => s.id === selLoc.stateId)
    const cityObj = cities.find(c => c.id === selLoc.cityId)
    const areaObj = areas.find(a => a.id === selLoc.areaId)

    try {
      const locObj = await addWorkerLocation(worker.id, {
        state_id: selLoc.stateId,
        city_id: selLoc.cityId,
        area_id: selLoc.areaId,
        state_name: stateObj.name,
        city_name: cityObj.name,
        area_name: areaObj.name,
        society_name: selLoc.societyName || 'All Societies'
      })

      setLocations([...locations, locObj])
      setSelLoc({ stateId: '', cityId: '', areaId: '', societyName: '' })
      toast.success('Work Location added!')
    } catch (err) {
      toast.error('Failed to add location')
    }
  }

  const handleRemoveLocation = async (id) => {
    try {
      await removeWorkerLocation(id)
      setLocations(locations.filter(l => l.id !== id))
      toast.success('Location removed')
    } catch (err) {
      toast.error('Failed to delete location')
    }
  }

  const handleAddLanguage = () => {
    if (newLanguage && !languages.includes(newLanguage)) {
      setLanguages([...languages, newLanguage])
      setNewLanguage('')
    }
  }

  const handleRemoveLanguage = (lang) => {
    setLanguages(languages.filter(l => l !== lang))
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // 1. Upload photo if present
      if (avatarFile) {
        await uploadWorkerPhoto(worker.id, avatarFile)
      }
      
      // 2. Upload UPI QR if present
      if (upiFile) {
        await uploadUpiQr(worker.id, upiFile)
      }

      // 3. Update main profile details in Supabase
      const { error: userErr } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id)
      if (userErr) throw userErr

      await supabase
        .from('workers')
        .update({
          full_name: fullName,
          bio,
          experience_years: Number(experience),
          pricing_per_hour: Number(pricingPerHour),
          pricing_per_day: Number(pricingPerDay),
          pricing_note: pricingNote,
          phone2,
          languages,
          travel_radius: Number(travelRadius),
          latitude: primaryLat,
          longitude: primaryLng,
          current_city: primaryCityName || null,
          current_area: primaryAreaName || null,
          last_location_update: new Date().toISOString()
        })
        .eq('id', worker.id)

      // 4. Update/Upsert primary location entry in worker_locations table
      const primaryLoc = locations.find(l => l.is_primary)
      if (primaryLoc) {
        const { error: updateLocErr } = await supabase
          .from('worker_locations')
          .update({
            state_id: primaryStateId || null,
            city_id: primaryCityId || null,
            area_id: primaryAreaId || null,
            state_name: primaryStateName || null,
            city_name: primaryCityName || null,
            area_name: primaryAreaName || null,
            society_name: primarySocietyName || 'All Societies',
            latitude: primaryLat || null,
            longitude: primaryLng || null,
            address: primaryAddress || null
          })
          .eq('id', primaryLoc.id)
        if (updateLocErr) throw updateLocErr
      } else {
        const { error: insertLocErr } = await supabase
          .from('worker_locations')
          .insert([{
            worker_id: worker.id,
            state_id: primaryStateId || null,
            city_id: primaryCityId || null,
            area_id: primaryAreaId || null,
            state_name: primaryStateName || null,
            city_name: primaryCityName || null,
            area_name: primaryAreaName || null,
            society_name: primarySocietyName || 'All Societies',
            latitude: primaryLat || null,
            longitude: primaryLng || null,
            address: primaryAddress || null,
            is_primary: true
          }])
        if (insertLocErr) throw insertLocErr
      }

      toast.success('Profile updated successfully!')
      await refreshProfile()
      navigate('/worker/profile')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ width: 'fit-content', gap: '4px' }}>
          <ArrowLeft size={16} /> Cancel
        </button>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Edit Profile Settings</h2>

        <form onSubmit={handleSaveProfile} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Profile & UPI Upload blocks */}
          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Profile Avatar Image</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '4px' }}>
                  <FileUp size={14} /> Upload Avatar
                  <input type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={e => setAvatarFile(e.target.files[0])} />
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {avatarFile ? avatarFile.name : 'No file chosen'}
                </span>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">UPI QR Scanner Image</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '4px' }}>
                  <QrCode size={14} /> Upload UPI QR Code
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setUpiFile(e.target.files[0])} />
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {upiFile ? upiFile.name : 'No file chosen'}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Backup Phone Number</label>
              <input type="tel" className="form-input" value={phone2} onChange={e => setPhone2(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Experience Years</label>
              <input type="number" className="form-input" value={experience} onChange={e => setExperience(e.target.value)} required />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Biography</label>
            <textarea className="form-input" rows={3} value={bio} onChange={e => setBio(e.target.value)} required />
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Hourly Pricing (₹)</label>
              <input type="number" className="form-input" value={pricingPerHour} onChange={e => setPricingPerHour(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Daily Pricing (₹)</label>
              <input type="number" className="form-input" value={pricingPerDay} onChange={e => setPricingPerDay(e.target.value)} required />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Pricing Notes</label>
              <input type="text" className="form-input" value={pricingNote} onChange={e => setPricingNote(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Service Travel Distance Limit (Radius)</label>
              <select className="form-select" value={travelRadius} onChange={e => setTravelRadius(Number(e.target.value))}>
                <option value={3}>3 km</option>
                <option value={5}>5 km</option>
                <option value={8}>8 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={20}>20 km</option>
              </select>
            </div>
          </div>

          {/* Languages input section */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Languages Spoken</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className="form-input" placeholder="Add Language..." value={newLanguage} onChange={e => setNewLanguage(e.target.value)} />
              <button type="button" onClick={handleAddLanguage} className="btn btn-secondary">Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
              {languages.map(l => (
                <span key={l} className="badge badge-verified" style={{ textTransform: 'none', cursor: 'pointer' }} onClick={() => handleRemoveLanguage(l)}>
                  {l} ✕
                </span>
              ))}
            </div>
          </div>

          {/* Primary Location (Map & Details) */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Primary Base Location</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Set your primary address location. You can pin it on the map or select it manually below.
            </p>

            <div className="grid-3" style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>State</label>
                <select className="form-select" value={primaryStateId} onChange={handlePrimaryStateChange}>
                  <option value="">Select State</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>City</label>
                <select className="form-select" value={primaryCityId} disabled={!primaryStateId} onChange={handlePrimaryCityChange}>
                  <option value="">Select City</option>
                  {primaryCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Area</label>
                <select className="form-select" value={primaryAreaId} disabled={!primaryCityId} onChange={handlePrimaryAreaChange}>
                  <option value="">Select Area</option>
                  {primaryAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Society Name / Landmark</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Setu Vartica" 
                value={primarySocietyName} 
                onChange={e => setPrimarySocietyName(e.target.value)} 
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Pin Base Location on Map</label>
              <LocationPicker 
                lat={primaryLat} 
                lng={primaryLng} 
                onLocationChange={handlePrimaryLocationChange} 
              />
            </div>
          </div>

          {/* Location matrix list adding manager */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Manage Additional Work Locations</h4>
              <button 
                type="button" 
                onClick={handleDetectLocation} 
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}
              >
                <MapPin size={12} /> Detect Current GPS
              </button>
            </div>

            <div className="grid-3" style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <select className="form-select" value={selLoc.stateId} onChange={e => setSelLoc({ ...selLoc, stateId: e.target.value })}>
                <option value="">Select State</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select className="form-select" value={selLoc.cityId} disabled={!selLoc.stateId} onChange={e => setSelLoc({ ...selLoc, cityId: e.target.value })}>
                <option value="">Select City</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select className="form-select" value={selLoc.areaId} disabled={!selLoc.cityId} onChange={e => setSelLoc({ ...selLoc, areaId: e.target.value })}>
                <option value="">Select Area</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Society Name (Optional)" 
                value={selLoc.societyName}
                onChange={e => setSelLoc({ ...selLoc, societyName: e.target.value })}
              />
              <button type="button" onClick={handleAddLocation} className="btn btn-secondary" style={{ gap: '4px' }}>
                <Plus size={16} /> Add Location
              </button>
            </div>

            {/* Configured locations list */}
            <div className="card glass" style={{ padding: '0.75rem' }}>
              {locations.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '0.5rem' }}>No locations added yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {locations.map(loc => (
                    <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                      <span>{loc.city_name} → {loc.area_name} ({loc.society_name})</span>
                      <button type="button" onClick={() => handleRemoveLocation(loc.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={saving}>
            {saving ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Save Profile Details'}
          </button>
        </form>
      </div>
    </WorkerLayout>
  )
}
