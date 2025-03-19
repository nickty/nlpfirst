"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2, Power } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { checkOllamaStatus } from "@/app/actions"

export function LocalModelSelector() {
  const [selectedModel, setSelectedModel] = useState("llama3")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "warning">("idle")
  const [message, setMessage] = useState("")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isOllamaRunning, setIsOllamaRunning] = useState(false)
  const [ollamaEnabled, setOllamaEnabled] = useState(true)

  // Check Ollama status on component mount
  useEffect(() => {
    // Check if Ollama is disabled in localStorage
    const storedOllamaEnabled = localStorage.getItem("ollamaEnabled")
    if (storedOllamaEnabled !== null) {
      setOllamaEnabled(storedOllamaEnabled === "true")
    }

    checkStatus()
  }, [])

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    // Store the selected model in localStorage
    localStorage.setItem("selectedModel", value)
    // Dispatch an event to notify other components
    window.dispatchEvent(new CustomEvent("modelChanged", { detail: value }))
  }

  const toggleOllama = (enabled: boolean) => {
    setOllamaEnabled(enabled)
    localStorage.setItem("ollamaEnabled", String(enabled))
    // Dispatch an event to notify other components
    window.dispatchEvent(new CustomEvent("ollamaEnabledChanged", { detail: enabled }))

    if (enabled) {
      checkStatus()
    } else {
      setStatus("warning")
      setMessage("Ollama is disabled. The app will use the rule-based fallback approach.")
    }
  }

  const checkStatus = async () => {
    if (!ollamaEnabled) {
      setStatus("warning")
      setMessage("Ollama is disabled. The app will use the rule-based fallback approach.")
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const { running, models } = await checkOllamaStatus()

      setIsOllamaRunning(running)

      if (!running) {
        setStatus("warning")
        setMessage("Could not connect to Ollama. The app will use a fallback approach.")
        return
      }

      setAvailableModels(models)

      if (models.includes(selectedModel)) {
        setStatus("success")
        setMessage(`${selectedModel} is available and ready to use`)
      } else if (models.length > 0) {
        setStatus("warning")
        setMessage(`${selectedModel} is not installed. Available models: ${models.join(", ")}`)
        // Auto-select the first available model
        if (models.length > 0) {
          handleModelChange(models[0])
        }
      } else {
        setStatus("warning")
        setMessage(
          `No models installed. Run 'ollama pull ${selectedModel}' to install it. The app will use a fallback approach.`,
        )
      }
    } catch (error) {
      setStatus("warning")
      setMessage("Error checking Ollama status. The app will use a fallback approach.")
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
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Local Model Settings</span>
          <div className="flex items-center space-x-2">
            <Switch id="ollama-toggle" checked={ollamaEnabled} onCheckedChange={toggleOllama} />
            <Label htmlFor="ollama-toggle" className="text-sm font-normal">
              {ollamaEnabled ? "Ollama Enabled" : "Ollama Disabled"}
            </Label>
          </div>
        </CardTitle>
        <CardDescription>Select and manage local language models for SQL generation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ollamaEnabled && (
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <Select
                value={selectedModel}
                onValueChange={handleModelChange}
                disabled={!isOllamaRunning || availableModels.length === 0}
              >
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
            <Button onClick={checkStatus} variant="outline" disabled={status === "loading"}>
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
        )}

        {status !== "idle" && (
          <Alert variant={status === "success" ? "default" : status === "error" ? "destructive" : "default"}>
            <AlertTitle className="flex items-center">
              {getStatusIcon()}
              <span className="ml-2">
                {status === "success"
                  ? "Ready"
                  : status === "error"
                    ? "Error"
                    : status === "warning"
                      ? "Warning"
                      : "Status"}
              </span>
            </AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {!isOllamaRunning && ollamaEnabled && (
          <Alert variant="default">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle>Ollama Not Running</AlertTitle>
            <AlertDescription>
              <p>Ollama is not running. The app will use a fallback approach, but for better results:</p>
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
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => toggleOllama(false)} className="flex items-center">
                  <Power className="mr-2 h-4 w-4" />
                  Disable Ollama Attempts
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

