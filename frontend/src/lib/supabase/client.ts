import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing!")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common database operations
export const dbOperations = {
  // User operations
  async createUser(userData: any) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getUserByWallet(walletAddress: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async updateUserVerification(userId: string, verified: boolean) {
    const { data, error } = await supabase
      .from('users')
      .update({ verified, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // EHR operations
  async createEHRRecord(recordData: any) {
    const { data, error } = await supabase
      .from('health_records')
      .insert([recordData])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getPatientRecords(patientId: string) {
    const { data, error } = await supabase
      .from('health_records')
      .select('*, patient_id:patient_wallet')
      .eq('patient_wallet', patientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async searchRecords(patientWallet: string) {
    const { data, error } = await supabase
      .from('health_records')
      .select('*, patient_id:patient_wallet')
      .ilike('patient_wallet', patientWallet)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error("Supabase search error:", error)
      throw error
    }
    return data
  },

  // Get records with permission status for a specific doctor
  async getRecordsWithPermissions(patientWallet: string, doctorWallet: string) {
    console.log('[getRecordsWithPermissions] Called with:', { patientWallet, doctorWallet })

    // Get all patient records (includes authorized_doctors array)
    const { data: records, error: recordsError } = await supabase
      .from('health_records')
      .select('*, patient_id:patient_wallet, authorized_doctors')
      .ilike('patient_wallet', patientWallet)
      .order('created_at', { ascending: false })
      .limit(50)

    if (recordsError) {
      console.error("Supabase records error:", recordsError)
      throw recordsError
    }

    console.log('[getRecordsWithPermissions] Records found:', records?.length || 0)
    console.log('[getRecordsWithPermissions] Sample record authorized_doctors:', records?.[0]?.authorized_doctors)

    if (!records || records.length === 0) {
      return []
    }

    // Get pending access requests for this doctor-patient pair
    // Use ilike for case-insensitive matching since wallet addresses are stored lowercase
    const { data: requests, error: reqError } = await supabase
      .from('access_requests')
      .select('*')
      .ilike('patient_wallet', patientWallet)
      .ilike('doctor_wallet', doctorWallet)
      .eq('status', 'sent')

    console.log('[getRecordsWithPermissions] Pending requests:', requests, reqError)

    // Build a set of record IDs that are pending
    const pendingRecordIds = new Set<string>()
    if (requests) {
      requests.forEach(r => {
        if (r.requested_record_ids && Array.isArray(r.requested_record_ids)) {
          r.requested_record_ids.forEach((id: string) => pendingRecordIds.add(id))
        }
      })
    }

    console.log('[getRecordsWithPermissions] Pending IDs:', [...pendingRecordIds])

    // Map records with their permission status
    // Check if doctorWallet is in the record's authorized_doctors array
    const result = records.map(record => {
      const authorizedDoctors = record.authorized_doctors || []
      const isGranted = Array.isArray(authorizedDoctors) &&
        authorizedDoctors.some((doc: string) =>
          doc.toLowerCase() === doctorWallet.toLowerCase()
        )
      const isPending = pendingRecordIds.has(record.id)

      return {
        ...record,
        permissionStatus: isGranted
          ? 'granted'
          : isPending
            ? 'pending'
            : 'none'
      }
    })

    console.log('[getRecordsWithPermissions] Results with status:', result.map(r => ({
      id: r.id,
      title: r.title,
      status: r.permissionStatus,
      authorizedDoctors: r.authorized_doctors
    })))

    return result
  },

  // Access request operations
  async createAccessRequest(requestData: any) {
    const { document_names, ...dbData } = requestData
    const { data, error } = await supabase
      .from('access_requests')
      .insert([{
        ...dbData,
        snapshot_document_titles: document_names
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAccessRequests(walletAddress: string, userRole: string) {
    const column = userRole === 'patient' ? 'patient_wallet' : 'doctor_wallet'

    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .eq(column, walletAddress)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async updateAccessRequest(requestId: string, status: string, respondedAt?: string) {
    const { data, error } = await supabase
      .from('access_requests')
      .update({
        status,
        responded_at: respondedAt || new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}