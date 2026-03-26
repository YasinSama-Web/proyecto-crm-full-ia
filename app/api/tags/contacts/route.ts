import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    
    const tag = searchParams.get("tag")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 15 // Traemos de a 15 para cuidar la memoria
    const offset = (page - 1) * limit

    if (!tag) return NextResponse.json({ error: "Etiqueta requerida" }, { status: 400 })

    const contacts = await sql`
      SELECT id, phone, name, last_message
      FROM "Contact"
      WHERE usuario_id = ${user.rootOwnerId}
        AND is_group = false
        AND ${tag} = ANY(tags)
      ORDER BY last_message DESC NULLS LAST, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    
    return NextResponse.json(contacts)
  } catch (error) {
    console.error("Error fetching tagged contacts:", error)
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 })
  }
}
