import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth({ requiredFeature: "sales" });
    const rootId = user.rootOwnerId;

    const url = new URL(req.url);
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");

    // 1. OBTENEMOS LAS COLUMNAS (STAGES)
    let stages = await sql`
      SELECT id, name, order_index 
      FROM pipeline_stages 
      WHERE usuario_id = ${rootId} 
      ORDER BY order_index ASC
    `;

    if (stages.length === 0) {
      const id1 = 'stg_' + Math.random().toString(36).substring(2, 9);
      const id2 = 'stg_' + Math.random().toString(36).substring(2, 9);
      const id3 = 'stg_' + Math.random().toString(36).substring(2, 9);
      await sql`
        INSERT INTO pipeline_stages (id, usuario_id, name, order_index) VALUES
        (${id1}, ${rootId}, 'Nuevos Leads', 0),
        (${id2}, ${rootId}, 'En Negociación', 1),
        (${id3}, ${rootId}, 'Cerrado Ganado', 2)
      `;
      stages = await sql`SELECT id, name, order_index FROM pipeline_stages WHERE usuario_id = ${rootId} ORDER BY order_index ASC`;
    }

    // 2. OBTENEMOS LOS DEALS (Dependiendo de si hay fecha o es Histórico)
    let deals;

    if (fromStr && toStr) {
      // 🔥 BÚSQUEDA CON FECHA (Ej: Hoy, Ayer, 7 Días)
      const startDate = `${fromStr}T00:00:00-03:00`;
      const endDate = `${toStr}T23:59:59-03:00`;

      deals = await sql`
        SELECT id, name as contact_name, phone, deal_value, pipeline_stage_id, tags, updated_at
        FROM "Contact"
        WHERE usuario_id = ${rootId}
        AND pipeline_stage_id IS NOT NULL
        AND updated_at >= ${startDate}
        AND updated_at <= ${endDate}
      `;
    } else {
      // 🔥 BÚSQUEDA DE HISTÓRICO COMPLETO (Sin filtro de fecha)
      deals = await sql`
        SELECT id, name as contact_name, phone, deal_value, pipeline_stage_id, tags, updated_at
        FROM "Contact"
        WHERE usuario_id = ${rootId}
        AND pipeline_stage_id IS NOT NULL
      `;
    }

    return NextResponse.json({ stages, deals });
  } catch (error: any) {
    console.error("[PIPELINE_GET_ERROR]", error);
    return NextResponse.json({ stages: [], deals: [] });
  }
}
