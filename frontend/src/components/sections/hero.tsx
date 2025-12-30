import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle } from "lucide-react"

export function HeroSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                🚀 Revolutionary Healthcare Technology
              </Badge>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-gray-900">
                Own Your Health Data. <span className="text-blue-600">Control Your Care.</span>
              </h1>
              <p className="max-w-none md:max-w-2xl text-gray-600 text-base sm:text-lg md:text-xl leading-relaxed">
                Experience the future of healthcare with our decentralized platform. Secure, private, and
                patient-controlled health records powered by blockchain technology.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <span>Blockchain Secured</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <span>Patient Owned</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 rounded-lg blur-3xl opacity-30"></div>
              <div className="relative w-full rounded-lg shadow-2xl overflow-hidden border border-gray-200">
                <Image
                  src="/images/hero-dashboard.png"
                  alt="HealthChain Patient Dashboard - Secure health records management"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}