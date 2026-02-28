"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ConfidenceMeter } from "@/components/ConfidenceMeter"
import type { Doctor } from "@/lib/mockData"

interface DoctorCardProps {
  doctor: Doctor
  index?: number
}

export function DoctorCard({ doctor, index = 0 }: DoctorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
    >
      <Link href={`/dashboard/doctor/${doctor.id}`}>
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl
                        transition-all duration-200 cursor-pointer group
                        border border-transparent hover:border-blue-100">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                {doctor.name}
              </h3>
              <p className="text-sm text-gray-500">
                {doctor.specialty} · {doctor.experienceYears} yrs exp
              </p>
            </div>
            {doctor.acceptingNew && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full
                               font-medium border border-green-200 shrink-0 ml-2">
                Accepting New
              </span>
            )}
          </div>

          {/* Location */}
          <p className="text-sm text-gray-400 mb-4">
            {doctor.hospital} · {doctor.location}
          </p>

          {/* Confidence Meter */}
          <ConfidenceMeter score={doctor.matchScore} />
        </div>
      </Link>
    </motion.div>
  )
}
