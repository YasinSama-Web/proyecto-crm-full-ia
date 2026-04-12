import { notFound } from "next/navigation"
import { ContactDetail } from "@/components/dashboard/contact-detail"
import { sql } from "@/lib/db"
import { DEFAULT_TAGS } from "@/components/dashboard/tag-manager"
// 1. Función mejorada para traer Contacto + Conversaciones Enriquecidas
async function getContactData(id: string) {
  try {
    // A. Traemos datos básicos del contacto
    const contactRes = await sql`
      SELECT id, phone, name, created_at, last_message, tags, notes
      FROM "Contact"
      WHERE id = ${id}
    `

    if (contactRes.length === 0) return null
    const contact = contactRes[0]

    // B. Traemos conversaciones con "Esteroides" (Nombre de línea + Mensajes)
    // - JOIN con lineas_whatsapp para el nombre.
    // - Subquery JSON para los últimos 3 mensajes.
    const conversations = await sql`
      SELECT 
        c.id, 
        c."lineId" as line_id, 
        lw.nombre as line_name, -- 🔥 AQUÍ OBTENEMOS EL NOMBRE REAL
        c.last_activity, 
        c.is_conversion, 
        (SELECT COUNT(*) FROM mensajes m WHERE m.conversation_id = c.id) as message_count,
        (
            -- Subconsulta para traer los 3 mensajes más recientes como JSON
            SELECT COALESCE(json_agg(t), '[]'::json)
            FROM (
              SELECT 
                content as body, 
                type as media_type,
                (CASE WHEN is_incoming = true THEN false ELSE true END) as from_me
              FROM mensajes
              WHERE conversation_id = c.id
              ORDER BY timestamp DESC
              LIMIT 3
            ) t
        ) as recent_messages
      FROM conversaciones c
      LEFT JOIN lineas_whatsapp lw ON c."lineId" = lw.id
      WHERE c.contact_phone = ${contact.phone}
      GROUP BY c.id, lw.nombre
      ORDER BY c.last_activity DESC
    `

    return {
      ...contact,
      conversations,
    }
  } catch (error) {
    console.error("[v0] Error fetching contact:", error)
    return null
  }
}

// 2. Nueva función para traer los Pagos (Recuperando el widget perdido)
// 2. Nueva función para traer los Pagos (Recuperando el widget perdido)
async function getContactPayments(phone: string) {
    try {
        // Buscamos mensajes marcados como recibos (pagos) asociados a este teléfono
        const payments = await sql`
            SELECT 
              m.id, 
              m.amount, 
              m.timestamp as created_at, 
              m.conversation_id,
              m.content,           -- 🔥 AQUÍ AGREGAMOS EL DETALLE DEL PRODUCTO
              m.processed_by_ai    -- 🔥 AQUÍ AGREGAMOS SI FUE IA O HUMANO
            FROM mensajes m
            JOIN conversaciones c ON m.conversation_id = c.id
            WHERE c.contact_phone = ${phone} 
            AND m.is_receipt = true
            ORDER BY m.timestamp DESC
        `
        return payments
    } catch (error) {
        console.error("Error fetching payments:", error)
        return []
    }
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  // Ejecutamos la carga de datos
  const contact = await getContactData(id)

  if (!contact) {
    notFound()
  }

  // Buscamos los pagos usando el teléfono del contacto que acabamos de encontrar
  const payments = await getContactPayments(contact.phone)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Pasamos 'contact' y ahora también 'initialPayments' */}
      <ContactDetail 
        contact={contact as any} 
        initialPayments={payments as any[]} 
        availableTags={DEFAULT_TAGS}
      />
    </div>
  )
}
