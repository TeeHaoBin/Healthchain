"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount } from "wagmi"
import { format, formatDistanceToNow } from "date-fns"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useRole } from "@/hooks/useRole"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  Shield,
  Wallet,
  Clock,
  AlertCircle,
  Heart,
  Users,
  Copy,
  Check,
  Building,
  Award,
  Stethoscope,
  Pencil,
  X,
  Save,
  Loader2
} from "lucide-react"
import {
  getUserByWallet,
  getPatientProfile,
  getDoctorProfile,
  updateUser,
  updatePatientProfile,
  User as UserType,
  PatientProfile,
  DoctorProfile
} from "@/lib/supabase/helpers"

// Form data interfaces
interface PersonalInfoForm {
  full_name: string
  email: string
  phone_number: string
  date_of_birth: string
  preferred_language: string
}

interface EmergencyContactForm {
  emergency_contact_name: string
  emergency_contact_phone: string
}

interface HealthFlagsForm {
  has_allergies: boolean
  has_chronic_conditions: boolean
}

export default function ProfilePage() {
  const { role, isAuthenticated } = useRole()
  const { address, isConnected } = useAccount()
  const { toast } = useToast()

  const [user, setUser] = useState<UserType | null>(null)
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null)
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Edit mode states
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingEmergency, setEditingEmergency] = useState(false)
  const [editingHealth, setEditingHealth] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states
  const [personalForm, setPersonalForm] = useState<PersonalInfoForm>({
    full_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    preferred_language: 'en'
  })
  const [emergencyForm, setEmergencyForm] = useState<EmergencyContactForm>({
    emergency_contact_name: '',
    emergency_contact_phone: ''
  })
  const [healthForm, setHealthForm] = useState<HealthFlagsForm>({
    has_allergies: false,
    has_chronic_conditions: false
  })

  const fetchProfileData = useCallback(async () => {
    if (!isConnected || !address) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const userData = await getUserByWallet(address)
      setUser(userData)

      if (userData) {
        // Initialize personal form with user data
        setPersonalForm({
          full_name: userData.full_name || '',
          email: userData.email || '',
          phone_number: (userData as any).phone_number || '',
          date_of_birth: '',
          preferred_language: 'en'
        })

        if (userData.role === 'patient') {
          const profile = await getPatientProfile(userData.id)
          setPatientProfile(profile)

          // Initialize forms with patient profile data
          if (profile) {
            setPersonalForm(prev => ({
              ...prev,
              date_of_birth: profile.date_of_birth || '',
              preferred_language: profile.preferred_language || 'en'
            }))
            setEmergencyForm({
              emergency_contact_name: profile.emergency_contact_name || '',
              emergency_contact_phone: profile.emergency_contact_phone || ''
            })
            setHealthForm({
              has_allergies: profile.has_allergies || false,
              has_chronic_conditions: profile.has_chronic_conditions || false
            })
          }
        } else if (userData.role === 'doctor') {
          const profile = await getDoctorProfile(userData.id)
          setDoctorProfile(profile)
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [address, isConnected, toast])

  useEffect(() => {
    fetchProfileData()
  }, [fetchProfileData])

  const copyWalletAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast({
        title: 'Copied!',
        description: 'Wallet address copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatWalletDisplay = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
  }

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      ar: 'Arabic'
    }
    return languages[code] || code
  }

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200'
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Cancel editing functions
  const cancelPersonalEdit = () => {
    setPersonalForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone_number: (user as any)?.phone_number || '',
      date_of_birth: patientProfile?.date_of_birth || '',
      preferred_language: patientProfile?.preferred_language || 'en'
    })
    setEditingPersonal(false)
  }

  const cancelEmergencyEdit = () => {
    setEmergencyForm({
      emergency_contact_name: patientProfile?.emergency_contact_name || '',
      emergency_contact_phone: patientProfile?.emergency_contact_phone || ''
    })
    setEditingEmergency(false)
  }

  const cancelHealthEdit = () => {
    setHealthForm({
      has_allergies: patientProfile?.has_allergies || false,
      has_chronic_conditions: patientProfile?.has_chronic_conditions || false
    })
    setEditingHealth(false)
  }

  // Save functions
  const savePersonalInfo = async () => {
    if (!user || !address) return

    setSaving(true)
    try {
      // Update user table (name, email, phone)
      const updatedUser = await updateUser(address, {
        full_name: personalForm.full_name,
        email: personalForm.email,
        phone_number: personalForm.phone_number
      } as any)

      if (!updatedUser) {
        throw new Error('Failed to update user info')
      }

      // Update patient profile (DOB, language) if patient
      if (role === 'patient' && user.id) {
        const profileUpdate = await updatePatientProfile(user.id, {
          date_of_birth: personalForm.date_of_birth || undefined,
          preferred_language: personalForm.preferred_language
        })

        if (profileUpdate) {
          setPatientProfile(profileUpdate)
        }
      }

      setUser(updatedUser)
      setEditingPersonal(false)
      toast({
        title: 'Success',
        description: 'Personal information updated successfully',
      })
    } catch (error) {
      console.error('Failed to save personal info:', error)
      toast({
        title: 'Error',
        description: 'Failed to update personal information',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveEmergencyContact = async () => {
    if (!user) return

    setSaving(true)
    try {
      const updated = await updatePatientProfile(user.id, {
        emergency_contact_name: emergencyForm.emergency_contact_name || undefined,
        emergency_contact_phone: emergencyForm.emergency_contact_phone || undefined
      })

      if (!updated) {
        throw new Error('Failed to update emergency contact')
      }

      setPatientProfile(updated)
      setEditingEmergency(false)
      toast({
        title: 'Success',
        description: 'Emergency contact updated successfully',
      })
    } catch (error) {
      console.error('Failed to save emergency contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to update emergency contact',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveHealthFlags = async () => {
    if (!user) return

    setSaving(true)
    try {
      const updated = await updatePatientProfile(user.id, {
        has_allergies: healthForm.has_allergies,
        has_chronic_conditions: healthForm.has_chronic_conditions
      })

      if (!updated) {
        throw new Error('Failed to update health flags')
      }

      setPatientProfile(updated)
      setEditingHealth(false)
      toast({
        title: 'Success',
        description: 'Health flags updated successfully',
      })
    } catch (error) {
      console.error('Failed to save health flags:', error)
      toast({
        title: 'Error',
        description: 'Failed to update health flags',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-32 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Profile Not Found</h2>
          <p className="text-gray-500">Please connect your wallet and complete registration.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">
            View and manage your profile information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                    <CardDescription>Your basic profile details</CardDescription>
                  </div>
                </div>
                {!editingPersonal ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPersonal(true)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelPersonalEdit}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={savePersonalInfo}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Full Name */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Full Name</span>
                  </div>
                  {editingPersonal ? (
                    <Input
                      value={personalForm.full_name}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-48 h-8 text-sm"
                      placeholder="Enter full name"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{user.full_name || 'Not provided'}</span>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  {editingPersonal ? (
                    <Input
                      type="email"
                      value={personalForm.email}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-48 h-8 text-sm"
                      placeholder="Enter email"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{user.email || 'Not provided'}</span>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">Phone</span>
                  </div>
                  {editingPersonal ? (
                    <Input
                      type="tel"
                      value={personalForm.phone_number}
                      onChange={(e) => setPersonalForm(prev => ({ ...prev, phone_number: e.target.value }))}
                      className="w-48 h-8 text-sm"
                      placeholder="Enter phone"
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{(user as any).phone_number || 'Not provided'}</span>
                  )}
                </div>

                {/* Patient-specific fields */}
                {role === 'patient' && (
                  <>
                    {/* Date of Birth */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Date of Birth</span>
                      </div>
                      {editingPersonal ? (
                        <Input
                          type="date"
                          value={personalForm.date_of_birth}
                          onChange={(e) => setPersonalForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                          className="w-48 h-8 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">
                          {patientProfile?.date_of_birth
                            ? format(new Date(patientProfile.date_of_birth), 'MMMM d, yyyy')
                            : 'Not provided'}
                        </span>
                      )}
                    </div>

                    {/* Preferred Language */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Globe className="h-4 w-4" />
                        <span className="text-sm">Preferred Language</span>
                      </div>
                      {editingPersonal ? (
                        <select
                          value={personalForm.preferred_language}
                          onChange={(e) => setPersonalForm(prev => ({ ...prev, preferred_language: e.target.value }))}
                          className="w-48 h-8 text-sm px-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                          <option value="zh">Chinese</option>
                          <option value="ja">Japanese</option>
                          <option value="ko">Korean</option>
                          <option value="ar">Arabic</option>
                        </select>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {patientProfile ? getLanguageName(patientProfile.preferred_language) : 'Not provided'}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact (Patient Only) */}
          {role === 'patient' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Users className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Emergency Contact</CardTitle>
                      <CardDescription>Contact in case of emergency</CardDescription>
                    </div>
                  </div>
                  {!editingEmergency ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingEmergency(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEmergencyEdit}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveEmergencyContact}
                        disabled={saving}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Contact Name */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4" />
                      <span className="text-sm">Contact Name</span>
                    </div>
                    {editingEmergency ? (
                      <Input
                        value={emergencyForm.emergency_contact_name}
                        onChange={(e) => setEmergencyForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                        className="w-48 h-8 text-sm"
                        placeholder="Enter contact name"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">
                        {patientProfile?.emergency_contact_name || 'Not provided'}
                      </span>
                    )}
                  </div>

                  {/* Contact Phone */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">Contact Phone</span>
                    </div>
                    {editingEmergency ? (
                      <Input
                        type="tel"
                        value={emergencyForm.emergency_contact_phone}
                        onChange={(e) => setEmergencyForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                        className="w-48 h-8 text-sm"
                        placeholder="Enter contact phone"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">
                        {patientProfile?.emergency_contact_phone || 'Not provided'}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Doctor Professional Info */}
          {role === 'doctor' && doctorProfile && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Stethoscope className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Professional Information</CardTitle>
                    <CardDescription>Your medical credentials</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Award className="h-4 w-4" />
                      <span className="text-sm">License Number</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {doctorProfile.license_number || 'Not provided'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Stethoscope className="h-4 w-4" />
                      <span className="text-sm">Specialization</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {doctorProfile.specialization || 'Not provided'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="h-4 w-4" />
                      <span className="text-sm">Hospital/Clinic</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {doctorProfile.hospital_name || 'Not provided'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm">Verification Status</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={getVerificationStatusColor(doctorProfile.verification_status)}
                    >
                      {doctorProfile.verification_status.charAt(0).toUpperCase() + doctorProfile.verification_status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Health Flags (Patient Only) */}
          {role === 'patient' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Heart className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Health Flags</CardTitle>
                      <CardDescription>Important health indicators</CardDescription>
                    </div>
                  </div>
                  {!editingHealth ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingHealth(true)}
                      className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelHealthEdit}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveHealthFlags}
                        disabled={saving}
                        className="bg-pink-600 hover:bg-pink-700"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingHealth ? (
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={healthForm.has_allergies}
                        onChange={(e) => setHealthForm(prev => ({ ...prev, has_allergies: e.target.checked }))}
                        className="h-4 w-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">I have known allergies</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={healthForm.has_chronic_conditions}
                        onChange={(e) => setHealthForm(prev => ({ ...prev, has_chronic_conditions: e.target.checked }))}
                        className="h-4 w-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">I have chronic conditions</span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Badge
                      variant="outline"
                      className={patientProfile?.has_allergies
                        ? 'bg-amber-100 text-amber-700 border-amber-200 px-4 py-2'
                        : 'bg-green-100 text-green-700 border-green-200 px-4 py-2'
                      }
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {patientProfile?.has_allergies ? 'Has Known Allergies' : 'No Known Allergies'}
                    </Badge>

                    <Badge
                      variant="outline"
                      className={patientProfile?.has_chronic_conditions
                        ? 'bg-amber-100 text-amber-700 border-amber-200 px-4 py-2'
                        : 'bg-green-100 text-green-700 border-green-200 px-4 py-2'
                      }
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      {patientProfile?.has_chronic_conditions ? 'Has Chronic Conditions' : 'No Chronic Conditions'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Account & Security */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Account & Security</CardTitle>
                  <CardDescription>Your account details and security info</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Role</span>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {role}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm">Wallet Address</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                      {address ? formatWalletDisplay(address) : 'Not connected'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={copyWalletAddress}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Member Since</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {format(new Date(user.created_at), 'MMMM yyyy')}
                    <span className="text-gray-500 text-sm ml-1">
                      ({formatDistanceToNow(new Date(user.created_at), { addSuffix: false })})
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Last Login</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {(user as any).last_login
                      ? formatDistanceToNow(new Date((user as any).last_login), { addSuffix: true })
                      : 'Current session'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}