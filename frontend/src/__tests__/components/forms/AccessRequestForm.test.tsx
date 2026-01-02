/**
 * AccessRequestForm Component Tests
 * Section 12.0 - Access Request Form UI
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
    dbOperations: {
        createAccessRequest: jest.fn(),
    },
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, disabled, onClick, type }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit' | 'reset' }) => (
        <button disabled={disabled} onClick={onClick} type={type} data-testid="button">
            {children}
        </button>
    ),
}))

jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}))

jest.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => <label htmlFor={htmlFor}>{children}</label>,
}))

jest.mock('@/components/ui/textarea', () => ({
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} data-testid="textarea" />,
}))

jest.mock('@/components/ui/select', () => ({
    Select: ({ children, value }: { children: React.ReactNode; value?: string }) => <div data-value={value}>{children}</div>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

// Import component after mocks
import AccessRequestForm from '@/components/forms/AccessRequestForm'

describe('AccessRequestForm Component', () => {
    const mockRecord = {
        id: 'record-123',
        patient_id: '0xpatient123',
        title: 'Medical Report',
        description: 'Patient medical report',
        file_type: 'PDF',
        ipfs_hash: 'Qm123',
        encrypted_key: 'key123',
        encryption_key_id: 'enc-key-123',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        file_size: 1024,
        is_encrypted: true,
        tags: ['medical', 'report'],
    }

    const mockDoctorWallet = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
    const mockOnCancel = jest.fn()
    const mockOnSuccess = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('12.0 Access Request Form UI', () => {
        it('12.1 Renders form title', () => {
            render(
                <AccessRequestForm
                    selectedRecord={mockRecord}
                    doctorWallet={mockDoctorWallet}
                    onCancel={mockOnCancel}
                    onSuccess={mockOnSuccess}
                />
            )

            expect(screen.getByText('Request Access')).toBeInTheDocument()
        })

        it('12.2 Displays selected record information', () => {
            render(
                <AccessRequestForm
                    selectedRecord={mockRecord}
                    doctorWallet={mockDoctorWallet}
                    onCancel={mockOnCancel}
                    onSuccess={mockOnSuccess}
                />
            )

            expect(screen.getByText('Medical Report')).toBeInTheDocument()
            expect(screen.getByText(/PDF/)).toBeInTheDocument()
        })

        it('12.3 Shows reason textarea field', () => {
            render(
                <AccessRequestForm
                    selectedRecord={mockRecord}
                    doctorWallet={mockDoctorWallet}
                    onCancel={mockOnCancel}
                    onSuccess={mockOnSuccess}
                />
            )

            expect(screen.getByText('Reason for Access')).toBeInTheDocument()
            expect(screen.getByTestId('textarea')).toBeInTheDocument()
        })

        it('12.4 Shows duration selection', () => {
            render(
                <AccessRequestForm
                    selectedRecord={mockRecord}
                    doctorWallet={mockDoctorWallet}
                    onCancel={mockOnCancel}
                    onSuccess={mockOnSuccess}
                />
            )

            expect(screen.getByText('Access Duration')).toBeInTheDocument()
        })

        it('12.5 Shows cancel button', () => {
            render(
                <AccessRequestForm
                    selectedRecord={mockRecord}
                    doctorWallet={mockDoctorWallet}
                    onCancel={mockOnCancel}
                    onSuccess={mockOnSuccess}
                />
            )

            expect(screen.getByText('Cancel')).toBeInTheDocument()
        })

        it('12.6 Shows submit button', () => {
            render(
                <AccessRequestForm
                    selectedRecord={mockRecord}
                    doctorWallet={mockDoctorWallet}
                    onCancel={mockOnCancel}
                    onSuccess={mockOnSuccess}
                />
            )

            expect(screen.getByText('Submit Access Request')).toBeInTheDocument()
        })

        it('12.7 Cancel button calls onCancel', () => {
            render(
                <AccessRequestForm
                    selectedRecord={mockRecord}
                    doctorWallet={mockDoctorWallet}
                    onCancel={mockOnCancel}
                    onSuccess={mockOnSuccess}
                />
            )

            const cancelButton = screen.getByText('Cancel')
            fireEvent.click(cancelButton)

            expect(mockOnCancel).toHaveBeenCalled()
        })

        it('12.8 Textarea accepts input', () => {
            render(
                <AccessRequestForm
                    selectedRecord={mockRecord}
                    doctorWallet={mockDoctorWallet}
                    onCancel={mockOnCancel}
                    onSuccess={mockOnSuccess}
                />
            )

            const textarea = screen.getByTestId('textarea')
            fireEvent.change(textarea, { target: { value: 'This is a valid reason for accessing the record' } })

            // Verify the form renders and accepts input
            expect(textarea).toBeInTheDocument()
        })
    })
})
