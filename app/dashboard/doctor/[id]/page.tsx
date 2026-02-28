import { notFound } from "next/navigation"
import { ConfidenceMeter } from "@/components/ConfidenceMeter"
import { RecoveryChart } from "@/components/RecoveryChart"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function DoctorDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams

  const name         = sp.name
  const specialty    = sp.specialty
  const hospital     = sp.hospital
  const matchScore   = Number(sp.matchScore ?? 0)
  const patientCount = Number(sp.patientCount ?? 0)

  if (!name) notFound()

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/doctor"
        className="text-sm text-blue-600 hover:underline mb-6 inline-block"
      >
        ← Back to Recommendations
      </Link>

      {/* Doctor header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">{name}</h2>
            <p className="text-gray-500 text-lg">
              {specialty} · {hospital}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-green-50 text-green-700 text-sm px-3 py-1.5 rounded-full border border-green-200 font-medium">
              Accepting New Patients
            </span>
          </div>
        </div>
      </div>

      {/* 3-column grid: AI Summary + Confidence Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AI Summary - 2 cols */}
        <div className="lg:col-span-2 bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-600 text-lg">🤖</span>
            <h3 className="font-semibold text-blue-900">AI Summary</h3>
          </div>
          <p className="text-blue-800 text-sm leading-relaxed">
            {specialty} specialist at {hospital}. Recommended based on strong patient outcome
            scores and high similarity to your profile.
          </p>
        </div>

        {/* Confidence Score - 1 col */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Match Confidence</h3>
            <div className="text-5xl font-bold text-gray-900 mb-1">{matchScore}%</div>
            <p className="text-xs text-gray-400 mb-4">based on patient similarity</p>
            <ConfidenceMeter score={matchScore} showLabel={false} />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Matched against {patientCount.toLocaleString()} similar patient outcomes
          </p>
        </div>
      </div>

      {/* Recovery Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-700 mb-2">
          Patient Recovery Rates — Last 6 Months
        </h3>
        <p className="text-xs text-gray-400 mb-6">
          Percentage of patients with similar profiles achieving positive outcomes
        </p>
        <RecoveryChart data={[]} />
      </div>
    </div>
  )
}
