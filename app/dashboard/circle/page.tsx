"use client"

import { useState, useEffect } from "react"
import {
  MOCK_CIRCLE_MEMBERS,
  MOCK_PERSONAL_MEMBERS,
} from "@/lib/mockData"
import type { Milestone } from "@/lib/mockData"
import { CircleMemberCard } from "@/components/CircleMemberCard"
import { MilestoneCard } from "@/components/MilestoneCard"
import { PageTransition } from "@/components/PageTransition"

const MAX_VISIBLE = 6

interface MilestoneEntry {
  milestone: Milestone
  memberName: string
}

// Mock incoming friend requests — hardcoded for demo
const INITIAL_INCOMING = [
  {
    id: "req-1",
    name: "Carlos M.",
    initials: "CM",
    condition: "Atrial Fibrillation",
    stage: "Stage 2 Recovery",
  },
  {
    id: "req-2",
    name: "Nadia K.",
    initials: "NK",
    condition: "Hypertensive Heart Disease",
    stage: "Stage 1 Management",
  },
]

export default function CirclePage() {
  const [memberTab, setMemberTab] = useState<"matched" | "personal">("matched")

  // Friend request state
  const [sentRequests, setSentRequests] = useState<string[]>([])
  const [showToast, setShowToast] = useState(false)
  const [incomingRequests, setIncomingRequests] =
    useState(INITIAL_INCOMING)

  // Milestone form state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [userMilestones, setUserMilestones] = useState<MilestoneEntry[]>([])
  const [milestoneTitle, setMilestoneTitle] = useState("")
  const [milestoneDesc, setMilestoneDesc] = useState("")
  const [milestoneCompleted, setMilestoneCompleted] = useState(false)

  const activeMembers =
    memberTab === "matched" ? MOCK_CIRCLE_MEMBERS : MOCK_PERSONAL_MEMBERS
  const visibleMembers = activeMembers.slice(0, MAX_VISIBLE)
  const hiddenCount = activeMembers.length - visibleMembers.length

  // Members the user sent requests to (for Pending section)
  const pendingMembers = MOCK_CIRCLE_MEMBERS.filter((m) =>
    sentRequests.includes(m.id)
  )

  // Milestones from active circle members (first 3)
  const circleMilestones: MilestoneEntry[] = activeMembers
    .slice(0, 3)
    .flatMap((member) =>
      member.milestones.map((m) => ({ milestone: m, memberName: member.name }))
    )

  // User-added milestones appear first
  const allMilestones = [...userMilestones, ...circleMilestones]

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFriendRequest = (memberId: string) => {
    if (sentRequests.includes(memberId)) return
    setSentRequests((prev) => [...prev, memberId])
    setShowToast(true)
  }

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!showToast) return
    const t = setTimeout(() => setShowToast(false), 3000)
    return () => clearTimeout(t)
  }, [showToast])

  const handleAccept = (id: string) =>
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id))

  const handleDecline = (id: string) =>
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id))

  const addMilestone = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!milestoneTitle.trim()) return

    const newEntry: MilestoneEntry = {
      milestone: {
        id: `user-${Date.now()}`,
        title: milestoneTitle.trim(),
        description: milestoneDesc.trim(),
        completedAt: milestoneCompleted ? new Date().toISOString() : null,
        daysFromDiagnosis: 0,
      },
      memberName: "You",
    }

    setUserMilestones((prev) => [newEntry, ...prev])
    setMilestoneTitle("")
    setMilestoneDesc("")
    setMilestoneCompleted(false)
    setShowMilestoneForm(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      {/* Header */}
      <h2 className="text-3xl font-bold text-stone-900 mb-2">Care Circle</h2>
      <p className="text-stone-600 mb-8 max-w-2xl">
        Connect with patients in similar stages of care and recovery. Share
        experiences and track your milestones together.
      </p>

      {/* ── Member Section ──────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-700">
            {memberTab === "matched" ? "Matched Members" : "Personal Circle"}
            <span className="ml-2 text-sm text-stone-400 font-normal">
              ({visibleMembers.length}
              {hiddenCount > 0 ? ` of ${activeMembers.length}` : ""} shown)
            </span>
          </h3>

          {/* Matched / Personal toggle */}
          <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMemberTab("matched")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                memberTab === "matched"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Matched
            </button>
            <button
              onClick={() => setMemberTab("personal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                memberTab === "personal"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              Personal
            </button>
          </div>
        </div>

        {/* ── Personal tab: incoming + outgoing requests ─────────────────── */}
        {memberTab === "personal" && (
          <div className="mb-6 space-y-4">
            {/* Incoming Friend Requests */}
            {incomingRequests.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                  Incoming Requests ({incomingRequests.length})
                </p>
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-xl border border-amber-100 px-3 py-2.5 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {req.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 text-sm">
                          {req.name}
                        </p>
                        <p className="text-xs text-stone-400 truncate">
                          {req.condition} · {req.stage}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAccept(req.id)}
                          className="px-3 py-1 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(req.id)}
                          className="px-3 py-1 bg-stone-100 text-stone-500 text-xs font-medium rounded-lg hover:bg-stone-200 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing / Pending Requests */}
            {pendingMembers.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                  Pending Requests ({pendingMembers.length})
                </p>
                <div className="space-y-2">
                  {pendingMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white rounded-xl border border-amber-100 px-3 py-2.5 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {member.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 text-sm">
                          {member.name}
                        </p>
                        <p className="text-xs text-stone-400 truncate">
                          {member.condition}
                        </p>
                      </div>
                      <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2.5 py-1 rounded-lg shrink-0">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for Personal tab when no requests */}
            {incomingRequests.length === 0 &&
              pendingMembers.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-1">
                  No pending requests. Add friends from the Matched tab.
                </p>
              )}

            {/* Divider before personal member grid */}
            {MOCK_PERSONAL_MEMBERS.length > 0 && (
              <div className="border-t border-stone-100 pt-2">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  Your Personal Circle
                </p>
              </div>
            )}
          </div>
        )}

        {/* Member cards — max 6, scroll container prevents overflow */}
        <div className="max-h-[400px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleMembers.map((member, i) => (
              <CircleMemberCard
                key={member.id}
                member={member}
                colorIndex={i}
                showFriendRequest={memberTab === "matched"}
                requestSent={sentRequests.includes(member.id)}
                onRequest={() => handleFriendRequest(member.id)}
              />
            ))}
          </div>
          {hiddenCount > 0 && (
            <p className="text-center text-xs text-stone-400 mt-3">
              +{hiddenCount} more members not shown
            </p>
          )}
        </div>

        {memberTab === "matched" && (
          <div className="mt-3">
            <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100">
              Stage 2 Recovery cohort
            </span>
          </div>
        )}
      </section>

      {/* ── Circle Milestones ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-700">
            Circle Milestones
            <span className="ml-2 text-sm text-stone-400 font-normal">
              (shared progress from your circle)
            </span>
          </h3>
          <button
            onClick={() => setShowMilestoneForm((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            <span className="text-base leading-none font-light">+</span>
            Add Milestone
          </button>
        </div>

        {/* Inline add milestone form */}
        {showMilestoneForm && (
          <form
            onSubmit={addMilestone}
            className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-5 space-y-3"
          >
            <p className="text-sm font-semibold text-amber-800">
              Share a new milestone with your circle
            </p>
            <input
              autoFocus
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              placeholder="Milestone title *"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <input
              value={milestoneDesc}
              onChange={(e) => setMilestoneDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={milestoneCompleted}
                onChange={(e) => setMilestoneCompleted(e.target.checked)}
                className="rounded accent-amber-600"
              />
              Mark as completed
            </label>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowMilestoneForm(false)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!milestoneTitle.trim()}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Share
              </button>
            </div>
          </form>
        )}

        {/* All milestones list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allMilestones.map(({ milestone, memberName }) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              memberName={memberName}
            />
          ))}
          {allMilestones.length === 0 && (
            <p className="col-span-2 text-sm text-stone-400 text-center py-6">
              No milestones yet. Be the first to share one!
            </p>
          )}
        </div>
      </section>

      {/* ── Friend Request Toast ─────────────────────────────────────────── */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Friend Request Sent!
        </div>
      )}
    </PageTransition>
  )
}
