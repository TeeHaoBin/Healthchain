/**
 * FileUploader Component Tests
 * Section 11.0 - File Upload UI
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock wagmi
const mockUseAccount = jest.fn()
jest.mock('wagmi', () => ({
    useAccount: () => mockUseAccount(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}))

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}))

// Mock fileUploadService
jest.mock('@/services/fileUploadService', () => ({
    fileUploadService: {
        uploadEncryptedFile: jest.fn(),
    },
}))

// Mock validation functions
jest.mock('@/lib/validation', () => ({
    isValidFileSize: jest.fn(() => ({ valid: true })),
    isValidFileType: jest.fn(() => ({ valid: true, category: 'document' })),
    isValidFileSizeSimple: jest.fn(() => true),
    isValidFileTypeSimple: jest.fn(() => true),
    validateDoctorAddresses: jest.fn(() => ({ valid: true, errors: [] })),
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) => (
        <button disabled={disabled} onClick={onClick} data-testid="button">
            {children}
        </button>
    ),
}))

jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}))

// Import component after mocks
import FileUploader from '@/components/forms/FileUploader'

describe('FileUploader Component', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('11.0 File Upload UI', () => {
        it('11.1 Shows wallet warning when not connected', () => {
            mockUseAccount.mockReturnValue({ address: undefined, isConnected: false })

            render(<FileUploader />)

            expect(screen.getByText(/Please connect your wallet/)).toBeInTheDocument()
        })

        it('11.2 Renders upload configuration section', () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<FileUploader />)

            expect(screen.getByText('Upload Configuration')).toBeInTheDocument()
        })

        it('11.3 Shows record type dropdown', () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<FileUploader />)

            expect(screen.getByText('Record Type')).toBeInTheDocument()
            expect(screen.getByDisplayValue('General Health Record')).toBeInTheDocument()
        })

        it('11.4 Shows authorized doctors input field', () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<FileUploader />)

            expect(screen.getByText(/Authorized Doctor Addresses/)).toBeInTheDocument()
            expect(screen.getByPlaceholderText(/0x123/)).toBeInTheDocument()
        })

        it('11.5 Shows drag and drop area', () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<FileUploader />)

            expect(screen.getByText(/Drag & Drop Your Medical Files/)).toBeInTheDocument()
        })

        it('11.6 Shows supported file types', () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<FileUploader />)

            expect(screen.getByText(/Supported file types/)).toBeInTheDocument()
            // PDF appears in multiple elements
            expect(screen.getAllByText(/PDF/).length).toBeGreaterThan(0)
        })

        it('11.7 Shows security features section', () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<FileUploader />)

            expect(screen.getByText('Security & Guidelines')).toBeInTheDocument()
            expect(screen.getByText(/End-to-end encryption/)).toBeInTheDocument()
        })

        it('11.8 Shows upload guidelines', () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<FileUploader />)

            expect(screen.getByText(/Maximum file size: 100MB/)).toBeInTheDocument()
        })

        it('11.9 File input exists with correct accept types', () => {
            mockUseAccount.mockReturnValue({
                address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                isConnected: true
            })

            render(<FileUploader />)

            const fileInput = document.getElementById('medical-file-input') as HTMLInputElement
            expect(fileInput).toBeInTheDocument()
            expect(fileInput.accept).toContain('.pdf')
            expect(fileInput.accept).toContain('.jpg')
        })

        it('11.10 File input is disabled when wallet not connected', () => {
            mockUseAccount.mockReturnValue({ address: undefined, isConnected: false })

            render(<FileUploader />)

            const fileInput = document.getElementById('medical-file-input') as HTMLInputElement
            expect(fileInput).toBeDisabled()
        })
    })
})
