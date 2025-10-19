import RoleGuard from '@/components/auth/RoleGuard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <AdminDashboard />
      </div>
    </RoleGuard>
  )
}