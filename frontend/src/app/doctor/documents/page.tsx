"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useAccount } from "wagmi"
import { format } from "date-fns"
import { FileText, Calendar, Shield, ExternalLink, Search, KeyRound, File, User } from "lucide-react"

import RoleGuard from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fileUploadService, FileMetadata } from "@/services/fileUploadService"
import WalletConnect from "@/components/auth/WalletConnect"

export default function DoctorDocumentsPage() {
    const { isConnected, address } = useAccount()
    const [files, setFiles] = useState<FileMetadata[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterType, setFilterType] = useState("all")
    const [viewingId, setViewingId] = useState<string | null>(null)

    // Highlight state for document link navigation
    const [highlightId, setHighlightId] = useState<string | null>(null)
    const [highlightedId, setHighlightedId] = useState<string | null>(null)
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

    useEffect(() => {
        async function fetchData() {
            if (!isConnected || !address) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                // Use fileUploadService to get files where doctor is in authorized_doctors array
                const data = await fileUploadService.getDoctorAccessibleFiles(address)
                setFiles(data || [])
                setError(null)
            } catch (err) {
                console.error("Failed to fetch data:", err)
                setError("Failed to load documents. Please try again.")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [isConnected, address])

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

    // Scroll to and highlight the document if highlightId is provided
    useEffect(() => {
        if (highlightId && !loading && files.length > 0) {
            setHighlightedId(highlightId)

            setTimeout(() => {
                const cardElement = cardRefs.current.get(highlightId)
                if (cardElement) {
                    cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 100)

            setTimeout(() => {
                setHighlightedId(null)
            }, 5000)
        }
    }, [highlightId, loading, files])

    const handleViewRecord = async (file: FileMetadata) => {
        try {
            setViewingId(file.id)
            const blob = await fileUploadService.retrieveFile(file.id)

            // Create download/view URL
            const url = URL.createObjectURL(blob)

            // Use anchor element for more reliable file handling
            const a = document.createElement('a')
            a.href = url
            a.target = '_blank'
            a.download = file.title || 'health-document'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            // Cleanup after a delay
            setTimeout(() => URL.revokeObjectURL(url), 60000)
        } catch (err) {
            console.error("Failed to view record:", err)
            alert("Failed to decrypt and view record. Please try again.")
        } finally {
            setViewingId(null)
        }
    }

    // Helper function to check if file type matches filter
    const matchesFileType = (mimeType: string, filter: string): boolean => {
        if (filter === "all") return true

        const normalizedMime = mimeType.toLowerCase()
        switch (filter) {
            case "PDF":
                return normalizedMime.includes("pdf")
            case "DICOM":
                return normalizedMime.includes("dicom")
            case "Image":
                return normalizedMime.startsWith("image/")
            default:
                return true
        }
    }

    const filteredFiles = files.filter(file => {
        const matchesSearch =
            file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.fileType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.patientAddress.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesType = matchesFileType(file.fileType, filterType)
        return matchesSearch && matchesType
    })

    const getFileTypeBadge = (mimeType: string) => {
        const normalizedMime = mimeType.toLowerCase()
        if (normalizedMime.includes("pdf")) {
            return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">PDF</Badge>
        }
        if (normalizedMime.includes("dicom")) {
            return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">DICOM</Badge>
        }
        if (normalizedMime.startsWith("image/")) {
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Image</Badge>
        }
        // Handle Word documents
        if (normalizedMime.includes("wordprocessingml") || normalizedMime.includes("msword")) {
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">DOC</Badge>
        }
        // Handle Excel spreadsheets
        if (normalizedMime.includes("spreadsheetml") || normalizedMime.includes("ms-excel")) {
            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">XLS</Badge>
        }
        // Handle PowerPoint presentations
        if (normalizedMime.includes("presentationml") || normalizedMime.includes("ms-powerpoint")) {
            return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">PPT</Badge>
        }
        // Handle plain text files
        if (normalizedMime.startsWith("text/")) {
            return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">TXT</Badge>
        }
        // For other types, show a simplified label
        const suffix = mimeType.split('/').pop() || 'File'
        // Truncate long suffixes
        const displayLabel = suffix.length > 10 ? 'File' : suffix.toUpperCase()
        return <Badge variant="secondary">{displayLabel}</Badge>
    }

    return (
        <RoleGuard allowedRoles={['doctor']}>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Patient Documents</h1>
                            <p className="mt-1 text-gray-500">
                                View documents shared with you by your patients
                            </p>
                        </div>
                        <Link href="/doctor/request">
                            <Button className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700">
                                <KeyRound className="h-4 w-4" />
                                Request Access
                            </Button>
                        </Link>
                    </div>

                    {!isConnected ? (
                        <Card className="p-8 text-center border-dashed">
                            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet to View Documents</h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                Access to patient records is secured by blockchain.
                                Please connect your wallet to verify your identity.
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
                                        placeholder="Search by file name, type, or patient address..."
                                        className="pl-10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Tabs defaultValue="all" value={filterType} onValueChange={setFilterType} className="w-full sm:w-auto">
                                    <TabsList>
                                        <TabsTrigger value="all">All</TabsTrigger>
                                        <TabsTrigger value="PDF">PDF</TabsTrigger>
                                        <TabsTrigger value="DICOM">DICOM</TabsTrigger>
                                        <TabsTrigger value="Image">Image</TabsTrigger>
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
                            ) : filteredFiles.length === 0 ? (
                                <Card className="p-12 text-center border-dashed">
                                    <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <File className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
                                    <p className="text-gray-500 mb-6">
                                        {searchTerm || filterType !== 'all'
                                            ? "Try adjusting your search or filters"
                                            : "No patients have granted you access to documents yet"}
                                    </p>
                                    {(searchTerm || filterType !== 'all') && (
                                        <Button variant="outline" onClick={() => { setSearchTerm(""); setFilterType("all") }}>
                                            Clear Filters
                                        </Button>
                                    )}
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredFiles.map((file) => (
                                        <Card
                                            key={file.id}
                                            ref={(el: HTMLDivElement | null) => {
                                                if (el) cardRefs.current.set(file.id, el)
                                                else cardRefs.current.delete(file.id)
                                            }}
                                            className={`hover:shadow-md transition-all duration-300 ${highlightedId === file.id
                                                ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg bg-blue-50/50'
                                                : ''
                                                }`}
                                            style={highlightedId === file.id ? {
                                                animation: 'blink-border 0.8s ease-in-out infinite'
                                            } : undefined}
                                        >
                                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 rounded-lg">
                                                        <FileText className="h-8 w-8 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        {getFileTypeBadge(file.fileType)}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-400 hover:text-blue-600"
                                                    onClick={() => handleViewRecord(file)}
                                                    disabled={viewingId === file.id}
                                                >
                                                    {viewingId === file.id ? (
                                                        <span className="animate-spin">⌛</span>
                                                    ) : (
                                                        <ExternalLink className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <CardTitle className="text-base font-semibold line-clamp-1 mb-1" title={file.title}>
                                                    {file.title}
                                                </CardTitle>
                                                <div className="text-sm text-gray-600 flex flex-col gap-1 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(file.uploadedAt), 'MMM d, yyyy')}
                                                        <span className="text-gray-300">|</span>
                                                        <span>{file.recordType}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <User className="h-3 w-3" />
                                                        <span className="truncate" title={file.patientAddress}>
                                                            {file.patientAddress.slice(0, 6)}...{file.patientAddress.slice(-4)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter className="pt-0">
                                                <div className="w-full flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                                    <Shield className="h-3 w-3 text-green-600" />
                                                    <span className="truncate">
                                                        Access Granted
                                                    </span>
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
