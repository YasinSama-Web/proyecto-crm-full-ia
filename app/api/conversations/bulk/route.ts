import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { conversationIds, action, tagId, tagName, agentId, note } = body;

    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      return NextResponse.json({ error: "No conversations selected" }, { status: 400 });
    }

    // 🔥 ACCIÓN 1: ARCHIVAR MASIVAMENTE
    if (action === 'archive') {
      await sql`
        UPDATE conversaciones SET status = 'RESOLVED', bot_enabled = true, last_activity = NOW()
        WHERE id = ANY(${conversationIds}) AND usuario_id = ${user.rootOwnerId}
      `;
      return NextResponse.json({ success: true });
    }

    // 🔥 ACCIÓN 2: ATENDER MASIVAMENTE
    if (action === 'open') {
      await sql`
        UPDATE conversaciones 
        SET status = 'OPEN', bot_enabled = false, assigned_to = ${user.id}, last_activity = NOW()
        WHERE id = ANY(${conversationIds}) AND usuario_id = ${user.rootOwnerId}
      `;
      return NextResponse.json({ success: true });
    }
    // Arriba de todo, asegúrate de desestructurar tagName:
    // const { conversationIds, action, tagId, tagName, agentId, note } = body;

    // 🔥 ACCIÓN 3: ETIQUETAR MASIVAMENTE (Usando el Nombre en vez del ID)
    if (action === 'tag' && tagName) {
      const chats = await sql`SELECT contact_phone FROM conversaciones WHERE id = ANY(${conversationIds}) AND usuario_id = ${user.rootOwnerId}`;
      const phones = chats.map(c => c.contact_phone);

      if (phones.length > 0) {
        await sql`
          UPDATE "Contact"
          SET tags = array_append(COALESCE(tags, ARRAY[]::text[]), ${tagName})
          WHERE phone = ANY(${phones}) AND NOT (${tagName} = ANY(COALESCE(tags, ARRAY[]::text[])))
        `;
      }
      return NextResponse.json({ success: true });
    }

    // 🚀 🔥 ACCIÓN 4: REASIGNAR Y DEJAR NOTA
    if (action === 'assign' && agentId) {
      // 1. Obtenemos los nombres reales para el mensaje
      const senderQuery = await sql`SELECT nombre FROM usuarios WHERE id = ${user.id}`;
      const senderName = senderQuery[0]?.nombre || 'Un agente';

      const targetQuery = await sql`SELECT nombre FROM usuarios WHERE id = ${agentId}`;
      const targetName = targetQuery[0]?.nombre || 'otro agente';

      // 2. Armamos el mensaje interno. (Usamos un emoji para detectarlo fácil en el frontend)
      const noteText = note ? `\n📝 Nota: ${note}` : '';
      const sysMessage = `🟣 Transferido a ${targetName} por ${senderName}.${noteText}`;

      // 3. Pasamos los chats a OPEN y cambiamos el dueño
    await sql`
        UPDATE conversaciones
        SET assigned_to = ${agentId}, status = 'OPEN', bot_enabled = false, last_activity = NOW()
        WHERE id = ANY(${conversationIds}) AND usuario_id = ${user.rootOwnerId}
      `;

      // 4. Inyectamos el mensaje en TODOS los chats a la vez
      await sql`
        INSERT INTO mensajes (conversation_id, type, content, is_incoming, usuario_id)
        SELECT unnest(${conversationIds}::varchar[]), 'system', ${sysMessage}, false, ${user.rootOwnerId}
      `;

      return NextResponse.json({ success: true, message: `Chats asignados a ${targetName}` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("[BULK_ACTION_ERROR]", error);
    return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
  }
}
