import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { analyzeReceiptImage } from "@/lib/ai-analyzer"
import { io } from "socket.io-client"

const SECRET = process.env.WHATSAPP_SECRET

export async function POST(request: Request) {
  try {
    // 1. Verificar seguridad
    const authHeader = request.headers.get("x-api-secret")
    if (authHeader !== SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageId, imageUrl, conversationId } = await request.json()

    if (!messageId || !imageUrl) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    console.log(`🤖 [AUTO] Iniciando análisis IA para mensaje ${messageId}...`)

    // 💰 PEAJE AUTOMÁTICO
const checkCredits = await sql`
        UPDATE usuarios 
        SET 
            ia_credits = CASE WHEN COALESCE(ia_credits, 0) > 0 THEN ia_credits - 1 ELSE ia_credits END,
            ia_credits_extra = CASE WHEN COALESCE(ia_credits, 0) <= 0 AND COALESCE(ia_credits_extra, 0) > 0 THEN ia_credits_extra - 1 ELSE ia_credits_extra END,
            mensajes_ia = COALESCE(mensajes_ia, 0) + 1
        WHERE id = ( -- 🔥 ESTO SE HABÍA BORRADO
            SELECT c.usuario_id 
            FROM conversaciones c
            JOIN mensajes m ON m.conversation_id = c.id
            WHERE m.id = ${messageId}
            LIMIT 1
        ) AND (COALESCE(ia_credits, 0) > 0 OR COALESCE(ia_credits_extra, 0) > 0)
        RETURNING ia_credits, ia_credits_extra
    `

    if (checkCredits.length === 0) {
        console.log("❌ [AUTO] IA abortada: Usuario sin saldo de IA.");
        return NextResponse.json({ error: "insufficient_credits" }, { status: 402 })
    }



    // 2. Llamar a OpenAI
    const analysis = await analyzeReceiptImage(imageUrl)

    const logDetails = analysis.is_receipt 
        ? `Análisis automático - Monto: $${analysis.amount || 0}` 
        : `Análisis automático - Imagen descartada (Meme/No recibo)`;

        await sql`
      INSERT INTO ia_usage_logs (id, usuario_id, feature, credits_cost, details)
      VALUES (
        ${crypto.randomUUID()}, 
        (SELECT c.usuario_id FROM conversaciones c JOIN mensajes m ON m.conversation_id = c.id WHERE m.id = ${messageId} LIMIT 1), 
        'AUTO_VISION_RECEIPT', 
        1, 
        'Análisis automático de comprobante'
      )
    `

    // 3. Si es un comprobante, actualizamos la DB
    if (analysis.is_receipt && analysis.amount) {
        console.log(`💰 [AUTO] VENTA DETECTADA! Monto: $${analysis.amount} | Retención: ${analysis.needs_manual_review ? 'SÍ ⚠️' : 'NO ✅'}`)

        await sql`
            UPDATE mensajes 
            SET is_receipt = true, 
                amount = ${analysis.amount},
                processed_by_ai = true,
                needs_manual_review = ${analysis.needs_manual_review || false}
            WHERE id = ${messageId}
        `

        // 4. Avisar al Frontend
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
        const socket = io(socketUrl)
        socket.emit("payment_detected", {
            conversationId,
            amount: analysis.amount,
            messageId,
            needs_manual_review: analysis.needs_manual_review,
            review_reason: analysis.review_reason
        })
        
    } else {
        console.log("📉 [AUTO] IA: No parece un comprobante o no se leyó el monto.")
        await sql`UPDATE mensajes SET processed_by_ai = true WHERE id = ${messageId}`
    }

    return NextResponse.json({ success: true, analysis })

  } catch (error) {
    console.error("❌ Error en endpoint automático:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
