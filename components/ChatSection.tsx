"use client"

import { useState, useRef, useEffect } from "react"
import { MOCK_CHAT_MESSAGES, MOCK_CIRCLE_MEMBERS } from "@/lib/mockData"
import type { ChatMessage } from "@/lib/mockData"

function pickResponder() {
  const members = MOCK_CIRCLE_MEMBERS
  return members[Math.floor(Math.random() * members.length)]
}

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-xs space-y-1">
        <p className="text-xs text-stone-400 px-1">{name}</p>
        <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-stone-200 shadow-sm flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  )
}

export function ChatSection() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES)
  const [input, setInput] = useState("")
  const [checking, setChecking] = useState(false)
  const [typingName, setTypingName] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingName])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || checking) return

    setInput("")
    setChecking(true)

    try {
      const guardRes = await fetch("/api/chat-guardrail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const { blocked, reason } = await guardRes.json()

      if (blocked) {
        const notice: ChatMessage = {
          id: Date.now().toString(),
          authorId: "system",
          authorName: "LINK-CARE Bot",
          text: `Your message was not posted. ${reason ?? "Messages containing specific medical advice aren't allowed in peer support spaces."}`,
          timestamp: new Date().toISOString(),
          isGuardrail: true,
        }
        setMessages((prev) => [...prev, notice])
        return
      }

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        authorId: "me",
        authorName: "You",
        text,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      const responder = pickResponder()
      const typingDelay = 800 + Math.random() * 800

      setTimeout(async () => {
        setTypingName(responder.name)
        try {
          const respondRes = await fetch("/api/chat-respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              persona: {
                name: responder.name,
                condition: responder.condition,
                stage: responder.stage,
              },
              history: [...messages, userMsg].slice(-6).map((m) => ({
                authorName: m.authorName,
                text: m.text,
              })),
            }),
          })
          const { response } = await respondRes.json()
          setTypingName(null)
          if (response) {
            const replyMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              authorId: responder.id,
              authorName: responder.name,
              text: response,
              timestamp: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, replyMsg])
          }
        } catch {
          setTypingName(null)
        }
      }, typingDelay)
    } catch {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        authorId: "me",
        authorName: "You",
        text,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
    } finally {
      setChecking(false)
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  return (
    <div className="mt-8">
      <h3 className="font-semibold text-stone-900 mb-3">Circle Chat</h3>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
        <span className="text-yellow-600 text-sm mt-0.5">⚠</span>
        <p className="text-yellow-700 text-sm font-medium">
          This is a peer support space. LINK-CARE does not provide medical advice.
          Do not share personal health information.
        </p>
      </div>

      <div className="bg-stone-50 rounded-2xl p-4 h-80 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg) => {
          const isMe = msg.authorId === "me"
          const isGuardrail = msg.isGuardrail
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-xs lg:max-w-sm space-y-1">
                {!isMe && (
                  <p className="text-xs text-stone-400 px-1">{msg.authorName}</p>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${isGuardrail
                    ? "bg-yellow-100 border border-yellow-300 text-yellow-800 italic"
                    : isMe
                      ? "bg-amber-600 text-white rounded-br-sm"
                      : "bg-white border border-stone-200 text-stone-700 rounded-bl-sm shadow-sm"
                  }`}>
                  {isGuardrail && <span className="not-italic mr-1">🤖</span>}
                  {msg.text}
                </div>
                <p className={`text-xs text-stone-400 px-1 ${isMe ? "text-right" : "text-left"}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          )
        })}

        {typingName && <TypingIndicator name={typingName} />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Share your experience with the group..."
          disabled={checking}
          className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm
                     bg-white focus:outline-none focus:ring-2 focus:ring-amber-500
                     focus:border-transparent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || checking}
          className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium
                     hover:bg-amber-700 transition-colors disabled:opacity-40
                     disabled:cursor-not-allowed min-w-[72px]"
        >
          {checking ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          ) : "Send"}
        </button>
      </form>
    </div>
  )
}