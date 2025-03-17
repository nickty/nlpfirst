export interface QueryResult {
    sql: string
    explanation: string
    data: Record<string, any>[]
    columns: string[]
  }
  
  export interface Company {
    id: number
    name: string
    valuation: number
    date_joined: string
    country: string
    city: string
    industry: string
    investors: string
  }
  
  