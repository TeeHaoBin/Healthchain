'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { User, Stethoscope } from 'lucide-react'
import { createUser, createDoctorProfile, createPatientProfile } from '@/lib/supabase/helpers'

type UserRole = 'patient' | 'doctor'

interface KYCFormData {
  role: UserRole
  fullName: string
  email: string
  phoneNumber: string
  // Patient-specific fields
  dateOfBirth?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  hasAllergies?: boolean
  hasChronicConditions?: boolean
  preferredLanguage?: string
  // Doctor-specific fields
  licenseNumber?: string
  specialization?: string
  hospitalAffiliation?: string
}

interface KYCFormProps {
  onComplete?: () => void
}

export default function KYCForm({ onComplete }: KYCFormProps) {
  const { address, isConnected } = useAccount()
  const [formData, setFormData] = useState<KYCFormData>({
    role: 'patient',
    fullName: '',
    email: '',
    phoneNumber: '',
    // Patient defaults
    hasAllergies: false,
    hasChronicConditions: false,
    preferredLanguage: 'en'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRoleSelect = (role: UserRole) => {
    setFormData({ ...formData, role })
  }

  const handleInputChange = (field: keyof KYCFormData, value: string) => {
    // Handle boolean fields for checkboxes
    if (field === 'hasAllergies' || field === 'hasChronicConditions') {
      setFormData({ ...formData, [field]: value === 'true' })
    } else {
      setFormData({ ...formData, [field]: value })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !address) return

    setIsSubmitting(true)
    try {
      console.log('Submitting KYC data:', { ...formData, walletAddress: address })
      console.log('Supabase URL configured:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Supabase Anon Key configured:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      // Create user in Supabase
      const userData = await createUser({
        wallet_address: address,
        email: formData.email,
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        role: formData.role
      })

      if (!userData) {
        throw new Error('Failed to create user account')
      }

      // Create role-specific profile
      if (formData.role === 'doctor') {
        const doctorProfile = await createDoctorProfile({
          user_id: userData.id,
          license_number: formData.licenseNumber,
          specialization: formData.specialization,
          hospital_name: formData.hospitalAffiliation
        })

        if (!doctorProfile) {
          throw new Error('Failed to create doctor profile')
        }
      } else if (formData.role === 'patient') {
        const patientProfile = await createPatientProfile({
          user_id: userData.id,
          date_of_birth: formData.dateOfBirth,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          has_allergies: formData.hasAllergies,
          has_chronic_conditions: formData.hasChronicConditions,
          preferred_language: formData.preferredLanguage
        })

        if (!patientProfile) {
          throw new Error('Failed to create patient profile')
        }
      }

      console.log('🎉 KYC data saved successfully!')

      // Call the onComplete callback to notify parent component
      if (onComplete) {
        console.log('🔄 Calling onComplete callback')
        console.log('🔄 onComplete function type:', typeof onComplete)
        onComplete()
        console.log('🔄 onComplete callback finished')
      } else {
        // Fallback: direct redirect if no callback provided
        console.log('🔄 No callback provided, doing direct redirect')
        const dashboardPath = formData.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'
        window.location.href = dashboardPath
      }
    } catch (error) {
      console.error('KYC submission failed:', error)
      alert('Failed to submit KYC data. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please connect your wallet first</p>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>
          Help us verify your identity and set up your healthcare access
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Role Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Your Role
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { role: 'patient' as UserRole, icon: User, label: 'Patient', desc: 'Manage your health records' },
              { role: 'doctor' as UserRole, icon: Stethoscope, label: 'Doctor', desc: 'Access patient records' }
            ].map(({ role, icon: Icon, label, desc }) => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleSelect(role)}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${formData.role === role
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <Icon className="h-6 w-6 mb-2 text-blue-600" />
                <h3 className="font-medium text-gray-900">{label}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name {formData.role === 'doctor' && <span className="text-blue-600 font-normal">(include title, e.g., Dr.)</span>} *
              </label>
              <Input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder={formData.role === 'doctor' ? "e.g., Dr. John Smith" : "Enter your full name"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <Input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
          </div>

          {/* Patient-specific fields */}
          {formData.role === 'patient' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Patient Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Language
                </label>
                <select
                  value={formData.preferredLanguage || 'en'}
                  onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>

              <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2 pt-2">
                Emergency Contact
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Name
                </label>
                <Input
                  type="text"
                  value={formData.emergencyContactName || ''}
                  onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                  placeholder="Full name of emergency contact"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Phone
                </label>
                <Input
                  type="tel"
                  value={formData.emergencyContactPhone || ''}
                  onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2 pt-2">
                Health Flags
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasAllergies"
                    checked={formData.hasAllergies || false}
                    onChange={(e) => handleInputChange('hasAllergies', e.target.checked.toString())}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hasAllergies" className="ml-3 block text-sm text-gray-700">
                    I have known allergies
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasChronicConditions"
                    checked={formData.hasChronicConditions || false}
                    onChange={(e) => handleInputChange('hasChronicConditions', e.target.checked.toString())}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hasChronicConditions" className="ml-3 block text-sm text-gray-700">
                    I have chronic conditions
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Doctor-specific fields */}
          {formData.role === 'doctor' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Professional Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical License Number *
                </label>
                <Input
                  type="text"
                  value={formData.licenseNumber || ''}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  placeholder="Enter your medical license number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization
                </label>
                <Input
                  type="text"
                  value={formData.specialization || ''}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="e.g., Cardiology, General Practice"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hospital/Clinic Affiliation
                </label>
                <Input
                  type="text"
                  value={formData.hospitalAffiliation || ''}
                  onChange={(e) => handleInputChange('hospitalAffiliation', e.target.value)}
                  placeholder="e.g., City General Hospital"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Complete Registration'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}