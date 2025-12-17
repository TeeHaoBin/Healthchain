"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import RoleGuard from '@/components/auth/RoleGuard'
import AccessHistory from '@/components/shared/AccessHistory'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/components/ui/use-toast'
import { Shield, Plus, Upload, XCircle, Loader2, Clock, CheckCircle2, FileText, User, RefreshCw, Send } from 'lucide-react'
import WalletConnect from '@/components/auth/WalletConnect'
import {
  getTransferRequestsForSourceDoctor,
  getTransferRequestsForRequestingDoctor,
  createTransferRequest,
  rejectTransferRequest,
  attachDocumentToTransfer,
  TransferRequestWithNames
} from '@/lib/supabase/helpers'
import { fileUploadService } from '@/services/fileUploadService'

export default function DoctorHistoryPage() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  // Transfer requests state
  const [myRequests, setMyRequests] = useState<TransferRequestWithNames[]>([])
  const [incomingRequests, setIncomingRequests] = useState<TransferRequestWithNames[]>([])
  const [loadingTransfers, setLoadingTransfers] = useState(false)

  // New request modal
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [newRequestData, setNewRequestData] = useState({
    patientWallet: '',
    sourceWallet: '',
    sourceOrganization: '',
    documentDescription: '',
    purpose: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency'
  })
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Rejection modal
  const [rejectingRequest, setRejectingRequest] = useState<TransferRequestWithNames | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingRejection, setProcessingRejection] = useState(false)

  // Upload modal
  const [uploadingRequest, setUploadingRequest] = useState<TransferRequestWithNames | null>(null)
  const [uploadProgress, setUploadProgress] = useState('')
  const [processingUpload, setProcessingUpload] = useState(false)

  // Fetch transfer requests
  const fetchTransferRequests = useCallback(async () => {
    if (!address) return

    setLoadingTransfers(true)
    try {
      const [myReqs, incoming] = await Promise.all([
        getTransferRequestsForRequestingDoctor(address),
        getTransferRequestsForSourceDoctor(address)
      ])
      setMyRequests(myReqs)
      setIncomingRequests(incoming)
    } catch (error) {
      console.error('Error fetching transfer requests:', error)
    } finally {
      setLoadingTransfers(false)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address) {
      fetchTransferRequests()
    }
  }, [isConnected, address, fetchTransferRequests])

  // Wallet address validation (matches DB constraint: ^0x[a-f0-9]{40}$)
  const isValidWallet = (wallet: string) => /^0x[a-fA-F0-9]{40}$/.test(wallet)

  // Form validation
  const getValidationErrors = () => {
    const errors: string[] = []
    if (!newRequestData.patientWallet) {
      errors.push('Patient wallet is required')
    } else if (!isValidWallet(newRequestData.patientWallet)) {
      errors.push('Patient wallet must be a valid Ethereum address (0x + 40 hex chars)')
    }
    if (!newRequestData.sourceWallet) {
      errors.push('Source provider wallet is required')
    } else if (!isValidWallet(newRequestData.sourceWallet)) {
      errors.push('Source provider wallet must be a valid Ethereum address')
    }
    if (!newRequestData.documentDescription) {
      errors.push('Document description is required')
    }
    if (newRequestData.purpose.length < 10) {
      errors.push('Purpose must be at least 10 characters')
    }
    return errors
  }

  const validationErrors = getValidationErrors()
  const isFormValid = validationErrors.length === 0

  // Create new transfer request
  const handleCreateRequest = async () => {
    if (!address) return

    // Validate before submitting
    if (!isFormValid) {
      toast({
        title: "Validation Error",
        description: validationErrors[0],
        variant: "destructive",
      })
      return
    }

    setSubmittingRequest(true)
    try {
      const result = await createTransferRequest({
        patient_wallet: newRequestData.patientWallet.toLowerCase(),
        requesting_doctor_wallet: address,
        source_doctor_wallet: newRequestData.sourceWallet.toLowerCase(),
        source_organization: newRequestData.sourceOrganization || undefined,
        document_description: newRequestData.documentDescription,
        purpose: newRequestData.purpose,
        urgency: newRequestData.urgency
      })

      if (result) {
        toast({
          title: "Request Created",
          description: "Your transfer request has been sent to the source provider.",
        })
        setShowNewRequestModal(false)
        setNewRequestData({
          patientWallet: '',
          sourceWallet: '',
          sourceOrganization: '',
          documentDescription: '',
          purpose: '',
          urgency: 'routine'
        })
        fetchTransferRequests()
      } else {
        throw new Error('Failed to create request')
      }
    } catch (error) {
      console.error('Error creating request:', error)
      toast({
        title: "Error",
        description: "Failed to create transfer request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingRequest(false)
    }
  }

  // Reject a transfer request
  const handleReject = async () => {
    if (!rejectingRequest) return

    setProcessingRejection(true)
    try {
      const result = await rejectTransferRequest(rejectingRequest.id, rejectionReason)
      if (result) {
        toast({
          title: "Request Rejected",
          description: "The request has been rejected and the requester will be notified.",
        })
        setRejectingRequest(null)
        setRejectionReason('')
        fetchTransferRequests()
      } else {
        throw new Error('Failed to reject request')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingRejection(false)
    }
  }

  // Handle file upload for transfer
  const handleUploadDocument = async (file: File) => {
    if (!uploadingRequest || !address) return

    setProcessingUpload(true)
    setUploadProgress('Encrypting document...')

    try {
      // Upload the document with ONLY Doctor A (source) authorized
      // Doctor B will be added via re-encryption AFTER patient approves
      const uploadResult = await fileUploadService.uploadEncryptedFile(
        file,
        uploadingRequest.patient_wallet,
        [address], // Only Doctor A - Doctor B added after patient approval
        'general'
      )

      if (!uploadResult.success || !uploadResult.fileId) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      setUploadProgress('Attaching to transfer request...')

      // Attach the document to the transfer request
      const attachResult = await attachDocumentToTransfer(
        uploadingRequest.id,
        uploadResult.fileId,
        file.name
      )

      if (attachResult) {
        toast({
          title: "Document Uploaded",
          description: "The document has been uploaded and is now awaiting patient approval.",
        })
        setUploadingRequest(null)
        fetchTransferRequests()
      } else {
        throw new Error('Failed to attach document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document.",
        variant: "destructive",
      })
    } finally {
      setProcessingUpload(false)
      setUploadProgress('')
    }
  }

  // Get status badge for transfer requests
  const getStatusBadge = (request: TransferRequestWithNames, isMyRequest: boolean) => {
    if (isMyRequest) {
      // "Requested by Me" tab - Doctor B's view
      if (request.source_status === 'awaiting_upload') {
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Awaiting Provider</Badge>
      }
      if (request.source_status === 'rejected') {
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      }
      if (request.source_status === 'uploaded') {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" />Awaiting Patient</Badge>
      }
      if (request.patient_status === 'denied') {
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Patient Denied</Badge>
      }
      if (request.source_status === 'granted') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
      }
    } else {
      // "Requested from Me" tab - Doctor A's view
      if (request.source_status === 'awaiting_upload') {
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Action Required</Badge>
      }
      if (request.source_status === 'rejected') {
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" />You Rejected</Badge>
      }
      if (request.source_status === 'uploaded') {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" />Awaiting Patient</Badge>
      }
      if (request.patient_status === 'denied') {
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Patient Denied</Badge>
      }
      if (request.source_status === 'granted') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
      }
    }
    return null
  }

  // Count pending requests
  const pendingMyCount = myRequests.filter(r => r.source_status === 'awaiting_upload' || r.source_status === 'uploaded').length
  const pendingIncomingCount = incomingRequests.filter(r => r.source_status === 'awaiting_upload').length

  return (
    <RoleGuard allowedRoles={['doctor']}>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Request History
          </h1>
          <p className="text-gray-600 mb-8">
            View your complete request history and manage document transfers.
          </p>

          {!isConnected ? (
            <Card className="p-8 text-center border-dashed">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet to View History</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Your request history is secured by blockchain. Please connect your wallet to view.
              </p>
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </Card>
          ) : (
            <Tabs defaultValue="direct" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="direct">Direct Requests</TabsTrigger>
                <TabsTrigger value="requested-by-me" className="relative">
                  Requested by Me
                  {pendingMyCount > 0 && (
                    <Badge className="ml-2 bg-yellow-500 text-white text-xs">{pendingMyCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="requested-from-me" className="relative">
                  Requested from Me
                  {pendingIncomingCount > 0 && (
                    <Badge className="ml-2 bg-yellow-500 text-white text-xs">{pendingIncomingCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Direct Requests Tab */}
              <TabsContent value="direct">
                <AccessHistory walletAddress={address} />
              </TabsContent>

              {/* Requested by Me Tab - Doctor B's view */}
              <TabsContent value="requested-by-me">
                <div className="flex justify-between mb-4">
                  <Button variant="outline" size="sm" onClick={fetchTransferRequests} disabled={loadingTransfers}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingTransfers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={() => setShowNewRequestModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </div>

                <Card className="divide-y">
                  {loadingTransfers ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-500 mt-2">Loading...</p>
                    </div>
                  ) : myRequests.length === 0 ? (
                    <div className="p-8 text-center">
                      <Send className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No transfer requests yet.</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Create a request to get documents from another provider.
                      </p>
                    </div>
                  ) : (
                    myRequests.map((request) => (
                      <div key={request.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <User className="h-4 w-4" />
                              <span>To:</span>
                              <span className="font-medium text-gray-900">
                                {request.source_doctor_name || request.source_doctor_wallet.slice(0, 10) + '...'}
                                {request.source_organization && ` (${request.source_organization})`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <FileText className="h-4 w-4" />
                              <span>Document:</span>
                              <span className="font-medium text-gray-900">
                                {request.document_description || request.snapshot_document_titles?.[0] || 'Not specified'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Patient: {request.patient_name || request.patient_wallet.slice(0, 10) + '...'}
                            </p>
                            {request.source_rejection_reason && (
                              <p className="text-sm text-red-600 mt-2">
                                Rejection reason: {request.source_rejection_reason}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(request, true)}
                            <p className="text-xs text-gray-400">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </TabsContent>

              {/* Requested from Me Tab - Doctor A's view */}
              <TabsContent value="requested-from-me">
                <div className="flex justify-end mb-4">
                  <Button variant="outline" size="sm" onClick={fetchTransferRequests} disabled={loadingTransfers}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingTransfers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                <Card className="divide-y">
                  {loadingTransfers ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-500 mt-2">Loading...</p>
                    </div>
                  ) : incomingRequests.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No incoming requests.</p>
                      <p className="text-sm text-gray-400 mt-1">
                        When other doctors request documents from you, they will appear here.
                      </p>
                    </div>
                  ) : (
                    incomingRequests.map((request) => (
                      <div key={request.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <User className="h-4 w-4" />
                              <span>From:</span>
                              <span className="font-medium text-gray-900">
                                {request.requesting_doctor_name || request.requesting_doctor_wallet.slice(0, 10) + '...'}
                              </span>
                            </div>
                            <div className="bg-blue-50 rounded p-3 mt-2 mb-2">
                              <p className="text-sm text-blue-800 font-medium">Document Requested:</p>
                              <p className="text-sm text-blue-900">
                                {request.document_description || 'Not specified'}
                              </p>
                            </div>
                            <p className="text-sm text-gray-500">
                              Patient: {request.patient_name || request.patient_wallet.slice(0, 10) + '...'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Purpose: {request.purpose}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(request, false)}

                            {request.source_status === 'awaiting_upload' && (
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRejectingRequest(request)
                                    setRejectionReason('')
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setUploadingRequest(request)}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                              </div>
                            )}

                            <p className="text-xs text-gray-400">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* New Request Modal */}
          <Dialog open={showNewRequestModal} onOpenChange={setShowNewRequestModal}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Request Document Transfer</DialogTitle>
                <DialogDescription>
                  Request a document from another healthcare provider. The patient will need to approve the transfer.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="patientWallet">Patient Wallet Address *</Label>
                  <Input
                    id="patientWallet"
                    placeholder="0x..."
                    value={newRequestData.patientWallet}
                    onChange={(e) => setNewRequestData({ ...newRequestData, patientWallet: e.target.value })}
                    className={newRequestData.patientWallet && !isValidWallet(newRequestData.patientWallet) ? 'border-red-500' : ''}
                  />
                  {newRequestData.patientWallet && !isValidWallet(newRequestData.patientWallet) && (
                    <p className="text-sm text-red-500 mt-1">Must be a valid Ethereum address (0x + 40 hex characters)</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="sourceWallet">Source Provider Wallet Address *</Label>
                  <Input
                    id="sourceWallet"
                    placeholder="0x..."
                    value={newRequestData.sourceWallet}
                    onChange={(e) => setNewRequestData({ ...newRequestData, sourceWallet: e.target.value })}
                    className={newRequestData.sourceWallet && !isValidWallet(newRequestData.sourceWallet) ? 'border-red-500' : ''}
                  />
                  {newRequestData.sourceWallet && !isValidWallet(newRequestData.sourceWallet) && (
                    <p className="text-sm text-red-500 mt-1">Must be a valid Ethereum address (0x + 40 hex characters)</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="sourceOrg">Source Organization (optional)</Label>
                  <Input
                    id="sourceOrg"
                    placeholder="Hospital name..."
                    value={newRequestData.sourceOrganization}
                    onChange={(e) => setNewRequestData({ ...newRequestData, sourceOrganization: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="docDesc">Document Description *</Label>
                  <Textarea
                    id="docDesc"
                    placeholder="Describe what document you need (e.g., 'Surgery report from January 2024')"
                    value={newRequestData.documentDescription}
                    onChange={(e) => setNewRequestData({ ...newRequestData, documentDescription: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="purpose">Purpose * (min 10 characters)</Label>
                  <Textarea
                    id="purpose"
                    placeholder="Why do you need this document? (at least 10 characters)"
                    value={newRequestData.purpose}
                    onChange={(e) => setNewRequestData({ ...newRequestData, purpose: e.target.value })}
                    rows={2}
                  />
                  {newRequestData.purpose.length > 0 && newRequestData.purpose.length < 10 && (
                    <p className="text-sm text-red-500 mt-1">
                      Purpose must be at least 10 characters ({10 - newRequestData.purpose.length} more needed)
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={newRequestData.urgency}
                    onValueChange={(value: 'routine' | 'urgent' | 'emergency') =>
                      setNewRequestData({ ...newRequestData, urgency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewRequestModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRequest}
                  disabled={submittingRequest || !isFormValid}
                >
                  {submittingRequest ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Rejection Modal */}
          <Dialog open={!!rejectingRequest} onOpenChange={() => setRejectingRequest(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reject Request</DialogTitle>
                <DialogDescription>
                  Provide a reason for rejecting this document request.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <Label htmlFor="rejectReason">Reason *</Label>
                <Textarea
                  id="rejectReason"
                  placeholder="e.g., Document not available, Wrong patient, etc."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectingRequest(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processingRejection || !rejectionReason}
                >
                  {processingRejection ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Reject Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upload Modal */}
          <Dialog open={!!uploadingRequest} onOpenChange={() => !processingUpload && setUploadingRequest(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload the requested document. It will be encrypted and sent for patient approval.
                </DialogDescription>
              </DialogHeader>

              {uploadingRequest && (
                <div className="py-4">
                  <div className="bg-blue-50 rounded p-3 mb-4">
                    <p className="text-sm text-blue-800 font-medium">Requested Document:</p>
                    <p className="text-sm text-blue-900">
                      {uploadingRequest.document_description || 'Not specified'}
                    </p>
                  </div>

                  {processingUpload ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                      <p className="text-sm text-gray-600 mt-3">{uploadProgress}</p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600 mb-4">
                        Click to select or drag and drop
                      </p>
                      <Input
                        type="file"
                        className="hidden"
                        id="fileUpload"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadDocument(file)
                        }}
                      />
                      <Button asChild>
                        <label htmlFor="fileUpload" className="cursor-pointer">
                          Select File
                        </label>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUploadingRequest(null)}
                  disabled={processingUpload}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}