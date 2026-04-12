export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"

const SERVER_URL = process.env.CRM_URL || process.env.WHATSAPP_SERVER_URL || process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || ""
const API_SECRET = process.env.SECRET || process.env.WHATSAPP_SERVER_SECRET || process.env.WHATSAPP_SECRET || ""

export async function POST(request: Request) {
  try {
    console.log("🚀 INICIANDO ENVÍO (Modo Estricto Omnicanal)...")

    const user = await requireAuth(request)
    const body = await request.json()
    
    // 🔥 Atrapamos todas las variables que manda ChatView (incluyendo mobileId y quoted)
    const { 
        lineId, contactPhone, content, body: bodyContent, conversationId, type = "text",
        mobileId, quotedMessageId, quotedParticipant, quotedContent 
    } = body

    // Dependiendo de cómo lo mande el frontend, agarramos el contenido
    const finalContent = content || bodyContent;

    // Validación interna
    if (!contactPhone || !finalContent) {
      return NextResponse.json({ error: "Faltan datos requeridos en Next.js" }, { status: 400 })
    }

    // 🔥 CORRECCIÓN: Respetar los tipos de archivo
    let normalizedType = "text";
    if (type === "imagen" || type === "image") normalizedType = "image";
    if (type === "audio") normalizedType = "audio";
    if (type === "document") normalizedType = "document";
    
    // 🚦 1. EL DETECTOR OMNICANAL (Buscamos de dónde es este chat)
    let channel = "whatsapp";
    let omni_channel_id = null;

    if (conversationId) {
      const convData = await sql`SELECT channel, omni_channel_id FROM conversaciones WHERE id = ${conversationId}`;
      if (convData.length > 0) {
          channel = convData[0].channel || "whatsapp";
          omni_channel_id = convData[0].omni_channel_id;
      }
    }

    // 🔥 Limpieza de número condicional: A Telegram no se le borran los caracteres
    let cleanPhone = contactPhone.toString();
    if (channel === 'whatsapp') {
        cleanPhone = cleanPhone.replace(/\D/g, "");
    }

    // 2. Guardar en DB (CRM) de forma segura
    let savedMessage = null
    if (conversationId) {
      let dbContent = finalContent;
      if (normalizedType === "image") dbContent = "📷 Imagen enviada";
      if (normalizedType === "audio") dbContent = "🎤 Audio procesando..."; 
      if (normalizedType === "document") dbContent = "📄 Documento enviado";
      
      const dbMediaUrl = (normalizedType === "image" || normalizedType === "document" || normalizedType === "audio") ? finalContent : null
      
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
      console.log(`✅ Guardado en DB local y BOT APAGADO (Canal detectado: ${channel})`)
    }

    // 3. Enviar a Railway (AHORA CON LAS ETIQUETAS DEL CANAL)
    const url = SERVER_URL.startsWith("http") ? SERVER_URL : `https://${SERVER_URL}`
    
    // 🔥 LA LLAVE MAESTRA: Si es Telegram o LINE, el "lineId" para Railway DEBE ser el omni_channel_id
    const finalLineId = omni_channel_id ? omni_channel_id : lineId;

    const payloadRailway = {
        lineId: finalLineId,  // <--- ¡AQUÍ ESTÁ LA MAGIA!
        contactPhone: cleanPhone, 
        content: finalContent, 
        userId: user.id,  
        type: normalizedType,

        channel: channel,
        omni_channel_id: omni_channel_id,
        saveToDb: false, // Le decimos que no duplique porque ya lo guardamos arriba
        messageId: mobileId || savedMessage?.id,
        quotedMessageId: quotedMessageId,
        quotedParticipant: quotedParticipant,
        quotedContent: quotedContent
    };

    console.log(`📡 Enviando a Railway (Canal: ${channel} | LineID Real: ${finalLineId} | Tipo: ${payloadRailway.type})`)

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