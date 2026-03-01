import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex justify-between items-center border-b border-slate-200/70 bg-white/80 backdrop-blur-sm">
        <span className="text-xl font-bold text-slate-900 tracking-tight">LinkCare</span>
        <Link
          href="/signin"
          className="text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          Sign in →
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            ✦ AI-Powered Healthcare Matching
          </div>

          <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-5">
            Find the right doctor{" "}
            <span className="text-amber-600">for your journey</span>
          </h1>

          <p className="text-slate-500 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            LinkCare matches you with top specialists using real patient
            experiences and AI — tailored to your condition, stage, and
            emotional state.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signin"
              className="px-7 py-3.5 bg-amber-600 text-white font-semibold rounded-2xl
                         hover:bg-amber-700 transition-all duration-150 shadow-lg
                         shadow-amber-200 active:scale-95 text-sm"
            >
              Find My Doctor
            </Link>
            <Link
              href="/signin"
              className="px-7 py-3.5 bg-white text-slate-700 font-semibold rounded-2xl
                         border border-slate-200 hover:border-amber-200 hover:text-amber-700
                         transition-all duration-150 text-sm"
            >
              Join Care Circle
            </Link>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3 justify-center mt-16 max-w-lg">
          {[
            "🎙️ Voice input",
            "🤖 RAG-powered AI",
            "💬 Peer support circles",
            "📊 Outcome data",
            "🌡️ Emotion-aware UI",
          ].map((f) => (
            <span
              key={f}
              className="text-xs font-medium text-slate-500 bg-white border border-slate-200
                         px-3 py-1.5 rounded-full"
            >
              {f}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        LinkCare is not medical advice. For emergencies, call 911.
      </footer>
    </div>
  )
}
