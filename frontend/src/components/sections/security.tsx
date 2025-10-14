import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"

export function SecuritySection() {
  return (
    <section id="security" className="w-full py-12 md:py-24 lg:py-32 bg-white">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">🔒 Enterprise Security</Badge>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900">
                Your Health Data is <span className="text-green-600">Fortress-Protected</span>
              </h2>
              <p className="max-w-[600px] text-gray-600 md:text-xl">
                Built with military-grade security standards and blockchain technology to ensure your health data
                remains private and secure.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900">End-to-End Encryption</h4>
                  <p className="text-sm text-gray-600">AES-256 encryption protects data in transit and at rest</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900">Zero-Knowledge Architecture</h4>
                  <p className="text-sm text-gray-600">We can&apos;t see your data, even if we wanted to</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900">Immutable Audit Trail</h4>
                  <p className="text-sm text-gray-600">Every access is recorded on the blockchain</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900">HIPAA Compliant</h4>
                  <p className="text-sm text-gray-600">Meets all healthcare privacy regulations</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 rounded-lg blur-3xl opacity-30"></div>
              <div className="relative w-[600px] h-[400px] bg-gradient-to-br from-green-100 to-blue-100 rounded-lg shadow-2xl flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <div className="text-4xl mb-2">🔒</div>
                  <div className="text-sm">Security Dashboard</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}