"use client"

import { useEffect, useState } from "react"

interface ConfidenceMeterProps {
  score: number // 0–100
  showLabel?: boolean
}

export function ConfidenceMeter({ score, showLabel = true }: ConfidenceMeterProps) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 50)
    return () => clearTimeout(t)
  }, [score])

  const colorClass =
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-yellow-500" :
    score >= 40 ? "bg-orange-500" :
                  "bg-red-500"

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>Match Score</span>
          <span className="font-semibold text-gray-700">{score}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full confidence-bar rounded-full ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
