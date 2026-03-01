# LinkCare

> Care starts with connection. Connection starts with LinkCare.

LinkCare is an AI-powered patient support platform that connects people with peers who've lived their exact diagnosis — and the specialists those patients actually trusted.

---

## What It Does

- **Doctor Recommender** — Select your condition and stage, or just speak. LinkCare transcribes your voice, extracts your condition, stage, and emotional state, then runs a RAG pipeline to surface the most relevant doctors ranked by real patient outcome data.
- **Emotional State Interface (ESI)** — The UI adapts in real time based on your detected emotional state: calm, focused, anxious, or overwhelmed. Layout, tone, and information density all shift to match how you're feeling.
- **Care Circle** — Get matched with peers who share your diagnosis. Share milestones, send connection requests, and track recovery progress together.
- **Chat** — Circle group chat and personal 1-on-1 messaging with AI peer responses. All messages run through a guardrail that blocks specific medical advice.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion |
| Embeddings | Gemini `gemini-embedding-001` |
| Generation | Gemini `gemini-2.5-flash-lite` |
| Chat AI | Claude API (Anthropic) — guardrail + peer responses |
| Vector DB | VectorAI DB via REST bridge |
| Backend hosting | Modal |
| Voice | Browser MediaRecorder API |

---

## RAG Pipeline

1. User query (typed or transcribed from voice) → Gemini embedding
2. Cosine similarity search against `patient_experiences` collection, filtered by condition + stage
3. Retrieved experiences aggregated into doctor scores (composite of similarity, outcome, sentiment)
4. Context sent to Gemini → tone-adapted narrative summary based on ESI category

---

## Getting Started

### Prerequisites

- Node.js 18+
- A running Modal backend (VectorAI bridge)
- API keys for Gemini and Anthropic Claude

### Environment Variables

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_claude_key
VECTORAI_BRIDGE_URL=your_modal_bridge_url
```

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  page.tsx
  signin/page.tsx
  dashboard/
    chat/page.tsx
    circle/page.tsx
    doctor/page.tsx
    resources/page.tsx
  api/
    recommend/route.ts
    embed/route.ts
    transcribe/route.ts
    voice-extract/route.ts
    chat-guardrail/route.ts
    chat-respond/route.ts
components/
  DashboardShell.tsx
  ChatSection.tsx
  CircleMemberCard.tsx
  MilestoneCard.tsx
  DoctorCard.tsx
lib/
  emotionTheme.tsx
  mockData.ts
```

---

## Use of AI

We used ChatGPT to assist with the planning process of this project. We primarily used ChatGPT for advice as to which frameworks and languages to use. 

Additionally, we used Claude for coding assistance throughout the development of this project. It facilitated debugging and also provided suggestions on how to improve our code.

## Disclaimer

LinkCare is not a medical provider. It does not diagnose, treat, or replace professional medical advice. For emergencies, call 911.
