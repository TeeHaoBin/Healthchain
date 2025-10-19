'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { Spinner } from '@/components/shared/Spinner'

export default function DashboardRedirect() {
  const { role, loading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading && role) {
      switch (role) {
        case 'patient':
          router.push('/patient/dashboard')
          break
        case 'doctor':
          router.push('/doctor/dashboard')
          break
        case 'admin':
          router.push('/admin/dashboard')
          break
        default:
          router.push('/auth')
      }
    }
  }, [role, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return null
}