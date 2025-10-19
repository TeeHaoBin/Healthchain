import { supabase } from './client'

export type UserRole = 'patient' | 'doctor' | 'admin'

export interface User {
  id: string
  wallet_address: string
  email?: string
  full_name?: string
  role: UserRole
  verified: boolean
  created_at: string
  updated_at: string
}

export interface DoctorProfile {
  id: string
  user_id: string
  license_number?: string
  specialization?: string
  hospital_name?: string
  phone_number?: string
  verification_status: 'pending' | 'approved' | 'rejected'
  verification_documents?: any
  verified_at?: string
  verified_by?: string
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
  patient_id: string
  doctor_id: string
  purpose: string
  urgency: 'low' | 'medium' | 'high'
  status: 'pending' | 'approved' | 'denied' | 'revoked'
  requested_at: string
  expires_at?: string
  responded_at?: string
  response_message?: string
}

// User Management
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  try {
    console.log('Searching for wallet address:', walletAddress?.toLowerCase())
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    if (error) {
      console.log('Supabase error details:', error)
      if (error.code === 'PGRST116') {
        // No user found
        console.log('No user found for wallet:', walletAddress.toLowerCase())
        return null
      }
      throw error
    }

    console.log('Found user:', data)
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
  role: UserRole
}): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        wallet_address: userData.wallet_address.toLowerCase()
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating user:', error)
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

// Doctor Profile Management
export async function createDoctorProfile(profileData: {
  user_id: string
  license_number?: string
  specialization?: string
  hospital_name?: string
  phone_number?: string
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
export async function getAccessRequests(userId: string, userRole: UserRole): Promise<AccessRequest[]> {
  try {
    let query = supabase.from('access_requests').select(`
      *,
      patient:patient_id(full_name, email),
      doctor:doctor_id(full_name, email)
    `)

    if (userRole === 'patient') {
      query = query.eq('patient_id', userId)
    } else if (userRole === 'doctor') {
      query = query.eq('doctor_id', userId)
    }

    const { data, error } = await query.order('requested_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching access requests:', error)
    return []
  }
}

export async function createAccessRequest(requestData: {
  patient_id: string
  doctor_id: string
  purpose: string
  urgency?: AccessRequest['urgency']
}): Promise<AccessRequest | null> {
  try {
    const { data, error } = await supabase
      .from('access_requests')
      .insert([requestData])
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
    response_message?: string
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

// Access Logging
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

    // Also update user verification status
    if (status === 'approved') {
      const { error: userError } = await supabase
        .from('users')
        .update({ verified: true })
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