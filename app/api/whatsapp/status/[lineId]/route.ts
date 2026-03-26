export const runtime = "nodejs"


import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(req: Request, { params }: { params: { lineId: string } }) {
  try {
    const { lineId } = params

    const line = await sql`
      SELECT id, phone, status, qr_code
      FROM lineas_whatsapp
      WHERE id = ${lineId}
    `

    if (line.length === 0) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 })
    }

    const lineData = line[0]

    return NextResponse.json({
      lineId: lineData.id,
      phone: lineData.phone,
      status: lineData.status,
      qr: lineData.qr_code || null,
    })
  } catch (error) {
    console.error("[v0] Status check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
