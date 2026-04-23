import { NextResponse } from "next/server"
import { processPendingEvents } from "@/app/dashboard/marketing/action"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  // Seguridad básica por header o query param
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const results = await processPendingEvents()
    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}