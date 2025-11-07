"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useRole } from "@/hooks/useRole"

export default function ProfilePage() {
  const { role, user, isAuthenticated } = useRole()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your profile settings and preferences
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Role</label>
              <p className="text-sm text-muted-foreground capitalize">{role || "Loading..."}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? "Active" : "Not authenticated"}
              </p>
            </div>
            {user && (
              <div>
                <label className="text-sm font-medium">User ID</label>
                <p className="text-sm text-muted-foreground">{user.id || "N/A"}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Profile settings will be implemented here.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}