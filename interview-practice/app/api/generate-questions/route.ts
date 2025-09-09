import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const skills: string[] = body?.skills || []
    const keywords: string[] = body?.keywords || []
    const user_id: string = body?.user_id || "unknown"

    const base = [
      "Tell me about a challenging project you worked on and your role.",
      "How do you approach debugging complex issues?",
      "Describe a time you improved performance in an application.",
    ]
    const skillQs = skills.slice(0, 4).map((s) => `How have you used ${s} in production systems?`)
    const keywordQs = keywords.slice(0, 3).map((k) => `What is your experience with ${k}?`)

    const questions = Array.from(new Set([...base, ...skillQs, ...keywordQs]))
    return NextResponse.json({ user_id, questions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "generation error" }, { status: 400 })
  }
}
