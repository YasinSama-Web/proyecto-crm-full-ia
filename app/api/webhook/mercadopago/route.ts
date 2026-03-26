import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import crypto from "crypto"

// 🔐 VALIDACIÓN DE FIRMA DE MERCADO PAGO
function verifyMercadoPagoSignature(req: Request, body: string): boolean {
  const signature = req.headers.get("x-signature")
  const secret = process.env.MP_WEBHOOK_SECRET 
  
  if (!signature || !secret) {
    console.log("⚠️ Falta firma o secret. Modo desarrollo activado.")
    return process.env.NODE_ENV === "development" 
  }

  const parts = signature.split(",")
  const ts = parts.find(p => p.startsWith("ts="))?.replace("ts=", "")
  const hash = parts.find(p => p.startsWith("v1="))?.replace("v1=", "")
  
  if (!ts || !hash) return false

  const template = `id:${body};request-id:${req.headers.get("x-request-id") || ""};ts:${ts};`
  
  const crypted = crypto
    .createHmac("sha256", secret)
    .update(template)
    .digest("hex")

  return crypted === hash
}

function verifySimpleSecret(req: Request): boolean {
  const url = new URL(req.url)
  const secret = url.searchParams.get("secret")
  return secret === process.env.WEBHOOK_SECRET
}

