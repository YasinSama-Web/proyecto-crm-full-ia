import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// 🔥 USAR LA VARIABLE DE ENTORNO

export async function POST(request: Request) {
  
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { message, userEmail } = await request.json();

  try {
    const data = await resend.emails.send({
      from: 'Soporte CRM <onboarding@resend.dev>', // Usamos el dominio de prueba de Resend
      to: ['cursosluckylabmarketing@gmail.com'], // 🔥 PON AQUÍ TU EMAIL (El mismo con el que te registraste en Resend)
      subject: 'Nuevo Reporte de Bug 🐛',
      html: `
        <h2>Nuevo Ticket de Soporte</h2>
        <p><strong>Usuario:</strong> ${userEmail}</p>
        <p><strong>Mensaje:</strong></p>
        <blockquote style="background: #f9f9f9; padding: 10px; border-left: 5px solid #ccc;">
          ${message}
        </blockquote>
      `
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error });
  }
}
