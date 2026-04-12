import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const COSTO_CREDITOS = 5;

export async function POST(req: Request) {
  try {
    // 1. Autenticación y obtención de datos
    const user = await requireAuth(req)
    const { conversationId, contactId } = await req.json()

    if (!conversationId || !contactId) {
      return NextResponse.json({ error: "Faltan IDs requeridos" }, { status: 400 })
    }

    // 2. VERIFICACIÓN DE CRÉDITOS (El peaje)
    const userWallet = await sql`
        SELECT ia_credits, ia_credits_extra 
        FROM usuarios 
        WHERE id = ${user.id} LIMIT 1
    `
    const wallet = userWallet[0];
    const totalCredits = Number(wallet?.ia_credits || 0) + Number(wallet?.ia_credits_extra || 0);

    if (totalCredits < COSTO_CREDITOS) {
        return NextResponse.json({ error: "No tienes suficientes créditos de IA (Necesitas 5)" }, { status: 403 })
    }

    // 3. OBTENER CONTEXTO (Los últimos 20 mensajes de la charla)
    const messages = await sql`
        SELECT content, is_incoming, sender_name 
        FROM mensajes 
        WHERE conversation_id = ${conversationId} 
        ORDER BY timestamp ASC 
        LIMIT 20
    `

    if (messages.length < 3) {
        return NextResponse.json({ error: "El chat es muy corto para perfilar al cliente. Hablen un poco más." }, { status: 400 })
    }

    // Armamos el guion de la charla para pasárselo a ChatGPT
    const chatHistory = messages.map(m => 
        `${m.is_incoming ? 'Cliente' : 'Vendedor'}: ${m.content}`
    ).join('\n');

    console.log(`🧠 [IA] Analizando perfil para contacto ${contactId}...`)

    // 4. LA MAGIA DE OPENAI (Perfilado Psicológico)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Usamos 4o-mini porque es rapidísimo y muy inteligente
      messages: [
        {
          role: "system",
          content: `Eres un experto psicólogo de ventas (Sales Profiler). Tu objetivo es analizar el historial de un chat de WhatsApp/Telegram y darle al vendedor una radiografía rápida y táctica del cliente.
          
          Reglas estrictas:
          1. Sé directo y conciso (máximo 3 o 4 líneas breves).
          2. Define el perfil del cliente (ej: Analítico, Impulsivo, Buscador de Precio, Desconfiado, Emocional).
          3. Dale una TÁCTICA DE CIERRE EXACTA al vendedor (ej: "Háblale de garantías", "Ofrécele escasez", "No le des vueltas, ve al grano").
          4. Usa un tono profesional pero muy accionable. No uses formato Markdown, negritas ni títulos, solo el texto limpio.`
        },
        {
          role: "user",
          content: `Analiza este chat y dame el perfil y la táctica de cierre:\n\n${chatHistory}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    })

    const aiProfileResult = completion.choices[0].message.content?.trim()

    if (!aiProfileResult) throw new Error("La IA no devolvió un perfil válido.");

    // 5. GUARDAR RESULTADO EN EL CONTACTO
    await sql`
        UPDATE "Contact" 
        SET ai_profile = ${aiProfileResult}, updated_at = NOW()
        WHERE id = ${contactId}
    `

    // 6. COBRAR LOS CRÉDITOS (Motor Contable Inteligente)
    // Saca primero de los extra, y si no alcanza, saca del saldo principal
    await sql`
        UPDATE usuarios 
        SET 
            ia_credits = GREATEST(0, COALESCE(ia_credits, 0) - CASE WHEN ${COSTO_CREDITOS} > COALESCE(ia_credits_extra, 0) THEN ${COSTO_CREDITOS} - COALESCE(ia_credits_extra, 0) ELSE 0 END),
            ia_credits_extra = GREATEST(0, COALESCE(ia_credits_extra, 0) - ${COSTO_CREDITOS})
        WHERE id = ${user.id}
    `

    console.log(`✅ [IA] Perfil guardado. Se descontaron ${COSTO_CREDITOS} créditos a ${user.id}`)

    // 7. RESPONDER AL FRONTEND
    return NextResponse.json({ success: true, profile: aiProfileResult })

  } catch (error: any) {
    console.error("❌ Error en AI Profiler:", error)
    return NextResponse.json({ error: error.message || "Error procesando el perfil con IA" }, { status: 500 })
  }
}