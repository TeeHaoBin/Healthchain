"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EHRViewerProps {
    recordId: string
    userType: 'doctor' | 'patient' | 'admin'
}

export default function EHRViewer({ recordId, userType }: EHRViewerProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>EHR Viewer</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Viewing record: {recordId}</p>
                <p>User type: {userType}</p>
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded mt-4">
                    Placeholder: EHR Viewer component implementation pending.
                </div>
            </CardContent>
        </Card>
    )
}
