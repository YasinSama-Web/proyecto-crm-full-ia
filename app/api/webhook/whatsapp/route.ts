import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { uploadWhatsAppMedia } from "@/lib/storage"
import { io } from "socket.io-client"

// ============================================================================
// 🔒 AUTENTICACIÓN
// ============================================================================
function authenticateWebhook(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  const xApiSecret = request.headers.get("x-api-secret")
  const expectedSecret = process.env.WHATSAPP_SECRET

  if (!expectedSecret) return true
  const token = authHeader?.replace("Bearer ", "")
  return token === expectedSecret || xApiSecret === expectedSecret
}

// ============================================================================
// 📨 POST: RECEPCIÓN DE WEBHOOKS GENÉRICOS DE WHATSAPP
// ============================================================================
export async function POST(request: Request) {
  if (!authenticateWebhook(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = body.data || body; 
    const { lineId, contactPhone, contactName, timestamp } = data

    let message = data.message || data.text || "";
    let messageType = data.messageType || data.type || "text";
    let rawMediaUrl = data.mediaUrl || data.url || data.fileUrl || null;

    if (!lineId || !contactPhone) {
        return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    let finalContent = message || ""
    let finalMediaUrl = null
    let finalType = messageType

    // --- PROCESAMIENTO DE IMÁGENES ---
    if ((messageType === "image" || messageType === "imagen" || messageType === "photo") && rawMediaUrl) {
        try {
            const response = await fetch(rawMediaUrl)
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer()
                const publicUrl = await uploadWhatsAppMedia(Buffer.from(arrayBuffer), `inbound-${lineId}-${Date.now()}.jpg`, "image/jpeg")
                if (publicUrl) { finalMediaUrl = publicUrl; finalType = "image"; finalContent = finalContent || "📷 Imagen Recibida" }
            }
        } catch (error) { finalContent = "⚠️ Error descargando imagen." }
    }

    // --- BÚSQUEDA EN BASE DE DATOS (Línea) ---
    const lineData = await sql`SELECT usuario_id FROM lineas_whatsapp WHERE id = ${lineId}`
    if (lineData.length === 0) return NextResponse.json({ error: "Line not found" }, { status: 404 });
    
    const usuarioId = lineData[0].usuario_id
    
    // --- GESTIÓN DE CONVERSACIÓN ---
    let sourceLandingId = null;
    const refMatch = finalContent ? finalContent.match(/\(Ref:\s*([\w-]+)\)/i) : null;
    if (refMatch && refMatch[1]) {
        const landingRes = await sql`SELECT id FROM landings WHERE slug = ${refMatch[1].toLowerCase()} AND usuario_id = ${usuarioId} LIMIT 1`;
        if (landingRes.length > 0) sourceLandingId = landingRes[0].id;
    }

    const existingConv = await sql`
      SELECT id FROM conversaciones 
      WHERE line_id = ${lineId} AND contact_phone = ${contactPhone} AND usuario_id = ${usuarioId}
    `
    let conversationId: string

    if (existingConv.length === 0) {
      const newConv = await sql`
        INSERT INTO conversaciones (usuario_id, line_id, contact_phone, contact_name, last_activity, status, source_landing_id, bot_enabled)
        VALUES (${usuarioId}, ${lineId}, ${contactPhone}, ${contactName || null}, NOW(), 'PENDING', ${sourceLandingId}, true)
        RETURNING id
      `
      conversationId = newConv[0].id
    } else {
      conversationId = existingConv[0].id
      
      const updateQuery = sourceLandingId 
          ? sql`UPDATE conversaciones SET last_activity = NOW(), contact_name = COALESCE(${contactName}, contact_name), source_landing_id = ${sourceLandingId} WHERE id = ${conversationId}`
          : sql`UPDATE conversaciones SET last_activity = NOW(), contact_name = COALESCE(${contactName}, contact_name) WHERE id = ${conversationId}`;
      await updateQuery;
    }

    // --- GUARDAR MENSAJE RECIBIDO ---
    const dbType = (finalType === 'imagen' || finalType === 'image') ? 'image' : finalType;
    const savedMessageQuery = await sql`
      INSERT INTO mensajes (conversation_id, content, media_url, type, is_incoming, timestamp, is_read)
      VALUES (${conversationId}, ${finalContent}, ${finalMediaUrl}, ${dbType}, true, ${timestamp ? new Date(timestamp) : new Date()}, false)
      RETURNING *
    `
    const savedMsg = savedMessageQuery[0];

    // --- EMITIR WEBSOCKET PARA EL FRONTEND ---
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    const socket = io(socketUrl)
    try { socket.emit("new_message", { conversationId, message: savedMsg, lineId, contactPhone, contactName }) } catch (e) {}
    setTimeout(() => socket.disconnect(), 1000);

    // 🚀 NOTA IMPORTANTE:
    // Aquí YA NO hay lógica de bot.
    // La Inteligencia Artificial y los Nodos ahora se procesan centralizados en /api/bot/brain
    // que es llamado directamente por Baileys.

    return NextResponse.json({ success: true, messageId: savedMsg.id })

  } catch (error) {
    console.error("💥 [FATAL WEBHOOK ERROR]:", error)
    return NextResponse.json({ error: "Error processing webhook" }, { status: 500 })
  }
}

// ============================================================================
// 🛠️ MÉTODOS ADICIONALES
// ============================================================================
export async function PATCH() { return NextResponse.json({ success: true }) }
export async function GET() { return NextResponse.json({ status: "alive", message: "Webhook activo y optimizado 🤖" }) }
