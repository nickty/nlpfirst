"use client"

import { Button } from "@/components/ui/button"

const EXAMPLE_QUERIES = [
  "Show me all employees in the IT department",
  "How many employees do we have in each department?",
  "List all employees hired in the last year",
  "What is the average salary by department?",
  "Show me the top 10 highest paid employees",
  "How many employees are there in each city?",
  "List all employees who are managers",
  "Show me all departments and their employee count",
  "Find all transactions from last month",
  "What are our top selling products?",
  "Show me customer information with their recent orders",
  "List all projects with their assigned employees",
  "What is the total revenue by product category?",
  "Show me attendance records for employees in the Finance department",
  "Find all overdue tasks and who they're assigned to",
]

export function SuggestedQueries() {
  const handleQueryClick = (query: string) => {
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

