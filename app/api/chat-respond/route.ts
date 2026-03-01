import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]

export async function POST(req: NextRequest) {
  try {
    const { message, persona, history } = await req.json()
    // persona: { name, condition, stage }
    // history: array of { authorName, text } (last 6 messages for context)

    const historyText = (history ?? [])
      .slice(-6)
      .map((m: { authorName: string; text: string }) => `${m.authorName}: ${m.text}`)
      .join("\n")

    const prompt = `You are ${persona.name}, a real patient in an online cardiac peer support group.
Your condition: ${persona.condition}
Your stage: ${persona.stage}

You are responding to a message in the group chat. Stay completely in character as a fellow patient — never reveal you are an AI.

Rules:
- Keep your response SHORT (1-3 sentences max)
- Sound natural, warm, and human — like a text message
- Mix it up: sometimes share your own experience, sometimes ask a follow-up question, sometimes just offer encouragement
- Never give medical advice, dosing instructions, or diagnoses
- Refer to your own condition/experience occasionally to feel authentic
- Do not use emojis excessively — one at most, or none
- Do not start with "I" every time — vary your sentence starters

Recent chat:
${historyText}

The latest message you are responding to:
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
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 120,
            },
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
