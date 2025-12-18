import { supabase } from './client'

export type UserRole = 'patient' | 'doctor' | 'admin'

export interface User {
  id: string
  wallet_address: string
  email?: string
  full_name?: string
  role: UserRole
  profile_complete: boolean
  created_at: string
  updated_at: string
}

export interface DoctorProfile {
  id: string
  user_id: string
  license_number?: string
  specialization?: string
  hospital_name?: string
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  verification_documents?: any
  verified_at?: string
  verified_by?: string
  created_at: string
}

export interface PatientProfile {
  id: string
  user_id: string
  date_of_birth?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  has_allergies: boolean
  has_chronic_conditions: boolean
  preferred_language: string
  created_at: string
}

export interface HealthRecord {
  id: string
  patient_id: string
  record_hash: string
  record_type: 'lab-result' | 'prescription' | 'visit-note' | 'imaging' | 'other'
  title: string
  description?: string
  record_date: string
  uploaded_by: string
  file_size?: number
  mime_type?: string
  created_at: string
}

export interface AccessRequest {
  id: string
  patient_wallet: string
  doctor_wallet: string
  requested_record_ids?: string[]
  purpose: string
  urgency?: 'routine' | 'urgent' | 'emergency'
  status: 'draft' | 'sent' | 'approved' | 'denied' | 'expired' | 'revoked'
  patient_response?: string
  denial_reason?: string
  created_at?: string
  sent_at?: string
  responded_at?: string
  expires_at?: string
  snapshot_document_titles?: string[]
}

// ============================================
// Transfer Request Types (Doctor-to-Doctor)
// ============================================

export interface TransferRequest {
  id: string
  patient_wallet: string
  requesting_doctor_wallet: string  // Doctor B - wants the document
  source_doctor_wallet: string       // Doctor A - has the document
  source_organization?: string        // Snapshot of Doctor A's organization at request time
  requesting_organization?: string    // Snapshot of Doctor B's organization at request time
  document_description?: string      // What document is being requested
  requested_record_ids?: string[]    // Filled after Doctor A uploads
  snapshot_document_titles?: string[]
  purpose: string
  urgency: 'routine' | 'urgent' | 'emergency'
  patient_status: 'pending' | 'approved' | 'denied'
  patient_responded_at?: string
  patient_denial_reason?: string
  source_status: 'awaiting_upload' | 'uploaded' | 'rejected' | 'granted' | 'failed'
  source_responded_at?: string
  source_failure_reason?: string
  source_rejection_reason?: string   // Reason if Doctor A rejects
  created_at: string
  expires_at: string
}

export interface TransferRequestWithNames extends TransferRequest {
  patient_name?: string
  requesting_doctor_name?: string
  source_doctor_name?: string
  document_names?: string[]
}

// In-memory cache for user lookups to prevent redundant API calls
const userCache = new Map<string, { user: User | null; timestamp: number }>()
const USER_CACHE_TTL = 30000 // 30 seconds

// Function to clear cache (useful for logout or user updates)
export function clearUserCache(walletAddress?: string) {
  if (walletAddress) {
    userCache.delete(walletAddress.toLowerCase())
  } else {
    userCache.clear()
  }
}

// User Management
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  try {
    const normalizedAddress = walletAddress?.toLowerCase()

    if (!normalizedAddress) {
      return null
    }

    // Check cache first
    const cached = userCache.get(normalizedAddress)
    if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
      return cached.user
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No user found - cache this result too
        userCache.set(normalizedAddress, { user: null, timestamp: Date.now() })
        return null
      }
      throw error
    }

    // Cache the successful result
    userCache.set(normalizedAddress, { user: data, timestamp: Date.now() })
    return data
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function createUser(userData: {
  wallet_address: string
  email?: string
  full_name?: string
  phone_number?: string
  role: UserRole
}): Promise<User | null> {
  try {
    console.log('Creating user with data:', { ...userData, wallet_address: userData.wallet_address.toLowerCase() })

    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        wallet_address: userData.wallet_address.toLowerCase(),
        profile_complete: true
      }])
      .select()
      .single()

    console.log('Supabase response:', { data, error })

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('User created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating user:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return null
  }
}

export async function updateUser(
  walletAddress: string,
  updates: Partial<User>
): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('wallet_address', walletAddress.toLowerCase())
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user:', error)
    return null
  }
}

