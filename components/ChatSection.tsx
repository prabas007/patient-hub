"use client"

import { useState, useRef, useEffect } from "react"
import { MOCK_CHAT_MESSAGES } from "@/lib/mockData"
import type { ChatMessage } from "@/lib/mockData"

const GUARDRAIL_TEXT =
  "LINK-CARE cannot provide medical advice. Please consult a licensed healthcare professional for any medical concerns."

export function ChatSection() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES)
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      authorId: "me",
      authorName: "You",
      text: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")

    // Auto guardrail response after a short delay
    setTimeout(() => {
      const guardrailMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        authorId: "system",
        authorName: "LINK-CARE Bot",
        text: GUARDRAIL_TEXT,
        timestamp: new Date().toISOString(),
        isGuardrail: true,
      }
      setMessages((prev) => [...prev, guardrailMsg])
    }, 800)
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="mt-8">
      <h3 className="font-semibold text-stone-900 mb-3">Circle Chat</h3>

      {/* Disclaimer bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
        <span className="text-slate-400 text-sm mt-0.5">⚠</span>
        <p className="text-[#625e5e] text-sm font-medium">
          This is a peer support space. LinkCare does not provide medical advice.
          Do not share personal health information.
        </p>
      </div>

      {/* Message list */}
      <div className="bg-slate-50 rounded-2xl p-4 h-80 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg) => {
          const isMe = msg.authorId === "me"
          const isGuardrail = msg.isGuardrail

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs lg:max-w-sm space-y-1`}>
                {/* Author label (not shown for "me") */}
                {!isMe && (
                  <p className="text-xs text-stone-400 px-1">
                    {msg.authorName}
                  </p>
                )}

                {/* Bubble */}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${isGuardrail
                      ? "bg-[#ede8f7] border border-[#c5bde0] text-[#3a3030] italic"
                      : isMe
                        ? "bg-[#5c3d9e] text-white rounded-br-sm"
                        : "bg-white border border-stone-200 text-stone-700 rounded-bl-sm shadow-sm"
                    }`}
                >
                  {isGuardrail && <span className="not-italic mr-1">🤖</span>}
                  {msg.text}
                </div>

                {/* Timestamp */}
                <p className={`text-xs text-stone-400 px-1 ${isMe ? "text-right" : "text-left"}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Share your experience with the group..."
          className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-[#1a1818]
                     bg-white focus:outline-none focus:ring-2 focus:ring-[#5c3d9e]
                     focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-5 py-2.5 bg-[#5c3d9e] text-white rounded-xl text-sm font-medium
                     hover:bg-[#4a3282] transition-colors disabled:opacity-40
                     disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  )
}
