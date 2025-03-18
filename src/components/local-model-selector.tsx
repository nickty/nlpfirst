"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { checkOllamaStatus } from "@/lib/ollama"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function LocalModelSelector() {
  const [selectedModel, setSelectedModel] = useState("llama3")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isOllamaRunning, setIsOllamaRunning] = useState(false)

  // Check Ollama status on component mount
  useEffect(() => {
    checkOllamaStatus().then(({ running, models }) => {
      setIsOllamaRunning(running)
      if (running && models.length > 0) {
        setAvailableModels(models)
        setStatus("success")
        setMessage(`Ollama is running with ${models.length} models available`)
      } else if (running) {
        setStatus("warning")
        setMessage("Ollama is running but no models are installed")
      } else {
        setStatus("error")
        setMessage("Ollama is not running. Please start Ollama and refresh.")
      }
    })
  }, [])

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    // Store the selected model in localStorage
    localStorage.setItem("selectedModel", value)
    // Dispatch an event to notify other components
    window.dispatchEvent(new CustomEvent("modelChanged", { detail: value }))
  }

  const checkModelStatus = async () => {
    setStatus("loading")
    setMessage("")

    try {
      const { running, models } = await checkOllamaStatus()

      setIsOllamaRunning(running)

      if (!running) {
        setStatus("error")
        setMessage("Could not connect to Ollama. Make sure it's running on your machine.")
        return
      }

      setAvailableModels(models)

      if (models.includes(selectedModel)) {
        setStatus("success")
        setMessage(`${selectedModel} is available and ready to use`)
      } else if (models.length > 0) {
        setStatus("warning")
        setMessage(`${selectedModel} is not installed. Available models: ${models.join(", ")}`)
      } else {
        setStatus("error")
        setMessage(`No models installed. Run 'ollama pull ${selectedModel}' to install it.`)
      }
    } catch (error) {
      setStatus("error")
      setMessage("Error checking Ollama status. Make sure it's running on your machine.")
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Local Model Settings</CardTitle>
        <CardDescription>Select and manage local language models for SQL generation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <Select value={selectedModel} onValueChange={handleModelChange} disabled={!isOllamaRunning}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.length > 0 ? (
                  availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="llama3">llama3</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={checkModelStatus} variant="outline" disabled={status === "loading"}>
            {status === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                {getStatusIcon()}
                <span className="ml-2">Check Status</span>
              </>
            )}
          </Button>
        </div>

        {status !== "idle" && (
          <Alert variant={status === "success" ? "default" : status === "error" ? "destructive" : "default"}>
            <AlertTitle className="flex items-center">
              {getStatusIcon()}
              <span className="ml-2">{status === "success" ? "Ready" : status === "error" ? "Error" : "Status"}</span>
            </AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {!isOllamaRunning && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ollama Not Running</AlertTitle>
            <AlertDescription>
              <p>Ollama is not running. Please follow these steps:</p>
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>
                  Download and install Ollama from{" "}
                  <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">
                    ollama.ai
                  </a>
                </li>
                <li>Start the Ollama application</li>
                <li>
                  Pull a model using the command:{" "}
                  <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">ollama pull llama3</code>
                </li>
                <li>Refresh this page and click "Check Status"</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

