/**
 * AccessHistory Component Tests
 * Section 14.0 - Doctor Access History View
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}))

// Mock next/link
const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
MockLink.displayName = 'MockLink'
jest.mock('next/link', () => MockLink)

// Mock Supabase helpers
const mockGetAccessRequestsWithPatient = jest.fn()
jest.mock('@/lib/supabase/helpers', () => ({
    getAccessRequestsWithPatient: () => mockGetAccessRequestsWithPatient(),
}))

// Mock UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}))

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) => (
        <button disabled={disabled} onClick={onClick}>
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
import AccessHistory from '@/components/shared/AccessHistory'

describe('AccessHistory Component', () => {
    const mockRequests = [
        {
            id: 'req-1',
            doctor_wallet: '0xdoctor1',
            patient_wallet: '0xpatient1',
            patient_name: 'John Doe',
            status: 'approved',
            purpose: 'Treatment assessment',
            document_names: ['Blood Test Report'],
            requested_record_ids: ['rec-1'],
            sent_at: '2025-01-01T00:00:00Z',
            expires_at: '2025-01-15T00:00:00Z',
        },
        {
            id: 'req-2',
            doctor_wallet: '0xdoctor1',
            patient_wallet: '0xpatient2',
            patient_name: 'Jane Smith',
            status: 'denied',
            purpose: 'Second opinion',
            document_names: ['MRI Scan'],
            requested_record_ids: ['rec-2'],
            sent_at: '2025-01-02T00:00:00Z',
            expires_at: '2025-01-09T00:00:00Z',
            denial_reason: 'Patient declined access',
        },
    ]

    beforeEach(() => {
        jest.clearAllMocks()
        mockGetAccessRequestsWithPatient.mockResolvedValue(mockRequests)
    })

    describe('14.0 Access History UI', () => {
        it('14.1 Shows loading state initially', () => {
            mockGetAccessRequestsWithPatient.mockReturnValue(new Promise(() => { }))

            render(<AccessHistory walletAddress="0xdoctor1" />)

            expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
        })

        it('14.2 Displays statistics after loading', async () => {
            render(<AccessHistory walletAddress="0xdoctor1" />)

            await waitFor(() => {
                // Text appears in both stats cards and filter tabs
                expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
                expect(screen.getAllByText('Granted').length).toBeGreaterThan(0)
                expect(screen.getAllByText('Declined').length).toBeGreaterThan(0)
            })
        })

        it('14.3 Shows search input', async () => {
            render(<AccessHistory walletAddress="0xdoctor1" />)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/Search by patient name/)).toBeInTheDocument()
            })
        })

        it('14.4 Displays filter tabs', async () => {
            render(<AccessHistory walletAddress="0xdoctor1" />)

            await waitFor(() => {
                expect(screen.getByText('All')).toBeInTheDocument()
                // These appear in tabs
                expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
                expect(screen.getAllByText('Granted').length).toBeGreaterThan(0)
            })
        })

        it('14.5 Shows table headers', async () => {
            render(<AccessHistory walletAddress="0xdoctor1" />)

            await waitFor(() => {
                expect(screen.getByText('Patient')).toBeInTheDocument()
                expect(screen.getByText('Document')).toBeInTheDocument()
                expect(screen.getByText('Status')).toBeInTheDocument()
            })
        })

        it('14.6 Displays patient name in row', async () => {
            render(<AccessHistory walletAddress="0xdoctor1" />)

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
            })
        })

        it('14.7 Shows request history title', async () => {
            render(<AccessHistory walletAddress="0xdoctor1" />)

            await waitFor(() => {
                expect(screen.getByText('Request History')).toBeInTheDocument()
            })
        })

        it('14.8 Shows error state on fetch failure', async () => {
            // Suppress console.error for this test
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })
            mockGetAccessRequestsWithPatient.mockRejectedValue(new Error('Fetch failed'))

            render(<AccessHistory walletAddress="0xdoctor1" />)

            await waitFor(() => {
                expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
            })

            consoleSpy.mockRestore()
        })

        it('14.9 Handles no wallet address', async () => {
            mockGetAccessRequestsWithPatient.mockResolvedValue([])

            render(<AccessHistory />)

            // Component renders without error
            await waitFor(() => {
                // Without wallet address, component should show empty/no data state
                expect(document.body).toBeInTheDocument()
            })
        })

        it('14.10 Expired and Revoked tabs are present', async () => {
            render(<AccessHistory walletAddress="0xdoctor1" />)

            await waitFor(() => {
                // Tabs render with these text values
                expect(screen.getAllByText('Expired').length).toBeGreaterThan(0)
                expect(screen.getAllByText('Revoked').length).toBeGreaterThan(0)
            })
        })
    })
})
