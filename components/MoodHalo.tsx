"use client"


import React, { useEffect, useRef } from "react"


export type MoodType = "calm" | "focused" | "anxious" | "overwhelmed" | "neutral"


const MOOD_COLORS: Record<MoodType, string[]> = {
  calm:        ["#38bdf8", "#818cf8", "#06b6d4", "#6366f1"],
  focused:     ["#34d399", "#059669", "#6ee7b7", "#10b981"],
  anxious:     ["#fbbf24", "#fb923c", "#f97316", "#fde68a"],
  overwhelmed: ["#c084fc", "#e879f9", "#a855f7", "#9333ea"],
  neutral:     ["#94a3b8", "#64748b", "#cbd5e1", "#475569"],
}


function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ]
}
function cycleColor(colors: string[], t: number): [number, number, number] {
  const raw = ((t % 1) + 1) % 1
  const idx = raw * colors.length
  const i0  = Math.floor(idx) % colors.length
  const i1  = (i0 + 1) % colors.length
  return lerpColor(hexToRgb(colors[i0]), hexToRgb(colors[i1]), idx - Math.floor(idx))
}


// FIXED: increased from 12 → 20 so the glow bloom has enough room to paint
// without being clipped, especially on the outer card halo
const BLEED = 20


interface MoodHaloProps {
  mood: MoodType
  active: boolean
  children: React.ReactNode
  className?: string
  cardRadius?: number
}


