"use server"

import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"
import { randomUUID } from 'crypto';
import { createPendingCAPIEvent } from "@/app/dashboard/marketing/action";
// Función auxiliar para esperar (Paciencia)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function sendMessage({ 
  conversationId, 
  body, 
  type = "texto",
  lineId,
  contactPhone,
  mobileId,
  quotedMessageId,
  quotedParticipant,
  quotedContent,
}: { 
  conversationId: string
  body: string
  type?: "texto" | "image" | "audio" | "document"
  lineId?: string
  contactPhone?: string
  mobileId?: string
  quotedMessageId?: string | null
  quotedParticipant?: string | null
  quotedContent?: string | null
}) {
  const user = await requireAuth()
  
  
  try {
    // 1. OBTENER DATOS + ESTADO DE LA LÍNEA
    const conversation = await sql`
      SELECT c.*, l.status as line_status, l.is_archived as line_archived
      FROM conversaciones c
      LEFT JOIN lineas_whatsapp l ON c."lineId" = l.id::text
      WHERE c.id = ${conversationId} AND c.usuario_id = ${user.rootOwnerId}
    `
    
    if (conversation.length === 0) {
      return { success: false, error: "Conversación no encontrada" }
    }
    
    const conv = conversation[0]
    
    let targetLineId = conv.lineId || conv.lineid || lineId
    let targetPhone = conv.contact_phone || contactPhone

    if (!targetPhone) {
        return { success: false, error: "Faltan datos de contacto" }
    }

    // 🚦 2. EL DETECTOR OMNICANAL
    const channel = conv.channel || "whatsapp";
    const omni_channel_id = conv.omni_channel_id;

    if (channel === 'whatsapp') {
        targetPhone = targetPhone.replace(/\D/g, "");
    }

    // 3. LÓGICA DE MIGRACIÓN (¡SOLO SI ES WHATSAPP!)
    if (channel === 'whatsapp') {
        const isLineDead = !targetLineId || conv.line_archived === true || conv.line_status === 'DESCONECTADA';

        if (isLineDead) {
            console.log(`⚠️ Línea actual (${targetLineId}) no válida. Buscando reemplazo activo...`);
            
            const activeLines = await sql`
                SELECT id FROM lineas_whatsapp 
                WHERE "userId" = ${user.rootOwnerId} 
                AND status = 'CONECTADA' 
                AND (is_archived = false OR is_archived IS NULL)
                LIMIT 1
            `;

            if (activeLines.length === 0) {
                return { success: false, error: "No tienes ninguna línea conectada para responder." }
            }

            const newLineId = activeLines[0].id;
            targetLineId = newLineId;

            await sql`
                UPDATE conversaciones 
                SET "lineId" = ${newLineId} 
                WHERE id = ${conversationId}
            `;
        }
    }

    // 🔥 4. GUARDAR MENSAJE EN BASE DE DATOS LOCAL PRIMERO (Para evitar el error de Prisma en Railway)
    const finalMessageId = mobileId || randomUUID();
    
    await sql`UPDATE conversaciones SET bot_enabled = false WHERE id = ${conversationId}`;

    if (type !== "audio") {
       const dbType = (type === "image") ? "image" : (type === "document") ? "document" : "texto";

        await sql`
          INSERT INTO mensajes (
            id, conversation_id, content, type, is_incoming, 
            timestamp, usuario_id, media_url, status,
            quoted_message_id, quoted_participant, quoted_content
          )
          VALUES (
            ${finalMessageId}, ${conversationId}, ${body}, ${dbType}, false, 
            NOW(), ${user.id}, ${type === "image" ? body : null}, 'sent',
            ${quotedMessageId || null}, ${quotedParticipant || null}, ${quotedContent || null}
          )
        `
    }
    
    await sql`UPDATE conversaciones SET last_activity = NOW() WHERE id = ${conversationId}`

    // 5. DEFINIR FUNCIÓN DE ENVÍO A RAILWAY
    const executeSend = async (currentLineId: string | null) => {
       const whatsappServerUrl = process.env.WHATSAPP_SERVER_URL || process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL;
        const whatsappSecret = process.env.WHATSAPP_SECRET || process.env.SECRET;
        
        if (!whatsappServerUrl) throw new Error("WhatsApp server no configurado");

        let mappedType = "text";
        if (type === "image") mappedType = "image";
        if (type === "audio") mappedType = "audio";
        if (type === "document") mappedType = "document"

        const payload = {
            lineId: currentLineId,     
            contactPhone: targetPhone, 
            content: body,
            messageId: finalMessageId, // 🔥 Le pasamos el ID que acabamos de crear en BD
            type: mappedType,
            userId: user.id,
            saveToDb: type === "audio" ? true : false, 
            jid: currentLineId, 
            to: targetPhone,
            message: body,
            quotedMessageId: quotedMessageId || null,
            quotedParticipant: quotedParticipant || null,
            quotedContent: quotedContent || null,
            channel: channel,
            omni_channel_id: omni_channel_id
        }

        const response = await fetch(`${whatsappServerUrl}/api/send-message`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-api-secret": whatsappSecret || ""
            },
            body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorJson.error || JSON.stringify(errorJson));
        }
        
        return response.json();
    }

    // 6. EJECUTAR ENVÍO A RAILWAY DESPUÉS DE GUARDAR
    try {
        await executeSend(targetLineId);
    } catch (error: any) {
        console.warn("⚠️ Primer intento fallido:", error.message);

        if (error.message.includes("Cliente no listo") || 
            error.message.includes("no autenticado") || 
            error.message.includes("Cliente no inicializado")) {
            
            console.log("⏳ Esperando 4 segundos para reintento automático...");
            await delay(4000); 

            try {
                await executeSend(targetLineId);
            } catch (retryError: any) {
                console.error("❌ Falló el reintento:", retryError);
                return { success: false, error: "Conexión inestable. Intenta de nuevo en unos segundos." }
            }
        } else {
            return { success: false, error: "Error enviando: " + error.message }
        }
    }
    
    revalidatePath("/dashboard/messages")
    return { success: true, messageId: finalMessageId }
    
  } catch (error: any) {
    console.error("Error sending message:", error)
    return { success: false, error: error.message || "Error al enviar mensaje" }
  }
}
async function sendPurchaseCAPI(pixelId: string, token: string, amount: number, currency: string) {
    if (!pixelId || !token) return;

    const eventData = {
        data: [
            {
                event_name: "Purchase",
                event_time: Math.floor(Date.now() / 1000),
                action_source: "chat", 
                user_data: {},
                custom_data: {
                    currency: currency,
                    value: amount
                }
            }
        ]
    };

    try {
        await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData)
        });
        console.log(`✅ CAPI Enviado a Pixel ${pixelId} | Monto: ${amount}`);
    } catch (error) {
        console.error("❌ Failed to send CAPI event", error);
    }
}

