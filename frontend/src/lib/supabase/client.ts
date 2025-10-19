import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
      .from('ehr_records')
      .insert([recordData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getPatientRecords(patientId: string) {
    const { data, error } = await supabase
      .from('ehr_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Access request operations
  async createAccessRequest(requestData: any) {
    const { data, error } = await supabase
      .from('access_requests')
      .insert([requestData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getAccessRequests(userId: string, userRole: string) {
    const column = userRole === 'patient' ? 'patient_id' : 'doctor_id'
    
    const { data, error } = await supabase
      .from('access_requests')
      .select(`
        *,
        doctor:users!doctor_id(*),
        patient:users!patient_id(*),
        record:ehr_records(*)
      `)
      .eq(column, userId)
      .order('requested_at', { ascending: false })
    
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