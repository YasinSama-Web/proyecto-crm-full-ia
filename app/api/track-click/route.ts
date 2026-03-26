import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const { landingId } = await request.json()

    if (!landingId) {
      return NextResponse.json({ error: "landingId is required" }, { status: 400 })
    }

    const headersList = await headers()
    const userAgent = headersList.get("user-agent") || ""
    const referer = headersList.get("referer") || ""
    const forwardedFor = headersList.get("x-forwarded-for")
    const ip = forwardedFor?.split(",")[0]?.trim() || ""

    // Track the click event
    await sql`
      INSERT INTO tracking_eventos (landing_id, tipo_evento, ip_address, user_agent, referrer)
      VALUES (${landingId}, 'clic', ${ip}, ${userAgent}, ${referer})
    `

    // Increment click counter
    await sql`
      UPDATE landings SET clics_boton = clics_boton + 1 WHERE id = ${landingId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking click:", error)
    return NextResponse.json({ error: "Error tracking click" }, { status: 500 })
  }
}
