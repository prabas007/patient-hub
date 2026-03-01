"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const CONDITIONS = [
  "Breast Cancer",
  "Type 2 Diabetes",
  "Coronary Artery Disease",
  "Multiple Sclerosis",
  "Crohn's Disease",
  "Rheumatoid Arthritis",
  "Lung Cancer",
  "Parkinson's Disease",
  "Lupus",
  "Depression",
]

const STAGES: Record<string, string[]> = {
  "Breast Cancer":           ["Stage I", "Stage II", "Stage III", "Stage IV"],
  "Type 2 Diabetes":         ["Pre-diabetic", "Newly Diagnosed", "Moderate", "Advanced"],
  "Coronary Artery Disease": ["Mild", "Moderate", "Severe"],
  "Multiple Sclerosis":      ["Relapsing-Remitting", "Secondary Progressive", "Primary Progressive", "Clinically Isolated Syndrome"],
  "Crohn's Disease":         ["Mild", "Moderate-Severe", "Remission", "Flare"],
  "Rheumatoid Arthritis":    ["Early", "Moderate", "Severe", "Remission"],
  "Lung Cancer":             ["Stage I", "Stage II", "Stage III", "Stage IV"],
  "Parkinson's Disease":     ["Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5"],
  "Lupus":                   ["Mild", "Moderate", "Severe", "Remission"],
  "Depression":              ["Mild", "Moderate", "Severe", "Treatment-Resistant"],
}

function Input({
  label, type = "text", placeholder, value, onChange, required = false
}: {
  label: string; type?: string; placeholder?: string
  value: string; onChange: (v: string) => void; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#3a3030]">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-[#b0aeae] rounded-xl px-4 py-2.5 text-sm bg-[#f0eeee]
                   focus:outline-none focus:ring-2 focus:ring-[#5c3d9e] focus:border-transparent
                   focus:bg-white transition-colors text-[#3a3030] placeholder:text-[#b0aeae]"
      />
    </div>
  )
}

function Select({
  label, value, onChange, options, placeholder
}: {
  label: string; value: string; onChange: (v: string) => void
  options: string[]; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#3a3030]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#b0aeae] rounded-xl px-4 py-2.5 text-sm bg-[#f0eeee]
                   focus:outline-none focus:ring-2 focus:ring-[#5c3d9e] focus:border-transparent
                   focus:bg-white transition-colors text-[#3a3030] appearance-none"
      >
        <option value="" disabled>{placeholder ?? "Select…"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default function SignInPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"signin" | "signup">("signin")

  // Sign-in fields
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")

  // Sign-up fields
  const [name, setName]                   = useState("")
  const [signupEmail, setSignupEmail]     = useState("")
  const [signupPassword, setSignupPassword]         = useState("")
  const [confirmPassword, setConfirmPassword]       = useState("")
  const [dob, setDob]                     = useState("")
  const [condition, setCondition]         = useState("")
  const [stage, setStage]                 = useState("")

  const [error, setError] = useState("")

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password) { setError("Please fill in all fields."); return }
    router.push("/dashboard/doctor")
  }

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name || !signupEmail || !signupPassword || !confirmPassword || !dob) {
      setError("Please fill in all required fields."); return
    }
    if (signupPassword !== confirmPassword) {
      setError("Passwords do not match."); return
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters."); return
    }
    router.push("/dashboard/doctor")
  }

  const stages = condition ? (STAGES[condition] ?? []) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8e6e6] via-[#e2e0e0] to-[#d8d5d5] flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex justify-between items-center border-b border-[#b0aeae]/50 bg-white/80 backdrop-blur-sm">
        <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
          <span className="text-[#3a3030]">Link</span><span className="text-[#2233cc]">Care</span>
        </Link>
        <p className="text-sm text-[#625e5e]">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
          {" "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError("") }}
            className="font-semibold text-[#5c3d9e] hover:text-[#4a3282] transition-colors"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#b0aeae]/40 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#5c3d9e] via-[#2233cc] to-[#3344dd]" />

          <div className="p-8">
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#3a3030]">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-[#625e5e] mt-1">
                {mode === "signin"
                  ? "Sign in to access your care dashboard."
                  : "Join LinkCare to find the right doctors for your journey."}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* ── SIGN IN ── */}
            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <Input label="Email address" type="email" placeholder="you@example.com"
                  value={email} onChange={setEmail} required />
                <Input label="Password" type="password" placeholder="••••••••"
                  value={password} onChange={setPassword} required />

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm text-[#625e5e] cursor-pointer select-none">
                    <input type="checkbox" className="rounded accent-[#5c3d9e]" />
                    Remember me
                  </label>
                  <button type="button" className="text-sm text-[#5c3d9e] hover:text-[#4a3282] font-medium transition-colors">
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-[#5c3d9e] text-white font-semibold rounded-xl
                             hover:bg-[#4a3282] transition-colors active:scale-[0.98] text-sm"
                >
                  Sign In
                </button>
              </form>
            )}

            {/* ── SIGN UP ── */}
            {mode === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <Input label="Full name" placeholder="Jane Smith"
                  value={name} onChange={setName} required />
                <Input label="Email address" type="email" placeholder="you@example.com"
                  value={signupEmail} onChange={setSignupEmail} required />

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Password" type="password" placeholder="••••••••"
                    value={signupPassword} onChange={setSignupPassword} required />
                  <Input label="Confirm password" type="password" placeholder="••••••••"
                    value={confirmPassword} onChange={setConfirmPassword} required />
                </div>

                <Input label="Date of birth" type="date"
                  value={dob} onChange={setDob} required />

                <div className="pt-1 border-t border-[#b0aeae]/40">
                  <p className="text-xs font-semibold text-[#b0aeae] uppercase tracking-wider mb-3 mt-3">
                    Medical Profile <span className="font-normal normal-case">(optional — helps us personalise recommendations)</span>
                  </p>
                  <div className="space-y-3">
                    <Select label="Primary condition" value={condition} onChange={(v) => { setCondition(v); setStage("") }}
                      options={CONDITIONS} placeholder="Select your condition" />
                    {condition && (
                      <Select label="Current stage" value={stage} onChange={setStage}
                        options={stages} placeholder="Select your stage" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#b0aeae] leading-relaxed">
                  By creating an account you agree to our{" "}
                  <span className="text-[#5c3d9e] cursor-pointer hover:underline">Terms of Service</span>
                  {" "}and{" "}
                  <span className="text-[#5c3d9e] cursor-pointer hover:underline">Privacy Policy</span>.
                </p>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#5c3d9e] text-white font-semibold rounded-xl
                             hover:bg-[#4a3282] transition-colors active:scale-[0.98] text-sm"
                >
                  Create Account
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#b0aeae]/40" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-[#b0aeae]">or continue with</span>
              </div>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#b0aeae]/60
                                 rounded-xl text-sm font-medium text-[#625e5e] hover:bg-[#f0eeee]
                                 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#b0aeae]/60
                                 rounded-xl text-sm font-medium text-[#625e5e] hover:bg-[#f0eeee]
                                 transition-colors">
                <svg className="w-4 h-4 text-[#3a3030]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.09.682-.218.682-.484 0-.236-.009-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .269.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                GitHub
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-8 py-4 text-center text-xs text-[#625e5e] border-t border-[#b0aeae]/40 bg-white/60">
        LinkCare is not medical advice. For emergencies, call 911.
      </footer>
    </div>
  )
}
