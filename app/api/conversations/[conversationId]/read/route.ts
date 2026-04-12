import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

// 🔥 IMPORTANTE: Obliga a Vercel a no cachear esta ruta
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  // Next.js 15: params es una Promesa ahora
  context: { params: Promise<{ conversationId?: string; id?: string }> }
) {
  try {
    const user = await requireAuth()
    
    // 🔥 CORRECCIÓN: Esperamos los params
    const resolvedParams = await context.params
    // Leemos 'conversationId' o 'id' (dependiendo de cómo nombraste la carpeta [id] o [conversationId])
    const conversationId = resolvedParams.conversationId || resolvedParams.id

    if (!conversationId) {
        console.error("❌ Missing ID in params:", resolvedParams)
        return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    // 1. Validar Seguridad (Tu lógica original)
    const conversationCheck = await sql`
      SELECT id FROM conversaciones 
      WHERE id = ${conversationId} AND usuario_id = ${user.rootOwnerId}
    `

    if (conversationCheck.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 404 })
    }

    // 2. Actualizar CONTADOR
    await sql`
      UPDATE conversaciones 
      SET unread_count = 0,
      unread_ia_payment = false,
      unread_ia_furious = false
      WHERE id = ${conversationId}
    `

    // 3. Actualizar MENSAJES
    const result = await sql`
      UPDATE mensajes
      SET is_read = true
      WHERE conversation_id = ${conversationId} 
        AND is_read = false
      RETURNING id
    `

    return NextResponse.json({ success: true, updated: result.length })
  } catch (error) {
    console.error("Error marking read:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
