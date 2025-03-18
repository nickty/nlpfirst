// Types for Ollama responses
interface OllamaResponse {
    model: string
    created_at: string
    response: string
    done: boolean
  }
  
  // Function to call Ollama API
  export async function generateSQLWithOllama(
    query: string,
    modelName = "llama3",
  ): Promise<{ sql: string; explanation: string }> {
    try {
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
  
      // Call Ollama API (assuming it's running locally on port 11434)
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          prompt: `${systemPrompt}
  
  User query: ${query}`,
          stream: false,
        }),
      })
  
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`)
      }
  
      const data = (await response.json()) as OllamaResponse
  
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
        throw new Error("Failed to generate a valid SQL query")
      }
    } catch (error) {
      console.error("Error calling Ollama:", error)
      throw error
    }
  }
  
  // Function to check if Ollama is running and get available models
  export async function checkOllamaStatus(): Promise<{
    running: boolean
    models: string[]
  }> {
    try {
      const response = await fetch("http://localhost:11434/api/tags", {
        method: "GET",
      })
  
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
      console.error("Error checking Ollama status:", error)
      return {
        running: false,
        models: [],
      }
    }
  }
  
  