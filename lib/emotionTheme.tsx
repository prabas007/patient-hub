/**
 * CareLink Emotion Theme System
 * ==============================
 * Drives the full atmospheric UI color shift based on detected emotional state.
 * Used across doctor page and doctor detail page.
 */

"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// ── Theme definitions ──────────────────────────────────────────────────────────

export type EsiCategory = "calm" | "focused" | "anxious" | "overwhelmed" | "neutral";

export interface EmotionTheme {
  // Page-level
  pageBg: string;           // Tailwind bg class for page background
  pageText: string;         // Primary text color

  // Cards
  cardBg: string;
  cardBorder: string;

  // Accent / highlight
  accent: string;           // Primary accent color (Tailwind text class)
  accentBg: string;         // Light accent bg
  accentBorder: string;

  // Buttons
  buttonBg: string;         // Primary CTA button
  buttonHover: string;
  buttonShadow: string;

  // Mic button states
  micIdle: string;
  micRecording: string;

  // RAG summary card
  summaryBg: string;
  summaryBorder: string;
  summaryText: string;
  summaryAccent: string;

  // Misc
  label: string;
  description: string;

  // CSS transition override (applied inline)
  transition: string;
}

export const EMOTION_THEMES: Record<EsiCategory, EmotionTheme> = {
  neutral: {
    pageBg:        "bg-stone-50",
    pageText:      "text-stone-900",
    cardBg:        "bg-white",
    cardBorder:    "border-stone-200",
    accent:        "text-amber-700",
    accentBg:      "bg-amber-50",
    accentBorder:  "border-amber-200",
    buttonBg:      "bg-amber-600 hover:bg-amber-700",
    buttonHover:   "hover:bg-amber-700",
    buttonShadow:  "shadow-amber-200",
    micIdle:       "bg-amber-600",
    micRecording:  "bg-red-500",
    summaryBg:     "bg-amber-50",
    summaryBorder: "border-amber-100",
    summaryText:   "text-amber-800",
    summaryAccent: "text-amber-900",
    label:         "Neutral",
    description:   "Standard view",
    transition:    "background-color 2.5s ease, color 2.5s ease",
  },
  calm: {
    pageBg:        "bg-slate-50",
    pageText:      "text-slate-900",
    cardBg:        "bg-white",
    cardBorder:    "border-slate-200",
    accent:        "text-blue-600",
    accentBg:      "bg-blue-50",
    accentBorder:  "border-blue-200",
    buttonBg:      "bg-blue-600 hover:bg-blue-700",
    buttonHover:   "hover:bg-blue-700",
    buttonShadow:  "shadow-blue-200",
    micIdle:       "bg-blue-600",
    micRecording:  "bg-red-500",
    summaryBg:     "bg-blue-50",
    summaryBorder: "border-blue-100",
    summaryText:   "text-blue-800",
    summaryAccent: "text-blue-900",
    label:         "Calm",
    description:   "Detailed & analytical",
    transition:    "background-color 2.5s ease, color 2.5s ease",
  },
  focused: {
    pageBg:        "bg-emerald-50/40",
    pageText:      "text-gray-900",
    cardBg:        "bg-white",
    cardBorder:    "border-emerald-200",
    accent:        "text-emerald-600",
    accentBg:      "bg-emerald-50",
    accentBorder:  "border-emerald-200",
    buttonBg:      "bg-emerald-600 hover:bg-emerald-700",
    buttonHover:   "hover:bg-emerald-700",
    buttonShadow:  "shadow-emerald-200",
    micIdle:       "bg-emerald-600",
    micRecording:  "bg-red-500",
    summaryBg:     "bg-emerald-50",
    summaryBorder: "border-emerald-100",
    summaryText:   "text-emerald-800",
    summaryAccent: "text-emerald-900",
    label:         "Focused",
    description:   "Clear & efficient",
    transition:    "background-color 2.5s ease, color 2.5s ease",
  },
  anxious: {
    pageBg:        "bg-amber-50",
    pageText:      "text-amber-950",
    cardBg:        "bg-white",
    cardBorder:    "border-amber-200",
    accent:        "text-amber-600",
    accentBg:      "bg-amber-50",
    accentBorder:  "border-amber-200",
    buttonBg:      "bg-amber-500 hover:bg-amber-600",
    buttonHover:   "hover:bg-amber-600",
    buttonShadow:  "shadow-amber-200",
    micIdle:       "bg-amber-500",
    micRecording:  "bg-red-500",
    summaryBg:     "bg-amber-50",
    summaryBorder: "border-amber-200",
    summaryText:   "text-amber-800",
    summaryAccent: "text-amber-900",
    label:         "Anxious",
    description:   "Warm & reassuring",
    transition:    "background-color 2.5s ease, color 2.5s ease",
  },
  overwhelmed: {
    pageBg:        "bg-purple-50",
    pageText:      "text-purple-950",
    cardBg:        "bg-white",
    cardBorder:    "border-purple-200",
    accent:        "text-purple-600",
    accentBg:      "bg-purple-50",
    accentBorder:  "border-purple-200",
    buttonBg:      "bg-purple-500 hover:bg-purple-600",
    buttonHover:   "hover:bg-purple-600",
    buttonShadow:  "shadow-purple-200",
    micIdle:       "bg-purple-500",
    micRecording:  "bg-red-500",
    summaryBg:     "bg-purple-50",
    summaryBorder: "border-purple-100",
    summaryText:   "text-purple-800",
    summaryAccent: "text-purple-900",
    label:         "Overwhelmed",
    description:   "Gentle & simplified",
    transition:    "background-color 2.5s ease, color 2.5s ease",
  },
};

