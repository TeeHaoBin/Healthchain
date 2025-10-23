import SupabaseWeb3Auth from '@/components/auth/SupabaseWeb3Auth'
import WalletConnect from '@/components/auth/WalletConnect'
import NetworkChecker from '@/components/shared/NetworkChecker'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Back to Home button at the very top */}
        <div className="flex justify-start">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to HealthChain
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Secure, cryptographically verified access to your healthcare records
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Network Check - Show warning if not on Sepolia */}
          <NetworkChecker />
          
          {/* Step 1: Wallet Connection */}
          <WalletConnect />
          
          {/* Step 2: Secure Web3 Authentication */}
          <div className="border-t border-gray-200 pt-6">
            <SupabaseWeb3Auth />
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-200">
          <div className="text-center">
            <h3 className="text-sm font-medium text-blue-900 mb-2">🔐 Enhanced Security</h3>
            <p className="text-xs text-blue-700">
              This application uses cryptographic signatures to verify wallet ownership, 
              providing healthcare-grade security for your medical data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}