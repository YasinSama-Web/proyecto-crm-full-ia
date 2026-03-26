import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Los datos que configuraremos en Make para que nos envíe
    const { 
      owner_id, 
      nombre_cliente, 
      telefono_cliente, 
      email_cliente,
      titulo_reunion, 
      fecha_hora, // Formato esperado ISO: "2026-03-15T14:30:00Z"
      link_reunion 
    } = body;

    if (!owner_id || !telefono_cliente) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    // 1. Limpiamos el teléfono
    const telefonoLimpio = telefono_cliente.replace(/\D/g, '');

    // 2. Buscamos o Creamos al Contacto en el CRM
    const contactResult = await sql`SELECT id FROM "Contact" WHERE phone = ${telefonoLimpio} AND usuario_id = ${owner_id} LIMIT 1`;
    let contactId = null;
    
    if (contactResult.length > 0) {
        contactId = contactResult[0].id;
    } else {
        const newContactId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notas = email_cliente ? `Email: ${email_cliente} | Origen: Calendly` : `Origen: Calendly`;
        
        await sql`
            INSERT INTO "Contact" (id, usuario_id, name, phone, notes, created_at)
            VALUES (${newContactId}, ${owner_id}, ${nombre_cliente || 'Nuevo Lead'}, ${telefonoLimpio}, ${notas}, NOW())
        `;
        contactId = newContactId;
    }

    // 3. ARMAMOS LA TAREA PARA TU TABLA `tasks`
    const taskId = `tsk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const descripcionTarea = `👤 Cliente: ${nombre_cliente}\n📞 Teléfono: ${telefono_cliente}\n✉️ Email: ${email_cliente || 'N/A'}\n🔗 Link: ${link_reunion || 'N/A'}\n\nAgendado automáticamente vía Calendly.`;

    await sql`
      INSERT INTO tasks (
        id, 
        title, 
        description, 
        due_date, 
        task_type, 
        assigned_to, 
        created_by, 
        owner_id, 
        is_completed
      )
      VALUES (
        ${taskId}, 
        ${titulo_reunion || `Reunión con ${nombre_cliente}`}, 
        ${descripcionTarea},
        ${fecha_hora},
        'calendly', 
        ${owner_id}, 
        ${owner_id}, 
        ${owner_id},
        false
      )
    `;

    // 4. Disparar WhatsApp Automático de Confirmación al Cliente
    try {
        const lineas = await sql`SELECT id FROM lineas_whatsapp WHERE usuario_id = ${owner_id} AND estado = 'CONECTADA' LIMIT 1`;
        if (lineas.length > 0) {
            // Formateamos la fecha para que se lea linda en el mensaje
            const fechaBonita = new Date(fecha_hora).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });
            
            let mensaje = `¡Hola ${nombre_cliente}! 👋 Confirmamos tu reunión: *${titulo_reunion}*.\n\n📅 Fecha: ${fechaBonita}`;
            if (link_reunion) mensaje += `\n🔗 Link para unirte: ${link_reunion}`;
            mensaje += `\n\n¡Te esperamos!`;

            await sendWhatsAppMessage(lineas[0].id, telefonoLimpio, mensaje);
            console.log(`[Webhook Calendly] Confirmación enviada a ${telefonoLimpio}`);
        }
    } catch (msgError) {
        console.error("Error enviando WhatsApp de Calendly:", msgError);
    }

    return NextResponse.json({ success: true, message: "Cita de Calendly guardada como Task" });

  } catch (error) {
    console.error("❌ Error en Webhook Calendly:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
