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
            <span className="text-xs text-stone-500 font-medium">{point.successRate}%</span>
            <div className="w-full bg-stone-100 rounded-t-lg relative" style={{ height: "80px" }}>
              <div
                className="absolute bottom-0 w-full rounded-t-lg transition-all duration-700"
                style={{ height: `${heightPercent}%`, backgroundColor: "#3b82f6" }}
              />
            </div>
            <span className="text-xs text-stone-400">{point.month}</span>
          </div>
        )
      })}
    </div>
  )
}