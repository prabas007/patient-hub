"use client"

import { useState, useRef, useEffect } from "react"
import { MOCK_PERSONAL_CONVERSATIONS } from "@/lib/mockData"
import type { ChatMessage, PersonalConversation } from "@/lib/mockData"
import { ChatSection } from "@/components/ChatSection"
import { PageTransition } from "@/components/PageTransition"

export default function ChatPage() {
  const [mode, setMode] = useState<"circle" | "personal">("circle")
  const [conversations, setConversations] = useState<PersonalConversation[]>(
    MOCK_PERSONAL_CONVERSATIONS
  )
  const [activeConvId, setActiveConvId] = useState<string | null>(
    MOCK_PERSONAL_CONVERSATIONS[0]?.id ?? null
  )
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null
  const activeMessages = activeConv?.messages ?? []

  // Filter conversations by search query
  const filteredConversations = search.trim()
    ? conversations.filter((c) =>
        c.friendName.toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeMessages.length, activeConvId])

  const sendPersonalMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || !activeConvId) return

    const msg: ChatMessage = {
      id: Date.now().toString(),
      authorId: "me",
      authorName: "You",
      text: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId ? { ...c, messages: [...c.messages, msg] } : c
      )
    )
    setInput("")
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })

  const getLastMessage = (conv: PersonalConversation) => {
    const last = conv.messages[conv.messages.length - 1]
    if (!last) return "No messages yet"
    const prefix = last.authorId === "me" ? "You: " : ""
    return `${prefix}${last.text}`
  }

  return (
    <PageTransition>
      {/* ── Header + Toggle ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Chat</h2>
          <p className="text-stone-500 text-sm mt-1">
            Connect with your care community
          </p>
        </div>

        <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setMode("circle")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "circle"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Match Circle Chat
          </button>
          <button
            onClick={() => setMode("personal")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "personal"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Personal Chats
          </button>
        </div>
      </div>

      {/* ── Match Circle Chat ─────────────────────────────────────────────── */}
      {mode === "circle" && <ChatSection />}

      {/* ── Personal Chats Split View ─────────────────────────────────────── */}
      {mode === "personal" && (
        <div className="flex gap-4 h-[520px]">
          {/* Left: Conversation list */}
          <div className="w-72 shrink-0 flex flex-col border border-stone-200 rounded-2xl overflow-hidden">
            {/* Search bar */}
            <div className="p-3 border-b border-stone-100 bg-white">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                  />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 bg-white">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-3 text-left flex items-center gap-3 hover:bg-stone-50 transition-colors ${
                      activeConvId === conv.id ? "bg-amber-50" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                      {conv.friendInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 text-sm">
                        {conv.friendName}
                      </p>
                      <p className="text-xs text-stone-400 truncate">
                        {getLastMessage(conv)}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-stone-400 text-sm px-4 text-center">
                    No conversations match &quot;{search}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Active conversation */}
          <div className="flex-1 flex flex-col border border-stone-200 rounded-2xl overflow-hidden">
            {activeConv ? (
              <>
                {/* Conversation header */}
                <div className="px-4 py-3 border-b border-stone-100 bg-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                    {activeConv.friendInitials}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">
                      {activeConv.friendName}
                    </p>
                    <p className="text-xs text-stone-400">Personal connection</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
                  {activeConv.messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-stone-400 text-sm">
                        No messages yet. Say hi!
                      </p>
                    </div>
                  ) : (
                    activeConv.messages.map((msg) => {
                      const isMe = msg.authorId === "me"
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div className="max-w-xs space-y-1">
                            {!isMe && (
                              <p className="text-xs text-stone-400 px-1">
                                {msg.authorName}
                              </p>
                            )}
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                isMe
                                  ? "bg-amber-600 text-white rounded-br-sm"
                                  : "bg-white border border-stone-200 text-stone-700 rounded-bl-sm shadow-sm"
                              }`}
                            >
                              {msg.text}
                            </div>
                            <p
                              className={`text-xs text-stone-400 px-1 ${
                                isMe ? "text-right" : "text-left"
                              }`}
                            >
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={sendPersonalMessage}
                  className="p-3 border-t border-stone-100 bg-white flex gap-2"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-stone-50">
                <p className="text-stone-400 text-sm">
                  Select a conversation to start chatting
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  )
}
