'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase/client'
import { getUserByWallet, type UserRole, type User } from '@/lib/supabase/helpers'

interface UseRoleReturn {
  role: UserRole | null
  loading: boolean
  isAuthenticated: boolean
  error: string | null
  user: User | null
}

export function useRole(): UseRoleReturn {
  const { address, isConnected } = useAccount()
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkAuthAndRole = async () => {
      setLoading(true)
      setError(null)

      try {
        // First check Supabase Auth session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError

        if (session?.user) {
          // User is authenticated with Supabase Auth
          const walletAddress = session.user.user_metadata?.wallet_address
          
          if (walletAddress) {
            // Get user role from our custom users table
            const userData = await getUserByWallet(walletAddress)
            
            if (userData) {
              setRole(userData.role)
              setUser(userData)
            } else {
              // Session exists but no user data (should not happen)
              setRole(null)
              setUser(null)
            }
          } else {
            // Session exists but no wallet address (legacy auth)
            setRole(null)
            setUser(null)
          }
        } else if (address && isConnected) {
          // Wallet connected but no Supabase session
          // Check if user exists (for fallback to old system)
          const userData = await getUserByWallet(address)
          
          if (userData) {
            setRole(userData.role)
            setUser(userData)
          } else {
            setRole(null)
            setUser(null)
          }
        } else {
          // No wallet connection and no session
          setRole(null)
          setUser(null)
        }
      } catch (err) {
        setError('Failed to fetch user role')
        console.error('Error fetching user role:', err)
        setRole(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndRole()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkAuthAndRole()
      }
    })

    return () => subscription.unsubscribe()
  }, [address, isConnected])

  return {
    role,
    loading,
    isAuthenticated: isConnected && !!address,
    error,
    user
  }
}