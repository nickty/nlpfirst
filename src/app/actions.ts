"use server"

import { neon } from "@neondatabase/serverless"

// Create a reusable SQL client
const sql = neon(process.env.DATABASE_URL!)

export async function testDatabaseConnection() {
  try {
    // Simple query to test connection - use the companies table we created
    const result = await sql`SELECT COUNT(*) FROM companies`
    return { success: true, count: result[0].count }
  } catch (error) {
    console.error("Database connection error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function executeQuery(sqlQuery: string): Promise<any[]> {
  try {
    // For dynamic SQL queries, we need to create a new connection
    // and execute the query directly
    const db = neon(process.env.DATABASE_URL!)

    // Use the tagged template literal with an array of parameters
    // Since we're not using parameters, we can just pass an empty array
    const result = await db(sqlQuery, [])

    return result || []
  } catch (error) {
    console.error("Query execution error:", error)
    throw new Error(`Failed to execute query: ${(error as Error).message}`)
  }
}

// Add a new function to list all tables
export async function listTables() {
  try {
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    return { success: true, tables: result.map((row) => row.table_name) }
  } catch (error) {
    console.error("Error listing tables:", error)
    return { success: false, error: (error as Error).message }
  }
}

