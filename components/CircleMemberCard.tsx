import type { CircleMember } from "@/lib/mockData"

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-teal-500",
]

interface CircleMemberCardProps {
  member: CircleMember
  colorIndex?: number
}

export function CircleMemberCard({ member, colorIndex = 0 }: CircleMemberCardProps) {
  const avatarColor = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
      {/* Avatar */}
      <div
        className={`${avatarColor} w-10 h-10 rounded-full flex items-center justify-center
                    text-white font-bold text-sm shrink-0`}
      >
        {member.initials}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{member.name}</p>
        <p className="text-xs text-gray-500 truncate">{member.condition}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            {member.stage}
          </span>
          <span className="text-xs text-gray-400">
            {member.joinedDaysAgo}d ago
          </span>
        </div>
      </div>
    </div>
  )
}
