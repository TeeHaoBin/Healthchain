/**
 * AccessRequestTable Component Tests
 * Section 13.0 - Access Request Management Table
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next/link
const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
MockLink.displayName = 'MockLink'
jest.mock('next/link', () => MockLink)

// Mock UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}))

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, disabled, onClick, className }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; className?: string }) => (
        <button disabled={disabled} onClick={onClick} className={className}>
            {children}
        </button>
    ),
}))

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => <span className={className}>{children}</span>,
}))

jest.mock('@/components/ui/input', () => ({
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

jest.mock('@/components/ui/textarea', () => ({
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}))

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => <button data-value={value}>{children}</button>,
}))

jest.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Import component after mocks
import AccessRequestTable from '@/components/shared/AccessRequestTable'

describe('AccessRequestTable Component', () => {
    const mockRequests = [
        {
            id: 'req-1',
            doctor_wallet: '0xdoctor1',
            doctor_name: 'Dr. Smith',
            patient_wallet: '0xpatient1',
            status: 'sent' as const,
            purpose: 'Routine checkup',
            document_names: ['Blood Test Results'],
            requested_record_ids: ['rec-1'],
            sent_at: '2025-01-01T00:00:00Z',
            expires_at: '2025-01-08T00:00:00Z',
        },
        {
            id: 'req-2',
            doctor_wallet: '0xdoctor2',
            doctor_name: 'Dr. Jones',
            patient_wallet: '0xpatient1',
            status: 'approved' as const,
            purpose: 'Follow-up',
            document_names: ['X-Ray Report'],
            requested_record_ids: ['rec-2'],
            sent_at: '2025-01-02T00:00:00Z',
            expires_at: '2025-01-09T00:00:00Z',
        },
    ]

    const mockOnApprove = jest.fn()
    const mockOnReject = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('13.0 Access Request Table UI', () => {
        it('13.1 Shows loading state', () => {
            render(
                <AccessRequestTable
                    requests={[]}
                    loading={true}
                />
            )

            // Should show skeleton loading
            expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
        })

        it('13.2 Displays statistics cards', () => {
            render(
                <AccessRequestTable
                    requests={mockRequests}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            // Text appears in stats cards and filter tabs
            expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
            expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
            expect(screen.getAllByText('Declined').length).toBeGreaterThan(0)
        })

        it('13.3 Shows search input', () => {
            render(
                <AccessRequestTable
                    requests={mockRequests}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            expect(screen.getByPlaceholderText(/Search by doctor name/)).toBeInTheDocument()
        })

        it('13.4 Shows filter tabs', () => {
            render(
                <AccessRequestTable
                    requests={mockRequests}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            expect(screen.getByText('All')).toBeInTheDocument()
            expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
            expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
        })

        it('13.5 Displays table headers', () => {
            render(
                <AccessRequestTable
                    requests={mockRequests}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            expect(screen.getByText('Doctor')).toBeInTheDocument()
            expect(screen.getByText('Document')).toBeInTheDocument()
            expect(screen.getByText('Status')).toBeInTheDocument()
        })

        it('13.6 Shows doctor name in request row', () => {
            render(
                <AccessRequestTable
                    requests={mockRequests}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            expect(screen.getByText('Dr. Smith')).toBeInTheDocument()
        })

        it('13.7 Shows approve button for pending requests', () => {
            render(
                <AccessRequestTable
                    requests={mockRequests}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            expect(screen.getByText('Approve')).toBeInTheDocument()
        })

        it('13.8 Shows reject button for pending requests', () => {
            render(
                <AccessRequestTable
                    requests={mockRequests}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            expect(screen.getByText('Reject')).toBeInTheDocument()
        })

        it('13.9 Shows empty state when no requests', () => {
            render(
                <AccessRequestTable
                    requests={[]}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            // The component shows "No requests match your filters" when filter is on pending
            expect(screen.getByText(/No requests match/)).toBeInTheDocument()
        })

        it('13.10 Approve button calls onApprove', () => {
            render(
                <AccessRequestTable
                    requests={mockRequests}
                    onApprove={mockOnApprove}
                    onReject={mockOnReject}
                />
            )

            const approveButton = screen.getByText('Approve')
            fireEvent.click(approveButton)

            expect(mockOnApprove).toHaveBeenCalled()
        })
    })
})
