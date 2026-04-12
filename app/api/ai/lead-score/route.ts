import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const COSTO_CREDITOS = 3; // Cobramos 3 créditos por medir la temperatura

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req)
    const { conversationId, contactId } = await req.json()

    if (!conversationId || !contactId) {
      return NextResponse.json({ error: "Faltan IDs requeridos" }, { status: 400 })
    }

    // 1. VERIFICACIÓN DE CRÉDITOS
    const userWallet = await sql`
        SELECT ia_credits, ia_credits_extra 
        FROM usuarios 
        WHERE id = ${user.id} LIMIT 1
    `
    const wallet = userWallet[0];
    const totalCredits = Number(wallet?.ia_credits || 0) + Number(wallet?.ia_credits_extra || 0);

    if (totalCredits < COSTO_CREDITOS) {
        return NextResponse.json({ error: `No tienes suficientes créditos (Necesitas ${COSTO_CREDITOS})` }, { status: 403 })
    }

    // 2. OBTENER EL CONTEXTO DEL CHAT
    const messages = await sql`
        SELECT content, is_incoming 
        FROM mensajes 
        WHERE conversation_id = ${conversationId} 
        ORDER BY timestamp ASC 
        LIMIT 20
    `

    if (messages.length < 2) {
        return NextResponse.json({ error: "No hay suficientes mensajes para calcular el interés." }, { status: 400 })
    }

    const chatHistory = messages.map(m => 
        `${m.is_incoming ? 'Cliente' : 'Vendedor'}: ${m.content}`
    ).join('\n');

    console.log(`🌡️ [IA] Calculando temperatura (Scoring) para contacto ${contactId}...`)

    // 3. LA LLAMADA A OPENAI (Forzando respuesta JSON)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" }, // 🔥 Magia pura: Le exigimos un JSON
      messages: [
        {
          role: "system",
          content: `Eres un analista experto en cierres de ventas. Tu tarea es analizar este chat y determinar la probabilidad de compra del cliente (Lead Score).
          
          Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta:
          {
             "score": <número del 0 al 100>,
             "reason": "<Explicación muy breve de 1 línea de por qué le diste ese puntaje>"
          }

          Criterios:
          - 0-30: Frío (Pregunta algo genérico, deja en visto).
          - 31-70: Tibio (Hace preguntas técnicas, pide detalles o precios, pero no define).
          - 71-100: Caliente (Muestra urgencia, pide medios de pago, acepta la oferta).`
        },
        {
          role: "user",
          content: chatHistory
        }
      ],
      temperature: 0.3, // Temperatura baja para que sea analítico y no invente
    })

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) throw new Error("La IA no devolvió respuesta.");
    
    const parsedData = JSON.parse(responseContent);
    const { score, reason } = parsedData;

    // 4. GUARDAR EL RESULTADO
    await sql`
        UPDATE "Contact" 
        SET lead_score = ${score}, lead_score_reason = ${reason}, updated_at = NOW()
        WHERE id = ${contactId}
    `

    // 5. COBRAR LOS CRÉDITOS
    await sql`
        UPDATE usuarios 
        SET 
            ia_credits = GREATEST(0, COALESCE(ia_credits, 0) - CASE WHEN ${COSTO_CREDITOS} > COALESCE(ia_credits_extra, 0) THEN ${COSTO_CREDITOS} - COALESCE(ia_credits_extra, 0) ELSE 0 END),
            ia_credits_extra = GREATEST(0, COALESCE(ia_credits_extra, 0) - ${COSTO_CREDITOS})
        WHERE id = ${user.id}
    `

    return NextResponse.json({ success: true, score, reason })

  } catch (error: any) {
    console.error("❌ Error en Lead Scoring:", error)
    return NextResponse.json({ error: error.message || "Error procesando el score con IA" }, { status: 500 })
  }
}