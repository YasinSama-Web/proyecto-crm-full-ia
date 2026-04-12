import { NextResponse } from "next/server";
import { sql } from "@/lib/db"; 
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic" // 🔥 Obligatorio en App Router para que no cachee resultados viejos

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req as any);
    
    // 1. Leemos si el frontend solo quiere los activos (como pide el Cajero Manual)
    const { searchParams } = new URL(req.url);
    const soloActivos = searchParams.get("activos") === "true";

    let productosQuery;

    // 2. Buscamos en la BD según lo que pidieron
    if (soloActivos) {
        productosQuery = await sql`
          SELECT * FROM productos 
          WHERE usuario_id = ${user.rootOwnerId} AND activo = true AND stock > 0
          ORDER BY prioritario DESC, created_at DESC
        `;
    } else {
        productosQuery = await sql`
          SELECT * FROM productos 
          WHERE usuario_id = ${user.rootOwnerId} 
          ORDER BY prioritario DESC, created_at DESC
        `;
    }
    
    // 🔥 FIX 1: Devolvemos un objeto con la llave "productos" (Como espera el Frontend)
    return NextResponse.json({ productos: productosQuery }); 

  } catch (error) {
    console.error("❌ Error obteniendo productos:", error);
    // 🔥 FIX 2: Siempre devolver JSON en errores, nunca texto plano o HTML
    return NextResponse.json({ error: "Error obteniendo productos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req as any);
    const body = await req.json();
    
    // 1. Extraemos TODOS los campos (incluyendo los nuevos y la imagen)
    const { 
      sku, nombre, precio, stock, categoria, 
      descripcion_corta, palabras_clave, 
      talle, color, medidas, marca, prioritario, material, 
      imagen_url 
    } = body;

    const id = crypto.randomUUID();

    // 2. ESCUDO ANTI-ALUCINACIONES: Generamos SKU automático si el usuario lo dejó en blanco
    const finalSku = sku && sku.trim() !== "" ? sku.trim() : `PRD-${id.substring(0, 6).toUpperCase()}`;

    // 3. Ejecutamos el SQL con estricto orden de columnas y valores
    await sql`
      INSERT INTO productos (
        id, usuario_id, sku, nombre, precio, stock, 
        categoria, descripcion_corta, palabras_clave, 
        talle, color, medidas, marca, material, 
        imagen_url, prioritario, activo, updated_at
      )
      VALUES (
        ${id}, 
        ${user.rootOwnerId}, 
        ${finalSku},
        ${nombre}, 
        ${Number(precio)}, 
        ${Number(stock || 0)}, 
        ${categoria || 'General'}, 
        ${descripcion_corta || ''}, 
        ${palabras_clave || ''},
        ${talle || null},
        ${color || null},
        ${medidas || null},
        ${marca || null},
        ${material || null},
        ${imagen_url || null}, 
        ${prioritario}, -- 🔥 FIX 3: Agregamos la coma que faltaba aquí
        true, 
        NOW()
      )
    `;

    return NextResponse.json({ success: true, id, sku: finalSku });
  } catch (error) {
    console.error("❌ Error creando producto:", error);
    return NextResponse.json({ error: "Error creando producto" }, { status: 500 });
  }
}