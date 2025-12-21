'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase/client'
import { getUserByWallet, clearUserCache, type UserRole, type User } from '@/lib/supabase/helpers'
import { logoutStateManager } from '@/lib/auth/logoutState'

interface UseRoleReturn {
  role: UserRole | null
  loading: boolean
  isAuthenticated: boolean
  error: string | null
  user: User | null
}

// ============================================
// MODULE-LEVEL CACHE - shared across all hook instances
// This prevents redundant auth checks when navigating between pages
// ============================================
interface AuthCache {
  role: UserRole | null
  user: User | null
  loading: boolean
  error: string | null
}

let authCache: AuthCache = {
  role: null,
  user: null,
  loading: true,
  error: null
}
let lastAuthCheckKey: string = ''
let authCheckInProgress: boolean = false
let authCheckPromise: Promise<void> | null = null

// Subscribers for cache changes
const cacheSubscribers = new Set<() => void>()

function notifyCacheSubscribers() {
  cacheSubscribers.forEach(callback => callback())
}

function subscribeToCache(callback: () => void) {
  cacheSubscribers.add(callback)
  return () => cacheSubscribers.delete(callback)
}

function getCacheSnapshot(): AuthCache {
  return authCache
}

// MUST be a cached constant - returning a new object causes infinite loop
const SERVER_SNAPSHOT: AuthCache = { role: null, user: null, loading: true, error: null }

function getServerSnapshot(): AuthCache {
  return SERVER_SNAPSHOT
}

function updateCache(updates: Partial<AuthCache>) {
  authCache = { ...authCache, ...updates }
  notifyCacheSubscribers()
}

// Reset cache on logout
function resetAuthCache() {
  lastAuthCheckKey = ''
  authCheckInProgress = false
  authCheckPromise = null
  updateCache({ role: null, user: null, loading: false, error: null })
  clearUserCache() // Also clear the helpers.ts cache
}

