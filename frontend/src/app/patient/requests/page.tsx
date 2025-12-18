"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import RoleGuard from '@/components/auth/RoleGuard'
import AccessRequestTable from '@/components/shared/AccessRequestTable'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useToast } from "@/components/ui/use-toast"
import { fileUploadService } from "@/services/fileUploadService"
import {
  updateAccessRequest,
  getAccessRequestsWithDoctor,
  AccessRequestWithDoctor,
  getTransferRequestsForPatient,
  updateTransferRequestPatientStatus,
  getTransferRequestById,
  TransferRequestWithNames
} from "@/lib/supabase/helpers"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from "lucide-react"

export default function PatientRequestsPage() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  // Direct access requests state
  const [requests, setRequests] = useState<AccessRequestWithDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState("")

  // Transfer requests state
  const [transferRequests, setTransferRequests] = useState<TransferRequestWithNames[]>([])
  const [loadingTransfers, setLoadingTransfers] = useState(true)
  const [transferProcessingId, setTransferProcessingId] = useState<string | null>(null)

  // Denial modal state
  const [denyingTransfer, setDenyingTransfer] = useState<TransferRequestWithNames | null>(null)
  const [denialReason, setDenialReason] = useState("")

  // Fetch direct access requests
  const fetchRequests = useCallback(async () => {
    if (!isConnected || !address) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getAccessRequestsWithDoctor(address.toLowerCase())
      setRequests(data || [])
    } catch (error) {
      console.error("Failed to fetch access requests:", error)
      toast({
        title: "Error",
        description: "Failed to load access requests",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [address, isConnected, toast])

  // Fetch transfer requests
  const fetchTransferRequests = useCallback(async () => {
    if (!isConnected || !address) {
      setLoadingTransfers(false)
      return
    }

    try {
      setLoadingTransfers(true)
      const data = await getTransferRequestsForPatient(address.toLowerCase())
      setTransferRequests(data || [])
    } catch (error) {
      console.error("Failed to fetch transfer requests:", error)
    } finally {
      setLoadingTransfers(false)
    }
  }, [address, isConnected])

  useEffect(() => {
    fetchRequests()
    fetchTransferRequests()
  }, [fetchRequests, fetchTransferRequests])

  // Handle approve with re-encryption (direct requests)
  const handleApprove = async (request: AccessRequestWithDoctor) => {
    if (!request.requested_record_ids || request.requested_record_ids.length === 0) {
      toast({
        title: "Error",
        description: "No records specified in this request",
        variant: "destructive",
      })
      return
    }

    setProcessingId(request.id)
    setProcessingStep("Starting approval process...")

    try {
      let successCount = 0
      let failCount = 0
      const totalRecords = request.requested_record_ids.length

      // Process each record in the request
      for (let i = 0; i < totalRecords; i++) {
        const recordId = request.requested_record_ids[i]
        setProcessingStep(`Processing record ${i + 1}/${totalRecords}...`)

        const result = await fileUploadService.grantAccessWithReEncryption(
          recordId,
          request.doctor_wallet,
          (step) => setProcessingStep(`Record ${i + 1}/${totalRecords}: ${step}`)
        )

        if (result.success) {
          successCount++
        } else {
          failCount++
          console.error(`Failed to grant access for record ${recordId}:`, result.error)
        }
      }

      // Update request status in database
      setProcessingStep("Updating request status...")
      await updateAccessRequest(request.id, { status: 'approved' })

      // Update local state
      setRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r)
      )

      // Show result toast
      if (failCount === 0) {
        toast({
          title: "Access Granted",
          description: `Successfully granted access to ${successCount} record(s)`,
        })
      } else {
        toast({
          title: "Partial Success",
          description: `Granted access to ${successCount} record(s), ${failCount} failed`,
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error("Approval failed:", error)
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
      setProcessingStep("")
    }
  }

  // Handle reject (direct requests)
  const handleReject = async (request: AccessRequestWithDoctor, denialReasonText?: string) => {
    setProcessingId(request.id)
    setProcessingStep("Rejecting request...")

    try {
      await updateAccessRequest(request.id, {
        status: 'denied',
        denial_reason: denialReasonText || 'Request denied by patient'
      })

      // Update local state
      setRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, status: 'denied' } : r)
      )

      toast({
        title: "Request Rejected",
        description: "The access request has been denied",
      })

    } catch (error) {
      console.error("Rejection failed:", error)
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
      setProcessingStep("")
    }
  }

  // Handle transfer request approval with re-encryption
  const handleTransferApprove = async (request: TransferRequestWithNames) => {
    setTransferProcessingId(request.id)

    try {
      // Get the full request with record IDs
      const fullRequest = await getTransferRequestById(request.id)
      if (!fullRequest || !fullRequest.requested_record_ids?.length) {
        throw new Error('Transfer request has no attached documents')
      }

      // Step 1: Re-encrypt each record to grant Doctor B access
      for (const recordId of fullRequest.requested_record_ids) {
        console.log(`🔒 Re-encrypting record ${recordId} for Doctor B...`)

        const result = await fileUploadService.grantAccessWithReEncryption(
          recordId,
          fullRequest.requesting_doctor_wallet // Doctor B
        )

        if (!result.success) {
          throw new Error(`Failed to grant access: ${result.error}`)
        }
      }

      // Step 2: Update the transfer request status
      const updateResult = await updateTransferRequestPatientStatus(request.id, 'approved')
      if (!updateResult) throw new Error('Failed to update transfer request')

      // Update local state
      setTransferRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, patient_status: 'approved' as const, source_status: 'granted' as const } : r)
      )

      toast({
        title: "Transfer Approved",
        description: "Access has been granted. The requesting doctor can now view the document.",
      })
    } catch (error) {
      console.error("Transfer approval failed:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve transfer request",
        variant: "destructive",
      })
    } finally {
      setTransferProcessingId(null)
    }
  }

  // Handle transfer request denial
  const handleTransferDeny = async () => {
    if (!denyingTransfer) return

    setTransferProcessingId(denyingTransfer.id)

    try {
      const result = await updateTransferRequestPatientStatus(
        denyingTransfer.id,
        'denied',
        denialReason || 'Request denied by patient'
      )
      if (!result) throw new Error('Failed to update transfer request')

      // Update local state
      setTransferRequests(prev =>
        prev.map(r => r.id === denyingTransfer.id ? { ...r, patient_status: 'denied' } : r)
      )

      toast({
        title: "Transfer Denied",
        description: "The transfer request has been denied.",
      })

      setDenyingTransfer(null)
      setDenialReason("")
    } catch (error) {
      console.error("Transfer denial failed:", error)
      toast({
        title: "Error",
        description: "Failed to deny transfer request",
        variant: "destructive",
      })
    } finally {
      setTransferProcessingId(null)
    }
  }

  // Get status badge for transfer requests
  const getTransferStatusBadge = (request: TransferRequestWithNames) => {
    // Check source-level statuses first (these take precedence)
    if (request.source_status === 'rejected') {
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" />Provider Rejected</Badge>
    }
    if (request.source_status === 'granted') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
    }
    if (request.source_status === 'failed') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
    }

    // Then check patient-level statuses
    if (request.patient_status === 'denied') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />You Denied</Badge>
    }
    if (request.source_status === 'uploaded' && request.patient_status === 'approved') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" />Processing</Badge>
    }
    if (request.source_status === 'uploaded' && request.patient_status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending Your Approval</Badge>
    }

    return null
  }

  // Count pending requests
  const pendingDirectCount = requests.filter(r => r.status === 'sent' || r.status === 'draft').length
  const pendingTransferCount = transferRequests.filter(r => r.source_status === 'uploaded' && r.patient_status === 'pending').length

  return (
    <RoleGuard allowedRoles={['patient']}>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Access Requests
          </h1>
          <p className="text-gray-600 mb-8">
            Review and manage access requests from healthcare providers.
            Approving a request will grant the doctor access to decrypt and view the specified records.
          </p>

          <Tabs defaultValue="direct" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="direct" className="relative">
                Direct Requests
                {pendingDirectCount > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-white">{pendingDirectCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="transfer" className="relative">
                Transfer Requests
                {pendingTransferCount > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-white">{pendingTransferCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Direct Requests Tab */}
            <TabsContent value="direct">
              <AccessRequestTable
                requests={requests}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={loading}
                processingId={processingId}
                processingStep={processingStep}
              />
            </TabsContent>

            {/* Transfer Requests Tab */}
            <TabsContent value="transfer">
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
                    <p className="text-gray-500 mt-2">Loading transfer requests...</p>
                  </div>
                ) : transferRequests.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No transfer requests.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Transfer requests occur when one doctor needs records from another doctor.
                    </p>
                  </div>
                ) : (
                  transferRequests.map((request) => (
                    <div key={request.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          {/* Transfer Badge */}
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 mb-2">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Provider Transfer
                          </Badge>

                          {/* Requesting Doctor */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <User className="h-4 w-4" />
                            <span className="min-w-[70px]">Requester:</span>
                            <span className="font-medium text-gray-900">
                              {request.requesting_doctor_name || request.requesting_doctor_wallet.slice(0, 8) + '...'}
                              {request.requesting_organization && ` (${request.requesting_organization})`}
                            </span>
                          </div>

                          {/* Source Doctor */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <ArrowRight className="h-4 w-4" />
                            <span className="min-w-[70px]">Provider:</span>
                            <span className="font-medium text-gray-900">
                              {request.source_doctor_name || request.source_doctor_wallet.slice(0, 8) + '...'}
                              {request.source_organization && ` (${request.source_organization})`}
                            </span>
                          </div>

                          {/* Documents */}
                          <div className="bg-gray-50 rounded p-3 mt-2">
                            <p className="text-xs text-gray-500 mb-1">Requested Documents:</p>
                            <div className="space-y-1">
                              {request.source_status === 'rejected' || !request.document_names?.length ? (
                                <p className="text-sm text-gray-400 italic">No file attached</p>
                              ) : (
                                request.document_names.map((name, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    {request.requested_record_ids?.[idx] ? (
                                      <>
                                        <ExternalLink className="h-3 w-3 text-blue-500" />
                                        <Link
                                          href={`/patient/records?highlightId=${request.requested_record_ids[idx]}`}
                                          className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          {name}
                                        </Link>
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="h-3 w-3 text-gray-400" />
                                        <span>{name}</span>
                                      </>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Purpose */}
                          <p className="text-sm text-gray-500 mt-2">
                            <span className="font-medium">Purpose:</span> {request.purpose}
                          </p>

                          {/* Urgency */}
                          {request.urgency !== 'routine' && (
                            <Badge variant="outline" className={`mt-2 ${request.urgency === 'emergency'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                              }`}>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {getTransferStatusBadge(request)}

                          {request.patient_status === 'pending' && request.source_status === 'uploaded' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setDenyingTransfer(request)
                                  setDenialReason("")
                                }}
                                disabled={transferProcessingId === request.id}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Deny
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleTransferApprove(request)}
                                disabled={transferProcessingId === request.id}
                              >
                                {transferProcessingId === request.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                )}
                                Approve
                              </Button>
                            </div>
                          )}

                          {request.patient_status === 'denied' && request.patient_denial_reason && (
                            <p className="text-xs text-gray-500 max-w-48 text-right">
                              Reason: {request.patient_denial_reason}
                            </p>
                          )}

                          {request.source_status === 'rejected' && request.source_rejection_reason && (
                            <p className="text-xs text-gray-500 max-w-48 text-right">
                              Provider reason: {request.source_rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <p className="text-xs text-gray-400">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Denial Modal for Transfer Requests */}
          <Dialog open={!!denyingTransfer} onOpenChange={() => setDenyingTransfer(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Deny Transfer Request</DialogTitle>
                <DialogDescription>
                  Please provide a reason for denying this transfer request.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <Label htmlFor="denial-reason">Reason (optional)</Label>
                <Textarea
                  id="denial-reason"
                  placeholder="Enter a reason for denial..."
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDenyingTransfer(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleTransferDeny}
                  disabled={transferProcessingId !== null}
                >
                  {transferProcessingId !== null ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : null}
                  Deny Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}