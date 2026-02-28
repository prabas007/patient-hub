"use client"

import { useState, useEffect, useRef } from "react"

export function SearchBar() {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[LINK-CARE Search]:", value)
  }

  return (
    <form onSubmit={handleSubmit} className="search-bar-container flex-1 max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search conditions, doctors, resources..."
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2
                     text-sm placeholder:text-gray-400 focus:outline-none
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-14"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs
                         text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono pointer-events-none">
          ⌘K
        </span>
      </div>
    </form>
  )
}
