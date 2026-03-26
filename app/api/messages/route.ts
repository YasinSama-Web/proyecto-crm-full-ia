import { NextResponse } from "next/server"
import { sql } from '@/lib/db'
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

// 🔥 SOLO UNA FUNCIÓN GET (unificada con test opcional)
export async function GET(req: Request) {
  try {
    // Test rápido de conexión (opcional, quitar en producción)
    const url = new URL(req.url);
    if (url.searchParams.has('test')) {
      const start = Date.now();
      const result = await sql`SELECT NOW() as time, pg_backend_pid() as pid`;
      return NextResponse.json({ 
        time: result[0].time, 
        pid: result[0].pid,
        duration: Date.now() - start 
      });
    }

    const user = await requireAuth(req)
    const rootOwnerId = user.rootOwnerId

    const conversationId = url.searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
    }

    // 1. VALIDACIÓN
    const conversationCheck = await sql`
      SELECT id, "lineId", assigned_to 
      FROM conversaciones 
      WHERE id = ${conversationId} AND usuario_id = ${rootOwnerId}
    `

    if (conversationCheck.length === 0) {
      return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 404 })
    }

    // 2. SEGURIDAD AGENTE
    if (user.role === 'AGENT' || user.role === 'MANAGER') { // Agregué Manager por si Yas tiene ese rol
        const lineId = conversationCheck[0].lineId
        const assignedTo = conversationCheck[0].assigned_to
        const allowedLineIds = user.permissions?.allowedLineIds || []
        
        // 🔥 LA LLAVE MAESTRA: 
        // Si no tiene acceso a la línea, PERO el chat es suyo, la dejamos pasar.
        if (!allowedLineIds.includes(lineId) && assignedTo !== user.id) {
            return NextResponse.json({ error: "Unauthorized for this line" }, { status: 403 })
        }
    }

    // 3. MENSAJES (limitado a 50 para performance)
    const messages = await sql`
      SELECT 
        id, 
        conversation_id, 
        type, 
        content, 
        is_incoming, 
        timestamp,          
        media_url,          
        amount,             
        processed_by_ai,    
        is_receipt,          
        status,       
        is_read,
        sender_name,
        quoted_message_id,
        quoted_participant,
        quoted_content,
        whatsapp_id         
      FROM mensajes
      WHERE conversation_id = ${conversationId}
      ORDER BY timestamp DESC
      LIMIT 50
    `

    // Normalización
    const normalized = messages.reverse().map((m) => ({
      ...m,
      is_incoming: m.is_incoming === true || m.is_incoming === "true",
      amount: m.amount ? Number(m.amount) : null,
      processed_by_ai: m.processed_by_ai === true || m.processed_by_ai === "true"
    }))

    return NextResponse.json(normalized)
    
  } catch (error: any) {
    console.error("Error fetching messages:", error)
    
    // 🔥 LOG DETALLADO PARA DEBUG
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500)
    });
    
    return NextResponse.json({ 
      error: "Failed to fetch messages",
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req)
    const rootOwnerId = user.rootOwnerId 

    const { conversationId, content, is_incoming = false, type = 'texto' } = await req.json()

    if (conversationId && content && req.headers.get("x-whatsapp-webhook") !== "true") {
      
      const conversationCheck = await sql`
        SELECT id, "lineId" FROM conversaciones 
        WHERE id = ${conversationId} AND usuario_id = ${rootOwnerId}
      `

      if (conversationCheck.length === 0) {
        return NextResponse.json({ error: "Conversation not found or unauthorized" }, { status: 404 })
      }

      if (user.role === 'AGENT') {
          const lineId = conversationCheck[0].lineId
          const allowedLineIds = user.permissions?.allowedLineIds || []
          if (!allowedLineIds.includes(lineId)) {
             return NextResponse.json({ error: "Unauthorized line" }, { status: 403 })
          }
      }

      const result = await sql`
        INSERT INTO mensajes (conversation_id, type, content, is_incoming, usuario_id)
        VALUES (${conversationId}, ${type}, ${content}, ${is_incoming}, ${rootOwnerId})
        RETURNING *
      `

      return NextResponse.json(result[0])
    }

    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error("Error creating message:", error)
    
    if (error.code === '53300' || error.message?.includes('Too many')) {
        return NextResponse.json({ error: "System busy, try again" }, { status: 429 })
    }
    
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: error.message 
    }, { status: 500 })
  }
}
