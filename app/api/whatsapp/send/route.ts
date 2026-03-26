export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"

// 🔥 ELIMINAMOS process.env.CRM_URL de la lista
const SERVER_URL = process.env.WHATSAPP_SERVER_URL || process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "";
const API_SECRET = process.env.SECRET || process.env.WHATSAPP_SERVER_SECRET || process.env.WHATSAPP_SECRET || ""

export async function POST(request: Request) {
  try {
    console.log("🚀 INICIANDO ENVÍO (Modo Estricto)...")

    const user = await requireAuth(request)
    const body = await request.json()
    const { lineId, contactPhone, content, conversationId, type = "text" } = body

    // Validación interna
    if (!lineId || !contactPhone || !content) {
      return NextResponse.json({ error: "Faltan datos requeridos en Next.js" }, { status: 400 })
    }

    // Limpieza de número
    let cleanPhone = contactPhone.toString().replace(/\D/g, "")
    
    // 🔥 CORRECCIÓN: Respetar el tipo 'audio'
    let normalizedType = "text";
    if (type === "imagen" || type === "image") normalizedType = "image";
    if (type === "audio") normalizedType = "audio";
    
    // 1. Guardar en DB (CRM) de forma segura
    let savedMessage = null
    if (conversationId) {
      let dbContent = content;
      if (normalizedType === "image") dbContent = "📷 Imagen enviada";
      if (normalizedType === "audio") dbContent = "🎤 Audio procesando..."; 
      
      const dbMediaUrl = normalizedType === "image" ? content : null
      
      const result = await sql`
          INSERT INTO mensajes (conversation_id, content, type, is_incoming, timestamp, media_url, usuario_id)
          VALUES (${conversationId}, ${dbContent}, ${normalizedType}, false, NOW(), ${dbMediaUrl}, ${user.id})
          RETURNING *
        `
      savedMessage = result[0]
      
      // 🔥 EL KILL SWITCH DEL CRM: Apagamos el bot al instante desde la web
      await sql`
          UPDATE conversaciones 
          SET bot_enabled = false, status = 'OPEN' 
          WHERE id = ${conversationId}
      `;
      console.log(`✅ Guardado en DB local y BOT APAGADO (Humano al mando)`)
    }

    // 2. Enviar a Railway (FORMATO ESTRICTO)
    const url = SERVER_URL.startsWith("http") ? SERVER_URL : `https://${SERVER_URL}`
    
    const payloadRailway = {
        lineId: lineId,
        contactPhone: cleanPhone, 
        content: content, // Aquí viaja el Base64 completo hacia Railway
        userId: user.id,  
        type: normalizedType // 🔥 Ahora sí dice "audio"
    };

    console.log(`📡 Enviando a Railway (Tipo: ${payloadRailway.type})`)

    const res = await fetch(`${url}/api/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": API_SECRET,
      },
      body: JSON.stringify(payloadRailway),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`❌ ERROR RAILWAY (${res.status}):`, errorText)
      return NextResponse.json({ error: "Fallo envío: " + errorText }, { status: 500 })
    }

    const responseData = await res.json().catch(() => ({}))
    console.log("✅ RESPUESTA RAILWAY ÉXITO:", responseData)

    return NextResponse.json(savedMessage || { success: true })
  } catch (error: any) {
    console.error("💀 ERROR FATAL:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
