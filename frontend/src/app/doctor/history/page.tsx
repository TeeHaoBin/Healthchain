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
import { Shield, Plus, Upload, XCircle, Loader2, Clock, CheckCircle2, FileText, User, RefreshCw, Send, Search, Info } from 'lucide-react'
import WalletConnect from '@/components/auth/WalletConnect'
import {
  getTransferRequestsForSourceDoctor,
  getTransferRequestsForRequestingDoctor,
  createTransferRequest,
  rejectTransferRequest,
  attachDocumentToTransfer,
  getDoctorProfileByWallet,
  getUserByWallet,
  TransferRequestWithNames
} from '@/lib/supabase/helpers'
import { fileUploadService } from '@/services/fileUploadService'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function DoctorHistoryPage() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  // Transfer requests state
  const [myRequests, setMyRequests] = useState<TransferRequestWithNames[]>([])
  const [incomingRequests, setIncomingRequests] = useState<TransferRequestWithNames[]>([])

  // Direct requests pending count (from AccessHistory)
  const [directPendingCount, setDirectPendingCount] = useState(0)
  const [loadingTransfers, setLoadingTransfers] = useState(false)

  // Search and filter state for "Requested by Me" tab
  const [mySearchTerm, setMySearchTerm] = useState('')
  const [myStatusFilter, setMyStatusFilter] = useState<'all' | 'awaiting' | 'pending' | 'completed' | 'providerRejected' | 'patientDenied'>('all')

  // Search and filter state for "Requested from Me" tab
  const [incomingSearchTerm, setIncomingSearchTerm] = useState('')
  const [incomingStatusFilter, setIncomingStatusFilter] = useState<'all' | 'awaiting' | 'uploaded' | 'rejected'>('all')

  // New request modal
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [newRequestData, setNewRequestData] = useState({
    patientWallet: '',
    sourceWallet: '',
    documentDescription: '',
    purpose: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency'
  })
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Auto-fetched source organization
  const [fetchedSourceOrg, setFetchedSourceOrg] = useState<string | null>(null)
  const [fetchingSourceOrg, setFetchingSourceOrg] = useState(false)

  // Auto-fetched names for wallet verification
  const [fetchedPatientName, setFetchedPatientName] = useState<string | null>(null)
  const [fetchingPatientName, setFetchingPatientName] = useState(false)
  const [fetchedSourceDoctorName, setFetchedSourceDoctorName] = useState<string | null>(null)
  const [fetchingSourceDoctorName, setFetchingSourceDoctorName] = useState(false)

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

  // Auto-fetch patient name when patient wallet is valid
  useEffect(() => {
    const fetchPatientName = async () => {
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(newRequestData.patientWallet)
      if (!newRequestData.patientWallet || !isValid) {
        setFetchedPatientName(null)
        return
      }

      setFetchingPatientName(true)
      try {
        const user = await getUserByWallet(newRequestData.patientWallet.toLowerCase())
        setFetchedPatientName(user?.full_name || null)
      } catch (error) {
        console.error('Error fetching patient name:', error)
        setFetchedPatientName(null)
      } finally {
        setFetchingPatientName(false)
      }
    }

    fetchPatientName()
  }, [newRequestData.patientWallet])

  // Auto-fetch source doctor name and organization when source wallet is valid
  useEffect(() => {
    const fetchSourceInfo = async () => {
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(newRequestData.sourceWallet)
      if (!newRequestData.sourceWallet || !isValid) {
        setFetchedSourceOrg(null)
        setFetchedSourceDoctorName(null)
        return
      }

      setFetchingSourceOrg(true)
      setFetchingSourceDoctorName(true)
      try {
        // Fetch user for name
        const user = await getUserByWallet(newRequestData.sourceWallet.toLowerCase())
        setFetchedSourceDoctorName(user?.full_name || null)

        // Fetch doctor profile for organization
        const profile = await getDoctorProfileByWallet(newRequestData.sourceWallet.toLowerCase())
        setFetchedSourceOrg(profile?.hospital_name || null)
      } catch (error) {
        console.error('Error fetching source doctor info:', error)
        setFetchedSourceOrg(null)
        setFetchedSourceDoctorName(null)
      } finally {
        setFetchingSourceOrg(false)
        setFetchingSourceDoctorName(false)
      }
    }

    fetchSourceInfo()
  }, [newRequestData.sourceWallet])

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
        source_organization: fetchedSourceOrg || undefined,
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
          documentDescription: '',
          purpose: '',
          urgency: 'routine'
        })
        setFetchedSourceOrg(null)
        setFetchedPatientName(null)
        setFetchedSourceDoctorName(null)
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

  // Filter logic for "Requested by Me" tab
  const getMyRequestDisplayStatus = (request: TransferRequestWithNames): 'awaiting' | 'pending' | 'completed' | 'providerRejected' | 'patientDenied' => {
    if (request.source_status === 'rejected') return 'providerRejected'
    if (request.patient_status === 'denied') return 'patientDenied'
    if (request.source_status === 'awaiting_upload') return 'awaiting'
    if (request.source_status === 'uploaded' && request.patient_status === 'pending') return 'pending'
    if (request.patient_status === 'approved' || request.source_status === 'granted') return 'completed'
    return 'pending'
  }

  const filteredMyRequests = myRequests.filter(request => {
    if (myStatusFilter !== 'all' && getMyRequestDisplayStatus(request) !== myStatusFilter) return false
    if (mySearchTerm) {
      const search = mySearchTerm.toLowerCase()
      const matchesSource = request.source_doctor_name?.toLowerCase().includes(search) || request.source_doctor_wallet.toLowerCase().includes(search)
      const matchesPatient = request.patient_name?.toLowerCase().includes(search) || request.patient_wallet.toLowerCase().includes(search)
      if (!matchesSource && !matchesPatient) return false
    }
    return true
  })

  const myFilterCounts = {
    all: myRequests.length,
    awaiting: myRequests.filter(r => getMyRequestDisplayStatus(r) === 'awaiting').length,
    pending: myRequests.filter(r => getMyRequestDisplayStatus(r) === 'pending').length,
    completed: myRequests.filter(r => getMyRequestDisplayStatus(r) === 'completed').length,
    providerRejected: myRequests.filter(r => getMyRequestDisplayStatus(r) === 'providerRejected').length,
    patientDenied: myRequests.filter(r => getMyRequestDisplayStatus(r) === 'patientDenied').length
  }

  // Filter logic for "Requested from Me" tab
  const getIncomingDisplayStatus = (request: TransferRequestWithNames): 'awaiting' | 'uploaded' | 'rejected' => {
    if (request.source_status === 'rejected') return 'rejected'
    if (request.source_status === 'awaiting_upload') return 'awaiting'
    return 'uploaded'
  }

  const filteredIncomingRequests = incomingRequests.filter(request => {
    if (incomingStatusFilter !== 'all' && getIncomingDisplayStatus(request) !== incomingStatusFilter) return false
    if (incomingSearchTerm) {
      const search = incomingSearchTerm.toLowerCase()
      const matchesRequester = request.requesting_doctor_name?.toLowerCase().includes(search) || request.requesting_doctor_wallet.toLowerCase().includes(search)
      const matchesPatient = request.patient_name?.toLowerCase().includes(search) || request.patient_wallet.toLowerCase().includes(search)
      if (!matchesRequester && !matchesPatient) return false
    }
    return true
  })

  const incomingFilterCounts = {
    all: incomingRequests.length,
    awaiting: incomingRequests.filter(r => getIncomingDisplayStatus(r) === 'awaiting').length,
    uploaded: incomingRequests.filter(r => getIncomingDisplayStatus(r) === 'uploaded').length,
    rejected: incomingRequests.filter(r => getIncomingDisplayStatus(r) === 'rejected').length
  }

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
                <TabsTrigger value="direct" className="relative">
                  Direct Requests
                  {directPendingCount > 0 && (
                    <Badge className="ml-2 bg-yellow-500 text-white text-xs">{directPendingCount}</Badge>
                  )}
                </TabsTrigger>
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
                <AccessHistory
                  walletAddress={address}
                  onStatsLoad={(stats) => setDirectPendingCount(stats.pending)}
                />
              </TabsContent>

              {/* Requested by Me Tab - Doctor B's view */}
              <TabsContent value="requested-by-me">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by provider name, patient, or wallet..."
                      className="pl-10"
                      value={mySearchTerm}
                      onChange={(e) => setMySearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchTransferRequests} disabled={loadingTransfers}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingTransfers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={() => setShowNewRequestModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </div>

                {/* Status Filter Tabs */}
                <Tabs value={myStatusFilter} onValueChange={(v) => setMyStatusFilter(v as typeof myStatusFilter)} className="mb-4">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="all">All ({myFilterCounts.all})</TabsTrigger>
                    <TabsTrigger value="awaiting">Awaiting Provider ({myFilterCounts.awaiting})</TabsTrigger>
                    <TabsTrigger value="pending">Patient Pending ({myFilterCounts.pending})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({myFilterCounts.completed})</TabsTrigger>
                    <TabsTrigger value="providerRejected">Provider Rejected ({myFilterCounts.providerRejected})</TabsTrigger>
                    <TabsTrigger value="patientDenied">Patient Denied ({myFilterCounts.patientDenied})</TabsTrigger>
                  </TabsList>
                </Tabs>

                <Card className="divide-y">
                  {loadingTransfers ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-500 mt-2">Loading...</p>
                    </div>
                  ) : filteredMyRequests.length === 0 ? (
                    <div className="p-8 text-center">
                      <Send className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">
                        {mySearchTerm || myStatusFilter !== 'all' ? 'No requests match your filters.' : 'No transfer requests yet.'}
                      </p>
                      {(mySearchTerm || myStatusFilter !== 'all') && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => { setMySearchTerm(''); setMyStatusFilter('all'); }}>
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredMyRequests.map((request) => (
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
                              <div className="mt-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-sm text-red-600 cursor-help">
                                      <Info className="h-3.5 w-3.5" />
                                      <span className="font-medium">Rejection Reason</span>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="start" className="max-w-xs">
                                    <p>{request.source_rejection_reason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
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
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by requester name, patient, or wallet..."
                      className="pl-10"
                      value={incomingSearchTerm}
                      onChange={(e) => setIncomingSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchTransferRequests} disabled={loadingTransfers}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingTransfers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {/* Status Filter Tabs */}
                <Tabs value={incomingStatusFilter} onValueChange={(v) => setIncomingStatusFilter(v as typeof incomingStatusFilter)} className="mb-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">All ({incomingFilterCounts.all})</TabsTrigger>
                    <TabsTrigger value="awaiting">Awaiting Upload ({incomingFilterCounts.awaiting})</TabsTrigger>
                    <TabsTrigger value="uploaded">Uploaded ({incomingFilterCounts.uploaded})</TabsTrigger>
                    <TabsTrigger value="rejected">You Rejected ({incomingFilterCounts.rejected})</TabsTrigger>
                  </TabsList>
                </Tabs>

                <Card className="divide-y">
                  {loadingTransfers ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-500 mt-2">Loading...</p>
                    </div>
                  ) : filteredIncomingRequests.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">
                        {incomingSearchTerm || incomingStatusFilter !== 'all' ? 'No requests match your filters.' : 'No incoming requests.'}
                      </p>
                      {(incomingSearchTerm || incomingStatusFilter !== 'all') && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => { setIncomingSearchTerm(''); setIncomingStatusFilter('all'); }}>
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredIncomingRequests.map((request) => (
                      <div key={request.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <User className="h-4 w-4" />
                              <span>From:</span>
                              <span className="font-medium text-gray-900">
                                {request.requesting_doctor_name || request.requesting_doctor_wallet.slice(0, 10) + '...'}
                                {request.requesting_organization && ` (${request.requesting_organization})`}
                              </span>
                            </div>
                            <div className="bg-blue-50 rounded p-3 mt-2 mb-2">
                              <p className="text-sm text-blue-800 font-medium">Document Requested:</p>
                              <p className="text-sm text-blue-900">
                                {request.document_description || 'Not specified'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <span className="min-w-[55px]">Patient:</span>
                              <span className="font-medium text-gray-900">
                                {request.patient_name || request.patient_wallet.slice(0, 10) + '...'}
                              </span>
                            </div>
                            <div className="mt-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-sm text-gray-500 cursor-help">
                                    <Info className="h-3.5 w-3.5" />
                                    <span className="font-medium">Purpose</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start" className="max-w-xs">
                                  <p>{request.purpose}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
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
                  {newRequestData.patientWallet && isValidWallet(newRequestData.patientWallet) && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      {fetchingPatientName ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Looking up patient...</>
                      ) : fetchedPatientName ? (
                        <>Patient&apos;s Name: <span className="font-medium text-gray-700">{fetchedPatientName}</span></>
                      ) : (
                        <span className="text-gray-400 italic">Patient not found in system</span>
                      )}
                    </p>
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
                  {newRequestData.sourceWallet && isValidWallet(newRequestData.sourceWallet) && (
                    <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                      <p>
                        {fetchingSourceDoctorName ? (
                          <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Looking up provider...</span>
                        ) : fetchedSourceDoctorName ? (
                          <><span className="inline-block w-[175px]">Source Provider&apos;s Name:</span><span className="font-medium text-gray-700">{fetchedSourceDoctorName}</span></>
                        ) : (
                          <span className="text-gray-400 italic">Provider not found in system</span>
                        )}
                      </p>
                      {(fetchingSourceOrg || fetchedSourceOrg || fetchedSourceDoctorName) && (
                        <p>
                          {fetchingSourceOrg ? (
                            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Looking up organization...</span>
                          ) : fetchedSourceOrg ? (
                            <><span className="inline-block w-[175px]">Source Organization:</span><span className="font-medium text-gray-700">{fetchedSourceOrg}</span></>
                          ) : (
                            <><span className="inline-block w-[175px]">Source Organization:</span><span className="text-gray-400 italic">Not available</span></>
                          )}
                        </p>
                      )}
                    </div>
                  )}
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