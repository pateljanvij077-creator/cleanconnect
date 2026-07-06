import { supabase } from '../supabase/client'

/**
 * Cleaning Worker profile, documents, availability and location services
 */

export async function getApprovedWorkers() {
  const { data: workers, error: workerError } = await supabase
    .from('workers')
    .select('*')
    .eq('verification_status', 'approved')
    .in('availability_status', ['available', 'busy'])
    .eq('is_subscription_active', true)
    .eq('is_active', true)

  if (workerError) throw workerError

  // Fetch all worker locations registered
  const { data: locations, error: locError } = await supabase
    .from('worker_locations')
    .select('*')

  if (locError) throw locError

  // Fetch all system settings for matching parameters
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('*')

  if (settingsError) {
    console.error('Failed to load system settings:', settingsError)
  }

  return { workers, locations, settings: settings || [] }
}

export async function getWorkerById(workerId) {
  const { data, error } = await supabase
    .from('workers')
    .select('*, reviews(*, homeowners(full_name))')
    .eq('id', workerId)
    .single()
  if (error) throw error
  return data
}

export async function updateWorkerProfile(workerId, data) {
  const { data: profile, error } = await supabase
    .from('workers')
    .update(data)
    .eq('id', workerId)
    .select()
    .single()
  if (error) throw error
  return profile
}

export async function updateWorkerAvailability(workerId, { isAvailable, status }) {
  const { data, error } = await supabase
    .from('workers')
    .update({
      is_available: isAvailable,
      availability_status: status
    })
    .eq('id', workerId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getWorkerLocations(workerId) {
  const { data, error } = await supabase
    .from('worker_locations')
    .select('*')
    .eq('worker_id', workerId)
  if (error) throw error
  return data
}

export async function addWorkerLocation(workerId, location) {
  const { data, error } = await supabase
    .from('worker_locations')
    .insert([{
      worker_id: workerId,
      ...location
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeWorkerLocation(locationId) {
  const { error } = await supabase
    .from('worker_locations')
    .delete()
    .eq('id', locationId)
  if (error) throw error
}

/**
 * Document uploads (Aadhaar / PAN) to Supabase Storage
 */
export async function uploadWorkerDocument(workerId, file, docType) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${workerId}/${docType}_${Date.now()}.${fileExt}`
  const bucketName = docType === 'aadhaar' ? 'aadhaar-docs' : 'pan-docs'

  // 1. Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, { cacheControl: '3600', upsert: true })

  if (uploadError) throw uploadError

  const publicUrl = supabase.storage.from(bucketName).getPublicUrl(fileName).data.publicUrl

  // 2. Save document details in database
  const { data, error } = await supabase
    .from('worker_documents')
    .insert([{
      worker_id: workerId,
      doc_type: docType,
      doc_url: publicUrl,
      verified: false
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Worker Profile Photo upload
 */
export async function uploadWorkerPhoto(workerId, file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${workerId}/avatar_${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('worker-photos')
    .upload(fileName, file, { cacheControl: '3600', upsert: true })

  if (uploadError) throw uploadError

  const publicUrl = supabase.storage.from('worker-photos').getPublicUrl(fileName).data.publicUrl

  // Update profile
  await updateWorkerProfile(workerId, { avatar_url: publicUrl })
  return publicUrl
}

/**
 * Worker UPI QR Code image upload
 */
export async function uploadUpiQr(workerId, file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${workerId}/upi_${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('worker-photos')
    .upload(fileName, file, { cacheControl: '3600', upsert: true })

  if (uploadError) throw uploadError

  const publicUrl = supabase.storage.from('worker-photos').getPublicUrl(fileName).data.publicUrl

  // Update profile
  await updateWorkerProfile(workerId, { upi_qr_url: publicUrl })
  return publicUrl
}
