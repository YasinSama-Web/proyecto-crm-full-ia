import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth-middleware";

// PATCH - Actualizar producto completo
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> } // ⭐ Promise
) {
  try {
    const user = await requireAuth(req as any);
    const { id } = await context.params; // ⭐ await
    
    const body = await req.json();
    
    const {
      sku, nombre, precio, stock, categoria,
      descripcion_corta, palabras_clave,
      talle, color, medidas, marca, material,
      imagen_url, activo, prioritario
    } = body;

    // Verificar que el producto pertenece al usuario
    const existing = await sql`
      SELECT id FROM productos 
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
    `;

    if (existing.length === 0) {
      return new NextResponse("Producto no encontrado", { status: 404 });
    }

    await sql`
      UPDATE productos SET
        sku = ${sku ?? existing[0].sku},
        nombre = ${nombre ?? existing[0].nombre},
        precio = ${Number(precio ?? existing[0].precio)},
        stock = ${Number(stock ?? existing[0].stock)},
        categoria = ${categoria ?? existing[0].categoria},
        descripcion_corta = ${descripcion_corta ?? existing[0].descripcion_corta},
        palabras_clave = ${palabras_clave ?? existing[0].palabras_clave},
        talle = ${talle ?? existing[0].talle},
        color = ${color ?? existing[0].color},
        medidas = ${medidas ?? existing[0].medidas},
        marca = ${marca ?? existing[0].marca},
        material = ${material ?? existing[0].material},
        imagen_url = ${imagen_url ?? existing[0].imagen_url},
        activo = ${activo ?? existing[0].activo},
        prioritario = ${prioritario ?? existing[0].prioritario},
        updated_at = NOW()
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error actualizando producto:", error);
    return new NextResponse("Error actualizando producto", { status: 500 });
  }
}

// DELETE - Eliminar producto
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> } // ⭐ Promise
) {
  try {
    const user = await requireAuth(req as any);
    const { id } = await context.params; // ⭐ await
    
    await sql`
      DELETE FROM productos 
      WHERE id = ${id} AND usuario_id = ${user.rootOwnerId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error eliminando producto:", error);
    return new NextResponse("Error eliminando producto", { status: 500 });
  }
}