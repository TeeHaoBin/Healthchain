// IPFS client for file storage with healthcare metadata support
export class IPFSClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = 'https://api.pinata.cloud'
    // Note: JWT tokens should only be used server-side for security
    // Client-side uploads must go through API routes that handle authentication
  }

  async uploadFile(file: File): Promise<string> {
    // Convert file to base64 for API transfer
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const fileData = btoa(binary)

    const metadata = {
      uploadedAt: new Date().toISOString(),
      fileType: file.type,
      fileSize: file.size.toString(),
      originalFileName: file.name
    }

    try {
      // Use server-side API endpoint with proper JWT authentication
      const response = await fetch('/api/upload-to-pinata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          metadata
        }),
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      return result.ipfsHash
    } catch (error) {
      console.error('Error uploading to IPFS:', error)
      throw error
    }
  }

  // Upload encrypted file via server-side API endpoint
  async uploadEncryptedFile(
    encryptedBlob: Blob,
    originalFileName: string,
    healthcareMetadata: {
      patientAddress: string
      authorizedDoctors: string[]
      fileType: string
      fileSize: number
      recordType?: string
      dateCreated?: string
    }
  ): Promise<string> {
    // Critical Fix #6: Use server-side endpoint instead of direct Pinata calls

    try {
      // Validate input parameters
      if (!encryptedBlob) {
        throw new Error('Encrypted blob is required but was not provided')
      }

      if (!(encryptedBlob instanceof Blob)) {
        throw new Error('Encrypted data must be a valid Blob object')
      }

      if (encryptedBlob.size === 0) {
        throw new Error('Encrypted blob is empty')
      }

      if (!originalFileName || originalFileName.trim().length === 0) {
        throw new Error('Original filename is required')
      }

      if (!healthcareMetadata?.patientAddress) {
        throw new Error('Patient address is required in metadata')
      }

      console.log('📤 Converting encrypted blob to base64...', {
        blobSize: encryptedBlob.size,
        blobType: encryptedBlob.type,
        fileName: originalFileName
      })

      // Convert blob to base64 for API transfer
      const arrayBuffer = await encryptedBlob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const fileData = btoa(binary)

      const metadata = {
        uploadedAt: new Date().toISOString(),
        originalFileName,
        originalFileType: healthcareMetadata.fileType,
        originalFileSize: healthcareMetadata.fileSize.toString(),
        patientAddress: healthcareMetadata.patientAddress,
        authorizedDoctors: JSON.stringify(healthcareMetadata.authorizedDoctors),
        recordType: healthcareMetadata.recordType || 'general',
        dateCreated: healthcareMetadata.dateCreated || new Date().toISOString(),
        encrypted: 'true',
        encryptionMethod: 'lit-protocol'
      }

      // Call our server-side API endpoint
      const response = await fetch('/api/upload-to-pinata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData,
          fileName: `encrypted_${originalFileName}`,
          metadata
        }),
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      return result.ipfsHash
    } catch (error) {
      console.error('Error uploading encrypted file to IPFS:', error)
      throw error
    }
  }

  async uploadJSON(jsonData: object): Promise<string> {
    // Convert JSON to base64 string for consistent API handling
    const jsonString = JSON.stringify(jsonData)
    const fileData = btoa(jsonString)

    const metadata = {
      uploadedAt: new Date().toISOString(),
      fileType: 'application/json',
      fileSize: jsonString.length.toString(),
      dataType: 'json-metadata'
    }

    try {
      // Use server-side API endpoint with proper JWT authentication
      const response = await fetch('/api/upload-to-pinata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData,
          fileName: `metadata-${Date.now()}.json`,
          metadata
        }),
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      return result.ipfsHash
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error)
      throw error
    }
  }

  getFileUrl(ipfsHash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
  }

  async getFile(ipfsHash: string): Promise<Response> {
    const url = this.getFileUrl(ipfsHash)
    return fetch(url)
  }

  /**
   * Delete/unpin a file from Pinata by its IPFS hash (CID)
   * Uses server-side API endpoint to protect Pinata JWT
   */
  async deleteFile(ipfsHash: string): Promise<boolean> {
    try {
      console.log('🗑️ Requesting file deletion from IPFS:', ipfsHash)

      const response = await fetch('/api/delete-from-pinata', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cid: ipfsHash }),
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Delete failed')
      }

      console.log('✅ File unpinned from IPFS:', ipfsHash)
      return true
    } catch (error) {
      console.error('Error deleting file from IPFS:', error)
      throw error
    }
  }
}

export const ipfsClient = new IPFSClient()