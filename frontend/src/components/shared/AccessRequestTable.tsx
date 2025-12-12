"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Search, FileText, AlertCircle } from "lucide-react"
import { AccessRequestWithDoctor } from "@/lib/supabase/helpers"

interface AccessRequestTableProps {
  requests: AccessRequestWithDoctor[]
  onApprove?: (request: AccessRequestWithDoctor) => void
  onReject?: (request: AccessRequestWithDoctor) => void
  loading?: boolean
  processingId?: string | null
  processingStep?: string
}

type StatusFilter = "all" | "pending" | "approved" | "declined"

// Helper to normalize DB status to display status
function getDisplayStatus(status: string): StatusFilter {
  switch (status) {
    case "sent":
    case "draft":
      return "pending"
    case "approved":
      return "approved"
    case "denied":
    case "rejected":
      return "declined"
    default:
      return "pending"
  }
}

// Helper to get badge styling
function getStatusBadge(status: string) {
  const displayStatus = getDisplayStatus(status)
  switch (displayStatus) {
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
    case "approved":
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>
    case "declined":
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Declined</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// Format wallet address for display
function formatWallet(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

// Format date for display
function formatDate(dateString?: string): string {
  if (!dateString) return "—"
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  } catch {
    return "—"
  }
}

export default function AccessRequestTable({
  requests,
  onApprove,
  onReject,
  loading = false,
  processingId = null,
  processingStep = ""
}: AccessRequestTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")

  // Filter requests based on search and status
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      // Status filter
      if (statusFilter !== "all") {
        const displayStatus = getDisplayStatus(request.status)
        if (displayStatus !== statusFilter) return false
      }

      // Search filter (doctor name or wallet)
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const doctorName = request.doctor_name?.toLowerCase() || ""
        const doctorWallet = request.doctor_wallet.toLowerCase()
        const purpose = request.purpose.toLowerCase()

        if (!doctorName.includes(search) &&
          !doctorWallet.includes(search) &&
          !purpose.includes(search)) {
          return false
        }
      }

      return true
    })
  }, [requests, statusFilter, searchTerm])

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      pending: requests.filter(r => getDisplayStatus(r.status) === "pending").length,
      approved: requests.filter(r => getDisplayStatus(r.status) === "approved").length,
      declined: requests.filter(r => getDisplayStatus(r.status) === "declined").length,
      total: requests.length
    }
  }, [requests])

  // Determine if Actions column should be shown
  const showActionsColumn = statusFilter === "all" || statusFilter === "pending"

  // Check if status is pending
  const isPending = (status: string) => getDisplayStatus(status) === "pending"

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

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-700">Pending</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-green-700">Approved</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
            <div className="text-sm text-red-700">Declined</div>
          </div>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by doctor name, wallet, or reason..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <h3 className="text-lg font-medium mb-4">Access Requests</h3>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Doctor</th>
                <th className="text-left py-3 px-4">Wallet Address</th>
                <th className="text-left py-3 px-4">Reason</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Requested</th>
                <th className="text-left py-3 px-4">Expires</th>
                {showActionsColumn && <th className="text-left py-3 px-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <p className="font-medium">
                        {request.doctor_name || formatWallet(request.doctor_wallet)}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 font-mono">
                      {formatWallet(request.doctor_wallet)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-gray-700 max-w-xs truncate" title={request.purpose}>
                      {request.purpose}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(request.status)}
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
                  {showActionsColumn && (
                    <td className="py-3 px-4">
                      {processingId === request.id ? (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="max-w-[150px] truncate">{processingStep || "Processing..."}</span>
                        </div>
                      ) : isPending(request.status) ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => onApprove?.(request)}
                            disabled={!!processingId}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => onReject?.(request)}
                            disabled={!!processingId}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "No requests match your filters"
                : "No access requests found"}
            </p>
            {(searchTerm || statusFilter !== "pending") && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setSearchTerm(""); setStatusFilter("pending") }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}