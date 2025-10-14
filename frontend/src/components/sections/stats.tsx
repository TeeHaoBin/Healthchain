export function StatsSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-blue-600 text-white">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-4 lg:gap-12">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="text-4xl font-bold">500K+</div>
            <div className="text-blue-100">Patients Protected</div>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="text-4xl font-bold">10K+</div>
            <div className="text-blue-100">Healthcare Providers</div>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="text-4xl font-bold">99.9%</div>
            <div className="text-blue-100">Uptime Guarantee</div>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="text-4xl font-bold">50+</div>
            <div className="text-blue-100">Countries Served</div>
          </div>
        </div>
      </div>
    </section>
  )
}