export async function POST(req: Request) {
  try {
    const body = await req.text() 
    let parsedBody: any = {}
    
    try { parsedBody = JSON.parse(body) } catch (e) { console.log("⚠️ Body no es JSON válido") }

    const url = new URL(req.url)
    const topic = (url.searchParams.get("topic") || url.searchParams.get("type") || parsedBody?.type || "").toLowerCase()
    const mpId = url.searchParams.get("data.id") || parsedBody?.data?.id || parsedBody?.id

    if (!mpId) return new NextResponse("OK", { status: 200 })

    console.log(`🔔 Webhook recibido: ${topic} | ID: ${mpId}`)

    // ==========================================
    // 🟠 CASO 1: CREACIÓN DEL CONTRATO (PREAPPROVAL)
    // Aquí Mercado Pago nos avisa que el usuario aceptó la suscripción.
    // Nos da el ID de la suscripción, pero AÚN NO HA COBRADO NADA.
    // ==========================================
    if (topic.includes("subscription") || topic.includes("preapproval")) {
      try {
        const response = await fetch(`https://api.mercadopago.com/preapproval/${mpId}`, {
          headers: { "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        })
        const data = await response.json()
        
        const externalRef = data.external_reference || ""
        if (!externalRef || !externalRef.includes("_")) return new NextResponse("OK", { status: 200 })

        const parts = externalRef.split("_")
        if (parts.length >= 3 && !externalRef.startsWith("CREDITS_")) {
          const [userId, plan, cycle] = parts

          // Guardamos el ID del contrato de MP en el usuario. Lo ponemos en PENDING.
          await sql`
            UPDATE usuarios 
            SET 
                subscription_status = 'PENDING', 
                payment_method = 'MERCADOPAGO', 
                mp_subscription_id = ${mpId.toString()}
            WHERE id = ${userId}
          `;
          console.log(`⏳ CONTRATO CREADO. Usuario: ${userId} | MP ID: ${mpId}`)
        }
        return new NextResponse("Preapproval procesado", { status: 200 })
      } catch (error) {
        console.error("❌ Error consultando MP (preapproval):", error)
        return new NextResponse("Error preapproval", { status: 500 })
      }
    } 

    // ==========================================
    // 🔵 CASO 2: PAGO RECIBIDO (PAYMENT)
    // Aquí Mercado Pago nos avisa que el dinero ya entró.
    // Es aquí donde rellenamos el "tanque" de mensajes y campañas.
    // ==========================================
    // else if (topic.includes("payment")) {
    //   try {
    //     const response = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, {
    //       headers: { "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    //     })
    //     const data = await response.json()

    else if (topic.includes("payment")) {
      try {
        let data: any = {};

        // 👻 INICIO: MODO FANTASMA (Solo para pruebas manuales)
        if (mpId.toString().startsWith("GHOST_TEST")) {
          console.log("👻 ALERTA: Ejecutando pago fantasma...");
          data = {
            status: "approved",
            external_reference: parsedBody.ghost_ref, // La referencia falsa que le enviaremos
            transaction_amount: 999
          };
        } 
        // 👻 FIN: MODO FANTASMA
        else {
          // Lógica normal: Consultar a Mercado Pago real
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${mpId}`, {
            headers: { "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` }
          });
          data = await response.json();
        }
        
        if (data.status !== "approved") return new NextResponse("Pago no aprobado aún", { status: 200 })

        const externalRef = data.external_reference || ""
        const paymentAmount = data.transaction_amount || data.net_received_amount || 0

        if (!externalRef) return new NextResponse("Sin external reference", { status: 200 })

        // 🔥 IDEMPOTENCIA: Verificar si ya procesamos este MP ID
        const existingPayment = await sql`SELECT id FROM pagos_suscripcion WHERE mp_payment_id = ${mpId.toString()} LIMIT 1`
        if (existingPayment.length > 0) {
          console.log(`⚠️ Webhook duplicado ignorado: ${mpId}`)
          return new NextResponse("Ya procesado", { status: 200 })
        }

        // 💰 ESCENARIO A: RECARGA DE CRÉDITOS IA (TU SISTEMA MANUAL)
        if (externalRef.startsWith("CREDITS_")) {
          const parts = externalRef.split("_")
          if (parts.length >= 3) {
            const [, userId, amountStr] = parts
            const amount = parseInt(amountStr, 10)

            await sql`UPDATE usuarios SET ia_credits_extra = COALESCE(ia_credits_extra, 0) + ${amount} WHERE id = ${userId}`
            await sql`INSERT INTO pagos_suscripcion (usuario_id, amount, status, mp_payment_id) VALUES (${userId}, ${paymentAmount}, 'APROBADO', ${mpId.toString()})`
            console.log(`✅ RECARGA IA EXITOSA. Usuario: ${userId} | Créditos Extra: +${amount}`)
          }
        }
        
        // 🛡️ ESCENARIO B: PAGO DE SUSCRIPCIÓN (MENSUAL/ANUAL)
        // Esto ocurre cuando compran el plan por primera vez, y CADA MES cuando se renueva.
        else if (externalRef.includes("_")) {
          const parts = externalRef.split("_")
          if (parts.length >= 3) {
            const [userId, plan, cycle] = parts
            const safeCycle = cycle.toUpperCase()
            const safePlan = plan.toUpperCase()

            if (!['STARTER', 'PRO', 'ENTERPRISE'].includes(safePlan)) {
              return new NextResponse("Plan inválido", { status: 400 })
            }

            // 🎯 RELLENANDO EL TANQUE: ASIGNACIÓN DE LÍMITES SEGÚN EL PLAN
            // Puedes ajustar estos números según lo que ofrezcas realmente.
            const mensajesPlan = safePlan === 'ENTERPRISE' ? 50000 : safePlan === 'PRO' ? 5000 : 300;
            const campanasRestantes = safePlan === 'ENTERPRISE' ? 9999 : safePlan === 'PRO' ? 10 : 3;
            const creditosIA = safePlan === 'ENTERPRISE' ? 2000 : safePlan === 'PRO' ? 1000 : 200;

            // Activamos el plan y RENOVAMOS todos los beneficios base
            await sql`
              UPDATE usuarios 
              SET plan = ${safePlan}, 
                  billing_cycle = ${safeCycle}, 
                  subscription_status = 'ACTIVE', 
                  payment_method = 'MERCADOPAGO', 
                  trial_ends_at = NULL,
                  mensajes_plan = ${mensajesPlan},       
                  ia_credits = ${creditosIA},            
                  campanas_restantes = ${campanasRestantes},
                  plan_expires_at = CASE WHEN ${safeCycle} = 'ANNUAL' THEN NOW() + INTERVAL '1 year' ELSE NOW() + INTERVAL '1 month' END
              WHERE id = ${userId}
            `;
            
            await sql`INSERT INTO pagos_suscripcion (usuario_id, amount, status, mp_payment_id) VALUES (${userId}, ${paymentAmount}, 'APROBADO', ${mpId.toString()})`
            console.log(`✅ SUSCRIPCIÓN PAGADA/RENOVADA. Usuario: ${userId} | Plan: ${safePlan}`)
          }
        }

        return new NextResponse("Pago procesado correctamente", { status: 200 })

      } catch (error) {
        console.error("❌ Error procesando pago (payment):", error)
        return new NextResponse("Error interno", { status: 500 })
      }
    }

    return new NextResponse("Webhook recibido", { status: 200 })

  } catch (error) {
    console.error("🚨 ERROR CRÍTICO EN WEBHOOK:", error)
    return new NextResponse("Error procesado", { status: 200 }) 
  }
}

export async function GET(req: Request) {
  const challenge = new URL(req.url).searchParams.get("challenge")
  if (challenge) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ status: "alive", message: "Webhook MP activo 🔐" })
}
