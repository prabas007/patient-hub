import Link from "next/link"

export default function ResourcesPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-stone-900 mb-4">
        Resources
      </h2>

      <p className="text-stone-600 mb-8 max-w-2xl">
        Trusted educational resources and AI-curated treatment guidance.
      </p>

      {/* Guidelines Card */}
      <Link href="/dashboard/resources/guidelines">
        <div className="bg-[#ede8f7] border border-[#c5bde0] rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
          <h3 className="text-lg font-semibold text-[#3a3030] mb-2">
            Guidelines & Responsible Use
          </h3>
          <p className="text-sm text-[#5c3d9e]">
            Learn how to use LinkCare safely and responsibly.
          </p>
        </div>
      </Link>

      {/* Placeholder Content */}
      <div className="mt-6 bg-stone-50 rounded-xl p-6 shadow-sm">
        <p className="text-stone-700">
          Personalized educational materials will appear here.
        </p>
      </div>
    </div>
  )
}