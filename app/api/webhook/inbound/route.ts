import { NextResponse } from "next/server";
import { sql } from "@/lib/db"; 
// 🔥 FIX: Importamos el conector directo a Railway
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner_id, nombre, telefono, email, origen = 'Facebook Ads' } = body;

    if (!owner_id || !telefono) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // 1. Limpiamos el teléfono. Si FB manda su texto dummy, le ponemos un número de error para que no choque
    let telefonoLimpio = telefono.replace(/\D/g, '');
    if (!telefonoLimpio) telefonoLimpio = `dummy_${Date.now()}`; 

    const contactId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notasFormateadas = email ? `Email: ${email} | Origen: ${origen}` : `Origen: ${origen}`;

    // 🔥 2. CREAR LA ETIQUETA EN EL TAG MANAGER (Si no existe)
    const tagCheck = await sql`SELECT id FROM etiquetas WHERE usuario_id = ${owner_id} AND name = ${origen}`;
    
    if (tagCheck.length === 0) {
       await sql`
         INSERT INTO etiquetas (usuario_id, name, color) 
         VALUES (${owner_id}, ${origen}, '#2563eb')
       `;
       console.log(`[Webhook] Etiqueta ${origen} creada en Tag Manager.`);
    }

    // 🔥 3. BUSCAMOS LA CONFIGURACIÓN ÚNICA DEL USUARIO
    const configRes = await sql`
      SELECT fb_lead_message, fb_lead_line_id, fb_lead_pipeline_stage_id 
      FROM config_automatizacion 
      WHERE usuario_id = ${owner_id} 
      LIMIT 1
    `;
    
    let pipelineStageId = null;
    let mensajePersonalizado = '¡Hola! 👋 Vimos que te registraste en nuestro anuncio. ¿En qué te podemos ayudar hoy?';
    let lineaPreferida = 'ALL';

    if (configRes.length > 0) {
      if (configRes[0].fb_lead_pipeline_stage_id && configRes[0].fb_lead_pipeline_stage_id !== 'none') {
        pipelineStageId = configRes[0].fb_lead_pipeline_stage_id;
      }
      if (configRes[0].fb_lead_message) mensajePersonalizado = configRes[0].fb_lead_message;
      if (configRes[0].fb_lead_line_id) lineaPreferida = configRes[0].fb_lead_line_id;
    }

  const existingContact = await sql`
      SELECT id, tags, deal_value 
      FROM "Contact" 
      WHERE phone = ${telefonoLimpio} AND usuario_id = ${owner_id} 
      LIMIT 1
    `;

    let finalContactId = contactId;

    if (existingContact.length > 0) {
      // 🟢 EL CLIENTE YA EXISTÍA (Evitamos duplicado)
      finalContactId = existingContact[0].id;
      const currentTags = existingContact[0].tags || [];
      const isRecurring = Number(existingContact[0].deal_value || 0) > 0;

      // Armamos las etiquetas sin duplicarlas
      let newTags = [...currentTags];
      if (!newTags.includes(origen)) newTags.push(origen);
      if (isRecurring && !newTags.includes('Recurrente 🔄')) newTags.push('Recurrente 🔄');

      // Lo traemos de vuelta a la columna de "Leads" y actualizamos su fecha (updated_at)
      await sql`
        UPDATE "Contact" 
        SET 
          pipeline_stage_id = COALESCE(${pipelineStageId}, pipeline_stage_id),
          tags = ${newTags}::text[],
          notes = CONCAT(notes, ' | Re-ingresó como Lead el: ', NOW()),
          updated_at = NOW()
        WHERE id = ${finalContactId}
      `;
      console.log(`[Webhook] Contacto actualizado. Es recurrente: ${isRecurring}`);

    } else {
      // 🔵 ES UN CLIENTE 100% NUEVO
      await sql`
        INSERT INTO "Contact" (
          id, usuario_id, name, phone, notes, tags, is_group, created_at, updated_at, pipeline_stage_id
        )
        VALUES (
          ${contactId}, ${owner_id}, ${nombre || 'Nuevo Lead'}, ${telefonoLimpio}, ${notasFormateadas}, ARRAY[${origen}]::text[], false, NOW(), NOW(), ${pipelineStageId}
        )
      `;
      console.log(`[Webhook] Contacto nuevo creado en DB.`);
    }

try {
      const nombreCliente = (nombre && nombre !== 'Nuevo Lead') ? nombre : '';
      const mensajeFinal = mensajePersonalizado.replace(/{nombre}/g, nombreCliente).trim();

      let lineaParaEnviar = null;

      // Usamos "userId" entre comillas dobles
      if (lineaPreferida === 'ALL') {
        const lineasDisponibles = await sql`SELECT id FROM lineas_whatsapp WHERE "userId" = ${owner_id} AND status = 'CONECTADA' LIMIT 1`;
        if (lineasDisponibles.length > 0) lineaParaEnviar = lineasDisponibles[0].id;
      } else {
        const lineaEspecifica = await sql`SELECT id FROM lineas_whatsapp WHERE id = ${lineaPreferida} AND "userId" = ${owner_id} AND status = 'CONECTADA' LIMIT 1`;
        if (lineaEspecifica.length > 0) lineaParaEnviar = lineaEspecifica[0].id;
      }

      if (lineaParaEnviar) {
        
        // 🔥 NUEVO: BUSCAR O CREAR LA CONVERSACIÓN PARA EL INBOX
        const convs = await sql`SELECT id FROM conversaciones WHERE contact_phone = ${telefonoLimpio} AND usuario_id = ${owner_id} LIMIT 1`;
        let convId;

        if (convs.length > 0) {
            // Si ya existe chat, lo traemos al frente (PENDING) y actualizamos la hora
            convId = convs[0].id;
            await sql`UPDATE conversaciones SET last_activity = NOW(), status = 'PENDING' WHERE id = ${convId}`;
        } else {
            // Si es un lead nuevo sin chat previo, le creamos su sala de chat
            convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await sql`
               INSERT INTO conversaciones (id, usuario_id, line_id, contact_phone, contact_name, status, last_activity) 
               VALUES (${convId}, ${owner_id}, ${lineaParaEnviar}, ${telefonoLimpio}, ${nombreCliente || 'Lead'}, 'PENDING', NOW())
            `;
        }

        // 🔥 Disparamos a Railway Y LE PASAMOS EL ID DE CONVERSACIÓN (convId)
        await sendWhatsAppMessage(lineaParaEnviar, telefonoLimpio, mensajeFinal, convId);
        
        console.log(`[Webhook FB] Mensaje enviado a ${telefonoLimpio} y registrado en el Inbox (Conv: ${convId})`);
      } else {
        console.log(`[Webhook FB] ALERTA: No se encontró línea conectada para el usuario ${owner_id}.`);
      }

    } catch (msgError) {
      console.error("⚠️ Error enviando el mensaje automático:", msgError);
    }

    return NextResponse.json({ success: true, message: "Lead procesado correctamente" });

  } catch (error) {
    console.error("❌ Error en Webhook Inbound:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