export async function updateLastLogin(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        failed_login_attempts: 0 // Reset failed attempts on successful login
      })
      .eq('id', userId)

    if (error) throw error
    console.log('✅ Last login updated for user:', userId)
    return true
  } catch (error) {
    console.error('❌ Error updating last login:', error)
    return false
  }
}

// Doctor Profile Management
export async function createDoctorProfile(profileData: {
  user_id: string
  license_number?: string
  specialization?: string
  hospital_name?: string
  verification_documents?: any
}): Promise<DoctorProfile | null> {
  try {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .insert([profileData])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating doctor profile:', error)
    return null
  }
}

export async function getDoctorProfile(userId: string): Promise<DoctorProfile | null> {
  try {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching doctor profile:', error)
    return null
  }
}

/**
 * Get doctor profile by wallet address
 * Used for auto-fetching organization (hospital_name) when creating transfer requests
 */
export async function getDoctorProfileByWallet(walletAddress: string): Promise<DoctorProfile | null> {
  try {
    // First get the user by wallet address
    const user = await getUserByWallet(walletAddress)
    if (!user) return null

    // Then get the doctor profile by user_id
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching doctor profile by wallet:', error)
    return null
  }
}

// Patient Profile Management
export async function createPatientProfile(profileData: {
  user_id: string
  date_of_birth?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  has_allergies?: boolean
  has_chronic_conditions?: boolean
  preferred_language?: string
}): Promise<PatientProfile | null> {
  try {
    const { data, error } = await supabase
      .from('patient_profiles')
      .insert([{
        ...profileData,
        has_allergies: profileData.has_allergies || false,
        has_chronic_conditions: profileData.has_chronic_conditions || false,
        preferred_language: profileData.preferred_language || 'en'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating patient profile:', error)
    return null
  }
}

export async function getPatientProfile(userId: string): Promise<PatientProfile | null> {
  try {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching patient profile:', error)
    return null
  }
}

// Health Records Management
export async function getPatientRecords(patientId: string): Promise<HealthRecord[]> {
  try {
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('record_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching patient records:', error)
    return []
  }
}

export async function createHealthRecord(recordData: {
  patient_id: string
  record_hash: string
  record_type: HealthRecord['record_type']
  title: string
  description?: string
  record_date: string
  uploaded_by: string
  file_size?: number
  mime_type?: string
}): Promise<HealthRecord | null> {
  try {
    const { data, error } = await supabase
      .from('health_records')
      .insert([recordData])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating health record:', error)
    return null
  }
}

// Access Request Management
export async function getAccessRequests(walletAddress: string, userRole: UserRole): Promise<AccessRequest[]> {
  try {
    const column = userRole === 'patient' ? 'patient_wallet' : 'doctor_wallet'

    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .eq(column, walletAddress)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching access requests:', error)
    return []
  }
}

export async function createAccessRequest(requestData: {
  patient_wallet: string
  doctor_wallet: string
  requested_record_ids?: string[]
  purpose: string
  urgency?: AccessRequest['urgency']
  status?: AccessRequest['status']

  expires_at?: string
  document_names?: string[] // Optional: pass names to snapshot them
}): Promise<AccessRequest | null> {
  try {
    const { document_names, ...dbData } = requestData
    const { data, error } = await supabase
      .from('access_requests')
      .insert([{
        ...dbData,
        // Save snapshot of document titles if provided
        snapshot_document_titles: document_names
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating access request:', error)
    return null
  }
}

export async function updateAccessRequest(
  requestId: string,
  updates: {
    status?: AccessRequest['status']
    patient_response?: string
    denial_reason?: string
    expires_at?: string
  }
): Promise<AccessRequest | null> {
  try {
    const { data, error } = await supabase
      .from('access_requests')
      .update({
        ...updates,
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating access request:', error)
    return null
  }
}

// Extended interface with patient details for history display
export interface AccessRequestWithPatient extends AccessRequest {
  patient_name?: string
  document_names?: string[] // Document titles for display
}

// Fetch access requests with patient names for doctor history page
export async function getAccessRequestsWithPatient(
  doctorWallet: string
): Promise<AccessRequestWithPatient[]> {
  try {
    // First, get all access requests for this doctor
    const { data: requests, error: requestsError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('doctor_wallet', doctorWallet.toLowerCase())
      .order('created_at', { ascending: false })

    if (requestsError) throw requestsError
    if (!requests || requests.length === 0) return []

    // Get unique patient wallet addresses
    const patientWallets = [...new Set(requests.map(r => r.patient_wallet))]

    // Fetch patient details for all unique wallets
    const { data: patients, error: patientsError } = await supabase
      .from('users')
      .select('wallet_address, full_name')
      .in('wallet_address', patientWallets)

    if (patientsError) {
      console.error('Error fetching patient details:', patientsError)
    }

    // Create a map of wallet -> name for quick lookup
    const patientMap = new Map<string, string>()
    if (patients) {
      patients.forEach(p => {
        patientMap.set(p.wallet_address, p.full_name || '')
      })
    }

    // Get all unique record IDs from all requests
    const allRecordIds = requests
      .flatMap(r => r.requested_record_ids || [])
      .filter((id, index, self) => self.indexOf(id) === index)

    // Fetch document titles for all record IDs
    let recordMap = new Map<string, string>()
    if (allRecordIds.length > 0) {
      const { data: records, error: recordsError } = await supabase
        .from('health_records')
        .select('id, title')
        .in('id', allRecordIds)

      if (recordsError) {
        console.error('Error fetching record details:', recordsError)
      }

      if (records) {
        records.forEach(r => {
          recordMap.set(r.id, r.title || 'Untitled Document')
        })
      }
    }

    // Combine requests with patient names and document names
    return requests.map(request => {
      // Logic: Use live record title if available, otherwise fallback to snapshot
      const documentNames = request.requested_record_ids?.map((id: string, index: number) => {
        const liveTitle = recordMap.get(id)

        if (liveTitle) return liveTitle

        // Fallback to snapshot if available
        if (request.snapshot_document_titles && request.snapshot_document_titles[index]) {
          return `${request.snapshot_document_titles[index]} (Deleted)`
        }

        return 'Unknown Document'
      }) || []

      return {
        ...request,
        patient_name: patientMap.get(request.patient_wallet) || undefined,
        document_names: documentNames
      }
    })
  } catch (error) {
    console.error('Error fetching access requests with patient:', error)
    return []
  }
}

// Extended interface with doctor details for patient requests page
export interface AccessRequestWithDoctor extends AccessRequest {
  doctor_name?: string
  document_names?: string[] // Document titles for display
}

// Fetch access requests with doctor names for patient requests page
export async function getAccessRequestsWithDoctor(
  patientWallet: string
): Promise<AccessRequestWithDoctor[]> {
  try {
    // First, get all access requests for this patient
    const { data: requests, error: requestsError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('patient_wallet', patientWallet.toLowerCase())
      .order('created_at', { ascending: false })

    if (requestsError) throw requestsError
    if (!requests || requests.length === 0) return []

    // Get unique doctor wallet addresses
    const doctorWallets = [...new Set(requests.map(r => r.doctor_wallet))]

    // Fetch doctor details for all unique wallets
    const { data: doctors, error: doctorsError } = await supabase
      .from('users')
      .select('wallet_address, full_name')
      .in('wallet_address', doctorWallets)

    if (doctorsError) {
      console.error('Error fetching doctor details:', doctorsError)
    }

    // Create a map of wallet -> name for quick lookup
    const doctorMap = new Map<string, string>()
    if (doctors) {
      doctors.forEach(d => {
        doctorMap.set(d.wallet_address, d.full_name || '')
      })
    }

    // Get all unique record IDs from all requests
    const allRecordIds = requests
      .flatMap(r => r.requested_record_ids || [])
      .filter((id, index, self) => self.indexOf(id) === index)

    // Fetch document titles for all record IDs
    let recordMap = new Map<string, string>()
    if (allRecordIds.length > 0) {
      const { data: records, error: recordsError } = await supabase
        .from('health_records')
        .select('id, title')
        .in('id', allRecordIds)

      if (recordsError) {
        console.error('Error fetching record details:', recordsError)
      }

      if (records) {
        records.forEach(r => {
          recordMap.set(r.id, r.title || 'Untitled Document')
        })
      }
    }

    // Combine requests with doctor names and document names
    return requests.map(request => {
      // Logic: Use live record title if available, otherwise fallback to snapshot
      const documentNames = request.requested_record_ids?.map((id: string, index: number) => {
        const liveTitle = recordMap.get(id)

        if (liveTitle) return liveTitle

        // Fallback to snapshot if available
        if (request.snapshot_document_titles && request.snapshot_document_titles[index]) {
          return `${request.snapshot_document_titles[index]} (Deleted)`
        }

        return 'Unknown Document'
      }) || []

      return {
        ...request,
        doctor_name: doctorMap.get(request.doctor_wallet) || undefined,
        document_names: documentNames
      }
    })
  } catch (error) {
    console.error('Error fetching access requests with doctor:', error)
    return []
  }
}

export async function logAccess(logData: {
  patient_id: string
  doctor_id: string
  record_id: string
  access_type: 'view' | 'download' | 'share'
  ip_address?: string
  user_agent?: string
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('access_logs')
      .insert([logData])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error logging access:', error)
    return false
  }
}

// Admin Functions
export async function getPendingDoctorVerifications(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select(`
        *,
        user:user_id(*)
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching pending verifications:', error)
    return []
  }
}

export async function verifyDoctor(
  profileId: string,
  status: 'approved' | 'rejected',
  verifiedBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('doctor_profiles')
      .update({
        verification_status: status,
        verified_at: new Date().toISOString(),
        verified_by: verifiedBy
      })
      .eq('id', profileId)

    if (error) throw error

    // Also update user profile completion status
    if (status === 'approved') {
      const { error: userError } = await supabase
        .from('users')
        .update({ profile_complete: true })
        .eq('id', (await supabase
          .from('doctor_profiles')
          .select('user_id')
          .eq('id', profileId)
          .single()
        ).data?.user_id)

      if (userError) throw userError
    }

    return true
  } catch (error) {
    console.error('Error verifying doctor:', error)
    return false
  }
}

// ============================================
// Transfer Request Management (Doctor-to-Doctor)
// ============================================

/**
 * Create a new transfer request (called by Doctor B - the requester)
 * In new workflow: Doctor B requests → Doctor A uploads → Patient approves
 */
export async function createTransferRequest(requestData: {
  patient_wallet: string
  requesting_doctor_wallet: string  // Doctor B
  source_doctor_wallet: string       // Doctor A
  source_organization?: string       // Auto-fetched if not provided
  document_description: string       // What document is needed
  purpose: string
  urgency?: 'routine' | 'urgent' | 'emergency'
}): Promise<TransferRequest | null> {
  try {
    // Auto-fetch requesting doctor's organization if not provided
    let requestingOrganization: string | undefined
    const requestingProfile = await getDoctorProfileByWallet(requestData.requesting_doctor_wallet)
    if (requestingProfile?.hospital_name) {
      requestingOrganization = requestingProfile.hospital_name
    }

    const { data, error } = await supabase
      .from('transfer_requests')
      .insert([{
        patient_wallet: requestData.patient_wallet.toLowerCase(),
        requesting_doctor_wallet: requestData.requesting_doctor_wallet.toLowerCase(),
        source_doctor_wallet: requestData.source_doctor_wallet.toLowerCase(),
        source_organization: requestData.source_organization,
        requesting_organization: requestingOrganization,
        document_description: requestData.document_description,
        purpose: requestData.purpose,
        urgency: requestData.urgency || 'routine',
        source_status: 'awaiting_upload',  // Doctor A needs to upload
        patient_status: 'pending'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating transfer request:', error)
    return null
  }
}

/**
 * Get transfer requests for a patient (only show after Doctor A has uploaded)
 * Patient sees requests where source_status='uploaded' and patient_status='pending'
 */
export async function getTransferRequestsForPatient(
  patientWallet: string
): Promise<TransferRequestWithNames[]> {
  try {
    const { data: requests, error: requestsError } = await supabase
      .from('transfer_requests')
      .select('*')
      .eq('patient_wallet', patientWallet.toLowerCase())
      .in('source_status', ['uploaded', 'granted', 'failed', 'rejected'])  // Show all actionable statuses including rejections
      .order('created_at', { ascending: false })

    if (requestsError) throw requestsError
    if (!requests || requests.length === 0) return []

    // Get unique doctor wallet addresses
    const doctorWallets = [
      ...new Set([
        ...requests.map(r => r.requesting_doctor_wallet),
        ...requests.map(r => r.source_doctor_wallet)
      ])
    ]

    // Fetch doctor details
    const { data: doctors } = await supabase
      .from('users')
      .select('wallet_address, full_name')
      .in('wallet_address', doctorWallets)

    const doctorMap = new Map<string, string>()
    if (doctors) {
      doctors.forEach(d => {
        doctorMap.set(d.wallet_address, d.full_name || '')
      })
    }

    // Get document titles
    const allRecordIds = requests
      .flatMap(r => r.requested_record_ids || [])
      .filter((id, index, self) => self.indexOf(id) === index)

    let recordMap = new Map<string, string>()
    if (allRecordIds.length > 0) {
      const { data: records } = await supabase
        .from('health_records')
        .select('id, title')
        .in('id', allRecordIds)

      if (records) {
        records.forEach(r => {
          recordMap.set(r.id, r.title || 'Untitled Document')
        })
      }
    }

    return requests.map(request => {
      const documentNames = request.requested_record_ids?.map((id: string, index: number) => {
        const liveTitle = recordMap.get(id)
        if (liveTitle) return liveTitle
        if (request.snapshot_document_titles?.[index]) {
          return `${request.snapshot_document_titles[index]} (Deleted)`
        }
        return 'Unknown Document'
      }) || []

      return {
        ...request,
        requesting_doctor_name: doctorMap.get(request.requesting_doctor_wallet) || undefined,
        source_doctor_name: doctorMap.get(request.source_doctor_wallet) || undefined,
        document_names: documentNames
      }
    })
  } catch (error) {
    console.error('Error fetching transfer requests for patient:', error)
    return []
  }
}

/**
 * Get incoming transfer requests for source doctor (Doctor A)
 * Shows all requests where Doctor A needs to respond (upload or reject)
 */
export async function getTransferRequestsForSourceDoctor(
  sourceDoctorWallet: string
): Promise<TransferRequestWithNames[]> {
  try {
    // Show all incoming requests (any status)
    const { data: requests, error: requestsError } = await supabase
      .from('transfer_requests')
      .select('*')
      .eq('source_doctor_wallet', sourceDoctorWallet.toLowerCase())
      .order('created_at', { ascending: false })

    if (requestsError) throw requestsError
    if (!requests || requests.length === 0) return []

    // Get unique wallet addresses
    const wallets = [
      ...new Set([
        ...requests.map(r => r.patient_wallet),
        ...requests.map(r => r.requesting_doctor_wallet)
      ])
    ]

    // Fetch user details
    const { data: users } = await supabase
      .from('users')
      .select('wallet_address, full_name')
      .in('wallet_address', wallets)

    const userMap = new Map<string, string>()
    if (users) {
      users.forEach(u => {
        userMap.set(u.wallet_address, u.full_name || '')
      })
    }

    // Get document titles
    const allRecordIds = requests
      .flatMap(r => r.requested_record_ids || [])
      .filter((id, index, self) => self.indexOf(id) === index)

    let recordMap = new Map<string, string>()
    if (allRecordIds.length > 0) {
      const { data: records } = await supabase
        .from('health_records')
        .select('id, title')
        .in('id', allRecordIds)

      if (records) {
        records.forEach(r => {
          recordMap.set(r.id, r.title || 'Untitled Document')
        })
      }
    }

    return requests.map(request => {
      const documentNames = request.requested_record_ids?.map((id: string, index: number) => {
        const liveTitle = recordMap.get(id)
        if (liveTitle) return liveTitle
        if (request.snapshot_document_titles?.[index]) {
          return `${request.snapshot_document_titles[index]} (Deleted)`
        }
        return 'Unknown Document'
      }) || []

      return {
        ...request,
        patient_name: userMap.get(request.patient_wallet) || undefined,
        requesting_doctor_name: userMap.get(request.requesting_doctor_wallet) || undefined,
        document_names: documentNames
      }
    })
  } catch (error) {
    console.error('Error fetching transfer requests for source doctor:', error)
    return []
  }
}

/**
 * Get transfer requests made by requesting doctor
 */
export async function getTransferRequestsForRequestingDoctor(
  requestingDoctorWallet: string
): Promise<TransferRequestWithNames[]> {
  try {
    const { data: requests, error: requestsError } = await supabase
      .from('transfer_requests')
      .select('*')
      .eq('requesting_doctor_wallet', requestingDoctorWallet.toLowerCase())
      .order('created_at', { ascending: false })

    if (requestsError) throw requestsError
    if (!requests || requests.length === 0) return []

    // Get unique wallet addresses
    const wallets = [
      ...new Set([
        ...requests.map(r => r.patient_wallet),
        ...requests.map(r => r.source_doctor_wallet)
      ])
    ]

    // Fetch user details
    const { data: users } = await supabase
      .from('users')
      .select('wallet_address, full_name')
      .in('wallet_address', wallets)

    const userMap = new Map<string, string>()
    if (users) {
      users.forEach(u => {
        userMap.set(u.wallet_address, u.full_name || '')
      })
    }

    // Get document titles
    const allRecordIds = requests
      .flatMap(r => r.requested_record_ids || [])
      .filter((id, index, self) => self.indexOf(id) === index)

    let recordMap = new Map<string, string>()
    if (allRecordIds.length > 0) {
      const { data: records } = await supabase
        .from('health_records')
        .select('id, title')
        .in('id', allRecordIds)

      if (records) {
        records.forEach(r => {
          recordMap.set(r.id, r.title || 'Untitled Document')
        })
      }
    }

    return requests.map(request => {
      const documentNames = request.requested_record_ids?.map((id: string, index: number) => {
        const liveTitle = recordMap.get(id)
        if (liveTitle) return liveTitle
        if (request.snapshot_document_titles?.[index]) {
          return `${request.snapshot_document_titles[index]} (Deleted)`
        }
        return 'Unknown Document'
      }) || []

      return {
        ...request,
        patient_name: userMap.get(request.patient_wallet) || undefined,
        source_doctor_name: userMap.get(request.source_doctor_wallet) || undefined,
        document_names: documentNames
      }
    })
  } catch (error) {
    console.error('Error fetching transfer requests for requesting doctor:', error)
    return []
  }
}

/**
 * Patient approves or denies a transfer request
 * When patient approves, the transfer is granted (Doctor B can access)
 */
export async function updateTransferRequestPatientStatus(
  requestId: string,
  status: 'approved' | 'denied',
  denialReason?: string
): Promise<TransferRequest | null> {
  try {
    const updateData: Record<string, unknown> = {
      patient_status: status,
      patient_responded_at: new Date().toISOString()
    }

    if (status === 'approved') {
      // When patient approves, transfer is granted
      updateData.source_status = 'granted'
      updateData.source_responded_at = new Date().toISOString()
    } else if (status === 'denied' && denialReason) {
      updateData.patient_denial_reason = denialReason
    }

    const { data, error } = await supabase
      .from('transfer_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating transfer request patient status:', error)
    return null
  }
}

/**
 * Source doctor marks transfer as granted or failed
 */
export async function updateTransferRequestSourceStatus(
  requestId: string,
  status: 'granted' | 'failed',
  failureReason?: string
): Promise<TransferRequest | null> {
  try {
    const updateData: Record<string, unknown> = {
      source_status: status,
      source_responded_at: new Date().toISOString()
    }

    if (status === 'failed' && failureReason) {
      updateData.source_failure_reason = failureReason
    }

    const { data, error } = await supabase
      .from('transfer_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating transfer request source status:', error)
    return null
  }
}

/**
 * Get a single transfer request by ID
 */
export async function getTransferRequestById(
  requestId: string
): Promise<TransferRequest | null> {
  try {
    const { data, error } = await supabase
      .from('transfer_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  } catch (error) {
    console.error('Error fetching transfer request:', error)
    return null
  }
}

/**
 * Doctor A rejects a transfer request (before uploading)
 * Called when Doctor A cannot or will not provide the requested document
 */
export async function rejectTransferRequest(
  requestId: string,
  rejectionReason: string
): Promise<TransferRequest | null> {
  try {
    const { data, error } = await supabase
      .from('transfer_requests')
      .update({
        source_status: 'rejected',
        source_rejection_reason: rejectionReason,
        source_responded_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error rejecting transfer request:', error)
    return null
  }
}

/**
 * Doctor A attaches uploaded document to transfer request
 * Called after Doctor A uploads the document to IPFS
 */
export async function attachDocumentToTransfer(
  requestId: string,
  recordId: string,
  documentTitle: string
): Promise<TransferRequest | null> {
  try {
    const { data, error } = await supabase
      .from('transfer_requests')
      .update({
        requested_record_ids: [recordId],
        snapshot_document_titles: [documentTitle],
        source_status: 'uploaded',
        source_responded_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error attaching document to transfer:', error)
    return null
  }
}