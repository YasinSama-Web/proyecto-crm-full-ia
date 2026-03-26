import { NextResponse } from "next/server";
import { sql } from "@/lib/db"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Zapier/Make enviará estos datos desde Shopify/Tiendanube
    const { 
      owner_id, 
      nombre, 
      telefono, 
      evento, // Ej: 'carrito_abandonado', 'compra_exitosa'
      producto, 
      monto, 
      checkout_url 
    } = body;

    if (!owner_id || !telefono) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    let telefonoLimpio = telefono.replace(/\D/g, '');
    if (!telefonoLimpio) return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });

    const contactId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tagName = evento === 'carrito_abandonado' ? 'Carrito Abandonado 🛒' : 'Cliente E-commerce 🛍️';
    const tagColor = evento === 'carrito_abandonado' ? '#f59e0b' : '#10b981'; // Naranja o Verde

    // 1. Auto-crear la etiqueta si no existe
    await sql`
      INSERT INTO etiquetas (usuario_id, name, color) 
      VALUES (${owner_id}, ${tagName}, ${tagColor})
      ON CONFLICT (usuario_id, name) DO NOTHING;
    `;

    // 2. Guardar contacto y asignarle la etiqueta del carrito
    await sql`
      INSERT INTO "Contact" (id, usuario_id, name, phone, notes, tags, created_at)
      VALUES (${contactId}, ${owner_id}, ${nombre || 'Cliente Tienda'}, ${telefonoLimpio}, 'Producto: ${producto}', ARRAY[${tagName}]::text[], NOW())
      ON CONFLICT (phone) 
      DO UPDATE SET 
        name = CASE WHEN "Contact".name = 'Cliente Nuevo' THEN EXCLUDED.name ELSE "Contact".name END,
        tags = CASE WHEN ${tagName}::text = ANY("Contact".tags) THEN "Contact".tags ELSE array_append("Contact".tags, ${tagName}::text) END
    `;

    // 3. RECUPERACIÓN AUTOMÁTICA POR WHATSAPP (El Santo Grial)
    if (evento === 'carrito_abandonado' && checkout_url) {
      try {
        const mensajeRecuperacion = `¡Hola ${nombre || ''}! 👋 Vimos que dejaste tu *${producto}* en el carrito. ¿Tuviste algún problema con el pago? \n\nPuedes terminar tu compra segura aquí: ${checkout_url}`;
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${appUrl}/api/messages/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: telefonoLimpio,
            message: mensajeRecuperacion,
            usuario_id: owner_id
          })
        });
      } catch (e) {
        console.error("Error enviando recuperación de carrito", e);
      }
    }

    return NextResponse.json({ success: true, message: "E-commerce webhook procesado" });

  } catch (error) {
    console.error("❌ Error en Webhook E-commerce:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
