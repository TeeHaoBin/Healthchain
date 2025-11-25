"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { format } from "date-fns"
import { FileText, Upload, Calendar, File, Shield, ExternalLink, Search, Filter } from "lucide-react"

import RoleGuard from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fileUploadService, FileMetadata } from "@/services/fileUploadService"
import WalletConnect from "@/components/auth/WalletConnect"

export default function PatientRecordsPage() {
  const { isConnected, address } = useAccount()
  const [records, setRecords] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [viewingId, setViewingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecords() {
      if (!isConnected || !address) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await fileUploadService.getPatientFiles(address)
        setRecords(data)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch records:", err)
        setError("Failed to load health records. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [isConnected, address])

  const handleViewRecord = async (record: FileMetadata) => {
    try {
      setViewingId(record.id)
      const blob = await fileUploadService.retrieveFile(record.id)

      // Create object URL and open in new tab
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')

      // Clean up object URL after a delay to allow browser to load it
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error("Failed to view record:", err)
      alert("Failed to decrypt and view record. Please try again.")
    } finally {
      setViewingId(null)
    }
  }

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.recordType.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || record.recordType === filterType
    return matchesSearch && matchesType
  })

  const getFileIcon = (type: string) => {
    // Simple mapping for now, can be expanded
    return <FileText className="h-8 w-8 text-blue-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <RoleGuard allowedRoles={['patient']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Health Records</h1>
              <p className="mt-1 text-gray-500">
                View and manage your securely stored medical documents
              </p>
            </div>
            <Link href="/patient/upload">
              <Button className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700">
                <Upload className="h-4 w-4" />
                Upload New Record
              </Button>
            </Link>
          </div>

          {!isConnected ? (
            <Card className="p-8 text-center border-dashed">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet to View Records</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Your health records are encrypted and linked to your wallet address.
                Please connect your wallet to access them.
              </p>
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </Card>
          ) : (
            <>
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search records by name or type..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Tabs defaultValue="all" value={filterType} onValueChange={setFilterType} className="w-full sm:w-auto">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="lab-result">Labs</TabsTrigger>
                    <TabsTrigger value="prescription">Rx</TabsTrigger>
                    <TabsTrigger value="imaging">Imaging</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Records Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader className="h-24 bg-gray-100 rounded-t-xl" />
                      <CardContent className="p-6 space-y-3">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <Card className="p-8 text-center border-red-200 bg-red-50">
                  <p className="text-red-600">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4 border-red-200 hover:bg-red-100 text-red-700"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </Card>
              ) : filteredRecords.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <File className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || filterType !== 'all'
                      ? "Try adjusting your search or filters"
                      : "You haven't uploaded any health records yet"}
                  </p>
                  {(searchTerm || filterType !== 'all') && (
                    <Button variant="outline" onClick={() => { setSearchTerm(""); setFilterType("all") }}>
                      Clear Filters
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRecords.map((record) => (
                    <Card key={record.id} className="hover:shadow-md transition-shadow duration-200">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            {getFileIcon(record.recordType)}
                          </div>
                          <div>
                            <Badge variant="secondary" className="mb-1 capitalize">
                              {record.recordType.replace('-', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-blue-600"
                          onClick={() => handleViewRecord(record)}
                          disabled={viewingId === record.id}
                        >
                          {viewingId === record.id ? (
                            <span className="animate-spin">⌛</span>
                          ) : (
                            <ExternalLink className="h-4 w-4" />
                          )}
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <CardTitle className="text-base font-semibold line-clamp-1 mb-1" title={record.fileName}>
                          {record.fileName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.uploadedAt), 'MMM d, yyyy')}
                          <span className="text-gray-300">|</span>
                          <span>{formatFileSize(record.fileSize)}</span>
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <div className="w-full flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          <Shield className="h-3 w-3 text-green-600" />
                          <span className="truncate">Encrypted & Secure</span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}
