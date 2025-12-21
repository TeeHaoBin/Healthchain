'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { format } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Users,
  Activity,
  Clock,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Loader2,
  Bell,
  FolderOpen,
  Send
} from 'lucide-react'
import { fileUploadService, FileMetadata } from '@/services/fileUploadService'
import {
  getAccessRequestsWithPatient,
  getTransferRequestsForSourceDoctor,
  getTransferRequestsForRequestingDoctor,
  AccessRequestWithPatient,
  TransferRequestWithNames
} from '@/lib/supabase/helpers'
import { useToast } from '@/components/ui/use-toast'

export default function DoctorDashboard() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  // Data states
  const [documents, setDocuments] = useState<FileMetadata[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequestWithPatient[]>([])
  const [incomingTransfers, setIncomingTransfers] = useState<TransferRequestWithNames[]>([])
  const [outgoingTransfers, setOutgoingTransfers] = useState<TransferRequestWithNames[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingId, setViewingId] = useState<string | null>(null)

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!isConnected || !address) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Fetch all data in parallel
      const [docsData, accessData, incomingData, outgoingData] = await Promise.all([
        fileUploadService.getDoctorAccessibleFiles(address),
        getAccessRequestsWithPatient(address.toLowerCase()),
        getTransferRequestsForSourceDoctor(address.toLowerCase()),
        getTransferRequestsForRequestingDoctor(address.toLowerCase())
      ])

      setDocuments(docsData || [])
      setAccessRequests(accessData || [])
      setIncomingTransfers(incomingData || [])
      setOutgoingTransfers(outgoingData || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [address, isConnected, toast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Calculate statistics
  const totalDocuments = documents.length
  const pendingRequests = accessRequests.filter(r => r.status === 'sent' || r.status === 'draft').length
  const pendingIncomingTransfers = incomingTransfers.filter(r => r.source_status === 'awaiting_upload').length
  const totalPendingActions = pendingRequests + pendingIncomingTransfers

  // Active patients: unique patients with approved access (from direct requests OR transfers)
  const activePatients = new Set([
    // From direct access requests
    ...accessRequests
      .filter(r => r.status === 'approved')
      .map(r => r.patient_wallet),
    // From transfers where this doctor received documents (granted + patient approved)
    ...outgoingTransfers
      .filter(r => r.source_status === 'granted' && r.patient_status === 'approved')
      .map(r => r.patient_wallet)
  ]).size

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentDocs = documents.filter(d => new Date(d.uploadedAt) > sevenDaysAgo).length
  const recentRequests = accessRequests.filter(r => r.created_at && new Date(r.created_at) > sevenDaysAgo).length
  const recentActivity = recentDocs + recentRequests

  // Get recent documents (top 5)
  const recentDocsList = documents
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 5)

  // Get pending actions requiring attention
  const pendingAccessList = accessRequests
    .filter(r => r.status === 'sent' || r.status === 'draft')
    .slice(0, 3)
  const pendingTransfersList = incomingTransfers
    .filter(r => r.source_status === 'awaiting_upload')
    .slice(0, 3)

  // View document handler
  const handleViewDocument = async (doc: FileMetadata) => {
    try {
      setViewingId(doc.id)
      const blob = await fileUploadService.retrieveFile(doc.id)
      const url = URL.createObjectURL(blob)

      // Use anchor element for more reliable file handling
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.download = doc.title || 'health-document'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      console.error('Failed to view document:', err)
      toast({
        title: 'Error',
        description: 'Failed to decrypt and view document',
        variant: 'destructive',
      })
    } finally {
      setViewingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileTypeBadge = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return { label: 'PDF', className: 'bg-red-100 text-red-700' }
    if (mimeType?.includes('dicom') || mimeType?.includes('application/dicom')) return { label: 'DICOM', className: 'bg-purple-100 text-purple-700' }
    if (mimeType?.startsWith('image/')) return { label: 'Image', className: 'bg-cyan-100 text-cyan-700' }
    return { label: 'File', className: 'bg-gray-100 text-gray-700' }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage patient records and access requests.
          </p>
        </div>
        <Link href="/doctor/request">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all">
            <Send className="h-4 w-4" />
            Request Patient Access
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-blue-600 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-700">Documents Accessible</p>
              <p className="text-3xl font-bold text-blue-900">{totalDocuments}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totalPendingActions > 0 ? 'from-amber-50 to-amber-100/50 border-amber-200/50' : 'from-gray-50 to-gray-100/50 border-gray-200/50'} hover:shadow-md transition-shadow`}>
          <CardContent className="flex items-center p-6">
            <div className={`p-3 rounded-xl ${totalPendingActions > 0 ? 'bg-amber-500' : 'bg-gray-400'}`}>
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${totalPendingActions > 0 ? 'text-amber-700' : 'text-gray-600'}`}>Pending Actions</p>
              <p className={`text-3xl font-bold ${totalPendingActions > 0 ? 'text-amber-900' : 'text-gray-700'}`}>{totalPendingActions}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50 hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-600 rounded-xl">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700">Active Patients</p>
              <p className="text-3xl font-bold text-green-900">{activePatients}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50 hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-purple-600 rounded-xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-700">This Week</p>
              <p className="text-3xl font-bold text-purple-900">{recentActivity}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Recent Documents</CardTitle>
              </div>
              <Link href="/doctor/documents">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>Patient documents you can access</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocsList.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No documents accessible yet</p>
                <Link href="/doctor/request">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Send className="h-4 w-4" />
                    Request Patient Access
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocsList.map(doc => {
                  const fileType = getFileTypeBadge(doc.fileType)
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate" title={doc.title}>
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge variant="secondary" className={`text-xs ${fileType.className}`}>
                              {fileType.label}
                            </Badge>
                            <span>•</span>
                            <span>{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</span>
                            <span>•</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleViewDocument(doc)}
                        disabled={viewingId === doc.id}
                      >
                        {viewingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">Pending Actions</CardTitle>
                {totalPendingActions > 0 && (
                  <Badge className="bg-amber-500 text-white">{totalPendingActions}</Badge>
                )}
              </div>
              <Link href="/doctor/history">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>Requests awaiting your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingAccessList.length === 0 && pendingTransfersList.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-gray-500">No pending actions</p>
                <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pending Access Requests (awaiting patient approval) */}
                {pendingAccessList.map(request => (
                  <div
                    key={request.id}
                    className="p-3 rounded-lg border border-amber-200 bg-amber-50/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg border border-amber-200">
                          <Users className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {request.patient_name || `Patient ${request.patient_wallet.slice(0, 8)}...`}
                          </p>
                          <p className="text-xs text-gray-500">
                            Access request • {request.document_names?.length || 0} document(s)
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </div>
                ))}

                {/* Incoming Transfer Requests (need to upload) */}
                {pendingTransfersList.map(request => (
                  <div
                    key={request.id}
                    className="p-3 rounded-lg border border-purple-200 bg-purple-50/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg border border-purple-200">
                          <ArrowRight className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {request.requesting_doctor_name || `Doctor ${request.requesting_doctor_wallet.slice(0, 8)}...`}
                          </p>
                          <p className="text-xs text-gray-500">
                            Transfer request for {request.patient_name || 'patient'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Upload
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}