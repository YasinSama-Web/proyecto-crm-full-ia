import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"
import { emitirWebhook } from "@/lib/webhook-service"
// 🔥 IMPORTANTE: Ajusta la ruta si tu archivo de actions de marketing está en otra carpeta
import { createPendingCAPIEvent } from "@/app/dashboard/marketing/action" 

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req)
    const { messageId, amount, conversationId, needsManualReview, imageUrl } = await req.json()

    // 1. OBTENER DATOS DE LA CONVERSACIÓN
    const conversationData = await sql`
        SELECT 
            c.contact_phone, 
            c.source_landing_id,  
            c.marketing_fbcid, -- 🔥 Sacamos el fbcid si el bot ya lo capturó
            COALESCE(l.nombre, o.name, 'Canal Desconocido') as line_name
        FROM conversaciones c 
        LEFT JOIN lineas_whatsapp l ON c."lineId" = l.id 
        LEFT JOIN omni_channels o ON c.omni_channel_id = o.id
        WHERE c.id = ${conversationId}
    `
    
    if (conversationData.length === 0) throw new Error(`Conversación no encontrada. ID: ${conversationId}`)
    
    const { contact_phone, line_name, source_landing_id, marketing_fbcid } = conversationData[0]

    // 2. GESTIÓN DE CONTACTO
    const contactResult = await sql`SELECT id, name, tags, email, city FROM "Contact" WHERE phone = ${contact_phone} AND usuario_id = ${user.rootOwnerId} LIMIT 1`
    let contactId = null;
    let clienteNombre = 'Cliente Nuevo';
    let clienteTags: string[] = [];
    let clienteEmail = null;
    let clienteCity = null;
    
    if (contactResult.length > 0) {
        contactId = contactResult[0].id;
        clienteNombre = contactResult[0].name || 'Cliente de WhatsApp';
        clienteTags = contactResult[0].tags || [];
        clienteEmail = contactResult[0].email;
        clienteCity = contactResult[0].city;
    } else {
        const newC = await sql`
            INSERT INTO "Contact" (phone, name, usuario_id) 
            VALUES (${contact_phone}, 'Cliente Nuevo', ${user.rootOwnerId}) 
            RETURNING id
        `
        contactId = newC[0].id;
    }

    // 3. ACTUALIZAR EL MENSAJE (Visual chat)
    await sql`
        UPDATE mensajes 
        SET is_receipt = true, amount = ${amount}, processed_by_ai = true, needs_manual_review = ${needsManualReview || false}
        WHERE id = ${messageId}
    `

    // 4. GUARDAR VENTA (PERSISTENCIA)
    await sql`
        INSERT INTO ventas (amount, contact_id, usuario_id, origin_message_id, line_snapshot, origen)
        VALUES (${amount}, ${contactId}, ${user.id}, ${messageId}, ${line_name}, 'humano')
    `

    // 5. AUTOMATIZACIÓN DEL PIPELINE DE VENTAS
    try {
        const lastStageRes = await sql`SELECT id FROM pipeline_stages WHERE usuario_id = ${user.rootOwnerId} ORDER BY order_index DESC LIMIT 1`
        const targetStageId = lastStageRes.length > 0 ? lastStageRes[0].id : null;

        if (targetStageId) {
            await sql`
                UPDATE "Contact"
                SET deal_value = COALESCE(deal_value, 0) + ${amount}, pipeline_stage_id = ${targetStageId}, updated_at = NOW()
                WHERE id = ${contactId}
            `
        }
    } catch (pipelineError) { console.error("⚠️ Error Pipeline:", pipelineError); }

    // 6. INTEGRACIÓN MARKETING (Landing Interna)
    if (source_landing_id) {
        try {
            const landingData = await sql`SELECT configuracion_json FROM landings WHERE id = ${source_landing_id}`
        } catch (e) { console.error("⚠️ Error silencioso en marketing:", e) }
    }

    // 7. WEBHOOK HACIA TUS APPS
    await emitirWebhook(user.rootOwnerId, 'pago_aprobado', {
        monto: amount, moneda: "ARS", conversacion_id: conversationId, mensaje_id: messageId,
        cliente_nombre: clienteNombre, cliente_telefono: contact_phone,
        cliente_etiquetas: Array.isArray(clienteTags) ? clienteTags.join(', ') : "", imagen_url: imageUrl || "Sin imagen"
    });

    // 🔥 8. ENVIAR A LA COLA DE META CAPI (Lead Tracking) 🔥
    try {
        await createPendingCAPIEvent({
            eventName: 'Purchase',
            value: amount,
            contentIds: ['semi_auto_payment'], 
            fbc: marketing_fbcid || null, // Se envía a Meta si lo tenemos
            userData: {
                phone: contact_phone,
                name: clienteNombre !== 'Cliente Nuevo' ? clienteNombre : undefined,
                email: clienteEmail || undefined,
                city: clienteCity || undefined
            },
            metadata: { source: 'semi_auto_ai', messageId }
        });
        console.log("✅ Venta enviada a la cola de CAPI");
    } catch (capiError) {
        console.error("⚠️ Error enviando a cola CAPI:", capiError);
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("❌ Error en confirm-payment:", error)
    return NextResponse.json({ error: error.message || "Error guardando venta" }, { status: 500 })
  }
}