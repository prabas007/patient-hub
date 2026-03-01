"use client"

import type { CircleMember } from "@/lib/mockData"

const AVATAR_COLORS = [
  "bg-orange-400",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-400",
  "bg-pink-500",
  "bg-teal-500",
]

interface CircleMemberCardProps {
  member: CircleMember
  colorIndex?: number
  showFriendRequest?: boolean
  requestSent?: boolean
  onRequest?: () => void
}

export function CircleMemberCard({
  member,
  colorIndex = 0,
  showFriendRequest,
  requestSent,
  onRequest,
}: CircleMemberCardProps) {
  const avatarColor = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]

  return (
    <div className="relative bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-start gap-3">
      {/* Avatar */}
      <div
        className={`${avatarColor} w-10 h-10 rounded-full flex items-center justify-center
                    text-white font-bold text-sm shrink-0`}
      >
        {member.initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 pr-6">
        <p className="font-semibold text-stone-900 text-sm truncate">{member.name}</p>
        <p className="text-xs text-stone-500 truncate">{member.condition}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-[#ede8f7] text-[#5c3d9e] px-2 py-0.5 rounded-full">
            {member.stage}
          </span>
          <span className="text-xs text-stone-400">{member.joinedDaysAgo}d ago</span>
        </div>
      </div>

      {/* Friend Request button — top-right corner */}
      {showFriendRequest && (
        <button
          onClick={onRequest}
          disabled={requestSent}
          title={requestSent ? "Request sent" : "Send friend request"}
          className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all
            ${
              requestSent
                ? "bg-green-100 text-green-600 cursor-default"
                : "bg-stone-100 text-stone-400 hover:bg-[#ede8f7] hover:text-[#5c3d9e]"
            }`}
        >
          {requestSent ? (
            /* Checkmark */
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            /* Plus */
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
