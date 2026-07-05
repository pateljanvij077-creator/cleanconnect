import { supabase } from '../supabase/client'

/**
 * CleanConnect Authentication and User profile services
 */

export async function signUp(email, password, fullName) {
  // If email is empty, we will create a dummy email using phone number on the frontend signup
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  
  // Record login history
  if (data?.user) {
    await recordLoginHistory(data.user.id)
  }
  
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function createHomeownerProfile(userId, roleId, profileData) {
  // 1. Update general users table
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      role_id: roleId,
      full_name: profileData.fullName,
      phone: profileData.phone,
      email: profileData.email || null,
    })
  
  if (userError) throw userError

  // 2. Insert homeowner detailed profile
  const { data, error } = await supabase
    .from('homeowners')
    .insert([{
      user_id: userId,
      full_name: profileData.fullName,
      email: profileData.email || null,
      phone: profileData.phone,
      state_id: profileData.stateId || null,
      city_id: profileData.cityId || null,
      area_id: profileData.areaId || null,
      society_id: profileData.societyId || null,
      society_name: profileData.societyName,
      house_number: profileData.houseNumber,
      address: profileData.address,
      latitude: profileData.latitude,
      longitude: profileData.longitude
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createWorkerProfile(userId, roleId, profileData) {
  // 1. Update general users table
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      role_id: roleId,
      full_name: profileData.fullName,
      phone: profileData.phone,
      email: profileData.email || null,
    })
  
  if (userError) throw userError

  // 2. Insert worker profile
  const { data, error } = await supabase
    .from('workers')
    .insert([{
      user_id: userId,
      full_name: profileData.fullName,
      email: profileData.email || null,
      phone: profileData.phone,
      phone2: profileData.phone2,
      gender: profileData.gender,
      dob: profileData.dob,
      bio: profileData.bio,
      experience_years: profileData.experienceYears,
      languages: profileData.languages,
      worker_type: profileData.workerType,
      pricing_per_hour: profileData.pricingPerHour,
      pricing_per_day: profileData.pricingPerDay,
      pricing_note: profileData.pricingNote || '',
      is_available: false,
      availability_status: 'offline',
      verification_status: 'pending',
      is_subscription_active: false
    }])
    .select()
    .single()

  if (error) throw error

  // 3. Add primary location
  if (profileData.locations && profileData.locations.length > 0) {
    const locs = profileData.locations.map(loc => ({
      worker_id: data.id,
      state_id: loc.stateId || null,
      city_id: loc.cityId || null,
      area_id: loc.areaId || null,
      society_id: loc.societyId || null,
      state_name: loc.stateName,
      city_name: loc.cityName,
      area_name: loc.areaName,
      society_name: loc.societyName,
      latitude: loc.latitude,
      longitude: loc.longitude,
      is_primary: true
    }))
    
    const { error: locError } = await supabase
      .from('worker_locations')
      .insert(locs)
    
    if (locError) console.error('Error saving locations:', locError)
  }

  return data
}

export async function getRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
  if (error) throw error
  return data
}

export async function getHomeownerProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('homeowners')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data
}

export async function getWorkerProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) return null
  return data
}

async function recordLoginHistory(userId) {
  try {
    const userAgent = navigator.userAgent
    // Basic screen/browser fingerprint info
    const deviceInfo = `${navigator.platform} - ${navigator.vendor}`
    
    await supabase
      .from('login_history')
      .insert([{
        user_id: userId,
        ip_address: '127.0.0.1', // Real IP is added via PostgreSQL header
        device_info: deviceInfo,
        user_agent: userAgent
      }])
  } catch (err) {
    console.error('Error logging history:', err)
  }
}
