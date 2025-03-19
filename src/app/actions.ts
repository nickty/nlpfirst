"use server"

import * as sql from "mssql"

const config: sql.config = {
  server: process.env.SERVER_IP_ADDRESS,
  database: process.env.DATABASE_NAME,
  user: "sa",
  password: process.env.DATABASE_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: false,
  },
}

// Create a connection pool
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Connected to SQL Server")
    return pool
  })
  .catch((err) => {
    console.error("Database Connection Failed:", err)
    throw err
  })

// Function to sanitize data (remove binary data)
function sanitizeData(data: any[]): any[] {
  return data.map((item) => {
    const sanitizedItem: Record<string, any> = {}

    for (const [key, value] of Object.entries(item)) {
      // Skip binary data (Uint8Array, Buffer)
      if (value instanceof Uint8Array || value instanceof Buffer) {
        sanitizedItem[key] = "[BINARY DATA]"
      } else if (value instanceof Date) {
        // Convert Date objects to ISO strings
        sanitizedItem[key] = value.toISOString()
      } else {
        sanitizedItem[key] = value
      }
    }

    return sanitizedItem
  })
}

// Function to execute a SQL query
export async function executeQuery(query: string): Promise<any[]> {
  try {
    const pool = await poolPromise
    const result = await pool.request().query(query)

    // Sanitize the data to remove binary content
    const sanitizedData = sanitizeData(result.recordset)

    return sanitizedData
  } catch (error) {
    console.error("Error executing query:", error)
    throw error
  }
}

// Function to get table schema
export async function getTableSchema(tableName: string): Promise<any[]> {
  const query = `
    SELECT 
      c.name AS column_name,
      t.name AS data_type,
      c.max_length,
      c.is_nullable,
      ISNULL(i.is_primary_key, 0) as is_primary_key
    FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    LEFT JOIN (
      SELECT ic.column_id, ic.object_id, 1 as is_primary_key
      FROM sys.index_columns ic
      INNER JOIN sys.indexes i ON ic.object_id = i.object_id
      AND ic.index_id = i.index_id
      WHERE i.is_primary_key = 1
    ) i ON i.column_id = c.column_id AND i.object_id = c.object_id
    WHERE c.object_id = OBJECT_ID('${tableName}')
    ORDER BY c.column_id;
  `

  try {
    const pool = await poolPromise
    const result = await pool.request().query(query)
    return result.recordset
  } catch (error) {
    console.error("Error getting table schema:", error)
    throw error
  }
}

// Function to list all tables
export async function listTables(): Promise<any[]> {
  const query = `
    SELECT 
      t.name AS table_name,
      s.name AS schema_name,
      p.rows AS row_count
    FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    INNER JOIN sys.partitions p ON t.object_id = p.object_id
    WHERE p.index_id IN (0,1)
    ORDER BY t.name;
  `

  try {
    const pool = await poolPromise
    const result = await pool.request().query(query)
    return result.recordset
  } catch (error) {
    console.error("Error listing tables:", error)
    throw error
  }
}

// Function to get foreign key relationships
export async function getForeignKeyRelationships(): Promise<any[]> {
  const query = `
    SELECT 
      fk.name AS constraint_name,
      OBJECT_NAME(fk.parent_object_id) AS table_name,
      COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
      OBJECT_NAME(fk.referenced_object_id) AS referenced_table_name,
      COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referenced_column_name
    FROM 
      sys.foreign_keys AS fk
    INNER JOIN 
      sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
    ORDER BY 
      table_name, referenced_table_name;
  `

  try {
    const pool = await poolPromise
    const result = await pool.request().query(query)
    return result.recordset
  } catch (error) {
    console.error("Error getting foreign key relationships:", error)
    throw error
  }
}

