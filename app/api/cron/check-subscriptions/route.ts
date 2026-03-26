import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Protección para cron-job.org
  const secret = request.headers.get('x-cron-secret');
  
  if (secret !== process.env.CRON_SECRET) {
    console.warn("Intento de acceso no autorizado al Cron");
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 🔥 AHORA SÍ ABRIMOS EL TRY
  try {
    const pastDueResult = await sql`
      UPDATE usuarios 
      SET subscription_status = 'PAST_DUE' 
      WHERE plan_expires_at < NOW() 
      AND subscription_status IN ('ACTIVE', 'TRIAL')
      RETURNING id;
    `;

    // FASE 2: De PAST_DUE a SUSPENDED
    const suspendedResult = await sql`
      UPDATE usuarios 
      SET subscription_status = 'SUSPENDED' 
      WHERE plan_expires_at < NOW() - INTERVAL '2 day' 
      AND subscription_status = 'PAST_DUE'
      RETURNING id;
    `;

    console.log(`[CRON] ${pastDueResult.length} pasaron a Gracia. ${suspendedResult.length} fueron Suspendidos.`);

    return NextResponse.json({ 
      success: true, 
      softLocked: pastDueResult.length,
      hardLocked: suspendedResult.length
    });

  } catch (error) { // El catch ahora sí tiene sentido
    console.error('[CRON ERROR]', error);
    
    // Extraemos el mensaje de error de forma segura
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
