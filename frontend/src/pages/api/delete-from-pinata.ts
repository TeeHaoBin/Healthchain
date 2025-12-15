// Server-side API endpoint to unpin files from Pinata
import type { NextApiRequest, NextApiResponse } from 'next'

type DeleteResponse = {
    success: boolean
    error?: string
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<DeleteResponse>
) {
    if (req.method !== 'DELETE') {
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

        // Get the CID (IPFS hash) to delete
        const { cid } = req.body

        if (!cid) {
            return res.status(400).json({
                success: false,
                error: 'Missing CID (IPFS hash)'
            })
        }

        console.log('🗑️ Attempting to unpin file from Pinata:', cid)
        console.log('🔑 JWT configured:', PINATA_JWT ? `Yes (${PINATA_JWT.substring(0, 20)}...${PINATA_JWT.substring(PINATA_JWT.length - 10)}) Length: ${PINATA_JWT.length}` : 'No')

        // First, we need to get the file ID from the CID
        // Pinata v3 API requires file ID for deletion, not CID directly
        // Try searching with different query parameters as v3 API format may vary
        let fileId: string | null = null

        // Approach 1: Try searching with cid query parameter
        console.log('🔍 Searching for file in Pinata...')
        // Correct V3 API endpoint: https://api.pinata.cloud/v3/files/{network}?cid={cid}
        const searchUrl = `https://api.pinata.cloud/v3/files/public?cid=${cid}&limit=1`
        console.log('🔗 Search URL:', searchUrl)

        const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`,
            },
        })

        console.log('🔍 Search response status:', searchResponse.status, searchResponse.statusText)

        if (searchResponse.ok) {
            const searchResult = await searchResponse.json()
            console.log('🔍 Pinata search result:', JSON.stringify(searchResult, null, 2))

            if (searchResult.data?.files?.length > 0) {
                fileId = searchResult.data.files[0].id
            }
        } else {
            console.warn('Search by cid query request failed:', searchResponse.status)
        }

        // Approach 2: If cid search didn't work, try listing and filtering
        if (!fileId) {
            console.log('🔍 Trying alternative search: list recent files and filter by CID...')
            // Correct V3 API endpoint for listing: https://api.pinata.cloud/v3/files/{network}
            const listResponse = await fetch(`https://api.pinata.cloud/v3/files/public?limit=100`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PINATA_JWT}`,
                },
            })

            console.log('📋 List response status:', listResponse.status)

            if (listResponse.ok) {
                const listResult = await listResponse.json()
                const fileCount = listResult.data?.files?.length || 0
                console.log(`📋 Found ${fileCount} files in Pinata public network`)

                // Log first few CIDs for debugging
                if (fileCount > 0) {
                    const sampleCids = listResult.data.files.slice(0, 5).map((f: { cid: string; name: string }) => ({ cid: f.cid, name: f.name }))
                    console.log('📋 Sample files:', JSON.stringify(sampleCids, null, 2))
                }

                const matchingFile = listResult.data?.files?.find((f: { cid: string }) => f.cid === cid)
                if (matchingFile) {
                    fileId = matchingFile.id
                    console.log('📄 Found file via list filter, ID:', fileId)
                }
            } else {
                const errorText = await listResponse.text()
                console.error('📋 List failed:', errorText)
            }
        }

        if (!fileId) {
            // File not found in Pinata - might already be deleted or never existed
            console.warn('⚠️ File not found in Pinata, may already be unpinned:', cid)
            return res.status(200).json({ success: true })
        }

        console.log('📄 Found file ID:', fileId)

        // Delete the file using Pinata v3 API
        // Correct V3 API endpoint: https://api.pinata.cloud/v3/files/{network}/{id}
        const deleteResponse = await fetch(`https://api.pinata.cloud/v3/files/public/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`,
            },
        })

        console.log('🗑️ Delete response status:', deleteResponse.status)

        if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text()
            console.error('Pinata delete failed:', errorText)
            throw new Error(`Delete failed: ${deleteResponse.status}`)
        }

        console.log('✅ File unpinned from Pinata:', cid)

        return res.status(200).json({ success: true })

    } catch (error) {
        console.error('Delete error:', error)
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Delete failed'
        })
    }
}
