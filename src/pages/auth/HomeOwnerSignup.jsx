import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles, MapPin, Search } from 'lucide-react'
import { homeownerSignupSchema } from '../../utils/validators'
import { signUp, signIn, createHomeownerProfile, getRoles } from '../../services/auth'
import { getStates, getCities, getAreas, searchSocieties, findOrCreateSociety, findOrCreateState, findOrCreateCity, findOrCreateArea } from '../../services/locations'
import LocationPicker from '../../components/maps/LocationPicker'
import { toast } from 'react-hot-toast'

export default function HomeOwnerSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Location lists
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])
  const [areasList, setAreasList] = useState([])
  const [societiesList, setSocietiesList] = useState([])
  const [selectedSocietyId, setSelectedSocietyId] = useState(null)
  
  const [showStateSuggestions, setShowStateSuggestions] = useState(false)
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false)
  const [showSocietySuggestions, setShowSocietySuggestions] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger
  } = useForm({
    resolver: zodResolver(homeownerSignupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      state: '',
      city: '',
      area: '',
      societyName: '',
      houseNumber: '',
      address: '',
      latitude: undefined,
      longitude: undefined
    }
  })

  // Watch state, city, area to fetch lists dynamically
  const typedState = watch('state')
  const typedCity = watch('city')
  const typedArea = watch('area')
  const typedSocietyName = watch('societyName')
  const pinLat = watch('latitude')
  const pinLng = watch('longitude')

  // Load States on mount
  useEffect(() => {
    getStates().then(setStatesList).catch(err => console.error('Error fetching states:', err))
  }, [])

  // Load Cities when state matches
  useEffect(() => {
    const st = statesList.find(s => s.name.toLowerCase() === (typedState || '').toLowerCase())
    if (st) {
      getCities(st.id).then(setCitiesList)
    } else {
      setCitiesList([])
    }
  }, [typedState, statesList])

  // Load Areas when city matches
  useEffect(() => {
    const ct = citiesList.find(c => c.name.toLowerCase() === (typedCity || '').toLowerCase())
    if (ct) {
      getAreas(ct.id).then(setAreasList)
    } else {
      setAreasList([])
    }
  }, [typedCity, citiesList])

  // Smart Society Database Search Autocomplete
  useEffect(() => {
    const matchedCity = citiesList.find(c => c.name.toLowerCase() === (typedCity || '').toLowerCase())
    const cityId = matchedCity ? matchedCity.id : null

    if (typedSocietyName && typedSocietyName.length >= 2) {
      searchSocieties(typedSocietyName, cityId).then(setSocietiesList)
      setShowSocietySuggestions(true)
    } else {
      setSocietiesList([])
      setShowSocietySuggestions(false)
    }
  }, [typedSocietyName, typedCity, citiesList])

  const selectSociety = (soc) => {
    setValue('societyName', soc.name)
    setSelectedSocietyId(soc.id)
    setShowSocietySuggestions(false)
    if (soc.latitude && soc.longitude) {
      setValue('latitude', soc.latitude)
      setValue('longitude', soc.longitude)
    }
    toast.success(`Society "${soc.name}" selected!`)
  }

  const handleLocationPin = (coords) => {
    setValue('latitude', coords.latitude)
    setValue('longitude', coords.longitude)
    setValue('address', coords.address)

    // Parse Nominatim details if available to auto-fill location fields
    const addr = coords.rawGeoData?.address || {}
    if (addr.state) {
      setValue('state', addr.state)
    }
    if (addr.city || addr.town || addr.village) {
      setValue('city', addr.city || addr.town || addr.village)
    }
    
    // Suggest society name from reverse geocode
    const parsedSociety = addr.neighbourhood || addr.suburb || addr.residential || ''
    if (parsedSociety) {
      setValue('societyName', parsedSociety)
    }
  }

  const handleNext = async () => {
    let fieldsToValidate = []
    if (step === 1) {
      fieldsToValidate = ['fullName', 'email', 'phone', 'password', 'confirmPassword']
    } else if (step === 2) {
      fieldsToValidate = ['state', 'city', 'area', 'societyName', 'houseNumber', 'address']
    }
    
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setStep(prev => prev + 1)
    } else {
      toast.error('Please correct errors in form fields')
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // 1. Get role ID for homeowner
      const roles = await getRoles()
      const homeownerRole = roles.find(r => r.name === 'homeowner')
      if (!homeownerRole) throw new Error('Role "homeowner" not configured in database')

      // Create fallback email if blank
      const authEmail = data.email || `${data.phone}@cleanconnect.com`

      // 2. Sign up Auth User
      let userId;
      try {
        const authResult = await signUp(authEmail, data.password, data.fullName)
        userId = authResult.user.id
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('already registered')) {
          // If the user already exists (likely from a previous failed registration attempt),
          // try to sign them in with the provided credentials to continue profile creation.
          const authResult = await signIn(authEmail, data.password)
          userId = authResult.user.id
        } else {
          throw err
        }
      }

      // 3. Find or Create Smart Location hierarchy
      let finalStateId = null
      let finalCityId = null
      let finalAreaId = null
      
      const matchedState = statesList.find(s => s.name.toLowerCase() === data.state.toLowerCase())
      if (matchedState) finalStateId = matchedState.id
      else { const st = await findOrCreateState(data.state); finalStateId = st.id; }

      const matchedCity = citiesList.find(c => c.name.toLowerCase() === data.city.toLowerCase())
      if (matchedCity) finalCityId = matchedCity.id
      else { const ct = await findOrCreateCity(data.city, finalStateId); finalCityId = ct.id; }

      const matchedArea = areasList.find(a => a.name.toLowerCase() === data.area.toLowerCase())
      if (matchedArea) finalAreaId = matchedArea.id
      else { const ar = await findOrCreateArea(data.area, finalCityId); finalAreaId = ar.id; }

      let finalSocietyId = selectedSocietyId
      if (!finalSocietyId && data.societyName) {
        const createdSoc = await findOrCreateSociety({
          name: data.societyName,
          areaId: finalAreaId,
          cityId: finalCityId,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address
        })
        finalSocietyId = createdSoc.id
      }

      // 4. Create Homeowner detailed profile
      await createHomeownerProfile(userId, homeownerRole.id, {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        stateId: finalStateId,
        cityId: finalCityId,
        areaId: finalAreaId,
        societyId: finalSocietyId,
        societyName: data.societyName,
        houseNumber: data.houseNumber,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude
      })

      toast.success('Registration complete! Welcome to CleanConnect.')
      navigate('/homeowner/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Registration failed. Check details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card glass slide-up" style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Step indicator header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="var(--primary)" />
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Home Owner Registration</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
            Step {step} of 3
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP 1: Personal credentials */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" placeholder="Amit Patel" {...register('fullName')} />
                {errors.fullName && <span className="form-error">{errors.fullName.message}</span>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" placeholder="9876543210" {...register('phone')} />
                {errors.phone && <span className="form-error">{errors.phone.message}</span>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address (Optional)</label>
                <input type="email" className="form-input" placeholder="amit@example.com" {...register('email')} />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" {...register('password')} />
                  {errors.password && <span className="form-error">{errors.password.message}</span>}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirm Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" {...register('confirmPassword')} />
                  {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Address and Location Picker */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-3">
                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label className="form-label">State</label>
                  <input type="text" className="form-input" placeholder="Type State" autoComplete="off"
                    {...register('state', { onBlur: () => setTimeout(() => setShowStateSuggestions(false), 200) })}
                    onFocus={() => setShowStateSuggestions(true)}
                  />
                  {showStateSuggestions && statesList.filter(s => s.name.toLowerCase().includes((watch('state')||'').toLowerCase())).length > 0 && (
                    <ul className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px', maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px' }}>
                      {statesList.filter(s => s.name.toLowerCase().includes((watch('state')||'').toLowerCase())).map(st => (
                        <li key={st.id} onClick={() => { setValue('state', st.name); setShowStateSuggestions(false) }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} className="glass-hover">{st.name}</li>
                      ))}
                    </ul>
                  )}
                  {errors.state && <span className="form-error">{errors.state.message}</span>}
                </div>

                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" placeholder="Type City" autoComplete="off"
                    {...register('city', { onBlur: () => setTimeout(() => setShowCitySuggestions(false), 200) })}
                    onFocus={() => setShowCitySuggestions(true)}
                  />
                  {showCitySuggestions && citiesList.filter(c => c.name.toLowerCase().includes((watch('city')||'').toLowerCase())).length > 0 && (
                    <ul className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px', maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px' }}>
                      {citiesList.filter(c => c.name.toLowerCase().includes((watch('city')||'').toLowerCase())).map(ct => (
                        <li key={ct.id} onClick={() => { setValue('city', ct.name); setShowCitySuggestions(false) }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} className="glass-hover">{ct.name}</li>
                      ))}
                    </ul>
                  )}
                  {errors.city && <span className="form-error">{errors.city.message}</span>}
                </div>

                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label className="form-label">Local Area</label>
                  <input type="text" className="form-input" placeholder="Type Area" autoComplete="off"
                    {...register('area', { onBlur: () => setTimeout(() => setShowAreaSuggestions(false), 200) })}
                    onFocus={() => setShowAreaSuggestions(true)}
                  />
                  {showAreaSuggestions && areasList.filter(a => a.name.toLowerCase().includes((watch('area')||'').toLowerCase())).length > 0 && (
                    <ul className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px', maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px' }}>
                      {areasList.filter(a => a.name.toLowerCase().includes((watch('area')||'').toLowerCase())).map(ar => (
                        <li key={ar.id} onClick={() => { setValue('area', ar.name); setShowAreaSuggestions(false) }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} className="glass-hover">{ar.name}</li>
                      ))}
                    </ul>
                  )}
                  {errors.area && <span className="form-error">{errors.area.message}</span>}
                </div>
              </div>

              {/* Society Database Smart Autocomplete suggestions */}
              <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                <label className="form-label">Society / Building Name</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Type Society..." 
                    {...register('societyName', {
                      onBlur: () => setTimeout(() => setShowSocietySuggestions(false), 200)
                    })} 
                    autoComplete="off"
                    onFocus={() => { if (societiesList.length > 0) setShowSocietySuggestions(true) }}
                  />
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                {errors.societyName && <span className="form-error">{errors.societyName.message}</span>}
                
                {showSocietySuggestions && societiesList.length > 0 && (
                  <ul className="glass" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px',
                    maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px'
                  }}>
                    {societiesList.map(soc => (
                      <li 
                        key={soc.id}
                        onClick={() => selectSociety(soc)}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                        className="glass-hover"
                      >
                        {soc.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({soc.cities?.name || ''})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">House / Flat Number</label>
                <input type="text" className="form-input" placeholder="Flat 402, Block B" {...register('houseNumber')} />
                {errors.houseNumber && <span className="form-error">{errors.houseNumber.message}</span>}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Street Address</label>
                <input type="text" className="form-input" placeholder="Nearby Landmark, Road Details" {...register('address')} />
                {errors.address && <span className="form-error">{errors.address.message}</span>}
              </div>

              {/* Map location picker integrated with geocoding */}
              <LocationPicker 
                lat={pinLat} 
                lng={pinLng} 
                onLocationChange={handleLocationPin} 
              />
            </div>
          )}

          {/* STEP 3: Review summary */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                <h4 style={{ fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Review Details</h4>
                <p><strong>Name:</strong> {watch('fullName')}</p>
                <p><strong>Phone:</strong> {watch('phone')}</p>
                <p><strong>Society Name:</strong> {watch('societyName')}</p>
                <p><strong>House/Flat:</strong> {watch('houseNumber')}</p>
                <p><strong>Complete Address:</strong> {watch('address')}</p>
                <p><strong>GPS Coordinates:</strong> {pinLat ? `${pinLat.toFixed(5)}, ${pinLng.toFixed(5)}` : 'Manual Location Pinned'}</p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <MapPin size={16} color="var(--success)" />
                <span>Confirming address triggers target location alignment instantly.</span>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            {step > 1 && (
              <button type="button" onClick={() => setStep(prev => prev - 1)} className="btn btn-secondary" style={{ flex: 1 }}>
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button type="button" onClick={handleNext} className="btn btn-primary" style={{ flex: 1 }}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Complete Registration'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  )
}
