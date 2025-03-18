import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateSQLWithOllama } from "@/lib/ollama"

// Create a SQL client directly in this file
const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    // Get the natural language query and model from the request body
    const { query, model = "llama3" } = await req.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required and must be a string" }, { status: 400 })
    }

    // Generate SQL using Ollama
    let parsedResponse
    try {
      parsedResponse = await generateSQLWithOllama(query, model)
    } catch (error) {
      console.error("Failed to generate SQL with Ollama:", error)
      return NextResponse.json({ error: `Failed to generate SQL: ${(error as Error).message}` }, { status: 500 })
    }

    // Execute the generated SQL query directly
    let data
    try {
      // Execute the query directly with the sql function
      data = await sql(parsedResponse.sql, [])
    } catch (error) {
      console.error("Error executing SQL query:", error)
      return NextResponse.json(
        {
          sql: parsedResponse.sql,
          explanation: parsedResponse.explanation,
          error: `Failed to execute query: ${(error as Error).message}`,
        },
        { status: 200 },
      )
    }

    // Return the SQL query, explanation, and data
    return NextResponse.json({
      sql: parsedResponse.sql,
      explanation: parsedResponse.explanation,
      data,
    })
  } catch (error) {
    console.error("Error generating SQL:", error)
    return NextResponse.json({ error: `Failed to generate SQL: ${(error as Error).message}` }, { status: 500 })
  }
}

