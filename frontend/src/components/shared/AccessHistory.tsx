"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Search, X, FileText, ExternalLink, AlertCircle, Info } from "lucide-react"
import { getAccessRequestsWithPatient, AccessRequestWithPatient } from "@/lib/supabase/helpers"

interface AccessHistoryProps {
  walletAddress?: string
}

type StatusFilter = "all" | "pending" | "granted" | "declined" | "expired" | "revoked"

// Helper to determine display status from DB status and dates
// Accepts currentTime as parameter to avoid SSR hydration mismatch
function getDisplayStatus(request: AccessRequestWithPatient, currentTime: Date | null): StatusFilter {
  const expiresAt = request.expires_at ? new Date(request.expires_at) : null

  switch (request.status) {
    case "sent":
    case "draft":
      return "pending"
    case "approved":
      // Only check expiry if we have currentTime (client-side)
      if (currentTime && expiresAt && expiresAt < currentTime) {
        return "expired"
      }
      return "granted"
    case "denied":
      return "declined"
    case "revoked":
      return "revoked"
    case "expired":
      return "expired"
    default:
      return "pending"
  }
}

// Helper to get badge styling
function getStatusBadge(status: StatusFilter) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
    case "granted":
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Access Granted</Badge>
    case "declined":
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Access Declined</Badge>
    case "expired":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Expired</Badge>
    case "revoked":
      return <Badge variant="secondary" className="bg-slate-100 text-slate-800 border-slate-200">Revoked</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// Format wallet address for display
function formatWallet(wallet: string): string {
  if (!wallet) return ""
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

// Format date for display
function formatDate(dateString?: string): string {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  })
}