// Function to test the database connection
export async function testDatabaseConnection(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const pool = await poolPromise
    const result = await pool.request().query("SELECT COUNT(*) AS count FROM EmployeeMaster")
    return { success: true, count: result.recordset[0].count }
  } catch (error) {
    console.error("Error testing database connection:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Function to fetch sample data for a table
export async function fetchSampleData(tableName: string) {
  try {
    const query = `SELECT TOP 10 * FROM ${tableName}`
    const data = await executeQuery(query)
    return data
  } catch (error) {
    console.error("Error fetching sample data:", error)
    throw new Error("Failed to fetch sample data")
  }
}

// Function to get simplified table schema (just column names and types)
async function getSimplifiedTableSchema(tableName: string): Promise<string> {
  try {
    const schema = await getTableSchema(tableName)
    return schema.map((col) => `${col.column_name} ${col.data_type}${col.is_primary_key ? " (PK)" : ""}`).join(", ")
  } catch (error) {
    console.error("Error getting simplified schema:", error)
    return ""
  }
}

// Function to get relevant tables based on the query
export async function getRelevantTables(query: string): Promise<string[]> {
  try {
    // Get all tables
    const tables = await listTables()

    // Filter out system tables
    const filteredTables = tables.filter(
      (t) => !t.table_name.startsWith("sys") && !t.table_name.startsWith("dt") && t.row_count > 0,
    )

    // Convert query to lowercase for case-insensitive matching
    const lowerQuery = query.toLowerCase()

    // Look for table names in the query
    const mentionedTables = filteredTables
      .filter(
        (t) =>
          lowerQuery.includes(t.table_name.toLowerCase()) ||
          lowerQuery.includes(t.table_name.toLowerCase().replace("master", "")) ||
          lowerQuery.includes(t.table_name.toLowerCase().replace("_", " ")),
      )
      .map((t) => t.table_name)

    // If no tables are explicitly mentioned, return the most important ones
    if (mentionedTables.length === 0) {
      // Return tables with "master" in the name or the ones with most rows
      const masterTables = filteredTables
        .filter((t) => t.table_name.toLowerCase().includes("master"))
        .map((t) => t.table_name)

      if (masterTables.length > 0) {
        return masterTables.slice(0, 3)
      }

      // Sort by row count and return top 3
      filteredTables.sort((a, b) => b.row_count - a.row_count)
      return filteredTables.slice(0, 3).map((t) => t.table_name)
    }

    return mentionedTables
  } catch (error) {
    console.error("Error getting relevant tables:", error)
    // Return a default set of tables if there's an error
    return ["EmployeeMaster"]
  }
}

// Function to generate SQL with Ollama using a simplified approach
export async function generateSQLWithOllamaSimplified(
  query: string,
  modelName = "llama3",
): Promise<{ sql: string; explanation: string }> {
  try {
    // Get relevant tables based on the query
    const relevantTables = await getRelevantTables(query)

    // Get simplified schema for relevant tables
    let tableInfo = ""
    for (const table of relevantTables) {
      const schema = await getSimplifiedTableSchema(table)
      tableInfo += `Table: ${table} (Columns: ${schema})\n\n`
    }

    // Define a simpler system prompt with just the relevant tables
    const systemPrompt = `
      You are an expert SQL query generator. Convert natural language queries to SQL for a Microsoft SQL Server database.
      
      The database has the following tables that are relevant to this query:
      
      ${tableInfo}
      
      Rules:
      1. Generate only valid T-SQL (SQL Server) queries
      2. Use proper SQL Server syntax (e.g., TOP instead of LIMIT)
      3. Return ONLY a JSON object with two properties:
         - "sql": the SQL query
         - "explanation": a brief explanation of what the query does in plain English
      4. Make sure the SQL is properly formatted and uses proper SQL Server syntax
      5. Do not include any markdown formatting in your response
      6. The response should be valid JSON that can be parsed with JSON.parse()
      7. Use appropriate SQL Server date functions (e.g., DATEADD, DATEDIFF) when working with dates
      8. For pagination, use OFFSET-FETCH instead of LIMIT
      9. If the query involves multiple tables, use appropriate JOIN clauses based on column names
      10. Focus on the tables that are most relevant to the query
    `

    // Call Ollama API with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout (reduced from 10)

    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          prompt: `${systemPrompt}\n\nUser query: ${query}`,
          stream: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`)
      }

      const data = await response.json()

      // Parse the response as JSON
      try {
        // Extract the JSON object from the response
        const jsonMatch = data.response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error("No JSON object found in response")
        }

        const jsonStr = jsonMatch[0]
        const parsedResponse = JSON.parse(jsonStr)

        return {
          sql: parsedResponse.sql,
          explanation: parsedResponse.explanation,
        }
      } catch (error) {
        console.error("Failed to parse Ollama response as JSON:", data.response)

        // Fallback: Try to extract SQL directly from the response
        const sqlMatch = data.response.match(/SELECT[\s\S]*?;/i)
        if (sqlMatch) {
          return {
            sql: sqlMatch[0],
            explanation: "Generated SQL query based on your request.",
          }
        }

        throw new Error("Failed to generate a valid SQL query")
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    console.error("Error calling Ollama:", error)
    throw error
  }
}

// Enhanced rule-based SQL generator
export async function generateSQLWithRuleBased(query: string): Promise<{ sql: string; explanation: string }> {
  try {
    // Get all tables to find the most relevant ones
    const tables = await listTables()

    // Filter out system tables
    const filteredTables = tables.filter(
      (t) => !t.table_name.startsWith("sys") && !t.table_name.startsWith("dt") && t.row_count > 0,
    )

    // Convert query to lowercase for case-insensitive matching
    const lowerQuery = query.toLowerCase()

    // Try to identify the main table from the query
    let mainTable = "EmployeeMaster" // Default to EmployeeMaster

    // Check for specific keywords in the query
    if (lowerQuery.includes("employee") || lowerQuery.includes("staff") || lowerQuery.includes("worker")) {
      mainTable = "EmployeeMaster"
    } else if (lowerQuery.includes("department")) {
      mainTable = "DepartmentMaster"
    } else if (lowerQuery.includes("project")) {
      mainTable = "ProjectMaster"
    } else if (lowerQuery.includes("customer")) {
      mainTable = "CustomerMaster"
    } else if (lowerQuery.includes("vendor") || lowerQuery.includes("supplier")) {
      mainTable = "VendorMaster"
    } else if (lowerQuery.includes("product") || lowerQuery.includes("item")) {
      mainTable = "ProductMaster"
    } else if (lowerQuery.includes("order") || lowerQuery.includes("purchase")) {
      mainTable = "OrderMaster"
    } else if (lowerQuery.includes("invoice") || lowerQuery.includes("bill")) {
      mainTable = "InvoiceMaster"
    } else {
      // Look for any table name in the query
      for (const table of filteredTables) {
        if (lowerQuery.includes(table.table_name.toLowerCase())) {
          mainTable = table.table_name
          break
        }
      }
    }

    // Try to identify the columns to select
    let columns = "*"

    if (lowerQuery.includes("name") && lowerQuery.includes("only")) {
      columns = "EmpName"
    } else if (lowerQuery.includes("id") && lowerQuery.includes("only")) {
      columns = "EmpID"
    } else if (lowerQuery.includes("email") && lowerQuery.includes("only")) {
      columns = "EMailID"
    }

    // Simple query templates
    if (lowerQuery.includes("show all") || lowerQuery.includes("list all") || lowerQuery.includes("get all")) {
      return {
        sql: `SELECT TOP 100 ${columns} FROM ${mainTable};`,
        explanation: `Shows the first 100 records from the ${mainTable} table.`,
      }
    }

    if (lowerQuery.includes("count")) {
      if (lowerQuery.includes("by") || lowerQuery.includes("group")) {
        // Try to identify the grouping column
        let groupColumn = "Department"

        if (lowerQuery.includes("department")) {
          groupColumn = "Department"
        } else if (lowerQuery.includes("gender") || lowerQuery.includes("sex")) {
          groupColumn = "Sex"
        } else if (lowerQuery.includes("city") || lowerQuery.includes("location")) {
          groupColumn = "Address1"
        } else if (lowerQuery.includes("status")) {
          groupColumn = "StatusInfo"
        } else if (lowerQuery.includes("position") || lowerQuery.includes("job")) {
          groupColumn = "JobPosition"
        }

        return {
          sql: `SELECT ${groupColumn}, COUNT(*) AS count FROM ${mainTable} GROUP BY ${groupColumn} ORDER BY count DESC;`,
          explanation: `Counts the number of records in the ${mainTable} table, grouped by ${groupColumn}.`,
        }
      } else {
        return {
          sql: `SELECT COUNT(*) AS count FROM ${mainTable};`,
          explanation: `Counts the total number of records in the ${mainTable} table.`,
        }
      }
    }

    if (lowerQuery.includes("top") || lowerQuery.includes("highest") || lowerQuery.includes("most")) {
      // Extract number if present (e.g., "top 5")
      const numMatch = lowerQuery.match(/\b(\d+)\b/)
      const limit = numMatch ? Number.parseInt(numMatch[1]) : 10

      return {
        sql: `SELECT TOP ${limit} * FROM ${mainTable} ORDER BY Id DESC;`,
        explanation: `Shows the top ${limit} records from the ${mainTable} table.`,
      }
    }

    if (lowerQuery.includes("active") || lowerQuery.includes("current")) {
      return {
        sql: `SELECT * FROM ${mainTable} WHERE Active = 1;`,
        explanation: `Shows active records from the ${mainTable} table.`,
      }
    }

    if (lowerQuery.includes("inactive") || lowerQuery.includes("former")) {
      return {
        sql: `SELECT * FROM ${mainTable} WHERE Active = 0;`,
        explanation: `Shows inactive records from the ${mainTable} table.`,
      }
    }

    if (lowerQuery.includes("recent") || lowerQuery.includes("latest") || lowerQuery.includes("newest")) {
      return {
        sql: `SELECT TOP 20 * FROM ${mainTable} ORDER BY Id DESC;`,
        explanation: `Shows the 20 most recent records from the ${mainTable} table.`,
      }
    }

    if (lowerQuery.includes("search") || lowerQuery.includes("find")) {
      // Try to extract a search term
      const searchTerms = lowerQuery
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 3 &&
            !["search", "find", "for", "the", "with", "where", "that", "have", "has", "all", "any"].includes(word),
        )

      if (searchTerms.length > 0) {
        const searchTerm = searchTerms[0]
        return {
          sql: `SELECT * FROM ${mainTable} WHERE EmpName LIKE '%${searchTerm}%' OR Department LIKE '%${searchTerm}%';`,
          explanation: `Searches for records in the ${mainTable} table containing "${searchTerm}".`,
        }
      }
    }

    // Default query
    return {
      sql: `SELECT TOP 10 * FROM ${mainTable};`,
      explanation: `Shows the first 10 records from the ${mainTable} table.`,
    }
  } catch (error) {
    console.error("Error in rule-based SQL generation:", error)
    // Absolute fallback
    return {
      sql: "SELECT TOP 10 * FROM EmployeeMaster;",
      explanation: "Shows the first 10 employees.",
    }
  }
}

// Function to generate and execute a query using the simplified approach
export async function generateAndExecuteQuerySimplified(query: string, model = "llama3") {
  try {
    let parsedResponse

    try {
      // Try the simplified Ollama approach first
      parsedResponse = await generateSQLWithOllamaSimplified(query, model)
    } catch (error) {
      console.error("Error with Ollama, falling back to rule-based approach:", error)

      // If Ollama fails, fall back to rule-based approach
      parsedResponse = await generateSQLWithRuleBased(query)
    }

    // Execute the generated SQL query
    let data
    try {
      data = await executeQuery(parsedResponse.sql)
    } catch (error) {
      console.error("Error executing SQL query:", error)

      // If the generated SQL fails, try a simpler fallback query
      try {
        const fallbackResponse = await generateSQLWithRuleBased(query)
        data = await executeQuery(fallbackResponse.sql)

        // Update the response with the fallback SQL that actually worked
        parsedResponse = fallbackResponse
      } catch (fallbackError) {
        // If even the fallback fails, return the original error
        return {
          sql: parsedResponse.sql,
          explanation: parsedResponse.explanation,
          error: `Failed to execute query: ${(error as Error).message}`,
        }
      }
    }

    // Return the SQL query, explanation, and data
    return {
      sql: parsedResponse.sql,
      explanation: parsedResponse.explanation,
      data,
    }
  } catch (error) {
    console.error("Error generating SQL:", error)

    // Ultimate fallback - just return some basic data
    try {
      const data = await executeQuery("SELECT TOP 10 * FROM EmployeeMaster")
      return {
        sql: "SELECT TOP 10 * FROM EmployeeMaster",
        explanation: "Showing basic employee data (fallback query).",
        data,
      }
    } catch (finalError) {
      throw new Error(`Failed to generate SQL: ${(error as Error).message}`)
    }
  }
}

// Function to check if Ollama is running and get available models
export async function checkOllamaStatus(): Promise<{
  running: boolean
  models: string[]
}> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout (reduced from 3)

    try {
      const response = await fetch("http://localhost:11434/api/tags", {
        method: "GET",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return { running: false, models: [] }
      }

      const data = await response.json()
      const models = data.models?.map((model: any) => model.name) || []

      return {
        running: true,
        models,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error("Error checking Ollama status:", error)
      return {
        running: false,
        models: [],
      }
    }
  } catch (error) {
    console.error("Error checking Ollama status:", error)
    return {
      running: false,
      models: [],
    }
  }
}

export async function fetchTables() {
  try {
    return await listTables()
  } catch (error) {
    console.error("Error fetching tables:", error)
    throw new Error("Failed to fetch tables")
  }
}

export async function fetchTableSchema(tableName: string) {
  try {
    return await getTableSchema(tableName)
  } catch (error) {
    console.error("Error fetching table schema:", error)
    throw new Error("Failed to fetch table schema")
  }
}
