import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req as any);
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new NextResponse("No hay items para importar", { status: 400 });
    }

    let procesados = 0;

    for (const item of items) {
      const sku = item.SKU ? String(item.SKU).trim() : crypto.randomUUID().substring(0, 8).toUpperCase();
      const nombre = String(item.Nombre || "Sin nombre").trim();
      const precio = Number(item.Precio) || 0;
      const stock = Number(item.Stock) || 0;
      const categoria = String(item.Categoria || "General").trim();
      const desc = String(item.Descripcion || "").trim();
      const keywords = String(item.Palabras_Clave || "").trim();

      try {
        // 🔥 Lógica a prueba de balas: Buscar -> Actualizar o Insertar
        const existing = await sql`SELECT id FROM productos WHERE usuario_id = ${user.rootOwnerId} AND sku = ${sku} LIMIT 1`;

        if (existing && existing.length > 0) {
          await sql`
            UPDATE productos 
            SET nombre = ${nombre}, precio = ${precio}, stock = ${stock}, categoria = ${categoria}, 
                descripcion_corta = ${desc}, palabras_clave = ${keywords}, updated_at = NOW()
            WHERE id = ${existing[0].id}
          `;
        } else {
          await sql`
            INSERT INTO productos (id, usuario_id, sku, nombre, precio, stock, categoria, descripcion_corta, palabras_clave, activo, updated_at)
            VALUES (gen_random_uuid(), ${user.rootOwnerId}, ${sku}, ${nombre}, ${precio}, ${stock}, ${categoria}, ${desc}, ${keywords}, true, NOW())
          `;
        }
        procesados++;
      } catch (err) {
        console.error(`Error procesando SKU ${sku}:`, err);
      }
    }

    return NextResponse.json({ success: true, procesados });
  } catch (error) {
    console.error("Bulk Import Error:", error);
    return new NextResponse("Error en importación masiva", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth(req as any);
    const { ids } = await req.json(); 

    if (!Array.isArray(ids) || ids.length === 0) {
      return new NextResponse("No hay items para borrar", { status: 400 });
    }

    // 🔥 Borrado Múltiple iterativo seguro
    for (const id of ids) {
       await sql`DELETE FROM productos WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk Delete Error:", error);
    return new NextResponse("Error borrando múltiples", { status: 500 });
  }
}