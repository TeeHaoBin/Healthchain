import { ipfsClient } from '@/lib/ipfs/client'
import { litClient } from '@/lib/lit/client'
import { supabase } from '@/lib/supabase/client'

export interface UploadResult {
  success: boolean
  ipfsHash?: string
  fileId?: string
  error?: string
}

export interface FileMetadata {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  ipfsHash: string
  encryptedSymmetricKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accessControlConditions: any[]
  patientAddress: string
  authorizedDoctors: string[]
  uploadedAt: string
  recordType: string
}

export class FileUploadService {

  async uploadEncryptedFile(
    file: File,
    patientAddress: string,
    authorizedDoctors: string[] = [],
    recordType: string = 'general'
  ): Promise<UploadResult> {
    try {
      console.log('🚀 Starting encrypted file upload...')

      // Step 1: Connect to Lit Protocol
      await litClient.connect()
      console.log('✅ Connected to Lit Protocol')

      // Step 2: Encrypt the file using Lit Protocol
      console.log('🔒 Encrypting file with Lit Protocol...')
      const encryptionResult = await litClient.encryptFileBinary(file, patientAddress, authorizedDoctors)

      // Validate encryption result
      if (!encryptionResult || !encryptionResult.encryptedData || !encryptionResult.encryptedSymmetricKey) {
        throw new Error('Failed to encrypt file - encryption result is invalid')
      }

      const {
        encryptedData,
        encryptedSymmetricKey,
        accessControlConditions
      } = encryptionResult

      // Additional validation to ensure encryptedData is a valid Blob
      if (!(encryptedData instanceof Blob)) {
        throw new Error('Failed to encrypt file - encrypted data is not a valid Blob')
      }

      if (encryptedData.size === 0) {
        throw new Error('Failed to encrypt file - encrypted data is empty')
      }

      console.log('✅ File encrypted successfully', {
        originalSize: file.size,
        encryptedSize: encryptedData.size,
        hasSymmetricKey: !!encryptedSymmetricKey
      })

      // Step 3: Upload encrypted file to IPFS via Pinata
      console.log('☁️ Uploading encrypted file to IPFS...')
      const ipfsHash = await ipfsClient.uploadEncryptedFile(
        encryptedData,
        file.name,
        {
          patientAddress,
          authorizedDoctors,
          fileType: file.type,
          fileSize: file.size,
          recordType,
          dateCreated: new Date().toISOString()
        }
      )

      console.log('✅ File uploaded to IPFS:', ipfsHash)

      // Step 4: Validate session for database operations
      console.log('👤 Validating session...')

      const authData = localStorage.getItem('healthchain_auth')
      if (!authData) {
        throw new Error('No authentication data found. Please log in again.')
      }

      const auth = JSON.parse(authData)
      const sessionToken = auth.sessionToken || auth.session_token

      if (!sessionToken) {
        throw new Error('No session token found. Please log in again.')
      }

      const { data: sessionValidation, error: sessionError } = await supabase.rpc(
        'validate_session_and_get_user',
        { p_session_token: sessionToken }
      )

      if (sessionError || !sessionValidation?.success) {
        throw new Error(`Session validation failed: ${sessionValidation?.error || sessionError?.message}`)
      }

      console.log('✅ Session validated for user:', sessionValidation.user?.wallet_address)

      // Step 5: Store metadata in Supabase
      console.log('💾 Storing metadata in database...')

      // Match your existing database structure
      const fileMetadata = {
        // Use your existing columns
        patient_wallet: patientAddress.toLowerCase(), // Your table uses patient_wallet
        title: file.name, // Map to your existing title column
        description: `Encrypted health record: ${recordType}`,
        record_type: recordType,
        record_date: new Date().toISOString().split('T')[0], // Date only
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),

        // New columns for encryption (added by our fix)
        file_name: file.name,
        file_type: file.type,
        ipfs_hash: ipfsHash,
        encrypted_symmetric_key: encryptedSymmetricKey,
        access_control_conditions: accessControlConditions,
        authorized_doctors: authorizedDoctors.map(addr => addr.toLowerCase()),
        uploaded_by: sessionValidation.user?.id,
        on_chain: false // Set to false since we're using IPFS
      }

      const { data, error } = await supabase
        .from('health_records')
        .insert([fileMetadata])
        .select()
        .single()

      if (error) {
        console.error('❌ Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('✅ Metadata stored in database')

      return {
        success: true,
        ipfsHash,
        fileId: data.id
      }

    } catch (error) {
      console.error('❌ Upload failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    } finally {
      // Clean up Lit Protocol connection
      await litClient.disconnect()
    }
  }

  // Get file list for a patient
  async getPatientFiles(patientAddress: string): Promise<FileMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('patient_wallet', patientAddress.toLowerCase()) // Use patient_wallet
        .order('uploaded_at', { ascending: false })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return data.map(record => {
        // Safely parse access control conditions - handle both string and object types
        const accessControlConditions = typeof record.access_control_conditions === 'string'
          ? JSON.parse(record.access_control_conditions)
          : (record.access_control_conditions || [])

        return {
          id: record.id,
          fileName: record.file_name || record.original_filename,
          fileType: record.file_type || record.mime_type,
          fileSize: record.file_size,
          ipfsHash: record.ipfs_hash,
          encryptedSymmetricKey: record.encrypted_symmetric_key,
          accessControlConditions,
          patientAddress: record.patient_wallet,
          authorizedDoctors: record.authorized_doctors || [],
          uploadedAt: record.uploaded_at,
          recordType: record.record_type
        }
      })

    } catch (error) {
      console.error('❌ Failed to get patient files:', error)
      throw error
    }
  }

