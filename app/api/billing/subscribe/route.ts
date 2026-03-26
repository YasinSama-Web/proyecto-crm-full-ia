import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getEnrichedUser } from "@/lib/auth"

// 💰 PRECIOS PARA PRUEBA REAL EN PRODUCCIÓN
const PLAN_PRICES = {
  starter: { monthly: 100, annual: 1000 },
  pro: { monthly: 150, annual: 1500 },
  enterprise: { monthly: 200, annual: 2000 }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const user = await getEnrichedUser(session.userId)
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

    const { tier, cycle } = await req.json()
    const price = PLAN_PRICES[tier as keyof typeof PLAN_PRICES]?.[cycle as "monthly" | "annual"]

    if (!price) return NextResponse.json({ error: "Plan inválido" }, { status: 400 })

    // 🚀 GENERACIÓN DE SUSCRIPCIÓN EN PRODUCCIÓN
    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` // Usa el Token de Producción (APP_USR)
      },
      body: JSON.stringify({
        reason: `Suscripción CRM - Plan ${tier.toUpperCase()}`,
        external_reference: `${user.id}_${tier}_${cycle}`, 
        payer_email: user.email, // Aquí viajará tu correo real
        back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        auto_recurring: {
          frequency: cycle === 'annual' ? 12 : 1,
          frequency_type: "months",
          transaction_amount: price,
          currency_id: "ARS"
        },
        status: "pending"
      })
    })

    const mpData = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error("MP ERROR:", mpData)
      return NextResponse.json({ error: mpData.message }, { status: mpResponse.status })
    }

    return NextResponse.json({ url: mpData.init_point })

  } catch (error) {
    console.error("Subscription API error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
