"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { format } from "date-fns"
import { FileText, Upload, Calendar, File, Shield, ExternalLink, Search, Filter, Pencil, Trash2 } from "lucide-react"

import RoleGuard from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { fileUploadService, FileMetadata } from "@/services/fileUploadService"
import WalletConnect from "@/components/auth/WalletConnect"

export default function PatientRecordsPage() {
  const { isConnected, address } = useAccount()
  const { toast } = useToast()

  // Parse highlightId from URL on client side to avoid useSearchParams Suspense issues
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const [records, setRecords] = useState<FileMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<FileMetadata | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [recordToEdit, setRecordToEdit] = useState<FileMetadata | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editRecordType, setEditRecordType] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  // Refs for scrolling to highlighted card
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Parse highlightId from URL on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const id = params.get('highlightId')
      if (id) {
        setHighlightId(id)
      }
    }
  }, [])

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

  // Scroll to and highlight the record if highlightId is provided
  useEffect(() => {
    if (highlightId && !loading && records.length > 0) {
      // Set the highlighted ID
      setHighlightedId(highlightId)

      // Scroll to the card after a short delay to ensure DOM is ready
      setTimeout(() => {
        const cardElement = cardRefs.current.get(highlightId)
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)

      // Clear highlight after 5 seconds
      setTimeout(() => {
        setHighlightedId(null)
      }, 5000)
    }
  }, [highlightId, loading, records])

  const handleViewRecord = async (record: FileMetadata) => {
    try {
      setViewingId(record.id)
      const blob = await fileUploadService.retrieveFile(record.id)

      // Create object URL and open in new tab
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')

      // Clean up object URL after a delay to allow browser to load it
      setTimeout(() => URL.revokeObjectURL(url), 10000) // 10 seconds
    } catch (err) {
      console.error("Failed to view record:", err)
      alert("Failed to decrypt and view record. Please try again.")
    } finally {
      setViewingId(null)
    }
  }

  // Open delete confirmation dialog
  const handleDeleteClick = (record: FileMetadata) => {
    setRecordToDelete(record)
    setDeleteDialogOpen(true)
  }

  // Open edit dialog
  const handleEditClick = (record: FileMetadata) => {
    setRecordToEdit(record)
    setEditTitle(record.title)
    setEditRecordType(record.recordType)
    setEditDialogOpen(true)
  }

  // Confirm and execute edit
  const confirmEdit = async () => {
    if (!recordToEdit || !address) return

    // Validate title
    if (!editTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Document title cannot be empty.",
        variant: "destructive",
      })
      return
    }

    try {
      setSavingEdit(true)

      const result = await fileUploadService.updateRecord(recordToEdit.id, address, {
        title: editTitle.trim(),
        recordType: editRecordType,
      })

      if (result.success) {
        // Update local state
        setRecords(prev => prev.map(r =>
          r.id === recordToEdit.id
            ? { ...r, title: editTitle.trim(), recordType: editRecordType }
            : r
        ))
        setEditDialogOpen(false)
        toast({
          title: "Record Updated",
          description: `"${editTitle.trim()}" has been updated successfully.`,
        })
      } else {
        throw new Error(result.error || "Failed to update record")
      }
    } catch (err) {
      console.error("Failed to update record:", err)
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update record. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingEdit(false)
      setRecordToEdit(null)
    }
  }

  // Confirm and execute deletion
  const confirmDelete = async () => {
    if (!recordToDelete || !address) return

    try {
      setDeletingId(recordToDelete.id)
      setDeleteDialogOpen(false)

      const result = await fileUploadService.deleteRecord(recordToDelete.id, address)

      if (result.success) {
        // Remove from local state
        setRecords(prev => prev.filter(r => r.id !== recordToDelete.id))
        toast({
          title: "Record Deleted",
          description: `"${recordToDelete.title}" has been permanently deleted.`,
        })
      } else {
        throw new Error(result.error || "Failed to delete record")
      }
    } catch (err) {
      console.error("Failed to delete record:", err)
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "Failed to delete record. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
      setRecordToDelete(null)
    }
  }

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="lab-result">Labs</TabsTrigger>
                    <TabsTrigger value="prescription">Prescriptions</TabsTrigger>
                    <TabsTrigger value="imaging">Imaging</TabsTrigger>
                    <TabsTrigger value="discharge-summary">Discharge</TabsTrigger>
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
                    <Card
                      key={record.id}
                      ref={(el: HTMLDivElement | null) => {
                        if (el) cardRefs.current.set(record.id, el)
                        else cardRefs.current.delete(record.id)
                      }}
                      className={`hover:shadow-md transition-all duration-300 ${highlightedId === record.id
                        ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg bg-blue-50/50'
                        : ''
                        }`}
                      style={highlightedId === record.id ? {
                        animation: 'blink-border 0.8s ease-in-out infinite'
                      } : undefined}
                    >
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
                        <CardTitle className="text-base font-semibold line-clamp-1 mb-1" title={record.title}>
                          {record.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.uploadedAt), 'MMM d, yyyy')}
                          <span className="text-gray-300">|</span>
                          <span>{formatFileSize(record.fileSize)}</span>
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <div className="w-full flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => handleEditClick(record)}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            onClick={() => handleDeleteClick(record)}
                            disabled={deletingId === record.id}
                          >
                            {deletingId === record.id ? (
                              <span className="animate-spin">⌛</span>
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            {deletingId === record.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Health Record</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-sm text-gray-500">
                  <p>
                    Are you sure you want to delete <strong>&quot;{recordToDelete?.title}&quot;</strong>?
                  </p>
                  <p className="mt-3">
                    This action cannot be undone. The file will be permanently removed from your health records and IPFS storage.
                  </p>
                  <p className="mt-3">
                    Any pending or approved access requests for this document will be revoked.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Record Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Health Record</DialogTitle>
              <DialogDescription>
                Update the document title and record type. Click save when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Document Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter document title"
                  disabled={savingEdit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-record-type">Record Type</Label>
                <Select
                  value={editRecordType}
                  onValueChange={setEditRecordType}
                  disabled={savingEdit}
                >
                  <SelectTrigger id="edit-record-type">
                    <SelectValue placeholder="Select record type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Health Record</SelectItem>
                    <SelectItem value="lab-result">Lab Result</SelectItem>
                    <SelectItem value="prescription">Prescription</SelectItem>
                    <SelectItem value="imaging">Medical Imaging</SelectItem>
                    <SelectItem value="discharge-summary">Discharge Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmEdit}
                disabled={savingEdit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingEdit ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  )
}
