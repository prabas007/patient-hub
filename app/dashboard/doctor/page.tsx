"use client"

import { useState, useEffect } from "react"
import { DoctorCard } from "@/components/DoctorCard"
import { DoctorCardSkeleton } from "@/components/Skeleton"
import { PageTransition } from "@/components/PageTransition"
import type { Doctor } from "@/lib/mockData"

export default function DoctorPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            condition: "Breast Cancer",
            stage: "Stage II",
            esiCategory: "calm",
            topK: 10,
          }),
        })

        if (!res.ok) throw new Error(`API error: ${res.status}`)

        const data = await res.json()
        console.log("Full API response:", JSON.stringify(data, null, 2))
        console.log("doctor_recommendations:", data.doctor_recommendations)

        const mapped: Doctor[] = (data.doctor_recommendations ?? []).map((d: any) => ({
          id: d.doctor_id,
          name: d.doctor_name,
          specialty: d.doctor_specialty,
          hospital: d.doctor_hospital,
          location: "",
          matchScore: Math.round(d.composite_score * 100),
          acceptingNew: true,
          experienceYears: 0,
          languages: [],
          aiSummary: "",
          patientCount: d.supporting_experiences,
          recoveryData: [],
        }))

        console.log("Mapped doctors:", mapped)
        setDoctors(mapped)
      } catch (err: any) {
        console.error("Fetch error:", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [])

  return (
    <PageTransition>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Doctor Recommender</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        AI-powered doctor recommendations based on similar patient experiences,
        structured outcomes, and recovery data.
      </p>

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          Failed to load recommendations: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <DoctorCardSkeleton key={i} />)
          : doctors.map((doctor, i) => (
              <DoctorCard key={doctor.id} doctor={doctor} index={i} />
            ))}
      </div>
    </PageTransition>
  )
}