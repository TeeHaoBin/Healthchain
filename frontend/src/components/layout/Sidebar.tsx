"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Shield,
  User,
  LogOut,
  Stethoscope,
  UserCheck,
  Activity,
  Monitor,
  KeyRound,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/hooks/useLogout"
import { logoutStateManager } from "@/lib/auth/logoutState"

type UserRole = "patient" | "doctor" | "admin"

interface SidebarProps {
  role: UserRole
}

const navigationItems = {
  patient: [
    { title: "Dashboard", url: "/patient/dashboard", icon: LayoutDashboard },
    { title: "My Health Record", url: "/patient/upload", icon: FileText },
    { title: "Manage Access", url: "/patient/requests", icon: Shield },
    { title: "Profile", url: "/profile", icon: User },
  ],
  doctor: [
    { title: "Dashboard", url: "/doctor/dashboard", icon: LayoutDashboard },
    { title: "Request Access", url: "/doctor/request", icon: KeyRound },
    { title: "History", url: "/doctor/history", icon: Activity },
    { title: "Profile", url: "/profile", icon: User },
  ],
  admin: [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Verify Doctor", url: "/admin/verify", icon: UserCheck },
    { title: "Test Functions", url: "/admin/test", icon: Activity },
    { title: "System Monitoring", url: "/admin/system-monitoring", icon: Monitor },
    { title: "Profile", url: "/profile", icon: User },
  ],
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const items = navigationItems[role]
  const { isLoggingOut, error, success, logout, resetLogoutState } = useLogout()

  const handleLogout = async () => {
    // CRITICAL: Set logout state IMMEDIATELY to prevent race conditions
    console.log('🚨 Sidebar: Setting logout state IMMEDIATELY on button click')
    logoutStateManager.setLoggingOut(true)
    
    try {
      const logoutSuccess = await logout()
      
      if (!logoutSuccess && error) {
        // Show error for a few seconds, then auto-retry or reset
        setTimeout(() => {
          resetLogoutState()
        }, 3000)
      }
    } catch (err) {
      console.error('❌ Logout failed in sidebar handler:', err)
      // Reset logout state on error
      logoutStateManager.setLoggingOut(false)
    }
  }

  const getLogoutButtonContent = () => {
    if (isLoggingOut) {
      return (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Logging out...
        </>
      )
    }
    
    if (success) {
      return (
        <>
          <CheckCircle className="h-5 w-5 text-green-600" />
          Logged out successfully!
        </>
      )
    }
    
    if (error) {
      return (
        <>
          <AlertCircle className="h-5 w-5 text-red-600" />
          Logout failed
        </>
      )
    }
    
    return (
      <>
        <LogOut className="h-5 w-5" />
        Logout
      </>
    )
  }

  const getLogoutButtonStyles = () => {
    if (success) {
      return "text-green-600 hover:bg-green-50 hover:text-green-700"
    }
    
    if (error) {
      return "text-red-600 hover:bg-red-50 hover:text-red-700"
    }
    
    return "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  }

  return (
    <div className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-sidebar">
      {/* Logo/Header */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <Link href="/" className="flex items-center gap-2">
          {role === "patient" && <FileText className="h-6 w-6 text-blue-600" />}
          {role === "doctor" && <Stethoscope className="h-6 w-6 text-green-600" />}
          {role === "admin" && <Shield className="h-6 w-6 text-purple-600" />}
          <span className="text-lg font-semibold">
            {role === "patient" && "Patient Portal"}
            {role === "doctor" && "Doctor Portal"}
            {role === "admin" && "Admin Portal"}
          </span>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.url

          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-gray-200 p-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 transition-all duration-200",
            getLogoutButtonStyles()
          )}
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {getLogoutButtonContent()}
        </Button>
        
        {/* Error message display */}
        {error && (
          <div className="mt-2 p-2 text-xs text-red-600 bg-red-50 rounded border border-red-200">
            {error}
            <div className="mt-1 text-xs text-red-500">
              Click to retry or wait for auto-reset
            </div>
          </div>
        )}
      </div>
    </div>
  )
}