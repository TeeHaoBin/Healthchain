'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  UserCheck, 
  Shield, 
  Activity,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react'

interface Doctor {
  id: string
  name: string
  email: string
  specialization: string
  hospital: string
  licenseNumber: string
  verificationStatus: 'pending' | 'verified' | 'rejected'
  submitDate: string
  documents: string[]
}

interface SystemStats {
  totalUsers: number
  totalDoctors: number
  totalPatients: number
  pendingVerifications: number
  totalRecords: number
  recentActivity: number
}

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    pendingVerifications: 0,
    totalRecords: 0,
    recentActivity: 0
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Mock data - replace with actual API calls
    setDoctors([
      {
        id: '1',
        name: 'Dr. Sarah Wilson',
        email: 'sarah.wilson@hospital.com',
        specialization: 'Cardiology',
        hospital: 'City General Hospital',
        licenseNumber: 'MD-2024-001',
        verificationStatus: 'pending',
        submitDate: '2024-01-16',
        documents: ['medical_license.pdf', 'hospital_verification.pdf', 'id_document.pdf']
      },
      {
        id: '2',
        name: 'Dr. Michael Chen',
        email: 'michael.chen@medcenter.com',
        specialization: 'Neurology',
        hospital: 'Specialist Care Center',
        licenseNumber: 'MD-2024-002',
        verificationStatus: 'pending',
        submitDate: '2024-01-15',
        documents: ['medical_license.pdf', 'specialization_cert.pdf']
      },
      {
        id: '3',
        name: 'Dr. Emily Rodriguez',
        email: 'emily.rodriguez@clinic.com',
        specialization: 'Pediatrics',
        hospital: 'Children\'s Medical Clinic',
        licenseNumber: 'MD-2024-003',
        verificationStatus: 'verified',
        submitDate: '2024-01-10',
        documents: ['medical_license.pdf', 'hospital_verification.pdf']
      }
    ])

    setStats({
      totalUsers: 156,
      totalDoctors: 23,
      totalPatients: 133,
      pendingVerifications: 2,
      totalRecords: 1247,
      recentActivity: 18
    })
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <AlertTriangle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleVerifyDoctor = (doctorId: string, action: 'verify' | 'reject') => {
    setDoctors(prev => prev.map(doctor => 
      doctor.id === doctorId 
        ? { ...doctor, verificationStatus: action === 'verify' ? 'verified' : 'rejected' }
        : doctor
    ))
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System administration and user management</p>
        </div>
        <Button className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <p className="text-xs font-medium text-gray-600">Doctors</p>
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

        <Card>
          <CardContent className="flex items-center p-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Pending</p>
              <p className="text-xl font-bold text-gray-900">{stats.pendingVerifications}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Shield className="h-6 w-6 text-indigo-600" />
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Records</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalRecords}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <Activity className="h-6 w-6 text-red-600" />
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Activity</p>
              <p className="text-xl font-bold text-gray-900">{stats.recentActivity}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Verification Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Doctor Verification Queue
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{doctor.name}</h3>
                      <Badge className={getStatusColor(doctor.verificationStatus)}>
                        {getStatusIcon(doctor.verificationStatus)}
                        <span className="ml-1">{doctor.verificationStatus}</span>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p><strong>Email:</strong> {doctor.email}</p>
                        <p><strong>Specialization:</strong> {doctor.specialization}</p>
                        <p><strong>Hospital:</strong> {doctor.hospital}</p>
                      </div>
                      <div>
                        <p><strong>License:</strong> {doctor.licenseNumber}</p>
                        <p><strong>Submitted:</strong> {doctor.submitDate}</p>
                        <p><strong>Documents:</strong> {doctor.documents.length} files</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm text-gray-600">Documents:</span>
                      {doctor.documents.map((doc, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Review
                    </Button>
                    
                    {doctor.verificationStatus === 'pending' && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={() => handleVerifyDoctor(doctor.id, 'verify')}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Verify
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleVerifyDoctor(doctor.id, 'reject')}
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 border-l-4 border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="text-sm">
                  <p className="font-medium">Dr. Emily Rodriguez verified</p>
                  <p className="text-gray-600">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 border-l-4 border-blue-500 bg-blue-50">
                <Users className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium">New patient registration: John Doe</p>
                  <p className="text-gray-600">3 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 border-l-4 border-yellow-500 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <div className="text-sm">
                  <p className="font-medium">Doctor verification pending: Dr. Michael Chen</p>
                  <p className="text-gray-600">5 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database Status</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">IPFS Network</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Blockchain Sync</span>
                <Badge className="bg-green-100 text-green-800">Synced</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response Time</span>
                <Badge className="bg-yellow-100 text-yellow-800">245ms</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}