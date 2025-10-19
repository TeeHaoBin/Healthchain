'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { Spinner } from '@/components/shared/Spinner'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallbackPath?: string
}

export default function RoleGuard({ 
  allowedRoles, 
  children, 
  fallbackPath = '/auth' 
}: RoleGuardProps) {
  const { role, loading, isAuthenticated } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/auth')
        return
      }

      if (role && !allowedRoles.includes(role)) {
        // Redirect to appropriate dashboard based on their actual role
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
            router.push(fallbackPath)
        }
      }
    }
  }, [role, loading, isAuthenticated, allowedRoles, router, fallbackPath])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    )
  }

  // Don't render children if user is not authenticated or doesn't have the right role
  if (!isAuthenticated || !role || !allowedRoles.includes(role)) {
    return null
  }

  return <>{children}</>
}