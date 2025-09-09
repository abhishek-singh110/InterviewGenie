import { type NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest) {
  try {
    // In production: const form = await _req.formData(); send audio to STT provider
    return NextResponse.json({ transcript: "This is a placeholder transcript derived from the recorded audio." })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "stt error" }, { status: 400 })
  }
}
