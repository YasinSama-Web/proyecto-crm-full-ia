// WhatsApp integration via Railway Baileys server

import { sql } from "./db"

const RAW_URL = process.env.WHATSAPP_SERVER_URL || process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || ""
const WHATSAPP_SERVER_URL = RAW_URL.startsWith("http") ? RAW_URL : (RAW_URL ? `https://${RAW_URL}` : "")
const WHATSAPP_SERVER_SECRET = process.env.WHATSAPP_SERVER_SECRET || process.env.SECRET || ""

interface WhatsAppServerResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
  lineId?: number
}

// Helper to make authenticated requests to WhatsApp server
async function callWhatsAppServer(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: object,
): Promise<WhatsAppServerResponse> {
  if (!WHATSAPP_SERVER_URL) {
    console.error("🚨 ERROR FATAL: URL de Railway no configurada en Vercel");
    return { success: false, error: "Falta configurar la URL del servidor de WhatsApp" }
  }

  const url = `${WHATSAPP_SERVER_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        // 🔥 LLAVE MAESTRA: Enviamos la clave en varios headers por seguridad
        "x-api-secret": WHATSAPP_SERVER_SECRET,
        "apikey": WHATSAPP_SERVER_SECRET,
        "Authorization": `Bearer ${WHATSAPP_SERVER_SECRET}`,
      },
      body: body ? JSON.stringify({ ...body, secret: WHATSAPP_SERVER_SECRET }) : undefined,
    })

    const contentType = response.headers.get("content-type")
    let data

    if (contentType?.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = { message: text }
    }

    return { success: response.ok, data, error: data.error, message: data.message, lineId: data.lineId }
  } catch (error) {
    console.error("WhatsApp API Error:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Request connection for a line
export async function requestConnection(
  lineId: number,
  phone: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!WHATSAPP_SERVER_URL) {
    return {
      success: false,
      error: "Servidor WhatsApp no configurado. Configure WHATSAPP_SERVER_URL y WHATSAPP_SERVER_SECRET.",
    }
  }

  const result = await callWhatsAppServer("/api/lineas/connect", "POST", { phone })

  if (result.success || result.message) {
    await sql`
      UPDATE lineas_whatsapp 
      SET telefono = ${phone}, estado = 'PENDIENTE'
      WHERE id = ${lineId}
    `

    return {
      success: true,
      message: result.message || "Conexión iniciada. Escanea el QR code via Socket.io.",
    }
  }

  return {
    success: false,
    error: result.error || "No se pudo conectar con el servidor WhatsApp.",
  }
}

// Get connection status for a line
export async function getConnectionStatus(lineId: number): Promise<{ status: string; phoneNumber?: string }> {
  const line = await sql`SELECT estado, telefono FROM lineas_whatsapp WHERE id = ${lineId}`
  return { status: line[0]?.estado || "DESCONECTADA", phoneNumber: line[0]?.telefono }
}
// Send message via WhatsApp - calls Railway backend /api/send-message
// 🔥 VERSIÓN OMNICANAL DEFINITIVA

export async function sendWhatsAppMessage(
  lineId: number | string,
  phoneNumber: string,
  message: string,
  conversationId?: string, 
  messageType: "texto" | "imagen" | "image" | "document" | "audio" = "texto",
  explicitMessageId?: string // Recibimos el ID para evitar duplicados visuales
): Promise<{ success: boolean; error?: string }> {
  
  // 1. Obtener usuario_id de la línea
  const lineData = await sql`SELECT "userId" as usuario_id FROM lineas_whatsapp WHERE id = ${lineId}`
  if (lineData.length === 0) return { success: false, error: "Línea no encontrada" }
  
  const usuarioId = lineData[0].usuario_id
  const normalizedType = (messageType === 'imagen' || messageType === 'image') ? 'image' : messageType

  // 🚦 2. DESCUBRIR EL CANAL EN LA BASE DE DATOS
  let channel = "whatsapp";
  let omni_channel_id = null;

  if (conversationId) {
     const convData = await sql`SELECT channel, omni_channel_id FROM conversaciones WHERE id = ${conversationId}`;
     if (convData.length > 0) {
         channel = convData[0].channel || "whatsapp";
         omni_channel_id = convData[0].omni_channel_id;
     }
  }

  // 🔥 CRÍTICO: Si es Telegram, NO borramos los caracteres raros porque los Chat ID pueden tener guiones
  const cleanPhone = channel === 'telegram' ? phoneNumber : phoneNumber.replace(/\D/g, "");

  // 3. Guardar en Base de Datos Local
  if (conversationId) {
    let dbContent = message;
    if (normalizedType === "image") dbContent = "📷 Imagen enviada";
    if (normalizedType === "document") dbContent = "📄 Documento enviado";
    if (normalizedType === "audio") dbContent = "🎤 Audio enviado";
    
    const dbMediaUrl = (normalizedType === "image" || normalizedType === "document" || normalizedType === "audio") ? message : null;

    await sql`
      INSERT INTO mensajes (conversation_id, type, content, media_url, is_incoming, timestamp, usuario_id)
      VALUES (${conversationId}, ${normalizedType}, ${dbContent}, ${dbMediaUrl}, false, NOW(), ${usuarioId})
    `
    await sql`UPDATE conversaciones SET last_activity = NOW() WHERE id = ${conversationId}`
  }

  if (!WHATSAPP_SERVER_URL) return { success: true }

  // 4. PREPARAR EL PAQUETE OMNICANAL PARA RAILWAY
  let payload: any = {
    lineId,
    contactPhone: cleanPhone,
    content: message, 
    userId: usuarioId,  
    type: normalizedType,
    channel: channel,                 // 🚦 ETIQUETA PARA EL ENRUTADOR
    omni_channel_id: omni_channel_id, // 🚦 ID DEL BOT DE TELEGRAM
    saveToDb: false,                  // 🛡️ Evita duplicados en Railway
    messageId: explicitMessageId      // 🛡️ Mantiene el ID sincronizado
  }

  if (normalizedType === 'image') {
      payload = { ...payload, image: { url: message }, mediaUrl: message, url: message, caption: "" }
  } else {
      payload = { ...payload, text: message }
  }

  // 5. Enviar a Railway
  const result = await callWhatsAppServer("/api/send-message", "POST", payload)

  if (result.success) return { success: true }
  return { success: false, error: result.error || "No se pudo enviar el mensaje." }
}
// Disconnect a line
export async function disconnectLine(lineId: number): Promise<{ success: boolean; error?: string }> {
  await sql`
    UPDATE lineas_whatsapp 
    SET estado = 'DESCONECTADA'
    WHERE id = ${lineId}
  `

  return { success: true }
}

// Process Incoming (Inbound)
export async function processIncomingMessage(payload: {
  lineId: string
  phoneNumber: string
  contactName?: string
  message: string
  messageType?: "texto" | "imagen" | "comprobante_detectado"
  timestamp?: string
}): Promise<{ success: boolean; conversationId?: string }> {
  const { lineId, phoneNumber, contactName, message, messageType = "texto" } = payload

  try {
    const cleanPhone = phoneNumber.split("@")[0].split(":")[0].replace(/\D/g, "")

    const lineData = await sql`
      SELECT "userId" as usuario_id FROM lineas_whatsapp WHERE id = ${lineId}
    `

    if (lineData.length === 0) {
      console.error("[v0] Line not found:", lineId)
      return { success: false }
    }

    const usuarioId = lineData[0].usuario_id

    // 1. Contact autosave
    const existingContact = await sql`
      SELECT id FROM "Contact" WHERE phone = ${cleanPhone} AND usuario_id = ${usuarioId}
    `

    if (existingContact.length === 0) {
      await sql`
        INSERT INTO "Contact" (usuario_id, phone, name, created_at, last_message)
        VALUES (${usuarioId}, ${cleanPhone}, ${contactName || cleanPhone}, NOW(), NOW())
      `
    } else {
      await sql`
        UPDATE "Contact" 
        SET last_message = NOW(),
            name = COALESCE(${contactName}, name)
        WHERE phone = ${cleanPhone} AND usuario_id = ${usuarioId}
      `
    }

    // 2. Conversation lookup/create
    let conversationId: string
    const existing = await sql`
      SELECT id FROM conversaciones 
      WHERE line_id = ${lineId} AND contact_phone = ${cleanPhone} AND usuario_id = ${usuarioId}
    `

    if (existing.length === 0) {
      const newConv = await sql`
        INSERT INTO conversaciones (usuario_id, line_id, contact_phone, last_activity)
        VALUES (${usuarioId}, ${lineId}, ${cleanPhone}, NOW())
        RETURNING id
      `
      conversationId = newConv[0].id
    } else {
      conversationId = existing[0].id
      await sql`
        UPDATE conversaciones 
        SET last_activity = NOW()
        WHERE id = ${conversationId}
      `
    }

    // 🔥 FIX INBOUND: Usamos 'type' corregido y 'media_url'
    const normalizedType = (messageType === 'imagen') ? 'image' : messageType
    const dbContent = normalizedType === 'image' ? "📷 Imagen Recibida" : message
    const dbMediaUrl = normalizedType === 'image' ? message : null

    // 3. Save incoming message
    await sql`
      INSERT INTO mensajes (
          conversation_id, 
          type, 
          content, 
          media_url, 
          is_incoming, 
          timestamp,
          usuario_id
      )
      VALUES (
          ${conversationId}, 
          ${normalizedType}, 
          ${dbContent}, 
          ${dbMediaUrl}, 
          true, 
          NOW(),
          ${usuarioId}
      )
    `

    return { success: true, conversationId }
  } catch (error) {
    console.error("[v0] Error processing incoming message:", error)
    return { success: false }
  }
}

export async function updateLineStatus(
  lineId: number,
  status: "CONECTADA" | "DESCONECTADA" | "PENDIENTE",
  phoneNumber?: string,
): Promise<void> {
  await sql`
    UPDATE lineas_whatsapp 
    SET estado = ${status}, 
        telefono = COALESCE(${phoneNumber}, telefono),
        ultima_conexion = CASE WHEN ${status} = 'CONECTADA' THEN NOW() ELSE ultima_conexion END
    WHERE id = ${lineId}
  `
}