export function MoodHalo({ mood, active, children, className = "", cardRadius = 18 }: MoodHaloProps) {
  const wrapRef   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)


  // Refs so the RAF loop always sees current values without restarting
  const activeRef = useRef(active)
  const moodRef   = useRef(mood)
  activeRef.current = active
  moodRef.current   = mood


  // Stores the WRAPPER content size (without bleed).
  // Canvas pixel buffer = (w + 2*BLEED) x (h + 2*BLEED).
  const sizeRef = useRef({ w: 0, h: 0 })


  // ResizeObserver: keep canvas pixel buffer exactly in sync with the wrapper
  useEffect(() => {
    const wrap   = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return


    function applySize(w: number, h: number) {
      const dpr = window.devicePixelRatio || 1
      const cw  = w + BLEED * 2
      const ch  = h + BLEED * 2
      sizeRef.current = { w, h }
      // CSS display size — set directly, never via calc()
      canvas!.style.width  = cw + "px"
      canvas!.style.height = ch + "px"
      // Backing-store pixel size
      canvas!.width  = Math.round(cw * dpr)
      canvas!.height = Math.round(ch * dpr)
    }


    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        applySize(entry.contentRect.width, entry.contentRect.height)
      }
    })
    ro.observe(wrap)


    // Immediate fallback in case ResizeObserver fires after first paint
    const rect = wrap.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) applySize(rect.width, rect.height)


    return () => ro.disconnect()
  }, [])


  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return


    const ctx   = canvas.getContext("2d")!
    let rafId   = 0
    let opacity = 0
    const dpr   = window.devicePixelRatio || 1


    function rrPath(x: number, y: number, W: number, H: number, r: number) {
      // Clamp r so it never exceeds half the shortest side.
      // This makes cardRadius=9999 render as a perfect circle/pill
      // rather than producing overlapping arcs (the broken-grid artifact).
      r = Math.min(r, W / 2, H / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + W - r, y)
      ctx.arcTo(x + W, y,       x + W, y + r,     r)
      ctx.lineTo(x + W, y + H - r)
      ctx.arcTo(x + W, y + H,   x + W - r, y + H, r)
      ctx.lineTo(x + r, y + H)
      ctx.arcTo(x,     y + H,   x,       y + H - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y,           x + r,   y,         r)
      ctx.closePath()
    }


    function frame(ts: number) {
      let { w, h } = sizeRef.current


      // If ResizeObserver hasn't fired yet, try a direct measure
      if (w === 0 || h === 0) {
        const rect = wrap!.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          w = rect.width
          h = rect.height
          sizeRef.current = { w, h }
          const cw = w + BLEED * 2
          const ch = h + BLEED * 2
          canvas.style.width  = cw + "px"
          canvas.style.height = ch + "px"
          canvas.width  = Math.round(cw * dpr)
          canvas.height = Math.round(ch * dpr)
        } else {
          rafId = requestAnimationFrame(frame)
          return
        }
      }


      // Canvas dimensions in CSS px (includes bleed on all sides)
      const cw = w + BLEED * 2
      const ch = h + BLEED * 2


      const target = activeRef.current ? 1 : 0
      opacity = lerp(opacity, target, 0.05)


      // All drawing coords are in CSS pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cw, ch)


      if (opacity >= 0.005) {
        const colors = MOOD_COLORS[moodRef.current] ?? MOOD_COLORS.neutral
        const t = ts * 0.0004


        // The wrapper's border sits exactly at (BLEED, BLEED) in canvas space.
        // W and H are the wrapper's actual CSS dimensions — path hugs its edge perfectly.
        const x  = BLEED
        const y  = BLEED
        const W  = w
        const H  = h
        const rr = cardRadius


        const cx    = cw / 2
        const cy    = ch / 2
        const angle = t * Math.PI * 2
        const gx1   = cx + Math.cos(angle) * cx * 1.2
        const gy1   = cy + Math.sin(angle) * cy * 1.2
        const gx2   = cx - Math.cos(angle) * cx * 1.2
        const gy2   = cy - Math.sin(angle) * cy * 1.2


        const [r1, g1, b1] = cycleColor(colors, t)
        const [r2, g2, b2] = cycleColor(colors, t + 0.5)
        const [r3, g3, b3] = cycleColor(colors, t + 0.25)


        // Layer 1 — fat outer bloom
        const grad1 = ctx.createLinearGradient(gx1, gy1, gx2, gy2)
        grad1.addColorStop(0,   `rgba(${r1},${g1},${b1},${0.5 * opacity})`)
        grad1.addColorStop(0.5, `rgba(${r2},${g2},${b2},${0.5 * opacity})`)
        grad1.addColorStop(1,   `rgba(${r1},${g1},${b1},${0.5 * opacity})`)
        ctx.save()
        ctx.shadowColor = `rgba(${r1},${g1},${b1},${opacity})`
        ctx.shadowBlur  = 30
        ctx.strokeStyle = grad1
        ctx.lineWidth   = 14
        rrPath(x, y, W, H, rr)
        ctx.stroke()
        ctx.restore()


        // Layer 2 — mid glow
        const grad2 = ctx.createLinearGradient(gx1, gy1, gx2, gy2)
        grad2.addColorStop(0,   `rgba(${r2},${g2},${b2},${0.75 * opacity})`)
        grad2.addColorStop(0.5, `rgba(${r3},${g3},${b3},${0.75 * opacity})`)
        grad2.addColorStop(1,   `rgba(${r2},${g2},${b2},${0.75 * opacity})`)
        ctx.save()
        ctx.shadowColor = `rgba(${r2},${g2},${b2},${opacity})`
        ctx.shadowBlur  = 10
        ctx.strokeStyle = grad2
        ctx.lineWidth   = 6
        rrPath(x, y, W, H, rr)
        ctx.stroke()
        ctx.restore()


        // Layer 3 — sharp bright edge
        const grad3 = ctx.createLinearGradient(gx1, gy1, gx2, gy2)
        grad3.addColorStop(0,   `rgba(${r1},${g1},${b1},${opacity})`)
        grad3.addColorStop(0.5, `rgba(${r3},${g3},${b3},${opacity})`)
        grad3.addColorStop(1,   `rgba(${r1},${g1},${b1},${opacity})`)
        ctx.save()
        ctx.shadowColor = `rgba(${r1},${g1},${b1},${opacity})`
        ctx.shadowBlur  = 6
        ctx.strokeStyle = grad3
        ctx.lineWidth   = 2
        rrPath(x, y, W, H, rr)
        ctx.stroke()
        ctx.restore()
      }


      rafId = requestAnimationFrame(frame)
    }


    const startId = setTimeout(() => { rafId = requestAnimationFrame(frame) }, 0)
    return () => { clearTimeout(startId); cancelAnimationFrame(rafId) }
  }, [cardRadius])


  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: "relative" }}
    >
      {/*
        Canvas sits BLEED px outside the wrapper on all four sides.
        Its pixel size is driven entirely by ResizeObserver — no calc() involved.
        The path draws at (BLEED, BLEED) with size (w × h) so it sits
        exactly on the wrapper's border.
      */}
      <canvas
        ref={canvasRef}
        style={{
          position:      "absolute",
          top:           -BLEED,
          left:          -BLEED,
          pointerEvents: "none",
          zIndex:        0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        {children}
      </div>
    </div>
  )
}

