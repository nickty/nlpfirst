"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { testDatabaseConnection } from "@/app/actions"

export function DatabaseTest() {
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    try {
      const testResult = await testDatabaseConnection()
      setResult(testResult)
    } catch (error) {
      setResult({ success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Database Connection Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleTest} disabled={loading}>
          {loading ? "Testing..." : "Test Database Connection"}
        </Button>

        {result && (
          <div className="mt-4 p-4 rounded-md bg-muted">
            {result.success ? (
              <p className="text-green-600">Connection successful! Found {result.count} companies in the database.</p>
            ) : (
              <p className="text-red-600">Connection failed: {result.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

