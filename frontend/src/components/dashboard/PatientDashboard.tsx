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
  Upload,
  Users,
  Activity,
  Clock,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Loader2,
  Bell,
  FolderOpen
} from 'lucide-react'
import { fileUploadService, FileMetadata } from '@/services/fileUploadService'
import {
  getAccessRequestsWithDoctor,
  getTransferRequestsForPatient,
  AccessRequestWithDoctor,
  TransferRequestWithNames
} from '@/lib/supabase/helpers'
import { useToast } from '@/components/ui/use-toast'

export default function PatientDashboard() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  // Data states
  const [records, setRecords] = useState<FileMetadata[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequestWithDoctor[]>([])
  const [transferRequests, setTransferRequests] = useState<TransferRequestWithNames[]>([])
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
      const [recordsData, accessData, transferData] = await Promise.all([
        fileUploadService.getPatientFiles(address),
        getAccessRequestsWithDoctor(address.toLowerCase()),
        getTransferRequestsForPatient(address.toLowerCase())
      ])

      setRecords(recordsData || [])
      setAccessRequests(accessData || [])
      setTransferRequests(transferData || [])
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
  const totalDocuments = records.length
  const pendingDirectRequests = accessRequests.filter(r => r.status === 'sent' || r.status === 'draft').length
  const pendingTransferRequests = transferRequests.filter(
    r => r.source_status === 'uploaded' && r.patient_status === 'pending'
  ).length
  const totalPendingRequests = pendingDirectRequests + pendingTransferRequests
  // Count all doctors with access: direct requests + transfer requests
  const activeDoctors = new Set([
    // Doctors from approved direct access requests
    ...accessRequests.filter(r => r.status === 'approved').map(r => r.doctor_wallet),
    // Doctors from approved transfer requests (requesting doctor gains access)
    ...transferRequests.filter(r => r.patient_status === 'approved').map(r => r.requesting_doctor_wallet)
  ]).size

  // Recent activity (requests and records from last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentRecords = records.filter(r => new Date(r.uploadedAt) > sevenDaysAgo).length
  const recentRequests = accessRequests.filter(r => r.created_at && new Date(r.created_at) > sevenDaysAgo).length
  const recentActivity = recentRecords + recentRequests

  // Get recent records (top 5)
  const recentRecordsList = records
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 5)

  // Get pending requests requiring action
  const pendingAccessList = accessRequests
    .filter(r => r.status === 'sent' || r.status === 'draft')
    .slice(0, 3)
  const pendingTransfersList = transferRequests
    .filter(r => r.source_status === 'uploaded' && r.patient_status === 'pending')
    .slice(0, 3)

  // View record handler
  const handleViewRecord = async (record: FileMetadata) => {
    try {
      setViewingId(record.id)
      const blob = await fileUploadService.retrieveFile(record.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10000) // 10 seconds
    } catch (err) {
      console.error('Failed to view record:', err)
      toast({
        title: 'Error',
        description: 'Failed to decrypt and view record',
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

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'lab-result': return 'bg-purple-100 text-purple-700'
      case 'prescription': return 'bg-blue-100 text-blue-700'
      case 'imaging': return 'bg-cyan-100 text-cyan-700'
      case 'discharge-summary': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here&apos;s your health records overview.
          </p>
        </div>
        <Link href="/patient/upload">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all">
            <Upload className="h-4 w-4" />
            Upload New Record
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
              <p className="text-sm font-medium text-blue-700">Total Documents</p>
              <p className="text-3xl font-bold text-blue-900">{totalDocuments}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totalPendingRequests > 0 ? 'from-amber-50 to-amber-100/50 border-amber-200/50' : 'from-gray-50 to-gray-100/50 border-gray-200/50'} hover:shadow-md transition-shadow`}>
          <CardContent className="flex items-center p-6">
            <div className={`p-3 rounded-xl ${totalPendingRequests > 0 ? 'bg-amber-500' : 'bg-gray-400'}`}>
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${totalPendingRequests > 0 ? 'text-amber-700' : 'text-gray-600'}`}>Pending Requests</p>
              <p className={`text-3xl font-bold ${totalPendingRequests > 0 ? 'text-amber-900' : 'text-gray-700'}`}>{totalPendingRequests}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50 hover:shadow-md transition-shadow">
          <CardContent className="flex items-center p-6">
            <div className="p-3 bg-green-600 rounded-xl">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700">Doctors with Access</p>
              <p className="text-3xl font-bold text-green-900">{activeDoctors}</p>
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
        {/* Recent Health Records */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Recent Documents</CardTitle>
              </div>
              <Link href="/patient/records">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>Your most recently uploaded health records</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRecordsList.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No health records yet</p>
                <Link href="/patient/upload">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Your First Record
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecordsList.map(record => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate" title={record.title}>
                          {record.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Badge variant="secondary" className={`text-xs ${getRecordTypeColor(record.recordType)}`}>
                            {record.recordType.replace('-', ' ')}
                          </Badge>
                          <span>•</span>
                          <span>{format(new Date(record.uploadedAt), 'MMM d, yyyy')}</span>
                          <span>•</span>
                          <span>{formatFileSize(record.fileSize)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handleViewRecord(record)}
                      disabled={viewingId === record.id}
                    >
                      {viewingId === record.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">Pending Requests</CardTitle>
                {totalPendingRequests > 0 && (
                  <Badge className="bg-amber-500 text-white">{totalPendingRequests}</Badge>
                )}
              </div>
              <Link href="/patient/requests">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <CardDescription>Requests awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingAccessList.length === 0 && pendingTransfersList.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-gray-500">No pending requests</p>
                <p className="text-sm text-gray-400 mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Direct Access Requests */}
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
                            {request.doctor_name || `Doctor ${request.doctor_wallet.slice(0, 8)}...`}
                          </p>
                          <p className="text-xs text-gray-500">
                            Direct access request • {request.document_names?.length || 0} document(s)
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

                {/* Transfer Requests */}
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
                            Transfer from {request.source_doctor_name || request.source_organization || 'provider'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Transfer
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