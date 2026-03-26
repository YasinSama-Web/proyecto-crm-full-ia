'use server'

import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

const sql = neon(process.env.DATABASE_URL!);
const RAILWAY_URL = process.env.CRM_URL || process.env.WHATSAPP_SERVER_URL || "";
const API_SECRET = process.env.SECRET || process.env.WHATSAPP_SECRET || "";

export async function initiateChat(formData: FormData) {
  const userId = formData.get("userId_frontend") as string;

  if (!userId || userId.trim() === "") {
      return { success: false, error: "Error: No se recibió la sesión del usuario (usuario_id missing)." };
  }

  try {
      const userCheck = await sql`SELECT id FROM "usuarios" WHERE id = ${userId}`;
      if (userCheck.length === 0) {
          console.log(`⚠️ Usuario ${userId} no encontrado en SQL. Sincronizando...`);
          await sql`
            INSERT INTO "usuarios" (id, email, nombre, password_hash, subscription_status, plan)
            VALUES (${userId}, 'user@system.com', 'Usuario Sistema', 'migrated_hash', 'active', 'pro')
          `;
      }
  } catch (e) { 
      console.error("Error verificando usuario:", e);
  }

  let lineId = "";
  try {
      const lines = await sql`SELECT id FROM "lineas_whatsapp" WHERE "userId" = ${userId} LIMIT 1`; 
      
      if (lines.length > 0) {
          lineId = lines[0].id;
      } else {
          const anyLine = await sql`SELECT id FROM "lineas_whatsapp" LIMIT 1`;
          if (anyLine.length > 0) {
              lineId = anyLine[0].id;
          } else {
              lineId = `line_${userId.substring(0,8)}`;
              await sql`
                INSERT INTO "lineas_whatsapp" (id, "userId", phone, nombre, status)
                VALUES (${lineId}, ${userId}, '549110000000', 'Línea Personal', 'CONNECTED')
              `;
          }
      }
  } catch (e) {
      return { success: false, error: "Error obteniendo línea de WhatsApp." };
  }

  // --- DATOS DEL FORMULARIO ---
  const mode = formData.get("mode") as string;
  const messageContent = formData.get("message") as string;
  let phone = formData.get("phone") as string;
  let name = formData.get("name") as string;
  let contactId = formData.get("contactId") as string;

  try {
    // A. GESTIÓN CONTACTO (Tabla "Contact")
    if (mode === 'new') {
        phone = phone.replace(/\D/g, ""); 
        
        const existing = await sql`
            SELECT id FROM "Contact" 
            WHERE phone = ${phone} AND usuario_id = ${userId}
        `;
        
        if (existing.length > 0) {
            contactId = existing[0].id;
        } else {
            const newContactId = crypto.randomUUID(); 
            await sql`
                INSERT INTO "Contact" (id, name, phone, usuario_id) 
                VALUES (${newContactId}, ${name}, ${phone}, ${userId}) 
            `;
            contactId = newContactId;
        }
    } else {
        // 🔥 SOLUCIÓN NOMBRE INVISIBLE: En modo búsqueda, recuperamos el nombre de la DB
        if (contactId) {
             const c = await sql`SELECT phone, name FROM "Contact" WHERE id = ${contactId}`;
             if(c.length > 0) {
                 if (!phone) phone = c[0].phone;
                 if (!name) name = c[0].name; // ¡Aquí atrapamos el nombre perdido!
             }
        }
    }

    // B. GESTIÓN CONVERSACIÓN (Tabla "conversaciones")
    let conversationId;
    
    const existingConv = await sql`
        SELECT id FROM "conversaciones" 
        WHERE contact_phone = ${phone} 
        AND "lineId" = ${lineId} 
        AND usuario_id = ${userId}
    `;
    
    // Aseguramos que haya un nombre válido para guardar en la conversación
    const finalContactName = name || phone || "Desconocido";

    if (existingConv.length > 0) {
        conversationId = existingConv[0].id;
        // Opcional: Actualizar el nombre si cambió
        await sql`UPDATE "conversaciones" SET contact_name = ${finalContactName} WHERE id = ${conversationId}`;
    } else {
        const newConvId = crypto.randomUUID();
        await sql`
            INSERT INTO "conversaciones" (
                id, contact_phone, "lineId", usuario_id, status, unread_count, last_activity, contact_name
            )
            VALUES (
                ${newConvId}, ${phone}, ${lineId}, ${userId}, 'OPEN', 0, NOW(), ${finalContactName}
            )
        `;
        conversationId = newConvId;
    }

    // C. ENVIAR MENSAJE (Tabla "mensajes")
    if (messageContent && messageContent.trim() !== "") {
        // 1. Insertar en DB Local
        await sql`
            INSERT INTO "mensajes" (conversation_id, content, type, is_incoming, usuario_id, timestamp)
            VALUES (${conversationId}, ${messageContent}, 'texto', false, ${userId}, NOW())
        `;

        // 2. Enviar a API Externa (Railway)
        const railwayUrl = RAILWAY_URL.startsWith("http") ? RAILWAY_URL : `https://${RAILWAY_URL}`;
        
        fetch(`${railwayUrl}/api/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-secret": API_SECRET },
            body: JSON.stringify({
                lineId: lineId,
                contactPhone: phone,
                content: messageContent,
                userId: userId, 
                type: "text",
                saveToDb: false // 🔥 SOLUCIÓN MENSAJE DOBLE: Le decimos al webhook que ignore este envío
            })
        }).catch(err => console.error("Error Railway:", err));

        // 3. Actualizar actividad
        await sql`
            UPDATE "conversaciones" 
            SET last_activity = NOW() 
            WHERE id = ${conversationId}
        `;
    }

    revalidatePath("/dashboard/chat");
    return { success: true, conversationId };

  } catch (error: any) {
    console.error("❌ ERROR ACTION:", error);
    return { success: false, error: "Error: " + error.message };
  }
}

export async function searchContactsAction(query: string, userId: string) {
    if (!userId) return [];
    
    try {
        // 🔥 SOLUCIÓN @lid y @g.us: Excluimos basura usando NOT LIKE directamente en SQL
        if (query && query.trim().length > 0) {
            const results = await sql`
                SELECT id, name, phone 
                FROM "Contact" 
                WHERE usuario_id = ${userId} 
                AND phone NOT LIKE '%@lid%' 
                AND phone NOT LIKE '%@g.us%'
                AND LENGTH(phone) < 20
                AND (name ILIKE ${'%' + query + '%'} OR phone ILIKE ${'%' + query + '%'})
                LIMIT 20
            `;
            return results;
        } 
        
        const results = await sql`
            SELECT id, name, phone 
            FROM "Contact" 
            WHERE usuario_id = ${userId}
            AND phone NOT LIKE '%@lid%' 
            AND phone NOT LIKE '%@g.us%'
            AND LENGTH(phone) < 20
            ORDER BY created_at DESC 
            LIMIT 50
        `;
        return results;

    } catch (e) { 
        console.error("Error búsqueda:", e);
        return []; 
    }
}
