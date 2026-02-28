"use client"

import { useState, useEffect } from "react"
import { MOCK_DOCTORS } from "@/lib/mockData"
import { DoctorCard } from "@/components/DoctorCard"
import { DoctorCardSkeleton } from "@/components/Skeleton"
import { PageTransition } from "@/components/PageTransition"

export default function DoctorPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <PageTransition>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Doctor Recommender
      </h2>

      <p className="text-gray-600 mb-8 max-w-2xl">
        AI-powered doctor recommendations based on similar patient experiences,
        structured outcomes, and recovery data.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <DoctorCardSkeleton key={i} />
            ))
          : MOCK_DOCTORS.map((doctor, i) => (
              <DoctorCard key={doctor.id} doctor={doctor} index={i} />
            ))}
      </div>
    </PageTransition>
  )
}
