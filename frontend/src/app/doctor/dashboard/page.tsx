import RoleGuard from '@/components/auth/RoleGuard'
import DoctorDashboard from '@/components/dashboard/DoctorDashboard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function DoctorDashboardPage() {
  return (
    <RoleGuard allowedRoles={['doctor']}>
      <DashboardLayout>
        <DoctorDashboard />
      </DashboardLayout>
    </RoleGuard>
  )
}