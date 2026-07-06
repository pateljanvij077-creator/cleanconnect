import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sparkles, MapPin, Plus, Trash2, Search } from 'lucide-react'
import { workerSignupSchema } from '../../utils/validators'
import { signUp, signIn, createWorkerProfile, getRoles } from '../../services/auth'
import { getStates, getCities, getAreas, searchSocieties, findOrCreateState, findOrCreateCity, findOrCreateArea, findOrCreateSociety } from '../../services/locations'
import LocationPicker from '../../components/maps/LocationPicker'
import { toast } from 'react-hot-toast'
import { getLocationDetails, getCurrentPosition } from '../../utils/gps'

export default function WorkerSignup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Location selector helper states
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])
  const [areasList, setAreasList] = useState([])
  
  const [showStateSuggestions, setShowStateSuggestions] = useState(false)
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false)
  const [showSocietySuggestions, setShowSocietySuggestions] = useState(false)
  const [societiesList, setSocietiesList] = useState([])
  
  // Work Locations adding system
  const [locations, setLocations] = useState([])
  const [currentLoc, setCurrentLoc] = useState({
    stateId: '', cityId: '', areaId: '', societyId: '',
    stateName: '', cityName: '', areaName: '', societyName: '',
    latitude: undefined, longitude: undefined, address: ''
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger
  } = useForm({
    resolver: zodResolver(workerSignupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      phone2: '',
      password: '',
      confirmPassword: '',
      gender: 'male',
      dob: '',
      bio: '',
      experienceYears: 1,
      languages: [],
      workerType: 'home_cleaning',
      pricingPerHour: 150,
      pricingPerDay: 800,
      pricingNote: '',
      travelRadius: 10
    }
  })

  // Watch fields
  const watchLanguages = watch('languages')
  const watchWorkerType = watch('workerType')

  const [maxSelectableSocieties, setMaxSelectableSocieties] = useState(10)

  useEffect(() => {
    getStates().then(setStatesList).catch(err => console.error('Error fetching states:', err))

    // Fetch max selectable societies setting
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

  // Load cities when current location state selection changes
  useEffect(() => {
    const st = statesList.find(s => s.name.toLowerCase() === (currentLoc.stateName || '').toLowerCase())
    if (st) {
      getCities(st.id).then(setCitiesList)
    } else {
      setCitiesList([])
    }
  }, [currentLoc.stateName, statesList])

  // Load areas when city changes
  useEffect(() => {
    const ct = citiesList.find(c => c.name.toLowerCase() === (currentLoc.cityName || '').toLowerCase())
    if (ct) {
      getAreas(ct.id).then(setAreasList)
    } else {
      setAreasList([])
    }
  }, [currentLoc.cityName, citiesList])

  // Smart Society Database Search Autocomplete
  useEffect(() => {
    const matchedCity = citiesList.find(c => c.name.toLowerCase() === (currentLoc.cityName || '').toLowerCase())
    const cityId = matchedCity ? matchedCity.id : null

    if (currentLoc.societyName && currentLoc.societyName.length >= 2 && showSocietySuggestions) {
      searchSocieties(currentLoc.societyName, cityId).then(setSocietiesList)
    } else {
      setSocietiesList([])
    }
  }, [currentLoc.societyName, currentLoc.cityName, citiesList, showSocietySuggestions])

  const selectSociety = (soc) => {
    setCurrentLoc({
      ...currentLoc,
      societyName: soc.name,
      societyId: soc.id,
      latitude: soc.latitude || currentLoc.latitude,
      longitude: soc.longitude || currentLoc.longitude
    })
    setShowSocietySuggestions(false)
    toast.success(`Society "${soc.name}" selected!`)
  }

  const addLocationRow = async () => {
    if (!currentLoc.stateName || !currentLoc.cityName || !currentLoc.areaName) {
      toast.error('Type State, City and Area to add location')
      return
    }

    const isAddingSociety = currentLoc.societyName && currentLoc.societyName !== 'All Societies'
    if (isAddingSociety) {
      const selectedSocietiesCount = locations.filter(loc => loc.societyName && loc.societyName !== 'All Societies').length
      if (selectedSocietiesCount >= maxSelectableSocieties) {
        toast.error(`Maximum selectable societies limit reached (${maxSelectableSocieties})`)
        return
      }
    }

    const newLoc = {
      stateName: currentLoc.stateName,
      cityName: currentLoc.cityName,
      areaName: currentLoc.areaName,
      societyName: currentLoc.societyName || 'All Societies',
      latitude: currentLoc.latitude,
      longitude: currentLoc.longitude,
      address: currentLoc.address,
      societyId: currentLoc.societyId // in case selected from autocomplete
    }

    setLocations([...locations, newLoc])
      // Reset location adding state
      setCurrentLoc({
        stateId: '', cityId: '', areaId: '', societyId: '',
        stateName: '', cityName: '', areaName: '', societyName: '',
        latitude: undefined, longitude: undefined, address: ''
      })
      toast.success('Work Location added!')
  }

  const handleLocationPin = async (coords) => {
    try {
      const details = await getLocationDetails(coords.latitude, coords.longitude)
      setCurrentLoc(prev => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: coords.address,
        stateName: details.state || prev.stateName,
        cityName: details.city || prev.cityName,
        areaName: details.area || prev.areaName,
        societyName: details.society || prev.societyName
      }))
    } catch (err) {
      console.error('Error parsing geocoded details:', err)
    }
  }

  const detectGpsLocation = async () => {
    setLoading(true)
    const toastId = toast.loading('Detecting GPS location...')
    try {
      const coords = await getCurrentPosition()
      const details = await getLocationDetails(coords.lat, coords.lng)
      
      setCurrentLoc(prev => ({
        ...prev,
        latitude: coords.lat,
        longitude: coords.lng,
        address: details.address || '',
        stateName: details.state || '',
        cityName: details.city || '',
        areaName: details.area || '',
        societyName: details.society || ''
      }))
      toast.success('Location detected successfully!', { id: toastId })
    } catch (err) {
      console.error(err)
      if (err.code === 1) {
        toast.error('Geolocation permission denied. Please allow location permissions in your browser settings.', { id: toastId })
      } else {
        toast.error('Failed to get GPS coordinates. Please select manually.', { id: toastId })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step === 3) {
      detectGpsLocation()
    }
  }, [step])

  const removeLocationRow = (index) => {
    setLocations(locations.filter((_, idx) => idx !== index))
  }

  const handleLanguageAdd = (lang) => {
    const list = watchLanguages || []
    if (lang && !list.includes(lang)) {
      setValue('languages', [...list, lang])
    }
  }

  const handleLanguageRemove = (lang) => {
    const list = watchLanguages || []
    setValue('languages', list.filter(l => l !== lang))
  }

  const handleNext = async () => {
    let fieldsToValidate = []
    if (step === 1) {
      fieldsToValidate = ['fullName', 'email', 'phone', 'phone2', 'password', 'confirmPassword', 'gender', 'dob']
    } else if (step === 2) {
      fieldsToValidate = ['bio', 'experienceYears', 'languages', 'workerType', 'pricingPerHour', 'pricingPerDay']
    }
    
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      if (step === 2 && locations.length === 0) {
        // Automatically proceed to location input step
        setStep(3)
      } else {
        setStep(prev => prev + 1)
      }
    } else {
      toast.error('Please correct errors in form fields')
    }
  }

  const onSubmit = async (data) => {
    if (locations.length === 0) {
      toast.error('Please add at least one Work Location (City/Area)')
      return
    }

    setLoading(true)
    try {
      // 1. Get role ID for worker
      const roles = await getRoles()
      const workerRole = roles.find(r => r.name === 'worker')
      if (!workerRole) throw new Error('Role "worker" not configured in database')

      // Create fallback email if blank
      const authEmail = data.email || `${data.phone}@cleanconnect.com`

      // 2. Sign up Auth User
      let userId;
      try {
        const authResult = await signUp(authEmail, data.password, data.fullName)
        userId = authResult.user.id
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('already registered')) {
          const authResult = await signIn(authEmail, data.password)
          userId = authResult.user.id
        } else {
          throw err
        }
      }

      // 3. Find or Create Smart Location hierarchy
      const resolvedLocations = []
      for (const loc of locations) {
        let finalStateId = null
        let finalCityId = null
        let finalAreaId = null
        
        const matchedState = statesList.find(s => s.name.toLowerCase() === loc.stateName.toLowerCase())
        if (matchedState) finalStateId = matchedState.id
        else { const st = await findOrCreateState(loc.stateName); finalStateId = st.id; }

        const matchedCity = citiesList.find(c => c.name.toLowerCase() === loc.cityName.toLowerCase())
        if (matchedCity) finalCityId = matchedCity.id
        else { const ct = await findOrCreateCity(loc.cityName, finalStateId); finalCityId = ct.id; }

        const matchedArea = areasList.find(a => a.name.toLowerCase() === loc.areaName.toLowerCase())
        if (matchedArea) finalAreaId = matchedArea.id
        else { const ar = await findOrCreateArea(loc.areaName, finalCityId); finalAreaId = ar.id; }

        let finalSocietyId = loc.societyId || null
        if (!finalSocietyId && loc.societyName && loc.societyName !== 'All Societies') {
          const createdSoc = await findOrCreateSociety({
            name: loc.societyName,
            areaId: finalAreaId,
            cityId: finalCityId,
            latitude: loc.latitude || undefined,
            longitude: loc.longitude || undefined,
            address: loc.address || ''
          })
          finalSocietyId = createdSoc.id
        }

        resolvedLocations.push({
          stateId: finalStateId,
          cityId: finalCityId,
          areaId: finalAreaId,
          societyId: finalSocietyId,
          stateName: loc.stateName,
          cityName: loc.cityName,
          areaName: loc.areaName,
          societyName: loc.societyName
        })
      }

      // 4. Create Worker Profile with primary locations list
      await createWorkerProfile(userId, workerRole.id, {
        ...data,
        locations: resolvedLocations
      })

      // Store worker profile credentials locally before proceeding to doc uploads
      localStorage.setItem('cleanconnect_signup_worker_id', userId)

      toast.success('Account created! Proceed to document uploads.')
      navigate('/auth/documents')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Registration failed. Check details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', alignItems: 'center', justify: 'center', padding: '1.5rem' }}>
      <div className="card glass slide-up" style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Step indicator header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="var(--primary)" />
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Worker Professional Account Registration</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
            Step {step} of 3
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP 1: Personal Credentials & DOB */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.0rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" placeholder="Ramesh Kumar" {...register('fullName')} />
                {errors.fullName && <span className="form-error">{errors.fullName.message}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Primary Phone (UPI/Call)</label>
                  <input type="tel" className="form-input" placeholder="9876543210" {...register('phone')} />
                  {errors.phone && <span className="form-error">{errors.phone.message}</span>}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Secondary / Backup Phone</label>
                  <input type="tel" className="form-input" placeholder="9123456789" {...register('phone2')} />
                  {errors.phone2 && <span className="form-error">{errors.phone2.message}</span>}
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address (Optional)</label>
                <input type="email" className="form-input" placeholder="ramesh@example.com" {...register('email')} />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Gender</label>
                  <select className="form-select" {...register('gender')}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-input" {...register('dob')} />
                  {errors.dob && <span className="form-error">{errors.dob.message}</span>}
                </div>
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

          {/* STEP 2: Work preferences and Rates */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Introduce Yourself (Bio)</label>
                <textarea 
                  className="form-input" 
                  rows={3} 
                  placeholder="Tell homeowners about your cleaning experience..." 
                  {...register('bio')}
                />
                {errors.bio && <span className="form-error">{errors.bio.message}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Years of Experience</label>
                  <input type="number" className="form-input" {...register('experienceYears', { valueAsNumber: true })} />
                  {errors.experienceYears && <span className="form-error">{errors.experienceYears.message}</span>}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Worker Type</label>
                  <select className="form-select" {...register('workerType')}>
                    <option value="home_cleaning">Home Cleaning Only</option>
                    <option value="office_cleaning">Office Cleaning Only</option>
                    <option value="both">Both (Home & Office)</option>
                  </select>
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Pricing Rate Per Hour (₹)</label>
                  <input type="number" className="form-input" {...register('pricingPerHour', { valueAsNumber: true })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Pricing Rate Per Day (₹)</label>
                  <input type="number" className="form-input" {...register('pricingPerDay', { valueAsNumber: true })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Service Travel Radius</label>
                  <select className="form-select" {...register('travelRadius', { valueAsNumber: true })}>
                    <option value={3}>3 km</option>
                    <option value={5}>5 km</option>
                    <option value={8}>8 km</option>
                    <option value={10}>10 km</option>
                    <option value={15}>15 km</option>
                    <option value={20}>20 km</option>
                  </select>
                </div>
              </div>

              {/* Languages tags input */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Languages Spoken</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {['Hindi', 'English', 'Punjabi', 'Gujarati', 'Marathi', 'Bengali', 'Tamil', 'Telugu'].map(l => (
                    <button 
                      key={l} 
                      type="button" 
                      onClick={() => handleLanguageAdd(l)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                    >
                      +{l}
                    </button>
                  ))}
                </div>
                
                {/* Active languages display list */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(watchLanguages || []).map(lang => (
                    <span 
                      key={lang} 
                      className="badge badge-verified" 
                      style={{ textTransform: 'none', cursor: 'pointer' }}
                      onClick={() => handleLanguageRemove(lang)}
                    >
                      {lang} ✕
                    </span>
                  ))}
                </div>
                {errors.languages && <span className="form-error">{errors.languages.message}</span>}
              </div>
            </div>
          )}

          {/* STEP 3: Multi Work-locations configuration */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Configure Work Locations</h4>
                <button 
                  type="button" 
                  onClick={detectGpsLocation} 
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}
                >
                  <MapPin size={12} /> Detect Current GPS
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Select multiple cities, areas or societies. Unlimited target locations allowed.
              </p>

              {/* Selector Row */}
              <div className="grid-3">
                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label className="form-label">State</label>
                  <input type="text" className="form-input" placeholder="Type State" autoComplete="off"
                    value={currentLoc.stateName}
                    onChange={(e) => setCurrentLoc({ ...currentLoc, stateName: e.target.value })}
                    onFocus={() => setShowStateSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowStateSuggestions(false), 200)}
                  />
                  {showStateSuggestions && statesList.filter(s => s.name.toLowerCase().includes((currentLoc.stateName||'').toLowerCase())).length > 0 && (
                    <ul className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px', maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px' }}>
                      {statesList.filter(s => s.name.toLowerCase().includes((currentLoc.stateName||'').toLowerCase())).map(st => (
                        <li key={st.id} onClick={() => { setCurrentLoc({ ...currentLoc, stateName: st.name }); setShowStateSuggestions(false) }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} className="glass-hover">{st.name}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" placeholder="Type City" autoComplete="off"
                    value={currentLoc.cityName}
                    onChange={(e) => setCurrentLoc({ ...currentLoc, cityName: e.target.value })}
                    onFocus={() => setShowCitySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                  />
                  {showCitySuggestions && citiesList.filter(c => c.name.toLowerCase().includes((currentLoc.cityName||'').toLowerCase())).length > 0 && (
                    <ul className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px', maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px' }}>
                      {citiesList.filter(c => c.name.toLowerCase().includes((currentLoc.cityName||'').toLowerCase())).map(ct => (
                        <li key={ct.id} onClick={() => { setCurrentLoc({ ...currentLoc, cityName: ct.name }); setShowCitySuggestions(false) }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} className="glass-hover">{ct.name}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label className="form-label">Area</label>
                  <input type="text" className="form-input" placeholder="Type Area" autoComplete="off"
                    value={currentLoc.areaName}
                    onChange={(e) => setCurrentLoc({ ...currentLoc, areaName: e.target.value })}
                    onFocus={() => setShowAreaSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 200)}
                  />
                  {showAreaSuggestions && areasList.filter(a => a.name.toLowerCase().includes((currentLoc.areaName||'').toLowerCase())).length > 0 && (
                    <ul className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: 'var(--radius-sm)', listStyle: 'none', padding: '4px', maxHeight: '160px', overflowY: 'auto', zIndex: 10, marginTop: '4px' }}>
                      {areasList.filter(a => a.name.toLowerCase().includes((currentLoc.areaName||'').toLowerCase())).map(ar => (
                        <li key={ar.id} onClick={() => { setCurrentLoc({ ...currentLoc, areaName: ar.name }); setShowAreaSuggestions(false) }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} className="glass-hover">{ar.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1, position: 'relative' }}>
                  <label className="form-label">Society Name (Optional - leave blank for all areas)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Green Park Residency"
                      value={currentLoc.societyName}
                      onChange={(e) => {
                        setCurrentLoc({ ...currentLoc, societyName: e.target.value })
                        setShowSocietySuggestions(true)
                      }}
                      onBlur={() => setTimeout(() => setShowSocietySuggestions(false), 200)}
                      onFocus={() => { if (societiesList.length > 0 || currentLoc.societyName?.length >= 2) setShowSocietySuggestions(true) }}
                      autoComplete="off"
                    />
                    <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                  
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
                <button 
                  type="button" 
                  onClick={addLocationRow} 
                  className="btn btn-primary"
                  style={{ gap: '4px', height: '44px' }}
                >
                  <Plus size={16} /> Add
                </button>
              </div>

              {/* Map location picker integrated with geocoding */}
              <LocationPicker 
                lat={currentLoc.latitude} 
                lng={currentLoc.longitude} 
                onLocationChange={handleLocationPin} 
              />

              {/* Added Locations list table */}
              <div className="card glass" style={{ padding: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                {locations.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '1rem', fontSize: '13px', color: 'var(--text-muted)' }}>
                    No work locations added yet. Please select above and click Add.
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>City</th>
                        <th style={{ padding: '8px' }}>Area</th>
                        <th style={{ padding: '8px' }}>Society</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px' }}>{loc.cityName}</td>
                          <td style={{ padding: '8px' }}>{loc.areaName}</td>
                          <td style={{ padding: '8px' }}>{loc.societyName}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            <button 
                              type="button" 
                              onClick={() => removeLocationRow(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Navigation controls */}
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
                {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Register & Upload Docs'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  )
}
