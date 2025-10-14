import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import Link from "next/link"

export function Header() {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <Link href="/" className="flex items-center justify-center">
        <Heart className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-xl font-bold text-gray-900">HealthChain</span>
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6">
        <Link href="#features" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
          Features
        </Link>
        <Link href="#how-it-works" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
          How It Works
        </Link>
        <Link href="#security" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
          Security
        </Link>
        <Link href="#contact" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
          Contact
        </Link>
      </nav>
      <div className="ml-6 flex gap-2">
        <Button variant="outline" size="sm">
          Sign In
        </Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
          Get Started
        </Button>
      </div>
    </header>
  )
}