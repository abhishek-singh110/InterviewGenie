import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const answer: string = body?.answer || ""
    const mode: "text" | "voice" = body?.mode || "text"

    const lengthScore = Math.min(10, Math.floor(answer.trim().split(/\s+/).length / 10) + 3)
    const plus = /\b(team|impact|optimize|customer|scalable|security|testing)\b/i.test(answer) ? 2 : 0
    const score = Math.max(1, Math.min(10, lengthScore + plus))

    const strengths: string[] = []
    if (answer.length > 120) strengths.push("Comprehensive explanation")
    if (/\bI\b/.test(answer)) strengths.push("Clear ownership of actions")
    if (/\bmetric|kpi|result|impact\b/i.test(answer)) strengths.push("Mentions measurable impact")

    const improvements: string[] = []
    if (!/\bexample|for instance|e\.g\.\b/i.test(answer))
      improvements.push("Add concrete examples to support your points")
    if (!/\bchallenge|problem|issue\b/i.test(answer)) improvements.push("Describe the core challenge you faced")
    if (!/\bresult|outcome|impact\b/i.test(answer)) improvements.push("Highlight the outcome or impact")

    return NextResponse.json({ score, strengths, improvements, mode })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "evaluation error" }, { status: 400 })
  }
}
