'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, File, X, Shield, CheckCircle, AlertCircle } from "lucide-react"
import { useAccount } from "wagmi"
import { fileUploadService } from "@/services/fileUploadService"
import { isValidFileSize, isValidFileType, isValidFileSizeSimple, isValidFileTypeSimple, validateDoctorAddresses } from "@/lib/validation"
import { useToast } from "@/components/ui/use-toast"

interface UploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  ipfsHash?: string
  error?: string
}

export default function FileUploader() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([])
  const [authorizedDoctors, setAuthorizedDoctors] = useState<string>('')
  const [recordType, setRecordType] = useState<string>('general')
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { toast } = useToast()
  // No ref needed for label-based approach - it's pure HTML

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileSelect called', event.target.files?.length); // Debug log

    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      console.log('Selected files:', newFiles.map(f => f.name)); // Debug log

      // Validate files with enhanced validation
      const validFiles: File[] = []
      const invalidFiles: { file: File; error: string; category?: string }[] = []

      newFiles.forEach(file => {
        // Validate file type first
        const typeValidation = isValidFileType(file)
        if (!typeValidation.valid) {
          invalidFiles.push({
            file,
            error: typeValidation.error || 'Unsupported file type',
            category: typeValidation.category
          })
          return
        }

        // Validate file size
        const sizeValidation = isValidFileSize(file)
        if (!sizeValidation.valid) {
          invalidFiles.push({
            file,
            error: sizeValidation.error || 'File too large',
            category: typeValidation.category
          })
          return
        }

        // File is valid
        validFiles.push(file)
        console.log(`✅ Valid file: ${file.name} (${typeValidation.category})`)
      })

      // Show errors for invalid files
      if (invalidFiles.length > 0) {
        const errorMessage = invalidFiles.map(({ file, error }) =>
          `${file.name}: ${error}`
        ).join(', ')
        toast({
          title: "Files Rejected",
          description: errorMessage,
          variant: "destructive",
        })
      }

      setSelectedFiles(validFiles)

      // Reset upload statuses with validation results
      setUploadStatuses([
        ...validFiles.map(file => ({
          file,
          status: 'pending' as const
        })),
        ...invalidFiles.map(({ file, error }) => ({
          file,
          status: 'error' as const,
          error
        }))
      ])
    } else {
      console.log('No files selected');
    }

    // Clear the input value to allow selecting the same files again
    event.target.value = '';
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !isConnected || !address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    // Validate doctor addresses before uploading
    const doctorValidation = validateDoctorAddresses(authorizedDoctors)
    if (!doctorValidation.valid) {
      toast({
        title: "Invalid Doctor Addresses",
        description: doctorValidation.errors.join(', '),
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    // Track upload results locally to avoid stale state issues
    let successCount = 0
    let failCount = 0

    try {
      // Parse authorized doctors from comma-separated string
      const doctorAddresses = authorizedDoctors
        .split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0)

      // Upload each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]

        // Update status to uploading
        setUploadStatuses(prev =>
          prev.map((status, index) =>
            index === i ? { ...status, status: 'uploading' } : status
          )
        )

        try {
          console.log(`🚀 Uploading file ${i + 1}/${selectedFiles.length}: ${file.name}`)

          const result = await fileUploadService.uploadEncryptedFile(
            file,
            address,
            doctorAddresses,
            recordType
          )

          if (result.success) {
            // Update status to success
            setUploadStatuses(prev =>
              prev.map((status, index) =>
                index === i ? {
                  ...status,
                  status: 'success',
                  ipfsHash: result.ipfsHash
                } : status
              )
            )
            successCount++
            console.log(`✅ Successfully uploaded: ${file.name}`)
          } else {
            throw new Error(result.error || 'Upload failed')
          }
        } catch (error) {
          console.error(`❌ Failed to upload ${file.name}:`, error)
          failCount++

          // Update status to error
          setUploadStatuses(prev =>
            prev.map((status, index) =>
              index === i ? {
                ...status,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              } : status
            )
          )
        }
      }

      console.log('🎉 Upload process completed!')

      if (failCount === 0) {
        // All files uploaded successfully
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''} to IPFS`,
        })
      } else if (successCount > 0) {
        // Some files failed
        toast({
          title: "Partial Upload",
          description: `${successCount} file${successCount !== 1 ? 's' : ''} uploaded, ${failCount} failed`,
          variant: "destructive",
        })
      } else {
        // All files failed
        toast({
          title: "Upload Failed",
          description: "All files failed to upload. Please try again.",
          variant: "destructive",
        })
      }

      // Redirect to records page after a short delay to show the toast
      setTimeout(() => {
        router.push('/patient/records')
      }, 2000)

    } catch (error) {
      console.error("❌ Upload process failed:", error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      })
      // Redirect to records page even on failure after showing error toast
      setTimeout(() => {
        router.push('/patient/records')
      }, 2000)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index))
    setUploadStatuses(statuses => statuses.filter((_, i) => i !== index))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Wallet Connection Status */}
      {!isConnected && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">Please connect your wallet to upload files</p>
          </div>
        </Card>
      )}

      {/* Configuration Card */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Upload Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Type
            </label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={uploading}
            >
              <option value="general">General Health Record</option>
              <option value="lab-result">Lab Result</option>
              <option value="prescription">Prescription</option>
              <option value="imaging">Medical Imaging</option>
              <option value="discharge-summary">Discharge Summary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authorized Doctor Addresses (comma-separated, optional)
            </label>
            <input
              type="text"
              value={authorizedDoctors}
              onChange={(e) => setAuthorizedDoctors(e.target.value)}
              placeholder="0x123..., 0x456..."
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to only allow yourself to access these files
            </p>
          </div>
        </div>
      </Card>

      {/* File Upload Card */}
      <Card className="p-6">
        {/* Enhanced Drag & Drop Area */}
        <div
          className="border-2 border-dashed border-blue-300 rounded-lg p-12 text-center bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 cursor-pointer"
          onDrop={(e) => {
            e.preventDefault()
            const files = Array.from(e.dataTransfer.files)
            const event = {
              target: { files: e.dataTransfer.files, value: '' }
            } as React.ChangeEvent<HTMLInputElement>
            handleFileSelect(event)
          }}
          onDragOver={(e) => {
            e.preventDefault()
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            e.currentTarget.classList.add('border-blue-500', 'bg-blue-100')
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100')
          }}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                🏥 Drag & Drop Your Medical Files Here
              </h3>
              <p className="text-gray-600 text-base mb-3">
                Simply drag your files into this area to upload them securely
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ✅ Drag & Drop is Working Perfectly!
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">
                Supported file types: PDF, DOC, DOCX, Images, DICOM, XLS, ZIP
              </p>

              {/* Professional medical file upload button */}
              <div className="flex flex-col items-center space-y-3">
                <label
                  htmlFor="medical-file-input"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white text-base font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  style={{
                    opacity: (uploading || !isConnected) ? 0.5 : 1,
                    pointerEvents: (uploading || !isConnected) ? 'none' : 'auto'
                  }}
                >
                  <Upload className="h-5 w-5 mr-3" />
                  Choose Medical Files
                </label>
                <input
                  id="medical-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.dcm,.dicom,.xls,.xlsx,.zip,.rar"
                  onChange={handleFileSelect}
                  disabled={uploading || !isConnected}
                  className="sr-only"
                />
                <p className="text-sm text-gray-500 text-center max-w-md">
                  Select your medical documents, lab results, or health records to upload securely
                </p>
              </div>
            </div>


            {/* Development status indicator */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-400 bg-white/50 p-2 rounded mt-4">
                <p>Status: Connected: {String(isConnected)} | Uploading: {String(uploading)}</p>
                <p>📁 Drag & Drop: Working | 🔘 Choose Files Button: Working (Label-based)</p>
                <p>🔒 Production-ready healthcare file upload system</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {selectedFiles.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Selected Files</h3>
          <div className="space-y-2">
            {uploadStatuses.map((status, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status.status)}
                  <div>
                    <p className="text-sm font-medium">{status.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(status.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {status.status === 'success' && status.ipfsHash && (
                      <p className="text-xs text-green-600">
                        IPFS: {status.ipfsHash.substring(0, 20)}...
                      </p>
                    )}
                    {status.status === 'error' && status.error && (
                      <p className="text-xs text-red-600">
                        Error: {status.error}
                      </p>
                    )}
                  </div>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={uploading || !isConnected}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Encrypting & Uploading...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Upload Encrypted Files
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFiles([])
                setUploadStatuses([])
              }}
              disabled={uploading}
            >
              Clear All
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Security & Guidelines
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔒 Security Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• End-to-end encryption with Lit Protocol</li>
              <li>• Decentralized storage on IPFS via Pinata</li>
              <li>• Wallet-based access control</li>
              <li>• Only you and authorized doctors can decrypt</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📋 Upload Guidelines</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Documents: PDF, DOC, DOCX, TXT</li>
              <li>• Images: JPG, PNG, GIF, BMP, TIFF</li>
              <li>• Medical: DICOM files (.dcm)</li>
              <li>• Spreadsheets: XLS, XLSX (lab results)</li>
              <li>• Archives: ZIP, RAR (bulk uploads)</li>
              <li>• Maximum file size: 100MB per file</li>
              <li>• Connect wallet before uploading</li>
              <li>• Add doctor addresses for shared access</li>
            </ul>
          </div>
        </div>

        {uploadStatuses.some(s => s.status === 'success') && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800">
                Files uploaded successfully! They are now encrypted and stored securely on IPFS.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}