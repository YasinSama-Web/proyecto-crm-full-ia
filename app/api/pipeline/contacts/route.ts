import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req as any);
    
    // 🔥 Súper consulta optimizada: Trae todos (incluso si is_group es NULL por error de migración)
    const contacts = await sql`
      SELECT id, name, phone, tags
      FROM "Contact"
      WHERE usuario_id = ${user.rootOwnerId}
      AND (is_group = false OR is_group IS NULL)
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("[PIPELINE_CONTACTS_ERROR]", error);
    return NextResponse.json([]);
  }
}
