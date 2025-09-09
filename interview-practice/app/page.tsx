"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect } from "react"
import { ensureUserId } from "@/lib/user-id"

// Landing / Home Page with CTA and user_id bootstrap
export default function HomePage() {
  useEffect(() => {
    ensureUserId()
  }, [])

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-pretty">AI Interview Practice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Paste a job description to generate tailored interview questions, then practice by typing or recording your
            answers and receive instant feedback.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/upload">Start Practice</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