export async function registerSale(conversationId: string, amount: number, description: string = "Venta Chat") {
    const user = await requireAuth();

    try {
        const chatData = await sql`
            SELECT 
                c.id, 
                c.source_landing_id,
                l.configuracion_json as landing_config,
                u.marketing_settings_json as global_config
            FROM conversaciones c
            LEFT JOIN landings l ON c.source_landing_id = l.id
            JOIN usuarios u ON c.usuario_id = u.id 
            WHERE c.id = ${conversationId} AND c.usuario_id = ${user.rootOwnerId}
        `;

        if (chatData.length === 0) return { success: false, error: "Chat no encontrado" };

        const chat = chatData[0];
        const landingConfig = chat.landing_config || {};
        const globalConfig = chat.global_config || {};

        let targetPixel = landingConfig.pixel_id;
        let targetToken = landingConfig.capi_token;

        if (!targetPixel) {
            targetPixel = globalConfig.pixel_id;
            targetToken = globalConfig.capi_token;
        }

        /* Aquí iría tu lógica de INSERT en tabla ventas si la tienes */
        // await sql`INSERT INTO ventas ...`

        if (targetPixel && targetToken) {
            await sendPurchaseCAPI(targetPixel, targetToken, amount, "USD");
        }

        revalidatePath("/dashboard/messages");
        return { success: true };

    } catch (error) {
        console.error("Error registering sale:", error);
        return { success: false, error: "Error al registrar venta" };
    }
}

