import { MOCK_DOCTORS } from "@/lib/mockData"
import { notFound } from "next/navigation"
import { ConfidenceMeter } from "@/components/ConfidenceMeter"
import { RecoveryChart } from "@/components/RecoveryChart"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DoctorDetailPage({ params }: PageProps) {
  const { id } = await params
  const doctor = MOCK_DOCTORS.find((d) => d.id === id)

  if (!doctor) notFound()

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
            <h2 className="text-3xl font-bold text-gray-900 mb-1">{doctor.name}</h2>
            <p className="text-gray-500 text-lg">
              {doctor.specialty} · {doctor.hospital}
            </p>
            <p className="text-gray-400 text-sm mt-1">{doctor.location}</p>
          </div>
          <div className="text-right">
            {doctor.acceptingNew ? (
              <span className="inline-block bg-green-50 text-green-700 text-sm px-3 py-1.5 rounded-full border border-green-200 font-medium">
                Accepting New Patients
              </span>
            ) : (
              <span className="inline-block bg-gray-50 text-gray-500 text-sm px-3 py-1.5 rounded-full border border-gray-200">
                Not Accepting New Patients
              </span>
            )}
            <p className="text-gray-400 text-xs mt-2">
              {doctor.experienceYears} years experience
            </p>
          </div>
        </div>

        {/* Languages */}
        <div className="flex gap-2 mt-3">
          {doctor.languages.map((lang) => (
            <span
              key={lang}
              className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100"
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* 3-column grid: AI Summary + Confidence Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AI Summary - 2 cols */}
        <div className="lg:col-span-2 bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-600 text-lg">🤖</span>
            <h3 className="font-semibold text-blue-900">AI Summary</h3>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-auto">
              Generated · Mock
            </span>
          </div>
          <p className="text-blue-800 text-sm leading-relaxed">{doctor.aiSummary}</p>
        </div>

        {/* Confidence Score - 1 col */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Match Confidence</h3>
            <div className="text-5xl font-bold text-gray-900 mb-1">{doctor.matchScore}%</div>
            <p className="text-xs text-gray-400 mb-4">based on patient similarity</p>
            <ConfidenceMeter score={doctor.matchScore} showLabel={false} />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Matched against {doctor.patientCount.toLocaleString()} similar patient outcomes
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
        <RecoveryChart data={doctor.recoveryData} />
      </div>
    </div>
  )
}
