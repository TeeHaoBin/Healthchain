'use client'

import { useState, useEffect } from 'react'
import { useConnect, useAccount, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut } from 'lucide-react'

export default function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { connect, connectors, error } = useConnect()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  // Handle hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleConnect = async (connector: any) => {
    try {
      setIsConnecting(true)
      await connect({ connector })
    } catch (err) {
      console.error('Failed to connect wallet:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Choose Your Wallet
          </h3>
          <p className="text-sm text-gray-600">
            Connect your wallet to access your healthcare data securely
          </p>
        </div>
        <div className="space-y-2">
          <Button disabled variant="outline" className="w-full">
            <Wallet className="h-4 w-4 mr-2" />
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
            <Wallet className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        </div>
        <Button 
          onClick={() => disconnect()} 
          variant="outline" 
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect Wallet
        </Button>
      </div>
    )
  }

  // Filter out duplicate connectors to ensure unique keys
  const uniqueConnectors = connectors.filter((connector, index, self) => 
    index === self.findIndex((c) => c.id === connector.id)
  )

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Choose Your Wallet
        </h3>
        <p className="text-sm text-gray-600">
          Connect your wallet to access your healthcare data securely
        </p>
      </div>
      
      <div className="space-y-2">
        {uniqueConnectors.map((connector, index) => (
          <Button
            key={`${connector.id}-${index}`}
            onClick={() => handleConnect(connector)}
            disabled={isConnecting}
            className="w-full"
            variant="outline"
          >
            <Wallet className="h-4 w-4 mr-2" />
            {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
          </Button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Error: {error.message}
          </p>
        </div>
      )}
    </div>
  )
}