export async function registerSaleFromChat(data: {
  conversationId: string;
  contactPhone: string;
  contactName?: string;
  amount: number;
  descripcion?: string;
  productos_skus?: string[]; 
}) {
  const user = await requireAuth();
  const agentId = user.id; 
  const rootOwnerId = user.rootOwnerId; 

  try {
    // 1. Buscar la última columna del pipeline 
    const lastStageRes = await sql`SELECT id FROM pipeline_stages WHERE usuario_id = ${rootOwnerId} ORDER BY order_index DESC LIMIT 1`;
    const targetStageId = lastStageRes.length > 0 ? lastStageRes[0].id : null;

    // 2. Buscar el contacto en el CRM
    const existingContact = await sql`SELECT id, email, city FROM "Contact" WHERE phone = ${data.contactPhone} AND usuario_id = ${rootOwnerId}`;
    let contactId = existingContact.length > 0 ? existingContact[0].id : null;
    let contactEmail = existingContact.length > 0 ? existingContact[0].email : null;
    let contactCity = existingContact.length > 0 ? existingContact[0].city : null;

    // 3. Si no existe, lo creamos
    if (!contactId) {
        contactId = 'c_' + Math.random().toString(36).substr(2, 9);
        await sql`
          INSERT INTO "Contact" (id, usuario_id, phone, name, deal_value, pipeline_stage_id, updated_at) 
          VALUES (${contactId}, ${rootOwnerId}, ${data.contactPhone}, ${data.contactName || 'Sin Nombre'}, 0, ${targetStageId}, NOW())
        `;
    }

    // 4. Actualizar el valor total del cliente
    if (targetStageId) {
        await sql`
          UPDATE "Contact" 
          SET deal_value = COALESCE(deal_value, 0) + ${data.amount}, pipeline_stage_id = ${targetStageId}, updated_at = NOW() 
          WHERE id = ${contactId}
        `;
    }

    // 5. Crear el "Recibo" visual en el chat
    const msgId = 'msg_' + Math.random().toString(36).substr(2, 9);
    const textoConcepto = data.descripcion ? ` (${data.descripcion})` : '';
    const textoFinal = `💰 Pago Manual registrado${textoConcepto}: $${data.amount}`;

    await sql`
      INSERT INTO mensajes (id, conversation_id, usuario_id, content, type, is_incoming, is_receipt, amount, timestamp, processed_by_ai) 
      VALUES (${msgId}, ${data.conversationId}, ${rootOwnerId}, ${textoFinal}, 'system', false, true, ${data.amount}, NOW(), false)
    `;

    // 6. INSERTAR EN TABLA VENTAS
    const skusJson = data.productos_skus && data.productos_skus.length > 0 ? JSON.stringify(data.productos_skus) : null;

    await sql`
      INSERT INTO ventas (amount, descripcion, contact_id, conversation_id, usuario_id, origin_message_id, origen, agente_id, productos_skus)
      VALUES (${data.amount}, ${data.descripcion || null}, ${contactId}, ${data.conversationId}, ${rootOwnerId}, ${msgId}, 'humano', ${agentId}, ${skusJson}::jsonb)
    `;

    // 7. DESCONTAR STOCK
    if (data.productos_skus && data.productos_skus.length > 0) {
        for (const item of data.productos_skus) {
            const partes = item.split('x ');
            if (partes.length === 2) {
                const cantidad = parseInt(partes[0].trim()) || 1;
                const sku = partes[1].trim();
                await sql`UPDATE productos SET stock = stock - ${cantidad} WHERE sku = ${sku} AND usuario_id = ${rootOwnerId} AND stock >= ${cantidad}`;
            }
        }
    }

    // 8. Actualizar estado de la conversación (Y obtener el fbcid si existe)
    const convUpdate = await sql`
      UPDATE conversaciones 
      SET is_conversion = true, conversion_amount = COALESCE(conversion_amount, 0) + ${data.amount}
      WHERE id = ${data.conversationId}
      RETURNING marketing_fbcid
    `;

    // 🔥 9. ENVIAR A LA COLA DE META CAPI (Lead Tracking) 🔥
    try {
      // Extraemos solo el nombre del SKU para mandarlo como ID de contenido a Meta
      const cleanSkus = data.productos_skus ? data.productos_skus.map(item => item.split('x ')[1]) : ['manual_item'];
      
      await createPendingCAPIEvent({
          eventName: 'Purchase',
          value: data.amount,
          contentIds: cleanSkus,
          fbc: convUpdate.length > 0 ? convUpdate[0].marketing_fbcid : null,
          userData: {
              phone: data.contactPhone,
              name: data.contactName,
              email: contactEmail,
              city: contactCity
          },
          metadata: { source: 'cajero_manual', agentId, descripcion: data.descripcion }
      });
    } catch (capiError) {
      console.error("⚠️ Error enviando a cola CAPI desde manual:", capiError);
    }

    revalidatePath("/dashboard/messages");
    revalidatePath("/dashboard/team"); 
    
    return { success: true };
  } catch (error: any) {
    console.error("Error en registerSaleFromChat:", error);
    return { success: false, error: "No se pudo registrar la venta." };
  }
}