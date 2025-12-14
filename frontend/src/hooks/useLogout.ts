'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDisconnect } from 'wagmi'
import { supabase } from '@/lib/supabase/client'
import { logoutStateManager } from '@/lib/auth/logoutState'

interface LogoutState {
  isLoggingOut: boolean
  error: string | null
  success: boolean
}

interface LogoutStep {
  name: string
  action: () => Promise<void>
  required: boolean
}

export function useLogout() {
  const [state, setState] = useState<LogoutState>({
    isLoggingOut: false,
    error: null,
    success: false
  })

  const router = useRouter()
  const { disconnect } = useDisconnect()

  const clearAllLocalStorage = () => {
    // CRITICAL: Clear the custom auth system's localStorage
    const criticalAuthKeys = [
      'healthchain_auth', // This is the main issue - custom auth storage!
      'selectedWallet',
      'walletconnect',
      'wagmi.wallet',
      'wagmi.store',
      'wagmi.cache',
      'wagmi.recentConnectorId', // This was found in logs
      'supabase.auth.token',
      // Additional wallet connection keys found in logs
      '@appkit/connection_status',
      '@appkit/active_caip_network_id',
      '@appkit/connected_namespaces',
      '@appkit/active_namespace',
      'rk-recent',
      'rk-latest-id'
    ]

    console.log('🧹 Clearing critical auth keys:', criticalAuthKeys)

    criticalAuthKeys.forEach(key => {
      try {
        const before = localStorage.getItem(key)
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
        const after = localStorage.getItem(key)
        console.log(`🗑️ ${key}: ${before ? 'existed' : 'not found'} → ${after ? 'still exists!' : 'cleared'}`)
      } catch (error) {
        console.warn(`❌ Failed to remove ${key} from storage:`, error)
      }
    })

    // Clear any remaining items that start with common auth prefixes
    const prefixes = ['auth_', 'wallet_', 'supabase_', 'wagmi.', 'walletconnect', '@appkit/', 'rk-']

    console.log('🧹 Scanning for prefixed keys:', prefixes)

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && prefixes.some(prefix => key.startsWith(prefix))) {
        try {
          console.log(`🗑️ Removing prefixed key: ${key}`)
          localStorage.removeItem(key)
        } catch (error) {
          console.warn(`❌ Failed to remove ${key} from localStorage:`, error)
        }
      }
    }

    // Extra verification - check what's left
    const remainingKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) remainingKeys.push(key)
    }
    console.log('📋 Remaining localStorage keys:', remainingKeys)
  }

  const verifyLogoutSuccess = async (): Promise<boolean> => {
    try {
      // Check 1: Supabase Auth Session
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔍 Supabase session check:', session ? 'Session exists' : 'No session')

      // Check 2: Custom localStorage auth
      const customAuth = localStorage.getItem('healthchain_auth')
      console.log('🔍 Custom auth check:', customAuth ? 'Auth data exists' : 'No auth data')

      // Check 3: Try fetching user data to see if auth is actually cleared
      try {
        // This mimics what useRole does - if this succeeds, logout failed
        const { address } = { address: session?.user?.user_metadata?.wallet_address }
        if (address) {
          console.log('🔍 Wallet address still available:', address)
          return false // Logout failed if we can still get wallet address
        }
      } catch (e) {
        console.log('🔍 Wallet address check failed (good):', e)
      }

      // Success if no session AND no custom auth data
      const isLoggedOut = !session && !customAuth
      console.log('🔍 Final logout verification:', isLoggedOut ? 'SUCCESS' : 'FAILED')

      return isLoggedOut
    } catch (error) {
      console.warn('❌ Could not verify logout status:', error)
      return false // Fail verification if we can't check properly
    }
  }

  const logout = async (): Promise<boolean> => {
    // Note: Logout state is now set immediately in the Sidebar before this function is called
    // This ensures no race conditions between button click and auth blocking
    console.log('🔒 useLogout: Logout state should already be set to LOGGING OUT')

    setState({
      isLoggingOut: true,
      error: null,
      success: false
    })

    const logoutSteps: LogoutStep[] = [
      {
        name: 'Invalidate Session in Database',
        action: async () => {
          // Get the current session token from localStorage
          const authData = localStorage.getItem('healthchain_auth')
          if (authData) {
            try {
              const parsed = JSON.parse(authData)
              const sessionToken = parsed.sessionToken || parsed.session_token

              if (sessionToken) {
                console.log('🔐 Invalidating session in database...')
                const { error } = await supabase.rpc('invalidate_session', {
                  p_session_token: sessionToken
                })

                if (error) {
                  console.warn('⚠️ Failed to invalidate session in database:', error.message)
                  // Continue with logout even if this fails
                } else {
                  console.log('✅ Session invalidated in database')
                }
              }
            } catch (e) {
              console.warn('⚠️ Could not parse auth data for session invalidation:', e)
            }
          }
        },
        required: false // Non-critical - continue logout even if this fails
      },
      {
        name: 'Clear Local Storage First',
        action: async () => {
          // Clear custom auth BEFORE Supabase to prevent race conditions
          clearAllLocalStorage()
        },
        required: true // This is critical to prevent the useRole hook from re-authenticating
      },
      {
        name: 'Supabase Auth Signout',
        action: async () => {
          const { error } = await supabase.auth.signOut({ scope: 'global' })
          if (error) throw new Error(`Supabase signout failed: ${error.message}`)
        },
        required: true
      },
      {
        name: 'Wallet Disconnect',
        action: async () => {
          return new Promise((resolve, reject) => {
            try {
              disconnect()
              // Give wallet time to disconnect
              setTimeout(() => resolve(), 500)
            } catch (error) {
              reject(new Error(`Wallet disconnect failed: ${error}`))
            }
          })
        },
        required: false // Non-critical if wallet is already disconnected
      },
      {
        name: 'Force Clear Remaining Auth',
        action: async () => {
          // Double-check and force clear any remaining auth data
          clearAllLocalStorage()

          // Clear cookies if any
          document.cookie.split(";").forEach((c) => {
            const eqPos = c.indexOf("=")
            const name = eqPos > -1 ? c.substr(0, eqPos) : c
            if (name.trim().includes('supabase') || name.trim().includes('auth')) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
            }
          })
        },
        required: true
      },
      {
        name: 'Verify Logout',
        action: async () => {
          // Wait a moment for all clears to take effect
          await new Promise(resolve => setTimeout(resolve, 200))

          const isLoggedOut = await verifyLogoutSuccess()
          if (!isLoggedOut) {
            throw new Error('Logout verification failed - authentication data still exists')
          }
        },
        required: true
      }
    ]

    let hasError = false
    let errorMessage = ''

    // Execute logout steps sequentially
    for (const step of logoutSteps) {
      try {
        console.log(`Executing: ${step.name}`)
        await step.action()
        console.log(`✅ ${step.name} completed`)
      } catch (error) {
        console.error(`❌ ${step.name} failed:`, error)

        if (step.required) {
          hasError = true
          errorMessage = `${step.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          break
        } else {
          console.warn(`⚠️ ${step.name} failed but continuing (non-critical)`)
        }
      }
    }

    if (hasError) {
      // If logout verification failed, try one final forced logout
      if (errorMessage.includes('Logout verification failed')) {
        console.log('🚨 Verification failed, attempting forced logout...')

        try {
          // Nuclear option - clear everything and force redirect
          clearAllLocalStorage()
          await supabase.auth.signOut({ scope: 'global' })

          // Force page reload to clear any remaining state
          console.log('🚨 Forcing page reload to complete logout')

          setState({
            isLoggingOut: false,
            error: null,
            success: true
          })

          // Keep logout state active until page reload
          // Immediate redirect with page reload
          setTimeout(() => {
            window.location.href = '/auth'
          }, 500)

          return true
        } catch (forcedError) {
          console.error('❌ Even forced logout failed:', forcedError)
        }
      }

      setState({
        isLoggingOut: false,
        error: errorMessage,
        success: false
      })

      // Reset logout state on error so user can try again
      logoutStateManager.setLoggingOut(false)
      return false
    }

    // Success
    setState({
      isLoggingOut: false,
      error: null,
      success: true
    })

    // Wait a moment for user to see success state, then redirect
    setTimeout(() => {
      router.push('/auth')

      // Reset logout state and success state after navigation
      setTimeout(() => {
        logoutStateManager.setLoggingOut(false)
        setState(prev => ({ ...prev, success: false }))
      }, 1000)
    }, 1000)

    return true
  }

  const resetLogoutState = () => {
    // Reset both local and global logout state
    logoutStateManager.setLoggingOut(false)
    setState({
      isLoggingOut: false,
      error: null,
      success: false
    })
  }

  return {
    ...state,
    logout,
    resetLogoutState
  }
}