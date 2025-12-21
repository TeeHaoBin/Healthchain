'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage, useChainId } from 'wagmi'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { getUserByWallet, updateLastLogin } from '@/lib/supabase/helpers'
import { Wallet, Shield, CheckCircle, AlertTriangle } from 'lucide-react'
import KYCForm from './KYCForm'

interface AuthState {
  step: 'connect' | 'authenticate' | 'register' | 'complete'
  user: any | null
  isAuthenticated: boolean
}

export default function SupabaseWeb3Auth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const chainId = useChainId()
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>({
    step: 'connect',
    user: null,
    isAuthenticated: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setAuthState({
          step: 'complete',
          user: session.user,
          isAuthenticated: true
        })
      }
    }
    checkAuth()
  }, [])

  // Handle wallet connection changes
  useEffect(() => {
    if (isConnected && address && !authState.isAuthenticated) {
      setAuthState(prev => ({ ...prev, step: 'authenticate' }))
    } else if (!isConnected) {
      setAuthState({ step: 'connect', user: null, isAuthenticated: false })
    }
  }, [isConnected, address, authState.isAuthenticated])

  const generateAuthMessage = (walletAddress: string, nonce: string) => {
    return `HealthChain wants you to sign in with your Ethereum account:
${walletAddress}

I authorize HealthChain to access my medical records securely.

URI: ${window.location.origin}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`
  }

  const handleAuthenticate = async () => {
    if (!address || !isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Check if user exists in our database
      const existingUser = await getUserByWallet(address)

      // Step 2: Generate message with nonce
      const nonce = Math.random().toString(36).substring(2, 15)
      const message = generateAuthMessage(address, nonce)

      // Step 3: Get user signature
      const signature = await signMessageAsync({
        message,
        account: address as `0x${string}` // Ensure we sign with the connected account
      })

      // Step 4: Authenticate with our custom function
      const { data: authResult, error: authError } = await supabase.rpc('auth_web3_secure', {
        wallet_address: address.toLowerCase(),
        signature: signature,
        message: message,
        nonce: Date.now().toString(),
        ip_address: '127.0.0.1'
      })

      if (authError) throw authError

      if (authResult?.user) {
        // User exists and is authenticated
        const user = existingUser || authResult.user
        console.log('✅ User authenticated successfully:', user)

        // Update last login timestamp
        if (existingUser) {
          await updateLastLogin(existingUser.id)
        }

        // Store auth state in localStorage WITH session token
        const authData = {
          wallet: address,
          user: user,
          sessionToken: authResult.session_token, // ← THIS IS THE KEY FIX!
          timestamp: Date.now()
        }
        console.log('💾 Saving auth with session token to localStorage:', authData)
        localStorage.setItem('healthchain_auth', JSON.stringify(authData))

        // Set authenticated state
        setAuthState({
          step: 'complete',
          user: user,
          isAuthenticated: true
        })

        // Redirect existing users to their dashboard
        setTimeout(() => {
          console.log('🔄 Redirecting existing user to dashboard for role:', user.role)
          let dashboardPath = '/dashboard'

          switch (user.role) {
            case 'patient':
              dashboardPath = '/patient/dashboard'
              break
            case 'doctor':
              dashboardPath = '/doctor/dashboard'
              break
            case 'admin':
              dashboardPath = '/admin/dashboard'
              break
          }

          console.log('🔄 Using router.push to:', dashboardPath)
          router.push(dashboardPath)
        }, 1000)
      } else {
        // User doesn't exist, needs to register
        setAuthState(prev => ({ ...prev, step: 'register' }))
      }

    } catch (err: any) {
      console.error('Authentication error:', err)
      setError(err.message || 'Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKYCComplete = async () => {
    console.log('🔄 handleKYCComplete called')
    // After KYC completion, authenticate the user
    if (!address) {
      console.log('❌ No address available')
      return
    }

    try {
      console.log('🔍 Getting user by wallet:', address)
      const existingUser = await getUserByWallet(address)

      if (existingUser) {
        console.log('✅ User found, creating session:', existingUser)

        // Generate a new session for the newly registered user
        // We need to call auth_web3_secure to create a session entry
        const nonce = Math.random().toString(36).substring(2, 15)
        const message = generateAuthMessage(address, nonce)

        // Sign message to create a proper session
        const signature = await signMessageAsync({
          message,
          account: address as `0x${string}`
        })

        const { data: authResult, error: authError } = await supabase.rpc('auth_web3_secure', {
          wallet_address: address.toLowerCase(),
          signature: signature,
          message: message,
          nonce: Date.now().toString(),
          ip_address: '127.0.0.1'
        })

        if (authError) {
          console.error('❌ Failed to create session after KYC:', authError)
          throw authError
        }

        // Set authenticated state
        setAuthState({
          step: 'complete',
          user: existingUser,
          isAuthenticated: true
        })

        // Update last login timestamp
        await updateLastLogin(existingUser.id)

        // Store auth state in localStorage WITH session token
        const authData = {
          wallet: address,
          user: existingUser,
          sessionToken: authResult?.session_token,
          timestamp: Date.now()
        }
        console.log('💾 Saving auth with session token to localStorage:', authData)
        localStorage.setItem('healthchain_auth', JSON.stringify(authData))

        // Verify it was saved
        const saved = localStorage.getItem('healthchain_auth')
        console.log('✅ Verified localStorage save:', saved ? 'Success' : 'Failed')

        // Redirect to appropriate dashboard using Next.js router (preserves state)
        setTimeout(() => {
          console.log('🔄 Redirecting to dashboard for role:', existingUser.role)
          let dashboardPath = '/dashboard'

          switch (existingUser.role) {
            case 'patient':
              dashboardPath = '/patient/dashboard'
              break
            case 'doctor':
              dashboardPath = '/doctor/dashboard'
              break
            case 'admin':
              dashboardPath = '/admin/dashboard'
              break
          }

          console.log('🔄 Using router.push to:', dashboardPath)
          router.push(dashboardPath)
        }, 1000)
      } else {
        console.log('❌ No user found after KYC completion')
      }
    } catch (error) {
      console.error('❌ Error in handleKYCComplete:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAuthState({ step: 'connect', user: null, isAuthenticated: false })
    window.location.reload()
  }

  // Render based on authentication step
  switch (authState.step) {
    case 'connect':
      return (
        <div className="text-center py-8">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600">Please connect your wallet to continue</p>
        </div>
      )

    case 'authenticate':
      return (
        <div className="space-y-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Secure Authentication
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Sign a message to cryptographically prove you own this wallet and access your healthcare data securely.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {address?.slice(0, 8)}...{address?.slice(-6)}
                </span>
              </div>
              <p className="text-xs text-blue-700">
                This signature provides cryptographic proof of wallet ownership
              </p>
            </div>
          </div>

          <Button
            onClick={handleAuthenticate}
            disabled={isLoading}
            className="w-full h-12 bg-[#0E76FD] hover:bg-[#00FF00] text-white hover:text-black rounded-2xl font-medium border-none animate-pulse hover:animate-none"
            size="lg"
          >
            <Shield className="h-4 w-4 mr-2" />
            {isLoading ? 'Authenticating...' : 'Sign Message to Authenticate'}
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">🔒 Why do we need this?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Proves you actually own this wallet address</li>
              <li>• Creates a secure session for accessing medical data</li>
              <li>• Provides audit trail for HIPAA compliance</li>
              <li>• No private keys are revealed or transmitted</li>
            </ul>
          </div>
        </div>
      )

    case 'register':
      return (
        <div className="space-y-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Wallet Verified ✓
            </h3>
            <p className="text-sm text-gray-600">
              Complete your profile to access HealthChain
            </p>
          </div>

          <KYCForm onComplete={handleKYCComplete} />
        </div>
      )

    case 'complete':
      return (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Securely Authenticated
              </span>
            </div>
            <div className="text-xs text-green-700">
              <p><strong>Wallet:</strong> {address?.slice(0, 8)}...{address?.slice(-6)}</p>
              <p><strong>Role:</strong> {authState.user?.user_metadata?.role || authState.user?.role}</p>
            </div>
          </div>


          <div className="text-xs text-gray-500 text-center">
            <p>🔐 Your session is cryptographically secure and HIPAA compliant</p>
          </div>
        </div>
      )

    default:
      return null
  }
}