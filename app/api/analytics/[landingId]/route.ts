import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { landingId: string } }) {
  const { landingId } = params
  const { searchParams } = new URL(request.url)
  const days = Number.parseInt(searchParams.get("days") || "30")

  try {
    const landingIdNum = Number.parseInt(landingId)

    // Get landing info
    const landing = await sql`
      SELECT * FROM landings WHERE id = ${landingIdNum}
    `

    if (landing.length === 0) {
      return NextResponse.json({ error: "Landing not found" }, { status: 404 })
    }

    // Get daily stats
    const dailyStats = await sql`
      SELECT 
        DATE(timestamp_evento) as date,
        tipo_evento,
        COUNT(*) as count
      FROM tracking_eventos
      WHERE landing_id = ${landingIdNum}
        AND timestamp_evento >= CURRENT_DATE - INTERVAL '${days}' DAY
      GROUP BY DATE(timestamp_evento), tipo_evento
      ORDER BY date ASC
    `

    // Get total stats
    const totals = await sql`
      SELECT 
        tipo_evento,
        COUNT(*) as count
      FROM tracking_eventos
      WHERE landing_id = ${landingIdNum}
        AND timestamp_evento >= CURRENT_DATE - INTERVAL '${days}' DAY
      GROUP BY tipo_evento
    `

    // Get conversions from conversations linked to this landing
    const conversions = await sql`
      SELECT COUNT(*) as count, COALESCE(SUM(monto_conversion), 0) as total_monto
      FROM conversaciones c
      JOIN tracking_eventos te ON te.conversacion_id = c.id
      WHERE te.landing_id = ${landingIdNum}
        AND c.es_conversion = true
        AND te.timestamp_evento >= CURRENT_DATE - INTERVAL '${days}' DAY
    `

    // Get recent events
    const recentEvents = await sql`
      SELECT tipo_evento, ip_address, user_agent, timestamp_evento
      FROM tracking_eventos
      WHERE landing_id = ${landingIdNum}
      ORDER BY timestamp_evento DESC
      LIMIT 20
    `

    // Format daily stats for charts
    const chartData: Record<string, { date: string; visitas: number; clics: number }> = {}

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      chartData[dateStr] = { date: dateStr, visitas: 0, clics: 0 }
    }

    dailyStats.forEach((stat: { date: string; tipo_evento: string; count: string }) => {
      const dateStr = new Date(stat.date).toISOString().split("T")[0]
      if (chartData[dateStr]) {
        if (stat.tipo_evento === "visita") {
          chartData[dateStr].visitas = Number.parseInt(stat.count)
        } else if (stat.tipo_evento === "clic") {
          chartData[dateStr].clics = Number.parseInt(stat.count)
        }
      }
    })

    return NextResponse.json({
      landing: landing[0],
      totals: {
        visitas: totals.find((t: { tipo_evento: string }) => t.tipo_evento === "visita")?.count || 0,
        clics: totals.find((t: { tipo_evento: string }) => t.tipo_evento === "clic")?.count || 0,
        conversiones: conversions[0]?.count || 0,
        monto_total: conversions[0]?.total_monto || 0,
      },
      chartData: Object.values(chartData),
      recentEvents,
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json({ error: "Error fetching analytics" }, { status: 500 })
  }
}
