'use client'

import { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function WalletConnect() {
  const [isMounted, setIsMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  // Handle hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-sm text-gray-600">
            Connect your wallet to access your healthcare data securely
          </p>
        </div>
        <div className="space-y-2">
          <Button disabled variant="outline" className="w-full">
            Loading wallets...
          </Button>
        </div>
      </div>
    )
  }

  if (isConnected && address) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-green-800">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        </div>
        <Button 
          onClick={() => disconnect()} 
          className="w-full bg-[#FF3131] hover:bg-[#E02828] text-white border-none"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect Wallet
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-sm text-gray-600">
          Connect your wallet to access your healthcare data securely
        </p>
      </div>
      
      <div className="flex justify-center">
        <ConnectButton />
      </div>
    </div>
  )
}