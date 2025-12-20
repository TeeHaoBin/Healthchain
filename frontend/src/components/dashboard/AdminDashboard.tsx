'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserCheck,
  Shield,
  Eye,
  AlertTriangle,
  FileText,
  Loader2,
  ArrowRight
} from 'lucide-react'
import {
  getAdminStats,
  getPendingDoctorVerifications,
  AdminStats
} from '@/lib/supabase/helpers'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

interface PendingDoctor {
  id: string
  license_number?: string
  specialization?: string
  hospital_name?: string
  verification_status: string
  created_at: string
  user: {
    id: string
    wallet_address: string
    email?: string
    full_name?: string
  }
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([])
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    pendingVerifications: 0,
    totalRecords: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [statsData, pendingData] = await Promise.all([
        getAdminStats(),
        getPendingDoctorVerifications()
      ])

      setStats(statsData)
      setPendingDoctors(pendingData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">System overview and quick access</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="h-6 w-6 text-blue-600" />
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total Users</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <UserCheck className="h-6 w-6 text-green-600" />
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Verified Doctors</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalDoctors}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Users className="h-6 w-6 text-purple-600" />
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Patients</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.pendingVerifications > 0 ? "ring-2 ring-yellow-400" : ""}>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className={`h-6 w-6 ${stats.pendingVerifications > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Pending Verification</p>
              <p className={`text-xl font-bold ${stats.pendingVerifications > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                {stats.pendingVerifications}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <FileText className="h-6 w-6 text-indigo-600" />
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Records</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalRecords}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verifications Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Pending Verifications
              {stats.pendingVerifications > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                  {stats.pendingVerifications}
                </Badge>
              )}
            </CardTitle>
            <Link href="/admin/verify">
              <Button className="flex items-center gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {pendingDoctors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No pending doctor verifications</p>
              <p className="text-sm mt-1">All doctors have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDoctors.slice(0, 3).map((doctor) => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {doctor.user?.full_name || 'Unknown Doctor'}
                      </h3>
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                        Pending
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{doctor.specialization || 'No specialization'}</span>
                      <span>•</span>
                      <span>{doctor.hospital_name || 'No organization'}</span>
                    </div>
                  </div>

                  <Link href="/admin/verify">
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                </div>
              ))}

              {pendingDoctors.length > 3 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-500">
                    +{pendingDoctors.length - 3} more pending verifications
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}