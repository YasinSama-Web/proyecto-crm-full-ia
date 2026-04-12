import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

// GET - Obtener todos los catálogos del usuario
export async function GET(req: Request) {
  try {
    const user = await requireAuth(req as any);
    
    const catalogos = await sql`
      SELECT * FROM catalogos_externos 
      WHERE usuario_id = ${user.rootOwnerId} 
      ORDER BY categoria ASC
    `;
    
    return NextResponse.json(catalogos);
  } catch (error) {
    console.error("❌ Error obteniendo catálogos:", error);
    return new NextResponse("Error obteniendo catálogos", { status: 500 });
  }
}

// POST - Crear o actualizar un catálogo
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req as any);
    const { categoria, url } = await req.json();

    if (!categoria || !url) {
      return new NextResponse("Faltan campos requeridos", { status: 400 });
    }

    // Upsert: Si existe, actualiza; si no, crea
    const result = await sql`
      INSERT INTO catalogos_externos (id, usuario_id, categoria, url, created_at)
      VALUES (${crypto.randomUUID()}, ${user.rootOwnerId}, ${categoria}, ${url}, NOW())
      ON CONFLICT (usuario_id, categoria) 
      DO UPDATE SET url = ${url}
      RETURNING *
    `;

    return NextResponse.json({ success: true, catalogo: result[0] });
  } catch (error) {
    console.error("❌ Error guardando catálogo:", error);
    return new NextResponse("Error guardando catálogo", { status: 500 });
  }
}