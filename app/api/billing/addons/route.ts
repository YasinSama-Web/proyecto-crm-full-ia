import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

// 🔥 PRECIOS BASE (Modifícalos a 1 si vas a hacer la prueba de $1)
const PLAN_PRICES = {
  TRIAL: 0,
  STARTER: 100,
  PRO: 45000,
  ENTERPRISE: 85000
}

const ADDON_PRICES = {
  EXTRA_AGENT: 1, // Ponlo en 1 para probar
  EXTRA_LINE: 1,  // Ponlo en 1 para probar
  EXTRA_BOT: 1,    // Ponlo en 1 para probar
  EXTRA_AI_BOT: 1 // Ponlo en 1 para probar
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req)
    
    // Recibimos el carrito desde el frontend (Ej: { EXTRA_AGENT: 2, EXTRA_LINE: 0 })
    const { cart } = await req.json()

    // 1. Buscamos la suscripción actual del usuario en la base de datos
    const dbUser = await sql`
      SELECT plan, mp_subscription_id, agentes_extra, lineas_extra, bots_extra, ia_bots_extra 
      FROM usuarios 
      WHERE id = ${user.rootOwnerId}
    `
    const currentUser = dbUser[0]

    // Si no tiene suscripción activa de MP, no podemos sumarle nada a la cuota
    if (!currentUser.mp_subscription_id) {
      return NextResponse.json({ error: "No tienes una suscripción automática activa en Mercado Pago para actualizar." }, { status: 400 })
    }

    // 2. Calculamos cuánto paga actualmente de extras (lo que ya tenía contratado)
    const costoExtrasViejos = 
      (Number(currentUser.agentes_extra || 0) * ADDON_PRICES.EXTRA_AGENT) +
      (Number(currentUser.lineas_extra || 0) * ADDON_PRICES.EXTRA_LINE) +
      (Number(currentUser.bots_extra || 0) * ADDON_PRICES.EXTRA_BOT) +
      (Number(currentUser.ia_bots_extra || 0) * ADDON_PRICES.EXTRA_AI_BOT);
    
    // 3. Calculamos cuánto cuestan los NUEVOS extras del carrito
    const costoCarritoNuevo = 
      (Number(cart.EXTRA_AGENT || 0) * ADDON_PRICES.EXTRA_AGENT) +
      (Number(cart.EXTRA_LINE || 0) * ADDON_PRICES.EXTRA_LINE) +
      (Number(cart.EXTRA_BOT || 0) * ADDON_PRICES.EXTRA_BOT) +
      (Number(cart.EXTRA_AI_BOT || 0) * ADDON_PRICES.EXTRA_AI_BOT);

    // 4. Sumamos todo para obtener el Gran Total Mensual
    const planBaseStr = String(currentUser.plan).toUpperCase() as keyof typeof PLAN_PRICES;
    const precioPlanBase = PLAN_PRICES[planBaseStr] || 0;
    
    const nuevoTotalMensual = precioPlanBase + costoExtrasViejos + costoCarritoNuevo;

    // 5. 🔥 LA MAGIA: Le pedimos a Mercado Pago que actualice el contrato
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${currentUser.mp_subscription_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auto_recurring: {
          transaction_amount: nuevoTotalMensual
        },
        reason: `Suscripción TuCRM - Plan ${planBaseStr} + Complementos`
      })
    });

    if (!mpResponse.ok) {
      const mpError = await mpResponse.json();
      console.error("MP Error (Update Preapproval):", mpError);
      return NextResponse.json({ error: "Mercado Pago rechazó la actualización de la cuota." }, { status: 400 });
    }

    // 6. Si Mercado Pago dijo OK, actualizamos nuestra Base de Datos sumando los nuevos extras
    await sql`
      UPDATE usuarios 
      SET 
        agentes_extra = COALESCE(agentes_extra, 0) + ${Number(cart.EXTRA_AGENT || 0)},
        lineas_extra = COALESCE(lineas_extra, 0) + ${Number(cart.EXTRA_LINE || 0)},
        bots_extra = COALESCE(bots_extra, 0) + ${Number(cart.EXTRA_BOT || 0)},
        ia_bots_extra = COALESCE(ia_bots_extra, 0) + ${Number(cart.EXTRA_AI_BOT || 0)}
      WHERE id = ${user.rootOwnerId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error actualizando addons:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
