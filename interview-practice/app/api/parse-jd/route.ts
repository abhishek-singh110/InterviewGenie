import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const jd: string = body?.jd || ""
    const user_id: string = body?.user_id || "unknown"

    const lower = jd.toLowerCase()
    const skills = Array.from(
      new Set(
        ["react", "next.js", "typescript", "node", "css", "tailwind", "api", "sql", "python"].filter((s) =>
          lower.includes(s.toLowerCase()),
        ),
      ),
    )
    const keywords = Array.from(new Set(jd.split(/\W+/).filter((w: string) => w.length > 6))).slice(0, 10)

    return NextResponse.json({ skills, keywords, user_id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "parse error" }, { status: 400 })
  }
}
