/**
 * WalletConnect Component Tests
 * Section 9.0 - Wallet Connection UI
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock wagmi hooks
const mockUseAccount = jest.fn()
const mockUseDisconnect = jest.fn()

jest.mock('wagmi', () => ({
    useAccount: () => mockUseAccount(),
    useDisconnect: () => mockUseDisconnect(),
}))

// Mock RainbowKit
jest.mock('@rainbow-me/rainbowkit', () => ({
    ConnectButton: () => <button data-testid="connect-button">Connect Wallet</button>,
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, disabled, onClick, className }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; className?: string }) => (
        <button disabled={disabled} onClick={onClick} className={className} data-testid="button">
            {children}
        </button>
    ),
}))

// Import component after mocks
import WalletConnect from '@/components/auth/WalletConnect'

describe('WalletConnect Component', () => {
    const mockDisconnect = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
        mockUseDisconnect.mockReturnValue({ disconnect: mockDisconnect })
    })

    describe('9.0 Wallet Connection UI', () => {
        it('9.1 Renders wallet connection interface', () => {
            mockUseAccount.mockReturnValue({ address: undefined, isConnected: false })

            render(<WalletConnect />)

            // Component should show connect interface
            expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument()
        })

        it('9.2 Shows connect button when disconnected', async () => {
            mockUseAccount.mockReturnValue({ address: undefined, isConnected: false })

            render(<WalletConnect />)

            // Wait for mount
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument()
        })

        it('9.3 Shows connected address when connected', async () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<WalletConnect />)

            // Wait for mount
            await new Promise(resolve => setTimeout(resolve, 0))

            expect(screen.getByText(/Connected:/)).toBeInTheDocument()
            expect(screen.getByText(/0x742d...f44e/)).toBeInTheDocument()
        })

        it('9.4 Shows disconnect button when connected', async () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<WalletConnect />)

            await new Promise(resolve => setTimeout(resolve, 0))

            expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument()
        })

        it('9.5 Displays truncated wallet address format', async () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<WalletConnect />)

            await new Promise(resolve => setTimeout(resolve, 0))

            // Should show first 6 and last 4 characters
            const addressText = screen.getByText(/0x742d...f44e/)
            expect(addressText).toBeInTheDocument()
        })

        it('9.6 Shows security message for healthcare access', () => {
            mockUseAccount.mockReturnValue({ address: undefined, isConnected: false })

            render(<WalletConnect />)

            expect(screen.getByText(/access your healthcare data securely/)).toBeInTheDocument()
        })
    })
})