export default function AccessHistory({ walletAddress }: AccessHistoryProps) {
  const router = useRouter()
  const [requests, setRequests] = useState<AccessRequestWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedRequest, setSelectedRequest] = useState<AccessRequestWithPatient | null>(null)

  // Client-only state for date comparisons (prevents SSR hydration mismatch)
  const [isMounted, setIsMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  // Set mounted state on client
  useEffect(() => {
    setIsMounted(true)
    setCurrentTime(new Date())
  }, [])

  // Fetch data on mount
  useEffect(() => {
    async function fetchHistory() {
      if (!walletAddress) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await getAccessRequestsWithPatient(walletAddress)
        setRequests(data)
      } catch (err) {
        console.error("Error fetching access history:", err)
        setError("Failed to load request history. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [walletAddress])

  // Filter requests based on search and status
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      // Status filter
      if (statusFilter !== "all") {
        const displayStatus = getDisplayStatus(request, currentTime)
        if (displayStatus !== statusFilter) return false
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const patientName = request.patient_name?.toLowerCase() || ""
        const patientWallet = request.patient_wallet.toLowerCase()
        const purpose = request.purpose.toLowerCase()

        if (!patientName.includes(search) &&
          !patientWallet.includes(search) &&
          !purpose.includes(search)) {
          return false
        }
      }

      return true
    })
  }, [requests, statusFilter, searchTerm, currentTime])

  // Calculate statistics (uses client-side currentTime to avoid hydration mismatch)
  const stats = useMemo(() => {
    if (!currentTime) {
      // Return zeros during SSR to avoid hydration mismatch
      return { pending: 0, declined: 0, active: 0, expired: 0, revoked: 0 }
    }
    return {
      pending: requests.filter(r => r.status === "sent" || r.status === "draft").length,
      declined: requests.filter(r => r.status === "denied").length,
      active: requests.filter(r => {
        const expiresAt = r.expires_at ? new Date(r.expires_at) : null
        return r.status === "approved" && expiresAt && expiresAt > currentTime
      }).length,
      expired: requests.filter(r => {
        const expiresAt = r.expires_at ? new Date(r.expires_at) : null
        return (r.status === "approved" && expiresAt && expiresAt <= currentTime) ||
          r.status === "expired"
      }).length,
      revoked: requests.filter(r => r.status === "revoked").length
    }
  }, [requests, currentTime])

  // Handle row click
  const handleRowClick = (request: AccessRequestWithPatient) => {
    const displayStatus = getDisplayStatus(request, currentTime)

    if (displayStatus === "declined") {
      // Show denial reason modal
      setSelectedRequest(request)
    } else if (displayStatus === "granted" && request.requested_record_ids?.length) {
      // Navigate to documents page with record ID
      const recordId = request.requested_record_ids[0]
      router.push(`/doctor/documents?recordId=${recordId}`)
    }
  }

  // Close modal
  const closeModal = () => setSelectedRequest(null)

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </Card>
        <Card className="p-6 animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center border-red-200 bg-red-50">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button
          variant="outline"
          className="border-red-200 hover:bg-red-100 text-red-700"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-700">Pending</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-green-700">Granted</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
            <div className="text-sm text-red-700">Declined</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
            <div className="text-sm text-gray-700">Expired</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-600">{stats.revoked}</div>
            <div className="text-sm text-slate-700">Revoked</div>
          </div>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by patient name, wallet, or reason..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="granted">Granted</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
              <TabsTrigger value="revoked">Revoked</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <h3 className="text-lg font-medium mb-4">Request History</h3>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Patient</th>
                <th className="text-left py-3 px-4">Document</th>
                <th className="text-left py-3 px-4 w-10">Reason</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Requested</th>
                <th className="text-left py-3 px-4">Expires</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const displayStatus = getDisplayStatus(request, currentTime)
                const isClickable = displayStatus === "granted" || displayStatus === "declined"

                return (
                  <tr
                    key={request.id}
                    className={`border-b hover:bg-gray-50 ${isClickable ? "cursor-pointer" : ""}`}
                    onClick={() => isClickable && handleRowClick(request)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <p className="font-medium">
                          {request.patient_name || formatWallet(request.patient_wallet)}
                        </p>
                        <span className="text-xs text-gray-500 font-mono">
                          {formatWallet(request.patient_wallet)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {request.document_names && request.document_names.length > 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {displayStatus === "granted" && request.requested_record_ids?.length ? (
                                <Link
                                  href={`/doctor/documents?highlightId=${request.requested_record_ids[0]}`}
                                  prefetch={false}
                                  className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors group"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-4 w-4 text-blue-500 flex-shrink-0 group-hover:text-blue-600" />
                                  <span className="text-sm text-gray-700 truncate max-w-[150px] group-hover:text-blue-600 group-hover:underline">
                                    {request.document_names.length === 1
                                      ? request.document_names[0]
                                      : `${request.document_names.length} documents`}
                                  </span>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-2 cursor-help">
                                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-500 truncate max-w-[150px]">
                                    {request.document_names.length === 1
                                      ? request.document_names[0]
                                      : `${request.document_names.length} documents`}
                                  </span>
                                </div>
                              )}
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              {displayStatus === "granted" && (
                                <p className="text-xs text-gray-500 mb-1">Click to view in Documents</p>
                              )}
                              <div className="space-y-1">
                                {request.document_names.map((name, idx) => (
                                  <p key={idx} className="text-sm">{name}</p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                              <Info className="h-4 w-4 text-gray-500" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-md">
                            <p className="text-sm break-words">{request.purpose || "No reason provided"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(displayStatus)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(request.sent_at || request.created_at)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(request.expires_at)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "No requests match your filters"
                : "No request history found"}
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setSearchTerm(""); setStatusFilter("all") }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Denial Reason Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
          <Card className="max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Request Declined</h3>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Patient</p>
                <p className="font-medium">
                  {selectedRequest.patient_name || "Unknown"}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {selectedRequest.patient_wallet}
                </p>
              </div>

              {selectedRequest.document_names && selectedRequest.document_names.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Document</p>
                  <div className="space-y-1">
                    {selectedRequest.document_names.map((name, idx) => (
                      <p key={idx} className="text-gray-700 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        {name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Your Request</p>
                <div className="max-h-24 overflow-y-auto bg-gray-50 rounded-md p-2">
                  <p className="text-gray-700 break-words whitespace-pre-wrap text-sm">{selectedRequest.purpose}</p>
                </div>
              </div>

              {selectedRequest.denial_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 font-medium mb-1">Reason for Decline</p>
                  <div className="max-h-24 overflow-y-auto">
                    <p className="text-red-700 break-words whitespace-pre-wrap text-sm">{selectedRequest.denial_reason}</p>
                  </div>
                </div>
              )}

              {selectedRequest.patient_response && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 font-medium mb-1">Patient Response</p>
                  <p className="text-gray-700">{selectedRequest.patient_response}</p>
                </div>
              )}

              {!selectedRequest.denial_reason && !selectedRequest.patient_response && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-500 text-sm">No reason was provided by the patient.</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                <p>Declined on: {formatDate(selectedRequest.responded_at)}</p>
              </div>
            </div>

            <div className="mt-6">
              <Button onClick={closeModal} className="w-full">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}