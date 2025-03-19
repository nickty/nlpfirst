"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Database, TableIcon, Key, Check, Plus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchTables, fetchTableSchema, fetchSampleData } from "@/app/actions"
import { useTableSelection } from "./table-selection-context"

interface TableInfo {
  table_name: string
  schema_name: string
  row_count: number
}

interface ColumnInfo {
  column_name: string
  data_type: string
  max_length: number
  is_nullable: boolean
  is_primary_key: boolean
}

export function DatabaseExplorer() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [sampleData, setSampleData] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedTables, addTable, removeTable, isTableSelected } = useTableSelection()

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    try {
      setLoading(true)
      const data = await fetchTables()
      setTables(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleTableSelect = async (tableName: string) => {
    try {
      setLoading(true)
      const schemaData = await fetchTableSchema(tableName)
      setColumns(schemaData)
      setSelectedTable(tableName)

      const sampleData = await fetchSampleData(tableName)
      setSampleData(sampleData)

      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const toggleTableSelection = (tableName: string) => {
    if (isTableSelected(tableName)) {
      removeTable(tableName)
    } else {
      addTable(tableName)
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Explorer
        </CardTitle>
        <CardDescription>Explore your SQL Server database structure and select tables for querying</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="tables" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tables">Tables</TabsTrigger>
              {selectedTable && (
                <>
                  <TabsTrigger value="schema">Schema</TabsTrigger>
                  <TabsTrigger value="sample">Sample Data</TabsTrigger>
                </>
              )}
              <TabsTrigger value="selected">Selected Tables ({selectedTables.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="tables" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table Name</TableHead>
                      <TableHead>Schema</TableHead>
                      <TableHead>Row Count</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={`${table.schema_name}.${table.table_name}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <TableIcon className="h-4 w-4" />
                            {table.table_name}
                          </div>
                        </TableCell>
                        <TableCell>{table.schema_name}</TableCell>
                        <TableCell>{table.row_count.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleTableSelect(table.table_name)}>
                              Explore
                            </Button>
                            <Button
                              variant={isTableSelected(table.table_name) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleTableSelection(table.table_name)}
                            >
                              {isTableSelected(table.table_name) ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" /> Selected
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-1" /> Select
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="selected" className="space-y-4">
              {selectedTables.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table Name</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTables.map((tableName) => (
                        <TableRow key={tableName}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <TableIcon className="h-4 w-4" />
                              {tableName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => removeTable(tableName)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Alert>
                  <AlertTitle>No Tables Selected</AlertTitle>
                  <AlertDescription>
                    Select tables from the Tables tab to include them in your queries.
                  </AlertDescription>
                </Alert>
              )}
              {selectedTables.length > 0 && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => removeTable(selectedTables[selectedTables.length - 1])}>
                    Remove Last
                  </Button>
                  <Button variant="destructive" className="ml-2" onClick={() => removeTable(selectedTables[0])}>
                    Remove First
                  </Button>
                  <Button variant="destructive" className="ml-2" onClick={() => removeTable(selectedTables[0])}>
                    Clear All
                  </Button>
                </div>
              )}
            </TabsContent>

            {selectedTable && (
              <>
                <TabsContent value="schema" className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column Name</TableHead>
                          <TableHead>Data Type</TableHead>
                          <TableHead>Nullable</TableHead>
                          <TableHead>Key</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columns.map((column) => (
                          <TableRow key={column.column_name}>
                            <TableCell className="font-medium">{column.column_name}</TableCell>
                            <TableCell>
                              {column.data_type}
                              {column.max_length > 0 && column.max_length < 8000 && `(${column.max_length})`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={column.is_nullable ? "outline" : "secondary"}>
                                {column.is_nullable ? "NULL" : "NOT NULL"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {column.is_primary_key && (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <Key className="h-3 w-3" />
                                  PK
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="sample" className="space-y-4">
                  {sampleData.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(sampleData[0]).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sampleData.map((row, i) => (
                            <TableRow key={i}>
                              {Object.values(row).map((value: any, j) => (
                                <TableCell key={j}>
                                  {value === null
                                    ? "NULL"
                                    : typeof value === "object"
                                      ? JSON.stringify(value)
                                      : String(value)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Alert>
                      <AlertTitle>No Data</AlertTitle>
                      <AlertDescription>No sample data available for this table.</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

