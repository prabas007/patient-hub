import type { Milestone } from "@/lib/mockData"

interface MilestoneCardProps {
  milestone: Milestone
  memberName: string
  onDelete?: () => void
}

export function MilestoneCard({ milestone, memberName, onDelete }: MilestoneCardProps) {
  const isComplete = milestone.completedAt !== null

  const formattedDate = isComplete
    ? new Date(milestone.completedAt!).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className={`relative rounded-xl border p-4 flex items-start gap-3
      ${isComplete ? "bg-green-50 border-green-200" : "bg-stone-50 border-stone-200"}`}>
      {/* Status icon */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
        ${isComplete ? "bg-green-500" : "bg-gray-300"}`}>
        {isComplete ? (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-2 h-2 rounded-full bg-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${onDelete ? "pr-5" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <p className={`font-semibold text-sm ${isComplete ? "text-green-900" : "text-stone-600"}`}>
            {milestone.title}
          </p>
          <span className="text-xs text-stone-400 shrink-0">
            Day {milestone.daysFromDiagnosis}
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${isComplete ? "text-green-700" : "text-stone-400"}`}>
          {milestone.description}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-stone-400">{memberName}</span>
          {isComplete ? (
            <span className="text-xs text-green-600 font-medium">{formattedDate}</span>
          ) : (
            <span className="text-xs text-stone-400 italic">Pending</span>
          )}
        </div>
      </div>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={onDelete}
          title="Remove milestone"
          className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full
                     text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
