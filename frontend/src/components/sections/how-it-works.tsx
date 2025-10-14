import { Badge } from "@/components/ui/badge"
import { Smartphone, FileText, Stethoscope } from "lucide-react"

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">Simple Steps to Healthcare Freedom</h2>
            <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Get started with decentralized healthcare in three easy steps.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-xl font-bold">
              1
            </div>
            <Smartphone className="h-12 w-12 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Create Your Digital Identity</h3>
            <p className="text-gray-600">
              Sign up and create your secure digital health identity. Your private keys, your control.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white text-xl font-bold">
              2
            </div>
            <FileText className="h-12 w-12 text-green-600" />
            <h3 className="text-xl font-bold text-gray-900">Import Your Health Data</h3>
            <p className="text-gray-600">
              Securely import your existing health records from any provider or start fresh with new data.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-white text-xl font-bold">
              3
            </div>
            <Stethoscope className="h-12 w-12 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-900">Connect with Providers</h3>
            <p className="text-gray-600">
              Share your data with healthcare providers on your terms. Revoke access anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}