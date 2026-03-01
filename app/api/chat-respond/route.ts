import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_CHAT_API_KEY!

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
]

export async function POST(req: NextRequest) {
  try {
    const { message, persona } = await req.json()
    // Only use the message itself — no history, minimizes tokens and API calls

    const prompt = `You are ${persona.name}, a real patient in an online cardiac peer support group.
Your condition: ${persona.condition}
Your stage: ${persona.stage}

Respond to this message from a fellow patient. Stay completely in character — never reveal you are an AI.

Rules:
- 1-2 sentences MAX — like a real text message
- Sound warm and human
- Mix it up: sometimes share your own experience, sometimes ask a follow-up question, sometimes just offer encouragement
- Never give medical advice, dosing instructions, or diagnoses
- No more than one emoji, or none

Message to respond to:
"${message}"

Reply as ${persona.name}:`

    let res: Response | null = null
    for (const model of MODELS) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 80 },
          }),
        }
      )
      if (res.status !== 429) break
      console.warn(`[chat-respond] 429 on ${model}, trying next...`)
      await new Promise((r) => setTimeout(r, 400))
    }

    if (!res || !res.ok) {
      console.error("[chat-respond] Gemini unavailable:", res?.status)
      return NextResponse.json({ response: null })
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null

    return NextResponse.json({ response: text })
  } catch (err) {
    console.error("[chat-respond] Error:", err)
    return NextResponse.json({ response: null })
  }
}