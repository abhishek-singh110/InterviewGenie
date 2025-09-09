"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { getUserId } from "@/lib/user-id"

type ParsedJD = { skills: string[]; keywords: string[] }

export function JDUploadForm() {
  const [jdText, setJdText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!jdText && !file) {
      setError("Please paste a job description or upload a file.")
      return
    }

    setLoading(true)
    try {
      let combinedJD = jdText
      if (file) {
        // Basic: read text; for PDFs/DOCX you’d normally send the file to your backend
        const text = await file.text().catch(() => "")
        combinedJD = [jdText, text].filter(Boolean).join("\n\n")
      }

      const user_id = getUserId()

      const parseRes = await fetch("/api/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: combinedJD, user_id }),
      })
      if (!parseRes.ok) throw new Error("Failed to parse job description")
      const parsed: ParsedJD = await parseRes.json()

      const genRes = await fetch(`http://127.0.0.1:8000/extract-and-generate/${user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd_text: combinedJD,   // ✅ match backend param
        }),
      });

      if (!genRes.ok) throw new Error("Failed to generate questions");

      const data = await genRes.json();

      // ✅ Extract only questions
      const questions = data.questions || {};
      console.log("Generated Questions:", questions);

      const allQuestions = Object.values(data.questions).flat();
      console.log(allQuestions);

      // Store only questions
      sessionStorage.setItem("practice_questions", JSON.stringify(allQuestions || {}));
      // Redirect to Next.js PAGE (not API route)
      router.push("/practice");
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Job Description</CardTitle>
        <CardDescription>Paste a JD or upload a file and we’ll generate tailored interview questions.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Paste Job Description</label>
            <Textarea
              placeholder="Paste the job description here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={10}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Or upload a file (optional)</label>
            <Input
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Generate Questions"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
