"use client"

import { useState, useRef, useEffect } from "react"
import { MOCK_PERSONAL_CONVERSATIONS, MOCK_PERSONAL_MEMBERS } from "@/lib/mockData"
import type { ChatMessage, PersonalConversation } from "@/lib/mockData"
import { ChatSection } from "@/components/ChatSection"
import { PageTransition } from "@/components/PageTransition"

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

export default function ChatPage() {
  const [mode, setMode] = useState<"circle" | "personal">("circle")
  const [conversations, setConversations] = useState<PersonalConversation[]>(MOCK_PERSONAL_CONVERSATIONS)
  const [activeConvId, setActiveConvId] = useState<string | null>(MOCK_PERSONAL_CONVERSATIONS[0]?.id ?? null)
  const [input, setInput] = useState("")
  const [checking, setChecking] = useState(false)
  const [typingName, setTypingName] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null
  const activeMessages = activeConv?.messages ?? []

  const filteredConversations = search.trim()
    ? conversations.filter((c) => c.friendName.toLowerCase().includes(search.toLowerCase()))
    : conversations

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeMessages.length, activeConvId, typingName])

  const sendPersonalMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || !activeConvId || checking) return

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
          text: `Your message was not posted. ${reason ?? "Messages containing specific medical advice aren't allowed."}`,
          timestamp: new Date().toISOString(),
          isGuardrail: true,
        }
        setConversations((prev) =>
          prev.map((c) => c.id === activeConvId ? { ...c, messages: [...c.messages, notice] } : c)
        )
        return
      }

      const msg: ChatMessage = {
        id: Date.now().toString(),
        authorId: "me",
        authorName: "You",
        text,
        timestamp: new Date().toISOString(),
      }
      setConversations((prev) =>
        prev.map((c) => c.id === activeConvId ? { ...c, messages: [...c.messages, msg] } : c)
      )

      const friend = MOCK_PERSONAL_MEMBERS.find((m) => m.id === activeConv?.friendId)
      if (!friend) return

      const typingDelay = 800 + Math.random() * 800

      setTimeout(async () => {
        setTypingName(friend.name)
        try {
          const respondRes = await fetch("/api/chat-respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              persona: { name: friend.name, condition: friend.condition, stage: friend.stage },
              history: [...activeMessages, msg].slice(-6).map((m) => ({
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
              authorId: friend.id,
              authorName: friend.name,
              text: response,
              timestamp: new Date().toISOString(),
            }
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConvId ? { ...c, messages: [...c.messages, replyMsg] } : c
              )
            )
          }
        } catch {
          setTypingName(null)
        }
      }, typingDelay)
    } catch {
      const msg: ChatMessage = {
        id: Date.now().toString(),
        authorId: "me",
        authorName: "You",
        text,
        timestamp: new Date().toISOString(),
      }
      setConversations((prev) =>
        prev.map((c) => c.id === activeConvId ? { ...c, messages: [...c.messages, msg] } : c)
      )
    } finally {
      setChecking(false)
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  const getLastMessage = (conv: PersonalConversation) => {
    const last = conv.messages[conv.messages.length - 1]
    if (!last) return "No messages yet"
    return `${last.authorId === "me" ? "You: " : ""}${last.text}`
  }

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Chat</h2>
          <p className="text-stone-500 text-sm mt-1">Connect with your care community</p>
        </div>
        <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setMode("circle")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "circle"
                ? "bg-white text-[#5c3d9e] shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Match Circle Chat
          </button>
          <button
            onClick={() => setMode("personal")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "personal"
                ? "bg-white text-[#5c3d9e] shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Personal Chats
          </button>
        </div>
      </div>

      {mode === "circle" && <ChatSection />}

      {mode === "personal" && (
        <div className="flex gap-4 h-[520px]">
          <div className="w-72 shrink-0 flex flex-col border border-stone-200 rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-stone-100 bg-white">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-3 py-2 text-sm text-[#1a1818] border border-stone-200 rounded-xl bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#5c3d9e] focus:border-transparent focus:bg-white transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 bg-white">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                  <button key={conv.id} onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-3 text-left flex items-center gap-3 hover:bg-stone-50 transition-colors ${
                      activeConvId === conv.id ? "bg-[#ede8f7]" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                      {conv.friendInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 text-sm">{conv.friendName}</p>
                      <p className="text-xs text-stone-400 truncate">{getLastMessage(conv)}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-stone-400 text-sm px-4 text-center">No conversations match &quot;{search}&quot;</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col border border-stone-200 rounded-2xl overflow-hidden">
            {activeConv ? (
              <>
                <div className="px-4 py-3 border-b border-stone-100 bg-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
                    {activeConv.friendInitials}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">{activeConv.friendName}</p>
                    <p className="text-xs text-stone-400">Personal connection</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
                  {activeConv.messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-stone-400 text-sm">No messages yet. Say hi!</p>
                    </div>
                  ) : (
                    activeConv.messages.map((msg) => {
                      const isMe = msg.authorId === "me"
                      const isGuardrail = msg.isGuardrail
                      return (
                        <div key={msg.id} className={`flex ${isMe || isGuardrail ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-xs space-y-1">
                            {!isMe && !isGuardrail && (
                              <p className="text-xs text-stone-400 px-1">{msg.authorName}</p>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isGuardrail
                                ? "bg-[#ede8f7] border border-[#c5bde0] text-[#3a3030] italic"
                                : isMe
                                  ? "bg-[#5c3d9e] text-white rounded-br-sm"
                                  : "bg-white border border-stone-200 text-stone-700 rounded-bl-sm shadow-sm"
                            }`}>
                              {isGuardrail && <span className="not-italic mr-1">🤖</span>}
                              {msg.text}
                            </div>
                            <p className={`text-xs text-stone-400 px-1 ${isMe || isGuardrail ? "text-right" : "text-left"}`}>
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  {typingName && activeConvId && <TypingIndicator name={typingName} />}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={sendPersonalMessage} className="p-3 border-t border-stone-100 bg-white flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Send a message..."
                    disabled={checking}
                    className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-sm text-[#1a1818] focus:outline-none focus:ring-2 focus:ring-[#5c3d9e] focus:border-transparent disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || checking}
                    className="px-4 py-2 bg-[#5c3d9e] text-white rounded-xl text-sm font-medium hover:bg-[#4a3282] transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-[64px]"
                  >
                    {checking ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : "Send"}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-stone-50">
                <p className="text-stone-400 text-sm">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  )
}
