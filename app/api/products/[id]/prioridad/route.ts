import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

// PATCH - Toggle prioridad con validación de límite (3 por categoría)
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> } // ⭐ Next.js 15: params es Promise
) {
  try {
    const user = await requireAuth(req as any);
    
    // ⭐ Desempaquetar params
    const { id } = await context.params;
    
    const { prioritario } = await req.json();

    // 1. Obtener producto actual y su categoría
    const producto = await sql`
      SELECT categoria, prioritario FROM productos 
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
    `;

    if (producto.length === 0) {
      return new NextResponse("Producto no encontrado", { status: 404 });
    }

    const { categoria, prioritario: estadoActual } = producto[0];

    // 2. Si está intentando activar (pasar a true) y no lo estaba ya
    if (prioritario === true && estadoActual === false) {
      // Contar cuántos prioritarios hay en esta categoría
      const count = await sql`
        SELECT COUNT(*) as total FROM productos 
        WHERE usuario_id = ${user.rootOwnerId} 
        AND categoria = ${categoria} 
        AND prioritario = true
      `;

      if (count[0].total >= 3) {
        return NextResponse.json(
          { 
            error: "Límite alcanzado", 
            message: `Solo puedes tener 3 productos estrella en la categoría "${categoria}"` 
          },
          { status: 400 }
        );
      }
    }

    // 3. Actualizar el estado
    await sql`
      UPDATE productos 
      SET prioritario = ${prioritario}, updated_at = NOW()
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
    `;

    return NextResponse.json({ 
      success: true, 
      prioritario,
      message: prioritario ? "Producto marcado como estrella" : "Producto removido de estrellas"
    });

  } catch (error) {
    console.error("❌ Error actualizando prioridad:", error);
    return new NextResponse("Error actualizando prioridad", { status: 500 });
  }
}