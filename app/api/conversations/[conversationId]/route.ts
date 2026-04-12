import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

// GET: Obtener UNA conversación específica
// Ruta: /api/conversations/[conversationId]
export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const user = await requireAuth(request)
    const { conversationId } = await params 

    // 🔥 MAGIA: Hacemos el JOIN con "Contact" para que el ChatView siempre tenga el cerebrito y el termómetro
    const conversation = await sql`
      SELECT 
        c.*,
        cont.ai_profile,
        cont.lead_score,
        cont.lead_score_reason
      FROM conversaciones c
      LEFT JOIN "Contact" cont ON c.contact_phone = cont.phone AND cont.usuario_id = c.usuario_id
      WHERE c.id = ${conversationId} 
      AND c.usuario_id = ${user.rootOwnerId} 
    `

    if (conversation.length === 0) {
      return NextResponse.json({ error: "Conversation not found or access denied" }, { status: 404 })
    }

    return NextResponse.json(conversation[0])
  } catch (error) {
    console.error("Error fetching conversation:", error)
    return NextResponse.json({ error: "Error fetching conversation" }, { status: 500 })
  }
}

// PATCH: Actualizar conversación
export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const user = await requireAuth(request)
    const { conversationId } = await params
    
    const body = await request.json()
    const { contact_name, is_conversion, monto_conversion, unread_count, status, bot_enabled } = body

    // Primero verificamos que la conversación pertenezca al usuario
    const checkOwner = await sql`
        SELECT id FROM conversaciones 
        WHERE id = ${conversationId} AND usuario_id = ${user.rootOwnerId}
    `
    if (checkOwner.length === 0) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    let result

    // 1. Marcar como leído
    if (unread_count !== undefined) {
        result = await sql`
            UPDATE conversaciones 
            SET unread_count = ${unread_count}
            WHERE id = ${conversationId}
            RETURNING *
        `
    } 
    // 2. Cambiar estado Y/O encender/apagar el bot Y AUTO-ASIGNAR
    else if (status !== undefined || bot_enabled !== undefined) {
        
        if (status === "OPEN") {
            result = await sql`
                UPDATE conversaciones 
                SET 
                    status = COALESCE(${status ?? null}, status),
                    bot_enabled = COALESCE(${bot_enabled ?? null}, bot_enabled),
                    assigned_to = ${user.id} 
                WHERE id = ${conversationId}
                RETURNING *
            `
        } else {
            result = await sql`
                UPDATE conversaciones 
                SET 
                    status = COALESCE(${status ?? null}, status),
                    bot_enabled = COALESCE(${bot_enabled ?? null}, bot_enabled),
                    assigned_to = CASE WHEN ${status} = 'PENDING' THEN NULL ELSE assigned_to END
                WHERE id = ${conversationId}
                RETURNING *
            `
        }
    }
    // 3. Actualizar datos de contacto/venta
    else {
        if (contact_name) {
             await sql`UPDATE conversaciones SET contact_name = ${contact_name} WHERE id = ${conversationId}`
        }
        if (is_conversion !== undefined) {
             await sql`
                UPDATE conversaciones 
                SET is_conversion = ${is_conversion}, 
                    conversion_amount = ${monto_conversion || 0} 
                WHERE id = ${conversationId}
             `
        }
    }

    // 🔥 EL PARCHE CRÍTICO DE PERSISTENCIA:
    // Retornamos el objeto actualizado final HACIENDO EL JOIN OTRA VEZ
    // Así, si el Frontend cambia un estado y sobreescribe su caché, ¡no borra los datos de la IA!
    const finalUpdatedResult = await sql`
      SELECT 
        c.*,
        cont.ai_profile,
        cont.lead_score,
        cont.lead_score_reason
      FROM conversaciones c
      LEFT JOIN "Contact" cont ON c.contact_phone = cont.phone AND cont.usuario_id = c.usuario_id
      WHERE c.id = ${conversationId}
    `

    return NextResponse.json(finalUpdatedResult && finalUpdatedResult.length > 0 ? finalUpdatedResult[0] : { success: true })

  } catch (error) {
    console.error("Error updating conversation:", error)
    return NextResponse.json({ error: "Error updating conversation" }, { status: 500 })
  }
}