"use client"

import { Button } from "@/components/ui/button"

const EXAMPLE_QUERIES = [
  "Show me the top 10 companies by valuation",
  "Which industries have the most unicorns?",
  "What's the average valuation of companies in the fintech sector?",
  "List companies founded after 2020",
  "Show me companies from the United States in the AI industry",
]

export function SuggestedQueries() {
  const handleQueryClick = (query: string) => {
    // Create a custom event to update the search form
    window.dispatchEvent(new CustomEvent("setSearchQuery", { detail: query }))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Try these examples</h2>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((query) => (
          <Button key={query} variant="outline" onClick={() => handleQueryClick(query)} className="text-sm">
            {query}
          </Button>
        ))}
      </div>
    </div>
  )
}

