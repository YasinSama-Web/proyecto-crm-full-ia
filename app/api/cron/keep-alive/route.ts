import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Importante para que no se cachee

export async function GET() {
  // 1. Obtenemos la URL de Railway desde tus variables de entorno
  const backendUrl = process.env.WHATSAPP_SERVER_URL;
  
  if (!backendUrl) {
    return NextResponse.json({ error: 'WhatsApp URL not configured' }, { status: 500 });
  }

  try {
    // 2. Le pegamos una "patada" suave al servidor de WhatsApp
    // Usamos la ruta base / o /health si existe
    const response = await fetch(`${backendUrl}/`, { 
      method: 'GET',
      cache: 'no-store'
    });

    console.log(`💓 Ping a Railway (${backendUrl}): ${response.status}`);
    
    return NextResponse.json({ 
      status: 'Alive', 
      railway_status: response.status,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("💀 Error despertando a Railway:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