// ── CSS variable map for smooth inline transitions ─────────────────────────────
// We use inline style transitions on the wrapper div because Tailwind
// class swaps don't animate — we need CSS transitions on actual color values.

export const EMOTION_CSS_VARS: Record<EsiCategory, Record<string, string>> = {
  neutral: {
    "--theme-bg":          "#f1f5f9",
    "--theme-accent":      "#d97706",
    "--theme-accent-soft": "#fef3c7",
    "--theme-text":        "#1c1917",
    "--theme-border":      "#e7e5e4",
    "--theme-btn":         "#d97706",
    "--theme-summary-bg":  "#fef3c7",
  },
  calm: {
    "--theme-bg":          "#f8fafc",
    "--theme-accent":      "#2563eb",
    "--theme-accent-soft": "#eff6ff",
    "--theme-text":        "#0f172a",
    "--theme-border":      "#e2e8f0",
    "--theme-btn":         "#2563eb",
    "--theme-summary-bg":  "#eff6ff",
  },
  focused: {
    "--theme-bg":          "#f0fdf7",
    "--theme-accent":      "#059669",
    "--theme-accent-soft": "#ecfdf5",
    "--theme-text":        "#111827",
    "--theme-border":      "#a7f3d0",
    "--theme-btn":         "#059669",
    "--theme-summary-bg":  "#ecfdf5",
  },
  anxious: {
    "--theme-bg":          "#fffbeb",
    "--theme-accent":      "#d97706",
    "--theme-accent-soft": "#fef3c7",
    "--theme-text":        "#1c0a00",
    "--theme-border":      "#fde68a",
    "--theme-btn":         "#f59e0b",
    "--theme-summary-bg":  "#fef3c7",
  },
  overwhelmed: {
    "--theme-bg":          "#faf5ff",
    "--theme-accent":      "#7c3aed",
    "--theme-accent-soft": "#f3e8ff",
    "--theme-text":        "#1e003a",
    "--theme-border":      "#e9d5ff",
    "--theme-btn":         "#8b5cf6",
    "--theme-summary-bg":  "#f3e8ff",
  },
};

// ── Context ───────────────────────────────────────────────────────────────────

interface EmotionContextValue {
  emotion: EsiCategory;
  theme: EmotionTheme;
  cssVars: Record<string, string>;
  setEmotion: (e: EsiCategory) => void;
  isRecording: boolean;
  setIsRecording: (v: boolean) => void;
}

const EmotionContext = createContext<EmotionContextValue>({
  emotion:      "neutral",
  theme:        EMOTION_THEMES.neutral,
  cssVars:      EMOTION_CSS_VARS.neutral,
  setEmotion:   () => {},
  isRecording:  false,
  setIsRecording: () => {},
});

export function EmotionProvider({ children }: { children: ReactNode }) {
  const [emotion, setEmotion]         = useState<EsiCategory>("neutral");
  const [isRecording, setIsRecording] = useState(false);

  return (
    <EmotionContext.Provider value={{
      emotion,
      theme:    EMOTION_THEMES[emotion],
      cssVars:  EMOTION_CSS_VARS[emotion],
      setEmotion,
      isRecording,
      setIsRecording,
    }}>
      {children}
    </EmotionContext.Provider>
  );
}

export function useEmotion() {
  return useContext(EmotionContext);
}
