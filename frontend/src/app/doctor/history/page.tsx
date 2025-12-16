"use client"

import { useAccount } from 'wagmi'
import RoleGuard from '@/components/auth/RoleGuard'
import AccessHistory from '@/components/shared/AccessHistory'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Shield } from 'lucide-react'
import WalletConnect from '@/components/auth/WalletConnect'

export default function DoctorHistoryPage() {
  const { address, isConnected } = useAccount()

  return (
    <RoleGuard allowedRoles={['doctor']}>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Request History
          </h1>
          <p className="text-gray-600 mb-8">
            View your complete request history and patient responses.
          </p>

          {!isConnected ? (
            <Card className="p-8 text-center border-dashed">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet to View History</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Your request history is secured by blockchain. Please connect your wallet to view.
              </p>
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </Card>
          ) : (
            <AccessHistory walletAddress={address} />
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}