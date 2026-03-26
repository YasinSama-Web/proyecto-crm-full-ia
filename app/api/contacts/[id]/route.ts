import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

// --- GET (INTACTO: TU LÓGICA ORIGINAL) ---
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request)
    const { id } = await params

    const contact = await sql`
      SELECT id, phone, name, created_at, last_message, tags, notes
      FROM "Contact"
      WHERE id = ${id} AND usuario_id = ${user.id}
    `

    if (contact.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    const conversations = await sql`
      SELECT c.id, c.line_id, c.last_activity, c.is_conversion, 
             COUNT(m.id) as message_count
      FROM conversaciones c
      LEFT JOIN mensajes m ON m.conversation_id = c.id
      WHERE c.contact_phone = ${contact[0].phone}
        AND c.usuario_id = ${user.id}
      GROUP BY c.id
      ORDER BY c.last_activity DESC
    `

    return NextResponse.json({
      ...contact[0],
      conversations,
    })
  } catch (error) {
    console.error("[v0] Error fetching contact:", error)
    return NextResponse.json({ error: "Error fetching contact" }, { status: 500 })
  }
}

// --- PATCH (VERSIÓN BLINDADA ANTI-ERRORES DE TIPO) ---
// --- PATCH (EL CEREBRO DE SINCRONIZACIÓN - CORREGIDO) ---
// --- PATCH (EL CEREBRO DE SINCRONIZACIÓN BLINDADO) ---
// --- PATCH (VERSIÓN DEFINITIVA Y BLINDADA) ---
// --- PATCH (MODO DETECTIVE CON LOGS Y CASTEO ESTRICTO) ---
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const body = await request.json()

    const { name, notes, tags, deal_value, pipeline_stage_id } = body

    // 1. Buscamos estado actual
    const currentData = await sql`SELECT * FROM "Contact" WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}`
    if (currentData.length === 0) return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    const currentContact = currentData[0]

    // 2. Formateo de Etiquetas a formato nativo de Postgres
    let newTags = currentContact.tags || []
    if (tags !== undefined) {
      if (typeof tags === "string") {
        try { newTags = JSON.parse(tags) } catch { newTags = [tags] }
      } else if (Array.isArray(tags)) { newTags = tags } 
      else { newTags = [] }
    }
    const tagsPgString = "{" + newTags.map((t: string) => `"${t.replace(/"/g, '\\"')}"`).join(",") + "}";

    const finalStageId = pipeline_stage_id !== undefined ? (pipeline_stage_id === "none" ? null : pipeline_stage_id) : currentContact.pipeline_stage_id
    
    // Casteo numérico estricto
    const rawDealValue = deal_value !== undefined ? deal_value : currentContact.deal_value;
    const finalDealValue = Number(rawDealValue) || 0;

    // 🔥 PAPELERA DE RECICLAJE
    if (deal_value === 0 && finalStageId === null) {
        try {
            const phone = currentContact.phone;
            await sql`UPDATE mensajes SET is_receipt = false, amount = 0 WHERE usuario_id = ${user.rootOwnerId} AND conversation_id IN (SELECT id FROM conversaciones WHERE contact_phone = ${phone})`;
            await sql`DELETE FROM ventas WHERE contact_id = ${id} AND usuario_id = ${user.rootOwnerId}`;
        } catch(e) { console.error("⚠️ Falla en papelera:", e) }
    }

    // 🚀 MAGIA KANBAN (Sincronización Total con Ventas y Mensajes)
    try {
        if (pipeline_stage_id !== undefined && finalStageId !== currentContact.pipeline_stage_id) {
           const lastStageRes = await sql`SELECT id FROM pipeline_stages WHERE usuario_id = ${user.rootOwnerId} ORDER BY order_index DESC LIMIT 1`;
           const lastStageId = lastStageRes.length > 0 ? lastStageRes[0].id : null;

           if (lastStageId) {
               const convs = await sql`SELECT id FROM conversaciones WHERE contact_phone = ${currentContact.phone} AND usuario_id = ${user.rootOwnerId} LIMIT 1`;
               let convId = convs.length > 0 ? convs[0].id : null;

               if (!convId) {
                   convId = 'conv_' + Math.random().toString(36).substr(2, 9);
                   await sql`INSERT INTO conversaciones (id, usuario_id, contact_phone, contact_name, status) VALUES (${convId}, ${user.rootOwnerId}, ${currentContact.phone}, ${currentContact.name}, 'CLOSED')`;
               }

               if (finalStageId === lastStageId && finalDealValue > 0) {
                   // ✅ ENTRÓ A VENTA CERRADA
                   const msgId = 'msg_' + Math.random().toString(36).substr(2, 9);
                   // Creamos el texto AFUERA del SQL para evitar el error $4
                   const logContent = `✅ Oportunidad Ganada en Pipeline: $${finalDealValue}`; 
                   
                   await sql`
                     INSERT INTO mensajes (id, conversation_id, usuario_id, content, type, is_incoming, is_receipt, amount, timestamp)
                     VALUES (${msgId}, ${convId}, ${user.rootOwnerId}, ${logContent}, 'system', false, true, ${finalDealValue}::numeric, NOW())
                   `;

                   // 🔥 EL CRUCE DE DATOS: Insertamos en la tabla ventas para las Analíticas
                   await sql`
                     INSERT INTO ventas (amount, contact_id, usuario_id, origin_message_id)
                     VALUES (${finalDealValue}::numeric, ${id}, ${user.rootOwnerId}, ${msgId})
                   `;

               } else if (currentContact.pipeline_stage_id === lastStageId && finalStageId !== lastStageId) {
                   // ❌ SALIÓ DE VENTA CERRADA (Se arrepintió, devuelvo a Leads)
                   await sql`DELETE FROM ventas WHERE contact_id = ${id} AND usuario_id = ${user.rootOwnerId}`;
                   await sql`DELETE FROM mensajes WHERE conversation_id = ${convId} AND content LIKE '✅ Oportunidad Ganada en Pipeline:%' AND is_receipt = true`;
               }
           }
        }
    } catch (syncError) {
        console.error("⚠️ [PIPELINE_SYNC_ERROR] Falla en analíticas:", syncError);
    }

    // 4. ACTUALIZACIÓN FINAL
   const newName = name !== undefined ? name : currentContact.name;
    
    const result = await sql`
      UPDATE "Contact"
      SET 
        name = ${newName},
        notes = ${notes !== undefined ? notes : currentContact.notes},
        tags = ${tagsPgString}::text[],
        deal_value = ${finalDealValue}::numeric,
        pipeline_stage_id = ${finalStageId}
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
      RETURNING *
    `;

    // 🔥 5. EL PARCHE MÁGICO: Sincronizar el nombre en los chats
    // Si el nombre cambió (o lo acabamos de guardar), actualizamos todas sus conversaciones
    if (newName) {
      try {
        await sql`
          UPDATE conversaciones 
          SET contact_name = ${newName} 
          WHERE contact_phone = ${currentContact.phone} AND usuario_id = ${user.rootOwnerId}
        `;
      } catch (syncNameError) {
        console.error("⚠️ Falla al sincronizar nombre en conversaciones:", syncNameError);
      }
    }

    return NextResponse.json(result[0])

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("❌ [CONTACT_PATCH_ERROR] EXPLOSIÓN FINAL:", error)
    return NextResponse.json({ error: "Error updating contact" }, { status: 500 })
  }
}

// --- DELETE (MODIFICADO: ELIMINACIÓN EN CASCADA) ---
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request)
    const { id } = await params

    // 1. Primero obtenemos el teléfono para saber qué borrar
    const contactResult = await sql`
        SELECT phone FROM "Contact" WHERE id = ${id} AND usuario_id = ${user.id}
    `

    if (contactResult.length === 0) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    const phone = contactResult[0].phone

    // 2. 🔥 ELIMINACIÓN EN CASCADA MANUAL 🔥
    
    // A. Borrar mensajes (hijos de conversaciones)
    await sql`
        DELETE FROM mensajes 
        WHERE conversation_id IN (
            SELECT id FROM conversaciones WHERE contact_phone = ${phone} AND usuario_id = ${user.id}
        )
    `

    // B. Borrar conversaciones (hijos de contacto)
    await sql`
        DELETE FROM conversaciones 
        WHERE contact_phone = ${phone} AND usuario_id = ${user.id}
    `

    // C. Finalmente, borrar el contacto
    const result = await sql`
      DELETE FROM "Contact"
      WHERE id = ${id} AND usuario_id = ${user.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting contact:", error)
    return NextResponse.json({ error: "Error deleting contact" }, { status: 500 })
  }
}
