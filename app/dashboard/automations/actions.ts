"use server"

import { sql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-middleware"

// ============= BOT & MENÚS (Con lógica numérica y seguridad) =============

export async function getRules(lineId: string) {
  if (!lineId) return []
  try {
    // 🔥 Protegemos la lectura
    await requireAuth({ requiredFeature: "automations" })

    const rules = await sql`
      SELECT * FROM reglas_automaticas
      WHERE chatbot_id = ${lineId}
      ORDER BY created_at ASC
    `
    return rules.sort((a, b) => (parseInt(a.tipo) || 999) - (parseInt(b.tipo) || 999));
  } catch (error) { return [] }
}

export async function updateMenuRule(ruleId: string, title: string, message: string, mediaUrl: string | null = null, pipelineStageId: string | null = null) {
  try {
    await requireAuth({ requiredFeature: "automations" })
    await sql`
      UPDATE reglas_automaticas 
      SET titulo = ${title}, mensaje = ${message}, media_url = ${mediaUrl}, pipeline_stage_id = ${pipelineStageId}
      WHERE id = ${ruleId}
    `
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { return { success: false, error: "Error al actualizar" } }
}

export async function createMenuRule(chatbotId: string, title: string, message: string, parentId: string | null = null, mediaUrl: string | null = null, pipelineStageId: string | null = null) {
  try {
    await requireAuth({ requiredFeature: "automations" }) 

    let countQuery;
    if (parentId) {
        countQuery = await sql`SELECT COUNT(*) FROM reglas_automaticas WHERE chatbot_id = ${chatbotId} AND parent_id = ${parentId}::uuid`
    } else {
        countQuery = await sql`SELECT COUNT(*) FROM reglas_automaticas WHERE chatbot_id = ${chatbotId} AND parent_id IS NULL`
    }
    
    const count = parseInt(countQuery[0].count)
    const nextNum = (count + 1).toString()

    await sql`
      INSERT INTO reglas_automaticas (chatbot_id, parent_id, tipo, titulo, mensaje, activo, line_id, media_url, pipeline_stage_id)
      VALUES (${chatbotId}, ${parentId}, ${nextNum}, ${title}, ${message}, true, 'bot_global', ${mediaUrl}, ${pipelineStageId})
    `
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error: any) { 
    return { success: false, error: error.message || "Error al crear la opción" } 
  }
}

export async function deleteRule(ruleId: string, lineId: string) {
  try {
    await requireAuth({ requiredFeature: "automations" })
    await sql`DELETE FROM reglas_automaticas WHERE id = ${ruleId}`
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { return { success: false, error: "Error al eliminar" } }
}

export async function toggleRule(ruleId: string, currentState: boolean) {
  try {
    await requireAuth({ requiredFeature: "automations" })
    await sql`UPDATE reglas_automaticas SET activo = ${!currentState} WHERE id = ${ruleId}`
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { return { success: false } }
}

// ============= RESPUESTAS RÁPIDAS (Atajos de Equipo) =============

export async function getQuickReplies() {
  try {
    // 🔥 Ya no necesitamos que el cliente mande el ID, el servidor sabe de qué "empresa" es
    const user = await requireAuth({ requiredFeature: "automations" })
    
    // Leemos usando rootOwnerId para que todo el equipo vea las mismas respuestas
    return await sql`SELECT * FROM respuestas_rapidas WHERE usuario_id = ${user.rootOwnerId} ORDER BY created_at DESC`
  } catch (error) { return [] }
}

export async function createQuickReply(atajo: string, mensaje: string) {
  try {
    const user = await requireAuth({ requiredFeature: "automations" })
    
    // 🔥 Insertamos usando rootOwnerId
    await sql`
      INSERT INTO respuestas_rapidas (usuario_id, atajo, mensaje)
      VALUES (${user.rootOwnerId}, ${atajo.toLowerCase().trim()}, ${mensaje})
    `
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { return { success: false } }
}

export async function deleteQuickReply(replyId: string) {
  try {
    await requireAuth({ requiredFeature: "automations" })
    await sql`DELETE FROM respuestas_rapidas WHERE id = ${replyId}`
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { return { success: false } }
}

// ============= CONFIGURACIÓN GENERAL (Horarios y Bienvenida) =============

export async function getGeneralConfig() {
  try {
    const user = await requireAuth({ requiredFeature: "automations" })
    
    // 🔥 Leemos del rootOwnerId
    const config = await sql`SELECT * FROM config_automatizacion WHERE usuario_id = ${user.rootOwnerId} LIMIT 1`
    return config[0] || null
  } catch (error) { return null }
}

export async function saveGeneralConfig(data: any) {
  try {
    const user = await requireAuth({ requiredFeature: "automations" })
    const rootId = user.rootOwnerId; // 🔥 Guardamos a nombre de la empresa

    const existing = await sql`SELECT id FROM config_automatizacion WHERE usuario_id = ${rootId} LIMIT 1`

  if (existing.length > 0) {
      await sql`
        UPDATE config_automatizacion SET 
          bienvenida_activa = ${data.bienvenida_activa},
          mensaje_bienvenida = ${data.mensaje_bienvenida || ""},
          ausencia_activa = ${data.ausencia_activa},
          hora_apertura = ${data.hora_apertura || null},
          hora_cierre = ${data.hora_cierre || null},
          mensaje_ausencia = ${data.mensaje_ausencia || ""},
          fb_lead_message = ${data.fb_lead_message || ""},
          fb_lead_line_id = ${data.fb_lead_line_id || "ALL"},
          fb_lead_pipeline_stage_id = ${data.fb_lead_pipeline_stage_id || "none"},
          updated_at = NOW()
        WHERE usuario_id = ${rootId}
      `
    } else {
      await sql`
        INSERT INTO config_automatizacion (
          usuario_id, bienvenida_activa, mensaje_bienvenida, ausencia_activa, hora_apertura, hora_cierre, mensaje_ausencia, fb_lead_message, fb_lead_line_id
        ) VALUES (
          ${rootId}, ${data.bienvenida_activa}, ${data.mensaje_bienvenida || ""}, ${data.ausencia_activa}, 
          ${data.hora_apertura || null}, ${data.hora_cierre || null}, ${data.mensaje_ausencia || ""},
          ${data.fb_lead_message || ""}, ${data.fb_lead_line_id || "ALL"}, ${data.fb_lead_pipeline_stage_id || "none"}
        )
      `
    }
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { return { success: false } }
}

// ============= GESTIÓN DE CHATBOTS (DEPARTAMENTOS) =============

export async function getChatbots() {
  try {
    const user = await requireAuth({ requiredFeature: "automations" })
    return await sql`
      SELECT * FROM chatbots 
      WHERE usuario_id = ${user.rootOwnerId} 
      ORDER BY created_at DESC
    `
  } catch (error) { return [] }
}

export async function createChatbot(nombre: string, color: string) {
  try {
    const user = await requireAuth({ requiredFeature: "automations" })
    await sql`
      INSERT INTO chatbots (usuario_id, nombre, color)
      VALUES (${user.rootOwnerId}, ${nombre}, ${color})
    `
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { return { success: false, error: "Error al crear el chatbot" } }
}

export async function deleteChatbot(botId: string) {
  try {
    const user = await requireAuth({ requiredFeature: "automations" })
    await sql`
      DELETE FROM chatbots 
      WHERE id = ${botId} AND usuario_id = ${user.rootOwnerId}
    `
    // Al borrar el bot, las reglas hijas se borran solas por el ON DELETE CASCADE
    revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { return { success: false, error: "Error al eliminar" } }
}

// ============= ASIGNAR CHATBOT A UNA LÍNEA =============

export async function assignBotToLine(lineId: string, chatbotId: string | null) {
  try {
    const user = await requireAuth({ ownerOrAdmin: true })
    
    // Si chatbotId es "null", desvinculamos el bot de la línea
    if (!chatbotId) {
      await sql`UPDATE lineas_whatsapp SET chatbot_id = NULL WHERE id = ${lineId} AND usuario_id = ${user.rootOwnerId}`
    } else {
      await sql`UPDATE lineas_whatsapp SET chatbot_id = ${chatbotId} WHERE id = ${lineId} AND usuario_id = ${user.rootOwnerId}`
    }
    
    revalidatePath("/dashboard/lines")
    return { success: true }
  } catch (error) { 
    return { success: false, error: "Error al asignar el chatbot" } 
  }
}

export async function updateChatbotGreeting(botId: string, greeting: string) {
  try {
    const user = await requireAuth({ requiredFeature: "automations" })
    await sql`
      UPDATE chatbots 
      SET mensaje_saludo = ${greeting}
      WHERE id = ${botId} AND usuario_id = ${user.rootOwnerId}
    `
    // revalidatePath("/dashboard/automations")
    return { success: true }
  } catch (error) { 
    return { success: false, error: "Error al guardar el saludo" } 
  }
}

export async function getPipelineStages() {
  try {
    const user = await requireAuth({ requiredFeature: "automations" })
    return await sql`SELECT id, name, color FROM pipeline_stages WHERE usuario_id = ${user.rootOwnerId} ORDER BY order_index ASC`
  } catch (error) { return [] }
}

export async function getLineas() {
  try {
    const user = await requireAuth();
    const result = await sql`
      SELECT id, phone, nombre, status 
      FROM lineas_whatsapp 
      WHERE "userId" = ${user.rootOwnerId}
    `;
    return result;
  } catch (error) {
    console.error("Error fetching lineas:", error);
    return [];
  }
}

export async function duplicateChatbot(botId: string, newName: string) {
  try {
    const user = await requireAuth({ requiredFeature: "automations" });
    
    // 1. Obtener el bot original
    const originalBots = await sql`SELECT * FROM chatbots WHERE id = ${botId} AND usuario_id = ${user.rootOwnerId}`;
    if (originalBots.length === 0) return { success: false, error: "Bot no encontrado" };
    const originalBot = originalBots[0];

    // 2. Crear el nuevo bot con el NOMBRE NUEVO
    const insertedBot = await sql`
      INSERT INTO chatbots (usuario_id, nombre, color, mensaje_saludo)
      VALUES (${user.rootOwnerId}, ${newName}, ${originalBot.color}, ${originalBot.mensaje_saludo})
      RETURNING id
    `;
    const newBotId = insertedBot[0].id;

    // 3. Clonar el árbol de reglas
    const rules = await sql`SELECT * FROM reglas_automaticas WHERE chatbot_id = ${botId} ORDER BY created_at ASC`;

    if (rules.length > 0) {
      const idMap = new Map();
      for (const rule of rules) {
        // Generamos los nuevos UUID para el clon
        idMap.set(rule.id, crypto.randomUUID());
      }

      for (const rule of rules) {
        const newRuleId = idMap.get(rule.id);
        const newParentId = rule.parent_id ? idMap.get(rule.parent_id) : null;

        await sql`
          INSERT INTO reglas_automaticas (
            id, chatbot_id, parent_id, tipo, titulo, mensaje, 
            activo, line_id, media_url, pipeline_stage_id
          )
          VALUES (
            ${newRuleId}, ${newBotId}, ${newParentId}, 
            ${rule.tipo}, ${rule.titulo}, ${rule.mensaje}, 
            ${rule.activo}, ${rule.line_id}, ${rule.media_url}, ${rule.pipeline_stage_id}
          )
        `;
      }
    }

    revalidatePath("/dashboard/automations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al duplicar el chatbot" };
  }
}

// 🔥 NUEVA ACCIÓN: Editar nombre del bot
export async function updateChatbotName(botId: string, newName: string) {
  try {
    const user = await requireAuth({ requiredFeature: "automations" });
    await sql`
      UPDATE chatbots 
      SET nombre = ${newName}
      WHERE id = ${botId} AND usuario_id = ${user.rootOwnerId}
    `;
    revalidatePath("/dashboard/automations");
    return { success: true };
  } catch (error) { 
    return { success: false, error: "Error al guardar el nombre" };
  }
}
