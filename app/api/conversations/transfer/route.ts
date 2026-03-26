import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // Import lazy de prisma
    const { prisma } = await import('@/lib/prisma');
    
    const { conversationId, fromAgentId, toAgentId, note } = await req.json();

    const updated = await prisma.conversaciones.update({
      where: { id: conversationId },
      data: {
        assigned_to: toAgentId,
        transferred_from: fromAgentId,
        transfer_note: note,
        assigned_at: new Date(),
        status: 'OPEN',
      }
    });

    await prisma.mensajes.create({
      data: {
        conversation_id: conversationId,
        content: `🟣 Chat transferido${note ? `: ${note}` : ''}`,
        type: 'system',
        is_incoming: false,
        usuario_id: 'system',
        timestamp: new Date()
      }
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
