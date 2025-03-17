"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface QueryResult {
  sql: string
  explanation: string
  data?: any[]
  error?: string
}

export function ResultsViewer() {
  const [result, setResult] = useState<QueryResult | null>(null)
  const [view, setView] = useState<"table" | "chart">("table")

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

  if (!result?.data || result.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Query results will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            {result?.error ? `Error: ${result.error}` : "No results found"}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get column names from the first result object
  const columns = Object.keys(result.data[0])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Results</CardTitle>
            <CardDescription>Found {result.data.length} records</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as "table" | "chart")}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column}>{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((column) => (
                        <TableCell key={`${rowIndex}-${column}`}>
                          {row[column] !== null ? String(row[column]) : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="chart">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart visualization will be implemented in a future step
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

