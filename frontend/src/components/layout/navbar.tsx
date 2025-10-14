import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <nav className="flex items-center justify-between p-6 lg:px-8">
      <div className="flex lg:flex-1">
        <a href="#" className="-m-1.5 p-1.5">
          <span className="sr-only">HealthChain</span>
          <div className="text-2xl font-bold text-blue-600">HealthChain</div>
        </a>
      </div>
      <div className="hidden lg:flex lg:gap-x-12">
        <a href="#features" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
          Features
        </a>
        <a href="#how-it-works" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
          How It Works
        </a>
        <a href="#pricing" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
          Pricing
        </a>
        <a href="#about" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
          About
        </a>
      </div>
      <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
        <Button variant="ghost" className="text-sm font-semibold leading-6 text-gray-900">
          Sign In
        </Button>
        <Button className="text-sm font-semibold leading-6">
          Get Started
        </Button>
      </div>
    </nav>
  )
}