"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount } from "wagmi"
import RoleGuard from '@/components/auth/RoleGuard'
import AccessRequestTable from '@/components/shared/AccessRequestTable'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useToast } from "@/components/ui/use-toast"
import { fileUploadService } from "@/services/fileUploadService"
import { updateAccessRequest, getAccessRequestsWithDoctor, AccessRequestWithDoctor } from "@/lib/supabase/helpers"

export default function PatientRequestsPage() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  const [requests, setRequests] = useState<AccessRequestWithDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState("")

  // Fetch access requests on mount
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

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Handle approve with re-encryption
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

  // Handle reject
  const handleReject = async (request: AccessRequestWithDoctor) => {
    setProcessingId(request.id)
    setProcessingStep("Rejecting request...")

    try {
      await updateAccessRequest(request.id, {
        status: 'denied',
        denial_reason: 'Request denied by patient'
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

          <AccessRequestTable
            requests={requests}
            onApprove={handleApprove}
            onReject={handleReject}
            loading={loading}
            processingId={processingId}
            processingStep={processingStep}
          />
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}