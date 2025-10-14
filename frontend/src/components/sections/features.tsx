import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Lock, Database, Zap, Globe } from "lucide-react"

export function FeaturesSection() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Core Features</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">
              Revolutionizing Healthcare Through Decentralization
            </h2>
            <p className="mx-auto max-w-3xl text-gray-600 text-base sm:text-lg md:text-xl leading-relaxed text-center">
              Our platform puts patients at the center of their healthcare journey with cutting-edge blockchain
              technology and user-centric design.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl items-stretch gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <Card className="border-2 border-gray-200 hover:border-gray-900 transition-colors h-full flex flex-col">
            <CardHeader className="flex-1">
              <Database className="h-12 w-12 text-blue-600 mb-2" />
              <CardTitle>Patient-Owned Records</CardTitle>
              <CardDescription>
                Your health data belongs to you. Access, share, and control your medical records across all
                healthcare providers.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-2 border-gray-200 hover:border-gray-900 transition-colors h-full flex flex-col">
            <CardHeader className="flex-1">
              <Shield className="h-12 w-12 text-green-600 mb-2" />
              <CardTitle>Blockchain Security</CardTitle>
              <CardDescription>
                Military-grade encryption and blockchain technology ensure your health data is secure and
                tamper-proof.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-2 border-gray-200 hover:border-gray-900 transition-colors h-full flex flex-col">
            <CardHeader className="flex-1">
              <Globe className="h-12 w-12 text-purple-600 mb-2" />
              <CardTitle>Global Interoperability</CardTitle>
              <CardDescription>
                Seamlessly share your health records with any healthcare provider worldwide, breaking down data
                silos.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-2 border-gray-200 hover:border-gray-900 transition-colors h-full flex flex-col">
            <CardHeader className="flex-1">
              <Zap className="h-12 w-12 text-yellow-600 mb-2" />
              <CardTitle>Instant Access</CardTitle>
              <CardDescription>
                Get immediate access to your complete health history, lab results, and medical imaging from
                anywhere.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-2 border-gray-200 hover:border-gray-900 transition-colors h-full flex flex-col">
            <CardHeader className="flex-1">
              <Users className="h-12 w-12 text-red-600 mb-2" />
              <CardTitle>Care Coordination</CardTitle>
              <CardDescription>
                Enable seamless collaboration between your healthcare team with secure, real-time data sharing.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-2 border-gray-200 hover:border-gray-900 transition-colors h-full flex flex-col">
            <CardHeader className="flex-1">
              <Lock className="h-12 w-12 text-indigo-600 mb-2" />
              <CardTitle>Privacy First</CardTitle>
              <CardDescription>
                Advanced privacy controls let you decide who sees what, when, and for how long.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  )
}