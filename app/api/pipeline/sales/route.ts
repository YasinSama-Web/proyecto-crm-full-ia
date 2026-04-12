import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const user = await requireAuth({ requiredFeature: "sales" });
    const rootId = user.rootOwnerId;
    const agentId = user.id; // 🔥 Agente que cerró la venta
    
    // 🔥 NUEVO: Recibimos los SKUs desde el frontend del Kanban
    const { phone, name, amount, stageId, concept, productos_skus } = await req.json();

    const existing = await sql`SELECT id FROM "Contact" WHERE phone = ${phone} AND usuario_id = ${rootId}`;
    let contactId;

    if (existing.length > 0) {
      contactId = existing[0].id;
      await sql`UPDATE "Contact" SET name = COALESCE(${name}, name), deal_value = COALESCE(deal_value, 0) + ${amount}, updated_at = NOW(), pipeline_stage_id = ${stageId} WHERE id = ${contactId}`;
    } else {
      contactId = 'c_' + Math.random().toString(36).substr(2, 9);
      await sql`INSERT INTO "Contact" (id, usuario_id, phone, name, deal_value, updated_at, pipeline_stage_id) VALUES (${contactId}, ${rootId}, ${phone}, ${name}, ${amount}, NOW(), ${stageId})`;
    }

    const convs = await sql`SELECT id FROM conversaciones WHERE contact_phone = ${phone} AND usuario_id = ${rootId} ORDER BY last_activity DESC LIMIT 1`;
    let convId = convs.length > 0 ? convs[0].id : 'conv_' + Math.random().toString(36).substr(2, 9);
    if (convs.length === 0) {
      await sql`INSERT INTO conversaciones (id, usuario_id, contact_phone, contact_name, status) VALUES (${convId}, ${rootId}, ${phone}, ${name}, 'CLOSED')`;
    }

    const textoConcepto = concept ? ` (${concept})` : '';
    const textoFinal = `💰 Pago Manual registrado${textoConcepto}: $${amount}`;
    const msgId = 'msg_' + Math.random().toString(36).substr(2, 9);
    
    await sql`
      INSERT INTO mensajes (
        id, conversation_id, usuario_id, content, type, 
        is_incoming, is_receipt, amount, timestamp, processed_by_ai
      ) 
      VALUES (
        ${msgId}, ${convId}, ${rootId}, ${textoFinal}, 'system', 
        false, true, ${amount}, NOW(), false
      )
    `;

    // 🔥 NUEVO: FORMATO JSON PARA SKUS Y CREACIÓN DE VENTA E-COMMERCE
    const skusJson = productos_skus && productos_skus.length > 0 
      ? JSON.stringify(productos_skus) 
      : null;

    await sql`
      INSERT INTO ventas (amount, descripcion, contact_id, conversation_id, usuario_id, origin_message_id, origen, agente_id, productos_skus) 
      VALUES (${amount}, ${concept || null}, ${contactId}, ${convId}, ${rootId}, ${msgId}, 'humano', ${agentId}, ${skusJson}::jsonb)
    `;

    // 🔥 NUEVO: DESCUENTO DE STOCK REAL
    if (productos_skus && productos_skus.length > 0) {
        for (const item of productos_skus) {
            const partes = item.split('x ');
            if (partes.length === 2) {
                const cantidad = parseInt(partes[0].trim()) || 1;
                const sku = partes[1].trim();
                await sql`
                    UPDATE productos 
                    SET stock = stock - ${cantidad} 
                    WHERE sku = ${sku} AND usuario_id = ${rootId} AND stock >= ${cantidad}
                `;
            }
        }
    }

    return NextResponse.json({ success: true, contactId });
  } catch (error) {
    console.error("[PIPELINE_SALE_ERROR]", error);
    return NextResponse.json({ error: "Error registrando la venta" }, { status: 500 });
  }
}