import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

// 🔥 IMPORTANTE: Obliga a Vercel a ejecutar siempre la función
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ conversationId?: string; id?: string }> }
) {
  try {
    const user = await requireAuth()
    
    // 🔥 CORRECCIÓN: Esperamos los params
    const resolvedParams = await context.params
    const conversationId = resolvedParams.conversationId || resolvedParams.id

    if (!conversationId) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    const body = await request.json()
    const { status } = body
    
    // 🔥 ROBUSTEZ: Convertimos a mayúsculas para evitar errores tontos
    const statusNormalizado = status ? String(status).toUpperCase() : ""

    // Validamos (Agregué 'INBOX' por seguridad, tu lógica original usaba solo OPEN/RESOLVED)
    if (!['OPEN', 'RESOLVED', 'INBOX'].includes(statusNormalizado)) {
        return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
    }

    // Validamos seguridad (Tu lógica original)
    const conversationCheck = await sql`
      SELECT id FROM conversaciones 
      WHERE id = ${conversationId} AND usuario_id = ${user.rootOwnerId}
    `

    if (conversationCheck.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 404 })
    }

    // Actualizamos el estado
    await sql`
      UPDATE conversaciones 
      SET status = ${statusNormalizado}
      WHERE id = ${conversationId}
    `

    return NextResponse.json({ success: true, status: statusNormalizado })
  } catch (error) {
    console.error("Error updating status:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
