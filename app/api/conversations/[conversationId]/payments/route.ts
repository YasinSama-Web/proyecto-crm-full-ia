import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ conversationId: string }> | { conversationId: string } }) {
  try {
    const user = await requireAuth(req as any)
    
    const resolvedParams = await params;
    const conversationId = resolvedParams.conversationId;
    
    const { searchParams } = new URL(req.url)
    let phone = searchParams.get('phone')

    if (!phone) {
        const conv = await sql`
            SELECT contact_phone 
            FROM conversaciones 
            WHERE id = ${conversationId}
            AND usuario_id = ${user.rootOwnerId}
        `
        if (conv.length > 0) phone = conv[0].contact_phone
    }

    if (!phone) return NextResponse.json([])

    // 🔥 EL CAMBIO CLAVE: Agregamos m.content y m.processed_by_ai
    const payments = await sql`
        SELECT m.id, m.amount, m.timestamp as created_at, m.content, m.processed_by_ai
        FROM mensajes m
        JOIN conversaciones c ON m.conversation_id = c.id
        WHERE c.contact_phone = ${phone}
        AND m.usuario_id = ${user.rootOwnerId}
        AND m.is_receipt = true
        ORDER BY m.timestamp DESC
    `

    const formatted = payments.map((p) => {
        const fecha = p.created_at ? new Date(p.created_at) : new Date()
        return {
            id: p.id,
            amount: Number(p.amount),
            created_at: fecha.toISOString(), 
            date: fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
            fullDate: fecha.toLocaleString(),
            status: 'approved',
            content: p.content || '',
            processed_by_ai: p.processed_by_ai // 🔥 Pasamos la verdad absoluta al frontend
        }
    })

    return NextResponse.json(formatted)

  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
