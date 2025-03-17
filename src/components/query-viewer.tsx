"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface QueryResult {
  sql: string
  explanation: string
  data?: any[]
  error?: string
}

export function QueryViewer() {
  const [result, setResult] = useState<QueryResult | null>(null)

  useEffect(() => {
    // Try to load initial result from localStorage
    const storedResult = localStorage.getItem("nlpResult")
    if (storedResult) {
      try {
        setResult(JSON.parse(storedResult))
      } catch (e) {
        console.error("Failed to parse stored result:", e)
      }
    }

    // Listen for updates from the search form
    const handleResultUpdate = (event: CustomEvent<QueryResult>) => {
      setResult(event.detail)
    }

    window.addEventListener("nlpResultUpdated", handleResultUpdate as EventListener)

    return () => {
      window.removeEventListener("nlpResultUpdated", handleResultUpdate as EventListener)
    }
  }, [])

  if (!result) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Query</CardTitle>
        <CardDescription>SQL query generated from your natural language input</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sql">
          <TabsList>
            <TabsTrigger value="sql">SQL</TabsTrigger>
            <TabsTrigger value="explanation">Explanation</TabsTrigger>
          </TabsList>
          <TabsContent value="sql" className="mt-2">
            <pre className="bg-muted p-4 rounded-md overflow-x-auto">
              <code>{result.sql || "No query generated yet"}</code>
            </pre>
            {result.error && <div className="mt-2 p-2 bg-red-100 text-red-800 rounded-md">Error: {result.error}</div>}
          </TabsContent>
          <TabsContent value="explanation" className="mt-2">
            <div className="p-4 rounded-md bg-muted">{result.explanation || "No explanation available"}</div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

