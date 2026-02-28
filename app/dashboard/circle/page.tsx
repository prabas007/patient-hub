"use client"

import { MOCK_CIRCLE_MEMBERS } from "@/lib/mockData"
import { CircleMemberCard } from "@/components/CircleMemberCard"
import { MilestoneCard } from "@/components/MilestoneCard"
import { ChatSection } from "@/components/ChatSection"
import { PageTransition } from "@/components/PageTransition"

// Collect milestones from the first 3 members for the milestone board
const MILESTONE_BOARD = MOCK_CIRCLE_MEMBERS.slice(0, 3).flatMap((member) =>
  member.milestones.map((m) => ({ milestone: m, memberName: member.name }))
)

export default function CirclePage() {
  return (
    <PageTransition>
      {/* Header */}
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Care Circle</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Connect with patients in similar stages of care and recovery. Share experiences
        and track your milestones together.
      </p>

      {/* ── Member Cards ──────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">
            Your Matched Members
            <span className="ml-2 text-sm text-gray-400 font-normal">
              ({MOCK_CIRCLE_MEMBERS.length} matched)
            </span>
          </h3>
          <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
            Stage 2 Recovery cohort
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MOCK_CIRCLE_MEMBERS.map((member, i) => (
            <CircleMemberCard key={member.id} member={member} colorIndex={i} />
          ))}
        </div>
      </section>

      {/* ── Milestone Board ───────────────────────────────────────────── */}
      <section className="mb-10">
        <h3 className="font-semibold text-gray-700 mb-4">
          Circle Milestones
          <span className="ml-2 text-sm text-gray-400 font-normal">
            (shared progress from your circle)
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MILESTONE_BOARD.map(({ milestone, memberName }) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              memberName={memberName}
            />
          ))}
        </div>
      </section>

      {/* ── Chat Section ──────────────────────────────────────────────── */}
      <ChatSection />
    </PageTransition>
  )
}
