import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { sql } from "@/lib/db"

export async function POST() {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userRes = await sql`
        SELECT mp_subscription_id 
        FROM usuarios 
        WHERE id = ${session.userId}
    `
    const mpSubId = userRes[0]?.mp_subscription_id

    // Si tiene un ID de MP guardado, intentamos cancelarlo allá
    if (mpSubId) {
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${mpSubId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: "cancelled" })
      })

      if (!mpResponse.ok) {
        console.warn("Mercado Pago rechazó la cancelación. Posiblemente el contrato ya no exista allá.")
        // No lanzamos error para poder continuar con la cancelación local.
      }
    }

    // SIEMPRE actualizamos nuestra base de datos local a CANCELLED
    await sql`
      UPDATE usuarios 
      SET subscription_status = 'CANCELLED' 
      WHERE id = ${session.userId}
    `

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("[CANCEL_SUBSCRIPTION_ERROR]", error)
    return NextResponse.json({ error: "Error interno procesando la cancelación." }, { status: 500 })
  }
}