export function useRole(): UseRoleReturn {
  const { address, isConnected } = useAccount()

  // Use useSyncExternalStore for stable cache synchronization across all hook instances
  const cache = useSyncExternalStore(subscribeToCache, getCacheSnapshot, getServerSnapshot)

  const [isLoggingOut, setIsLoggingOut] = useState(logoutStateManager.getIsLoggingOut())
  const authCheckDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const isInitialMount = useRef(true)

  // Subscribe to logout state changes
  useEffect(() => {
    const unsubscribe = logoutStateManager.subscribe(() => {
      const currentLogoutState = logoutStateManager.getIsLoggingOut()
      console.log('🔄 useRole: Logout state changed to:', currentLogoutState ? 'LOGGING OUT' : 'NOT LOGGING OUT')
      setIsLoggingOut(currentLogoutState)

      // If logout started, immediately clear auth state
      if (currentLogoutState) {
        console.log('🚫 useRole: Clearing all auth caches due to logout')
        resetAuthCache()
      }
    })

    return unsubscribe
  }, [])

  const checkAuthAndRole = useCallback(async (forceRefresh: boolean = false) => {
    // Create a cache key based on wallet state only (not isLoggingOut to avoid unnecessary resets)
    const cacheKey = `${address}-${isConnected}`

    // Skip if already in progress - wait for existing check
    if (authCheckInProgress && authCheckPromise) {
      console.log('⏭️ useRole: Auth check in progress, waiting for result...')
      await authCheckPromise
      return
    }

    // Skip if params haven't changed AND we have a cached role (unless force refresh)
    if (!forceRefresh && lastAuthCheckKey === cacheKey && authCache.role !== null) {
      console.log('⏭️ useRole: Using cached auth (same params, have role)')
      return
    }

    // CRITICAL: Block all authentication during logout
    if (isLoggingOut || logoutStateManager.getIsLoggingOut()) {
      console.log('🚫 useRole blocked - logout in progress')
      resetAuthCache()
      return
    }

    authCheckInProgress = true
    lastAuthCheckKey = cacheKey

    // Only set loading if we don't have cached data
    if (authCache.role === null) {
      updateCache({ loading: true, error: null })
    }

    // Create a promise that other instances can wait on
    authCheckPromise = (async () => {
      try {
        // ============================================
        // PRIORITY 1: Check custom session token from localStorage
        // This is the primary auth method for Web3 wallet-based auth
        // ============================================
        if (typeof window !== 'undefined') {
          const authData = localStorage.getItem('healthchain_auth')
          if (authData) {
            try {
              const parsed = JSON.parse(authData)
              const sessionToken = parsed.sessionToken || parsed.session_token

              if (sessionToken) {
                console.log('🔐 useRole: Found custom session token, validating...')

                const validationResult = await logoutStateManager.blockAuthDuringLogout(
                  async () => await supabase.rpc('validate_session_and_get_user', {
                    p_session_token: sessionToken
                  }),
                  'Custom session validation'
                )

                if (validationResult?.data?.success && validationResult?.data?.user) {
                  const userData = validationResult.data.user
                  console.log('✅ useRole: Custom session valid! User:', userData.role)

                  updateCache({
                    role: userData.role,
                    user: userData,
                    loading: false
                  })
                  authCheckInProgress = false
                  return
                } else {
                  // Session invalid or expired - clear it
                  console.log('⚠️ useRole: Custom session invalid or expired, clearing...')
                  localStorage.removeItem('healthchain_auth')
                }
              }
            } catch (parseError) {
              console.warn('⚠️ useRole: Failed to parse healthchain_auth:', parseError)
              localStorage.removeItem('healthchain_auth')
            }
          }
        }

        // ============================================
        // PRIORITY 2: Check Supabase Auth session (for compatibility)
        // ============================================
        const sessionResult = await logoutStateManager.blockAuthDuringLogout(
          () => supabase.auth.getSession(),
          'Supabase session check'
        )

        if (!sessionResult) {
          updateCache({ role: null, user: null, loading: false })
          return
        }

        const { data: { session }, error: sessionError } = sessionResult

        if (sessionError) throw sessionError

        if (session?.user) {
          const walletAddress = session.user.user_metadata?.wallet_address

          if (walletAddress) {
            const userData = await logoutStateManager.blockAuthDuringLogout(
              () => getUserByWallet(walletAddress),
              'User lookup by wallet (from session)'
            )

            updateCache({
              role: userData?.role ?? null,
              user: userData ?? null,
              loading: false
            })
          } else {
            updateCache({ role: null, user: null, loading: false })
          }
        } else if (address && isConnected) {
          // ============================================
          // PRIORITY 3: Wallet connected but no session - check user exists
          // ============================================
          console.log('ℹ️ Wallet connected but no session - checking if user exists for:', address.slice(0, 6) + '...')

          const userData = await logoutStateManager.blockAuthDuringLogout(
            () => getUserByWallet(address),
            'User lookup by wallet (fallback)'
          )

          if (userData) {
            console.log('✅ User found for connected wallet:', userData.role)
            updateCache({
              role: userData.role,
              user: userData,
              loading: false
            })
          } else {
            console.log('ℹ️ Wallet connected but no user record found - user needs to register')
            updateCache({ role: null, user: null, loading: false })
          }
        } else {
          updateCache({ role: null, user: null, loading: false })
        }
      } catch (err) {
        console.error('Error fetching user role:', err)
        updateCache({ role: null, user: null, loading: false, error: 'Failed to fetch user role' })
      } finally {
        authCheckInProgress = false
      }
    })()

    await authCheckPromise
  }, [address, isConnected, isLoggingOut])

  useEffect(() => {
    // If we already have cached data for same params, skip re-checking
    const cacheKey = `${address}-${isConnected}`
    if (lastAuthCheckKey === cacheKey && authCache.role !== null) {
      return
    }

    // Clear any pending debounce timer
    if (authCheckDebounceTimer.current) {
      clearTimeout(authCheckDebounceTimer.current)
    }

    // Debounce auth checks - use longer delay on initial mount to avoid React Strict Mode double-render
    const debounceDelay = isInitialMount.current ? 100 : 50
    isInitialMount.current = false

    authCheckDebounceTimer.current = setTimeout(() => {
      checkAuthAndRole()
    }, debounceDelay)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only reset cache for SIGNED_IN and SIGNED_OUT
      // TOKEN_REFRESHED should NOT reset the role - it's just a session refresh
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log('🔐 Auth state changed:', event)
        lastAuthCheckKey = ''
        checkAuthAndRole(true)
      } else if (event === 'TOKEN_REFRESHED') {
        // For token refresh, only re-check if we don't have a role cached
        // This prevents the role from flashing to null
        if (authCache.role === null) {
          console.log('🔄 Token refreshed, checking auth (no cached role)')
          checkAuthAndRole(true)
        } else {
          console.log('🔄 Token refreshed, keeping cached role:', authCache.role)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      if (authCheckDebounceTimer.current) {
        clearTimeout(authCheckDebounceTimer.current)
      }
    }
  }, [checkAuthAndRole, address, isConnected])

  return {
    role: cache.role,
    loading: cache.loading,
    // isAuthenticated: true if we have a valid role (from session) OR wallet is connected
    isAuthenticated: !!cache.role || (isConnected && !!address),
    error: cache.error,
    user: cache.user
  }
}