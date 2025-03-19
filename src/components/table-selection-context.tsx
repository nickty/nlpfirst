"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface TableSelectionContextType {
  selectedTables: string[]
  addTable: (tableName: string) => void
  removeTable: (tableName: string) => void
  clearTables: () => void
  isTableSelected: (tableName: string) => boolean
}

const TableSelectionContext = createContext<TableSelectionContextType | undefined>(undefined)

export function TableSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedTables, setSelectedTables] = useState<string[]>([])

  // Load selected tables from localStorage on mount
  useEffect(() => {
    const storedTables = localStorage.getItem("selectedTables")
    if (storedTables) {
      try {
        setSelectedTables(JSON.parse(storedTables))
      } catch (e) {
        console.error("Failed to parse stored tables:", e)
      }
    }
  }, [])

  // Save selected tables to localStorage when they change
  useEffect(() => {
    localStorage.setItem("selectedTables", JSON.stringify(selectedTables))
  }, [selectedTables])

  const addTable = (tableName: string) => {
    if (!selectedTables.includes(tableName)) {
      setSelectedTables([...selectedTables, tableName])
    }
  }

  const removeTable = (tableName: string) => {
    setSelectedTables(selectedTables.filter((table) => table !== tableName))
  }

  const clearTables = () => {
    setSelectedTables([])
  }

  const isTableSelected = (tableName: string) => {
    return selectedTables.includes(tableName)
  }

  return (
    <TableSelectionContext.Provider
      value={{
        selectedTables,
        addTable,
        removeTable,
        clearTables,
        isTableSelected,
      }}
    >
      {children}
    </TableSelectionContext.Provider>
  )
}

export function useTableSelection() {
  const context = useContext(TableSelectionContext)
  if (context === undefined) {
    throw new Error("useTableSelection must be used within a TableSelectionProvider")
  }
  return context
}

