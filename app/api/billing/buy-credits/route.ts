import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getEnrichedUser } from "@/lib/auth"

const PACKS = {
  500: { price: 15000, title: "Pack S - 500 Créditos Extra" },
  2000: { price: 50000, title: "Pack M - 2.000 Créditos Extra" },
  5000: { price: 100000, title: "Pack L - 5.000 Créditos Extra" }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const user = await getEnrichedUser(session.userId)
    const { amount } = await req.json()
    const pack = PACKS[amount as keyof typeof PACKS]

    if (!pack) return NextResponse.json({ error: "Pack inválido" }, { status: 400 })

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: [{
          title: pack.title,
          description: "Créditos para campañas masivas de WhatsApp (No caducan)",
          quantity: 1,
          currency_id: "ARS",
          unit_price: pack.price
        }],
        // 🔥 CLAVE: Identificador para que el Webhook sepa que es una recarga
        external_reference: `CREDITS_${user?.id}_${amount}`,
        payer: { email: user?.email },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/campaigns`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/campaigns`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/campaigns`
        },
        auto_return: "approved"
      })
    })

    const mpData = await mpResponse.json()
    if (!mpResponse.ok) throw new Error(mpData.message)

    return NextResponse.json({ url: mpData.init_point })

  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