  // Get files accessible to a doctor
  async getDoctorAccessibleFiles(doctorAddress: string): Promise<FileMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .contains('authorized_doctors', [doctorAddress.toLowerCase()])
        .order('uploaded_at', { ascending: false })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return data.map(record => {
        // Safely parse access control conditions - handle both string and object types
        const accessControlConditions = typeof record.access_control_conditions === 'string'
          ? JSON.parse(record.access_control_conditions)
          : (record.access_control_conditions || [])

        return {
          id: record.id,
          fileName: record.file_name || record.original_filename,
          fileType: record.file_type || record.mime_type,
          fileSize: record.file_size,
          ipfsHash: record.ipfs_hash,
          encryptedSymmetricKey: record.encrypted_symmetric_key,
          accessControlConditions,
          patientAddress: record.patient_wallet,
          authorizedDoctors: record.authorized_doctors || [],
          uploadedAt: record.uploaded_at,
          recordType: record.record_type
        }
      })

    } catch (error) {
      console.error('❌ Failed to get doctor accessible files:', error)
      throw error
    }
  }

  // Grant access to a doctor
  async grantDoctorAccess(fileId: string, doctorAddress: string): Promise<boolean> {
    try {
      // This would require re-encrypting the file with new access control conditions
      // For now, we'll just update the authorized_doctors list in the database
      const { data: currentRecord, error: fetchError } = await supabase
        .from('health_records')
        .select('authorized_doctors')
        .eq('id', fileId)
        .single()

      if (fetchError) {
        throw new Error(`Fetch error: ${fetchError.message}`)
      }

      const currentDoctors = currentRecord.authorized_doctors || []
      if (!currentDoctors.includes(doctorAddress.toLowerCase())) {
        const updatedDoctors = [...currentDoctors, doctorAddress.toLowerCase()]

        const { error: updateError } = await supabase
          .from('health_records')
          .update({ authorized_doctors: updatedDoctors })
          .eq('id', fileId)

        if (updateError) {
          throw new Error(`Update error: ${updateError.message}`)
        }
      }

      return true
    } catch (error) {
      console.error('❌ Failed to grant doctor access:', error)
      return false
    }
  }

  // Retrieve and decrypt a file
  async retrieveFile(fileId: string): Promise<Blob> {
    try {
      console.log('📥 Starting file retrieval for:', fileId)

      // 1. Fetch metadata from Supabase
      const { data: record, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error || !record) {
        throw new Error(`Record not found: ${error?.message || 'Unknown error'}`)
      }

      console.log('📄 Metadata retrieved:', {
        fileName: record.file_name,
        ipfsHash: record.ipfs_hash,
        hasKey: !!record.encrypted_symmetric_key
      })

      if (!record.ipfs_hash) {
        throw new Error('No IPFS hash found for this record')
      }

      // 2. Fetch encrypted content from Pinata with gateway fallback
      console.log('☁️ Fetching from IPFS...')
      const encryptedBlob = await this.fetchFromIPFSWithFallback(record.ipfs_hash)

      if (!encryptedBlob) {
        throw new Error('Failed to fetch file from all available IPFS gateways')
      }

      console.log('📦 Encrypted blob retrieved:', {
        size: encryptedBlob.size,
        type: encryptedBlob.type
      })

      // 3. Decrypt using Lit Protocol
      if (!record.encrypted_symmetric_key) {
        // If no key, assume it's not encrypted (legacy or public)
        console.warn('⚠️ No encryption key found, returning raw file')
        return encryptedBlob
      }

      console.log('🔓 Decrypting file...')
      await litClient.connect()

      const accessControlConditions = typeof record.access_control_conditions === 'string'
        ? JSON.parse(record.access_control_conditions)
        : record.access_control_conditions

      // CRITICAL FIX: Convert blob to string for decryption
      // The encryption process creates a string ciphertext, but IPFS returns it as a blob
      console.log('📝 Converting encrypted blob to string for decryption...')
      const encryptedString = await encryptedBlob.text()

      console.log('🔓 Starting decryption with Lit Protocol...', {
        ciphertextLength: encryptedString.length,
        hasAccessConditions: !!accessControlConditions,
        conditionsCount: accessControlConditions?.length || 0
      })

      const decryptedFile = await litClient.decryptFile(
        encryptedString,  // Pass string instead of blob
        record.encrypted_symmetric_key,
        accessControlConditions
      )

      // Handle different return types from decryptFile
      if (decryptedFile instanceof Blob) {
        return decryptedFile
      } else if (typeof decryptedFile === 'string') {
        return new Blob([decryptedFile], { type: record.mime_type || 'application/octet-stream' })
      } else {
        return new Blob([decryptedFile], { type: record.mime_type || 'application/octet-stream' })
      }

    } catch (error) {
      console.error('❌ Failed to retrieve file:', error)
      throw error
    }
  }

  // Helper method: Fetch from IPFS using public gateways with fallback for decentralization
  private async fetchFromIPFSWithFallback(ipfsHash: string): Promise<Blob | null> {
    // For PUBLIC IPFS files, we can use multiple gateways for true decentralization
    // This provides resilience and aligns with decentralized EHR project goals

    // Get dedicated gateway URL from environment (optional, used as primary if available)
    const dedicatedGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY

    // Define gateway priority list - all verified independent gateways (Nov 2025)
    const gateways = [
      // Primary: Dedicated Pinata gateway (fastest, if configured)
      dedicatedGateway ? {
        url: `https://${dedicatedGateway}/ipfs/${ipfsHash}`,
        name: 'Pinata Dedicated Gateway',
        timeout: 10000
      } : null,
      // Fallback 1: Pinata public gateway (VERIFIED ✅ - 7s response)
      {
        url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        name: 'Pinata Public Gateway',
        timeout: 10000
      },
      // Fallback 2: dweb.link - IPFS Foundation subdomain gateway (VERIFIED ✅ - 19s response)
      // Note: w3s.link redirects here, so we use dweb.link directly
      {
        url: `https://dweb.link/ipfs/${ipfsHash}`,
        name: 'IPFS Foundation Gateway (dweb.link)',
        timeout: 25000
      },
      // Fallback 3: ipfs.io - IPFS Foundation path gateway (VERIFIED ✅ - 3s response)
      // Official public gateway, can be slower under load
      {
        url: `https://ipfs.io/ipfs/${ipfsHash}`,
        name: 'IPFS Foundation Gateway (ipfs.io)',
        timeout: 30000 // Longer timeout as final fallback
      }
    ].filter(Boolean) as Array<{ url: string; name: string; timeout: number }>

    let lastError: Error | null = null

    for (const gateway of gateways) {
      try {
        console.log(`🔄 Attempting to fetch from ${gateway.name}...`)

        const response = await fetch(gateway.url, {
          // Add timeout per gateway (faster gateways have shorter timeouts)
          signal: AbortSignal.timeout(gateway.timeout),
          credentials: 'omit',
          mode: 'cors',
          // Follow redirects (dweb.link uses 301 redirects to subdomains)
          redirect: 'follow'
        })

        if (response.ok) {
          const blob = await response.blob()
          console.log(`✅ Successfully fetched from ${gateway.name}`, {
            size: blob.size,
            type: blob.type
          })
          return blob
        } else {
          const errorMsg = `${gateway.name} returned ${response.status}: ${response.statusText}`
          console.warn(`⚠️ ${errorMsg}`)
          lastError = new Error(errorMsg)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.warn(`⚠️ Failed to fetch from ${gateway.name}:`, errorMsg)
        lastError = error instanceof Error ? error : new Error(errorMsg)
        // Continue to next gateway - this is the beauty of decentralization!
      }
    }

    // All gateways failed
    console.error('❌ All IPFS gateways failed. Last error:', lastError)
    console.error('💡 This might indicate a network issue or the file may not be propagated yet.')
    console.error('💡 For public IPFS, files should be accessible within 1-2 minutes of upload.')

    return null
  }
}

export const fileUploadService = new FileUploadService();