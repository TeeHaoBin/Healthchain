import { Heart } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
      <div className="flex items-center gap-2">
        <Heart className="h-6 w-6 text-blue-600" />
        <span className="font-bold text-gray-900">HealthChain</span>
      </div>
      <p className="text-xs text-gray-600 sm:ml-4">
        © 2024 HealthChain. All rights reserved. Empowering patients worldwide.
      </p>
      <nav className="sm:ml-auto flex gap-4 sm:gap-6">
        <Link href="/terms" className="text-xs hover:underline underline-offset-4 text-gray-600 hover:text-blue-600">
          Terms of Service
        </Link>
        <Link
          href="/privacy"
          className="text-xs hover:underline underline-offset-4 text-gray-600 hover:text-blue-600"
        >
          Privacy Policy
        </Link>
        <Link
          href="/security"
          className="text-xs hover:underline underline-offset-4 text-gray-600 hover:text-blue-600"
        >
          Security
        </Link>
        <Link
          href="/support"
          className="text-xs hover:underline underline-offset-4 text-gray-600 hover:text-blue-600"
        >
          Support
        </Link>
      </nav>
    </footer>
  )
}