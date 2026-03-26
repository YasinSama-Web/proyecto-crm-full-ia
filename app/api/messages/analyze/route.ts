import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-middleware"
import { analyzeReceiptImage } from "@/lib/ai-analyzer"
import { sql } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req)
    const { imageUrl } = await req.json() 

    // 💰 PEAJE EN CASCADA: Descuenta de 'ia_credits' (Plan) primero. Si está en 0, descuenta de 'ia_credits_extra'.
    // 🔥 CORRECCIÓN: Usamos user.id para descontarle al agente que disparó la acción
    const checkCredits = await sql`
        UPDATE usuarios 
        SET 
            ia_credits = CASE WHEN COALESCE(ia_credits, 0) > 0 THEN ia_credits - 1 ELSE ia_credits END,
            ia_credits_extra = CASE WHEN COALESCE(ia_credits, 0) <= 0 AND COALESCE(ia_credits_extra, 0) > 0 THEN ia_credits_extra - 1 ELSE ia_credits_extra END,
            mensajes_ia = COALESCE(mensajes_ia, 0) + 1 
        WHERE id = ${user.id} AND (COALESCE(ia_credits, 0) > 0 OR COALESCE(ia_credits_extra, 0) > 0)
        RETURNING ia_credits, ia_credits_extra
    `

    // ⛔ Si la consulta no devolvió nada, ambas billeteras están vacías
    if (checkCredits.length === 0) {
        return NextResponse.json({ 
            success: false, 
            error: "insufficient_credits",
            message: "No tienes mensajes de IA disponibles." 
        })
    }



    // Guardamos los valores actualizados para mandarlos al Frontend
    const saldoPlan = checkCredits[0].ia_credits || 0;
    const saldoExtra = checkCredits[0].ia_credits_extra || 0;
    const totalRestante = saldoPlan + saldoExtra;

    // Llamamos al motor de IA rápido
    const analysis = await analyzeReceiptImage(imageUrl)

    // 🔥 GUARDAMOS EL REGISTRO CON DETALLES
    const logDetails = analysis.is_receipt 
        ? `Análisis manual - Monto: $${analysis.amount || 0}` 
        : `Análisis manual - Imagen descartada (Meme/No recibo)`;

        await sql`
      INSERT INTO ia_usage_logs (id, usuario_id, feature, credits_cost, details)
      VALUES (
        ${crypto.randomUUID()}, 
        ${user.id}, 
        'MANUAL_VISION_RECEIPT', 
        1, 
        'Análisis manual de comprobante'
      )
    `

    if (analysis.is_receipt && analysis.amount) {
        return NextResponse.json({ 
            success: true, 
            amount: analysis.amount,
            needs_manual_review: analysis.needs_manual_review,
            review_reason: analysis.review_reason,
            remaining_credits: totalRestante,
            saldo_plan: saldoPlan,    // 🔥 Lo mandamos por si quieres actualizar la UI
            saldo_extra: saldoExtra,  // 🔥 Lo mandamos por si quieres actualizar la UI
            message: "Monto detectado" 
        })
    } else {
        return NextResponse.json({ 
            success: false, 
            remaining_credits: totalRestante,
            saldo_plan: saldoPlan,
            saldo_extra: saldoExtra,
            message: "No se detectó un comprobante válido." 
        })
    }

  } catch (error: any) {
    console.error("Error en análisis:", error)
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 })
  }
}
