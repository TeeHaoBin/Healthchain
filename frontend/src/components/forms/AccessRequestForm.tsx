"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function AccessRequestForm() {
  const [formData, setFormData] = useState({
    patientWallet: "",
    reason: "",
    duration: "7"
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // TODO: Implement actual access request logic
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      console.log("Access request submitted:", formData)
      setFormData({ patientWallet: "", reason: "", duration: "7" })
    } catch (error) {
      console.error("Request failed:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="patientWallet" className="block text-sm font-medium text-gray-700 mb-2">
            Patient Wallet Address
          </label>
          <Input
            id="patientWallet"
            name="patientWallet"
            type="text"
            required
            value={formData.patientWallet}
            onChange={handleChange}
            placeholder="0x..."
            className="w-full"
          />
          <p className="text-sm text-gray-500">You&apos;re requesting access to:</p>
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Access
          </label>
          <textarea
            id="reason"
            name="reason"
            required
            value={formData.reason}
            onChange={handleChange}
            rows={4}
            placeholder="Please explain why you need access to this patient's health records..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
            Access Duration (days)
          </label>
          <select
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting Request..." : "Submit Access Request"}
          </Button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Important Notes:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• The patient will be notified of your access request</li>
          <li>• Access is only granted with patient consent</li>
          <li>• All access is logged and auditable</li>
          <li>• Access expires automatically after the specified duration</li>
        </ul>
      </div>
    </Card>
  )
}