import { SearchForm } from "@/components/search-form"
import { QueryViewer } from "@/components/query-viewer"
import { ResultsViewer } from "@/components/results-viewer"
import { SuggestedQueries } from "@/components/suggested-queries"
import { LocalModelSelector } from "@/components/local-model-selector"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-10 max-w-5xl">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4">Natural Language SQL</h1>
        <p className="text-lg text-muted-foreground">Ask questions about your data in plain English</p>
      </header>

      {/* Local Model Selector */}
      <div className="mb-8">
        <LocalModelSelector />
      </div>

      <SearchForm />

      <div className="mt-8">
        <SuggestedQueries />
      </div>

      <div className="mt-8 space-y-6">
        <QueryViewer />
        <ResultsViewer />
      </div>
    </main>
  )
}

