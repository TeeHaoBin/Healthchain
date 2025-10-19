import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, mainnet } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'HealthChain',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
  chains: [sepolia, mainnet],
  ssr: true, // If your dApp uses server side rendering (SSR)
})

// Smart contract addresses (replace with your deployed contracts)
export const CONTRACTS = {
  HEALTH_RECORDS: {
    address: '0x...' as `0x${string}`,
    abi: [] // Add your contract ABI here
  },
  ACCESS_CONTROL: {
    address: '0x...' as `0x${string}`,
    abi: [] // Add your contract ABI here
  }
}

// Contract function names
export const CONTRACT_FUNCTIONS = {
  // Health Records Contract
  STORE_RECORD_HASH: 'storeRecordHash',
  GET_RECORD_HASH: 'getRecordHash',
  
  // Access Control Contract
  GRANT_ACCESS: 'grantAccess',
  REVOKE_ACCESS: 'revokeAccess',
  CHECK_ACCESS: 'checkAccess',
  LOG_ACCESS: 'logAccess'
}