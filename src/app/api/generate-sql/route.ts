import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Define the structure of our response
interface GenerateSQLResponse {
  sql: string
  explanation: string
  data?: any[]
  error?: string
}

// Create a SQL client directly in this file
const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    // Get the natural language query from the request body
    const { query } = await req.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required and must be a string" }, { status: 400 })
    }

    // Define the system prompt with information about our database schema
    const systemPrompt = `
      You are an expert SQL query generator. Convert natural language queries to SQL for a PostgreSQL database.
      
      The database has a table called 'companies' with the following schema:
      
      CREATE TABLE companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        valuation BIGINT NOT NULL, -- in millions of USD
        date_joined DATE NOT NULL,
        country VARCHAR(100) NOT NULL,
        city VARCHAR(100),
        industry VARCHAR(100) NOT NULL,
        investors TEXT
      );
      
      Rules:
      1. Generate only valid PostgreSQL SQL queries
      2. Do not use backticks in the SQL
      3. Return ONLY a JSON object with two properties:
         - "sql": the SQL query
         - "explanation": a brief explanation of what the query does in plain English
      4. Make sure the SQL is properly formatted and uses proper SQL syntax
      5. Do not include any markdown formatting in your response
      6. The response should be valid JSON that can be parsed with JSON.parse()
    `

    // Generate the SQL query using the AI SDK
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      prompt: query,
    })

    // Parse the response as JSON
    let parsedResponse: { sql: string; explanation: string }
    try {
      parsedResponse = JSON.parse(text)
    } catch (error) {
      console.error("Failed to parse AI response as JSON:", text)
      return NextResponse.json({ error: "Failed to generate a valid SQL query" }, { status: 500 })
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

