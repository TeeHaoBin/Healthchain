// Critical Fix #2: Server-side API endpoint to protect Pinata JWT
import type { NextApiRequest, NextApiResponse } from 'next'

type UploadResponse = {
  success: boolean
  ipfsHash?: string
  error?: string
  pinataData?: {
    id: string
    name: string
    size: number
    mimeType: string
    createdAt: string
    isDuplicate: boolean
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // Get Pinata JWT from server environment (not exposed to client)
    const PINATA_JWT = process.env.PINATA_JWT

    if (!PINATA_JWT) {
      console.error('PINATA_JWT not configured in server environment')
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      })
    }

    // Get the uploaded file data from request
    const { fileData, fileName, metadata } = req.body

    if (!fileData || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Missing file data or filename'
      })
    }



    // Convert base64 back to buffer for upload
    const buffer = Buffer.from(fileData, 'base64')

    // Create form data for Pinata v3 API
    const formData = new FormData()

    // Add required fields for v3 API
    formData.append('file', new Blob([buffer], { type: 'application/octet-stream' }), fileName)
    formData.append('network', 'public') // Use public IPFS for truly decentralized healthcare data

    // Add optional name field
    if (fileName) {
      formData.append('name', fileName)
    }

    // Add keyvalues metadata (v3 format - flat structure)
    if (metadata) {
      // Convert nested metadata to flat keyvalue pairs for v3 API
      const keyvalues = {
        ...metadata,
        uploadedAt: new Date().toISOString(),
        apiVersion: 'v3'
      }

      // Add each keyvalue pair individually (v3 requirement)
      Object.entries(keyvalues).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(`keyvalues[${key}]`, String(value))
        }
      })
    }

    // Upload using Pinata v3 API
    const response = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        // Note: Don't set Content-Type for FormData - let browser set it with boundary
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pinata upload failed:', errorText)
      throw new Error(`Upload failed: ${response.status}`)
    }

    const result = await response.json()

    // Handle v3 API response format
    if (!result.data) {
      throw new Error('Invalid response format from Pinata v3 API')
    }

    return res.status(200).json({
      success: true,
      ipfsHash: result.data.cid, // v3 uses 'cid' instead of 'IpfsHash'
      pinataData: {
        id: result.data.id,
        name: result.data.name,
        size: result.data.size,
        mimeType: result.data.mime_type,
        createdAt: result.data.created_at,
        isDuplicate: result.data.is_duplicate
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    })
  }
}

// Configure body parser for larger healthcare files (up to 100mb)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
    responseLimit: false, // Disable response limit for large file uploads
  },
}