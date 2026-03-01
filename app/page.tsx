import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8e6e6] via-[#e2e0e0] to-[#d8d5d5] flex flex-col overflow-hidden">

      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#5c3d9e]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#2233cc]/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-[#b0aeae]/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-white/20 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 py-5 flex justify-between items-center border-b border-[#b0aeae]/40 bg-white/70 backdrop-blur-md">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-[#3a3030]">Link</span><span className="text-[#2233cc]">Care</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/signin" className="text-sm font-medium text-[#625e5e] hover:text-[#3a3030] transition-colors">
            Sign in
          </Link>
          <Link
            href="/signin"
            className="text-sm font-semibold bg-[#5c3d9e] text-white px-4 py-2 rounded-xl
                       hover:bg-[#4a3282] transition-colors shadow-sm"
          >
            Get started →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-12 -mt-8">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2.5 bg-white/90 border border-[#5c3d9e]/30 text-[#5c3d9e]
                        text-xs font-semibold px-4 py-2 rounded-full mb-10 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5c3d9e] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5c3d9e]" />
          </span>
          AI-Powered Healthcare Matching
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold leading-[1.15] mb-6 max-w-3xl tracking-tight text-[#3a3030]">
          Care starts with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5c3d9e] to-[#7c5cbf]">
            connection.
          </span>
          <br />
          Connection starts with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2233cc] via-[#3344dd] to-[#3a3030]">
            LinkCare.
          </span>
        </h1>

        {/* Sub */}
        <p className="text-[#625e5e] text-lg leading-relaxed mb-10 max-w-md">
          LinkCare connects you with others who&apos;ve lived your experience
          and the specialists they trust
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link
            href="/signin"
            className="px-8 py-3.5 bg-[#5c3d9e] text-white font-semibold rounded-2xl
                       hover:bg-[#4a3282] transition-all duration-150 shadow-lg
                       shadow-[#5c3d9e]/30 active:scale-95 text-sm"
          >
            Find My Doctor
          </Link>
          <Link
            href="/signin"
            className="px-8 py-3.5 bg-white/80 text-[#3a3030] font-semibold rounded-2xl
                       border border-[#b0aeae] hover:border-[#5c3d9e] hover:text-[#5c3d9e]
                       hover:shadow-md transition-all duration-150 text-sm backdrop-blur-sm"
          >
            Join Care Circle
          </Link>
        </div>

        {/* Thin divider */}
        <div className="w-px h-8 bg-[#b0aeae]/60 mb-7" />

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2.5 justify-center max-w-md">
          {[
            "Voice input",
            "RAG-powered AI",
            "Peer support",
            "Outcome data",
            "Emotion-aware UI",
          ].map((f) => (
            <span
              key={f}
              className="text-xs font-medium text-[#625e5e] bg-white/70 border border-[#b0aeae]/60
                         px-3.5 py-1.5 rounded-full shadow-sm backdrop-blur-sm tracking-wide"
            >
              {f}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-5 text-center text-xs text-[#625e5e]
                         border-t border-[#b0aeae]/40 bg-white/60 backdrop-blur-md">
        LinkCare is not medical advice. For emergencies, call 911.
      </footer>
    </div>
  )
}
