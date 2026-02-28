import type { RecoveryDataPoint } from "@/lib/mockData"

interface RecoveryChartProps {
  data: RecoveryDataPoint[]
}

export function RecoveryChart({ data }: RecoveryChartProps) {
  return (
    <div className="flex items-end gap-3" style={{ height: "120px" }}>
      {data.map((point) => {
        const heightPercent = point.successRate
        return (
          <div key={point.month} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs text-gray-500 font-medium">{point.successRate}%</span>
            <div className="w-full bg-gray-100 rounded-t-lg relative flex-1">
              <div
                className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all duration-700"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{point.month}</span>
          </div>
        )
      })}
    </div>
  )
}
