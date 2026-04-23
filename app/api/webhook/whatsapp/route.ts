import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { uploadWhatsAppMedia } from "@/lib/storage"
import { io } from "socket.io-client"

function authenticateWebhook(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  const xApiSecret = request.headers.get("x-api-secret")
  const expectedSecret = process.env.WHATSAPP_SECRET
  if (!expectedSecret) return true
  const token = authHeader?.replace("Bearer ", "")
  return token === expectedSecret || xApiSecret === expectedSecret
}

export async function POST(request: Request) {
  if (!authenticateWebhook(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = body.data || body

    const { lineId, contactPhone, contactName, timestamp } = data

    // =========================================================================
    // 🔥 FIX 1: EXTRAER TEXTO CORRECTAMENTE DE BAILEYS
    // =========================================================================
    let message = ""
    if (typeof data.message === 'string') {
      message = data.message
    } else if (data.message?.conversation) {
      message = data.message.conversation
    } else if (data.message?.extendedTextMessage?.text) {
      message = data.message.extendedTextMessage.text
    } else if (data.text) {
      message = data.text
    } else if (data.body) {
      message = data.body
    } else if (data.content) {
      message = data.content
    }

    let messageType = data.messageType || data.type || "text"
    let mimetype = data.mimetype
    let rawMediaUrl = data.mediaUrl || data.url || data.fileUrl || null
    let fileName = data.fileName || data.filename || `archivo-${Date.now()}`

    if (!lineId || !contactPhone) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    let finalContent = message || ""
    let finalMediaUrl = null
    let finalType = (messageType === 'image' || messageType === 'imagen') ? 'image' : 'text'

    // 1. Obtener usuario dueño de la línea
    const lineData = await sql`SELECT usuario_id FROM lineas_whatsapp WHERE id = ${lineId}`
    if (lineData.length === 0) return NextResponse.json({ error: "Line not found" }, { status: 404 })
    const usuarioId = lineData[0].usuario_id

    // 2. Procesamiento multimedia
    const isDocument = rawMediaUrl && (
      messageType === 'document' ||
      (mimetype && !mimetype.startsWith('image/') && !mimetype.startsWith('audio/'))
    )

    if (isDocument) {
      try {
        const response = await fetch(rawMediaUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const contentType = mimetype || 'application/octet-stream'
          const publicUrl = await uploadWhatsAppMedia(
            Buffer.from(arrayBuffer),
            `inbound-doc-${lineId}-${fileName}`,
            contentType
          )
          if (publicUrl) {
            finalMediaUrl = publicUrl
            finalType = "document"
            finalContent = finalContent || fileName
          }
        }
      } catch (error) {
        finalContent = `⚠️ Error descargando documento: ${fileName}`
      }
    } else if (finalType === 'image' && rawMediaUrl) {
      try {
        const response = await fetch(rawMediaUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const publicUrl = await uploadWhatsAppMedia(Buffer.from(arrayBuffer), `inbound-${lineId}-${Date.now()}.jpg`, "image/jpeg")
          if (publicUrl) {
            finalMediaUrl = publicUrl
            finalType = "image"
            finalContent = finalContent || "📷 Imagen Recibida"
          }
        }
      } catch (error) {
        finalContent = "⚠️ Error descargando imagen."
      }
    }

    // =========================================================================
    // 🔥 FIX 2: EXTRAER SID Y BUSCAR EN FBL_LOGS
    // =========================================================================
    let sourceLandingId = null
    let extractedFbcid = null
    let extractedFbp = null

    // Regex mejorado: captura (Ref:web|sid:sess_xxx) o (Ref:web|fb:xxx)
    const attrMatch = finalContent?.match(/\(Ref:\s*([^|)]+)(?:\|\s*(?:fb|fbcid|sid):\s*([^)]+))?\s*\)/i)

    if (attrMatch) {
      const ref = attrMatch[1]?.trim()
      const extractedValue = attrMatch[2]?.trim()

      console.log("=========================================")
      console.log("👀 TEXTO RECIBIDO:", finalContent)
      console.log("🎯 REF ENCONTRADO:", ref)
      console.log("💎 VALOR EXTRAIDO:", extractedValue)
      console.log("=========================================")

      // Buscar landing
      if (ref) {
        const landingRes = await sql`SELECT id FROM landings WHERE slug = ${ref.toLowerCase()} AND usuario_id = ${usuarioId} LIMIT 1`
        if (landingRes.length > 0) sourceLandingId = landingRes[0].id
      }

      // 🔥 SI ES SESSION ID, BUSCAMOS EN FBL_LOGS EL FBC REAL
      if (extractedValue?.startsWith('sess_')) {
        console.log("🔍 Buscando sesión en fbl_logs:", extractedValue)
        const fblData = await sql`
          SELECT fbc, fbp FROM fbl_logs 
          WHERE session_id = ${extractedValue} AND owner_id = ${usuarioId} 
          LIMIT 1
        `
        if (fblData.length > 0) {
          extractedFbcid = fblData[0].fbc
          extractedFbp = fblData[0].fbp
          console.log("✅ FBC RECUPERADO DE SESIÓN:", extractedFbcid)
          console.log("✅ FBP RECUPERADO DE SESIÓN:", extractedFbp)

          // Marcar como usado
          await sql`UPDATE fbl_logs SET used = true WHERE session_id = ${extractedValue}`
        } else {
          console.log("⚠️ Session ID no encontrado en fbl_logs")
        }
      } else {
        // Fallback: si es fbc directo (flujo viejo)
        extractedFbcid = extractedValue
      }
    } else {
      console.log("⚠️ El Regex no atrapó nada en este texto:", finalContent)
    }

    // =========================================================================
    // 🔥 FIX 3: CREAR/ACTUALIZAR CONVERSACIÓN CON FBC Y FBP
    // =========================================================================
    const existingConv = await sql`
      SELECT id, marketing_fbcid, marketing_fbp 
      FROM conversaciones 
      WHERE line_id = ${lineId} AND contact_phone = ${contactPhone} AND usuario_id = ${usuarioId}
    `
    let conversationId: string

    if (existingConv.length === 0) {
      // INSERT nueva conversación
      const newConv = await sql`
        INSERT INTO conversaciones (
          usuario_id, line_id, contact_phone, contact_name, last_activity, 
          status, source_landing_id, bot_enabled, 
          marketing_fbcid, marketing_fbp, marketing_source
        ) VALUES (
          ${usuarioId}, ${lineId}, ${contactPhone}, ${contactName || null}, NOW(), 
          'PENDING', ${sourceLandingId}, true,
          ${extractedFbcid}, ${extractedFbp}, ${extractedFbcid ? 'facebook_ads' : 'organic'}
        )
        RETURNING id
      `
      conversationId = newConv[0].id
      console.log("🆕 Nueva conversación creada con FBC:", extractedFbcid)
    } else {
      conversationId = existingConv[0].id

      // UPDATE: solo sobreescribe si antes era null (preserva datos existentes)
      await sql`
        UPDATE conversaciones 
        SET 
          last_activity = NOW(),
          contact_name = COALESCE(${contactName}, contact_name),
          source_landing_id = COALESCE(${sourceLandingId}, source_landing_id),
          marketing_fbcid = COALESCE(marketing_fbcid, ${extractedFbcid}),
          marketing_fbp = COALESCE(marketing_fbp, ${extractedFbp}),
          marketing_source = COALESCE(marketing_source, ${extractedFbcid ? 'facebook_ads' : null})
        WHERE id = ${conversationId}
      `
      console.log("📝 Conversación actualizada. FBC:", extractedFbcid)
    }

    // =========================================================================
    // GUARDAR MENSAJE
    // =========================================================================
    const savedMessageQuery = await sql`
      INSERT INTO mensajes (
        conversation_id, content, media_url, type, is_incoming, timestamp, is_read
      ) VALUES (
        ${conversationId}, ${finalContent}, ${finalMediaUrl}, ${finalType}, 
        true, ${timestamp ? new Date(timestamp) : new Date()}, false
      )
      RETURNING *
    `
    const savedMsg = savedMessageQuery[0]

    // Emitir socket
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    const socket = io(socketUrl)
    try {
      socket.emit("new_message", {
        conversationId,
        message: savedMsg,
        lineId,
        contactPhone,
        contactName
      })
    } catch (e) {}
    setTimeout(() => socket.disconnect(), 1000)

    return NextResponse.json({ success: true, messageId: savedMsg.id })

  } catch (error) {
    console.error("💥 [FATAL WEBHOOK ERROR]:", error)
    return NextResponse.json({ error: "Error processing webhook" }, { status: 500 })
  }
}

export async function PATCH() { return NextResponse.json({ success: true }) }
export async function GET() { return NextResponse.json({ status: "alive", message: "Webhook activo 🤖" }) }