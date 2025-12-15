"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import RoleGuard from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import RecordSearch from '@/components/doctor/RecordSearch'
import RecordList from '@/components/doctor/RecordList'
import AccessRequestForm from '@/components/forms/AccessRequestForm'
import { EHRRecord } from '@/types'
import { useToast } from "@/components/ui/use-toast"
import { dbOperations } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'

export default function DoctorRequestPage() {
  const [searchResults, setSearchResults] = useState<EHRRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<EHRRecord | null>(null)
  const [permissionFilter, setPermissionFilter] = useState<'all' | 'granted' | 'pending' | 'none'>('all')
  const { address } = useAccount()
  const { user } = useRole()
  const { toast } = useToast()

  // Use wallet from connection OR session fallback
  const doctorWallet = address || user?.wallet_address

  const handleSearch = async (patientWallet: string) => {
    if (!patientWallet.trim()) return

    setLoading(true)
    setPermissionFilter('all') // Reset filter on new search
    try {
      let records

      console.log('[DoctorRequestPage] handleSearch doctorWallet:', doctorWallet)

      if (doctorWallet) {
        // Use permission-aware search
        console.log('[DoctorRequestPage] Using permission-aware search')
        records = await dbOperations.getRecordsWithPermissions(patientWallet, doctorWallet)
      } else {
        // Fallback to basic search if doctor wallet not available
        console.log('[DoctorRequestPage] WARNING: Falling back to basic search (no doctorWallet)')
        records = await dbOperations.searchRecords(patientWallet)
      }

      console.log('[DoctorRequestPage] Search results:', records?.map(r => ({ id: r.id, title: r.title, permissionStatus: r.permissionStatus })))
      setSearchResults(records || [])

      if (!records || records.length === 0) {
        toast({
          title: "No records found",
          description: "No health records found for this wallet address.",
          variant: "default",
        })
      } else {
        toast({
          title: `Found ${records.length} record${records.length !== 1 ? 's' : ''} `,
          description: "Review the records and request access as needed.",
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while searching for records."
      console.error("Search failed:", error)
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSuccess = () => {
    toast({
      title: "Request Submitted",
      description: `Successfully requested access for "${selectedRecord?.title}"`,
    })
    // Update the record's status in the list
    setSearchResults(prev =>
      prev.map(r =>
        r.id === selectedRecord?.id
          ? { ...r, permissionStatus: 'pending' as const }
          : r
      )
    )
    setSelectedRecord(null)
  }

  // Filter records based on permission status
  const filteredRecords = permissionFilter === 'all'
    ? searchResults
    : searchResults.filter(r => r.permissionStatus === permissionFilter)

  return (
    <RoleGuard allowedRoles={['doctor']}>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Request Patient Access
          </h1>

          {!selectedRecord ? (
            <>
              <RecordSearch onSearch={handleSearch} loading={loading} />
              <RecordList
                records={filteredRecords}
                allRecords={searchResults}
                loading={loading}
                onRequestAccess={setSelectedRecord}
                permissionFilter={permissionFilter}
                onFilterChange={setPermissionFilter}
              />
            </>
          ) : (
            <AccessRequestForm
              selectedRecord={selectedRecord}
              doctorWallet={doctorWallet || ''}
              onCancel={() => setSelectedRecord(null)}
              onSuccess={handleRequestSuccess}
            />
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}