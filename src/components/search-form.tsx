"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function SearchForm() {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Listen for suggested query clicks
    const handleSetQuery = (event: CustomEvent<string>) => {
      setQuery(event.detail)
    }

    window.addEventListener("setSearchQuery", handleSetQuery as EventListener)

    return () => {
      window.removeEventListener("setSearchQuery", handleSetQuery as EventListener)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/generate-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate SQL")
      }

      // Store the result in localStorage to be accessed by other components
      localStorage.setItem("nlpResult", JSON.stringify(result))

      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent("nlpResultUpdated", { detail: result }))
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2">
      <Input
        placeholder="Ask a question about your data..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          "Processing..."
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Search
          </>
        )}
      </Button>
    </form>
  )
}

