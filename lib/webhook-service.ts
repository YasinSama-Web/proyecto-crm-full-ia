import { neon } from "@neondatabase/serverless";

// Conexión a tu base de datos Neon
const sql = neon(process.env.DATABASE_URL!);

// 🔥 EL CEREBRO DEL ENRUTADOR: ¿Qué apps escuchan qué eventos?
const EVENT_APP_MAP: Record<string, string[]> = {
  // Cuando se aprueba un pago, le avisamos a todas las apps de contabilidad, ventas y marketing
  'pago_aprobado': [
    'gsheets', 'gdrive', 'dropbox', 'facturante', 
    'hubspot', 'pipedrive', 'zoho', 'salesforce',
    'mailchimp', 'brevo', 'slack',
    'make', 'zapier', 'webhooks' // Los puentes universales siempre escuchan todo
  ],
  
  // Cuando se crea una tarea, le avisamos a calendarios y mensajería
  'tarea_creada': [
    'gcalendar', 'slack', 
    'make', 'zapier', 'webhooks'
  ]
};

export async function emitirWebhook(ownerId: string, evento: string, payload: any) {
  try {
    // 1. Buscamos en el diccionario qué aplicaciones deberían enterarse de este evento
    const appsInteresadas = EVENT_APP_MAP[evento] || ['make', 'zapier', 'webhooks'];

    // 2. Buscamos en tu tabla 'webhooks' las URLs que el cliente tiene configuradas y activas
    const webhooksActivos = await sql`
      SELECT url, event_type 
      FROM webhooks 
      WHERE owner_id = ${ownerId} 
        AND is_active = true 
        AND event_type = ANY(${appsInteresadas})
    `;

    if (webhooksActivos.length === 0) {
      console.log(`[Webhooks] No hay integraciones conectadas para el evento: ${evento}`);
      return { success: true, disparados: 0 };
    }

    // 3. Empaquetamos los datos con un formato limpio y estándar
    const paqueteDeDatos = {
      event: evento,
      timestamp: new Date().toISOString(),
      data: payload
    };

    // 4. 🚀 DISPARO MÚLTIPLE EN PARALELO
    // Enviamos la información a todas las URLs al mismo tiempo sin que una frene a la otra
    const promesas = webhooksActivos.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paqueteDeDatos)
        });
        
        if (!response.ok) {
          console.error(`❌ Error enviando a ${webhook.event_type} (${webhook.url}): Estado ${response.status}`);
        } else {
          console.log(`✅ Webhook disparado con éxito a la app: ${webhook.event_type}`);
        }
      } catch (err) {
        console.error(`❌ Fallo de red al intentar conectar con la app ${webhook.event_type}:`, err);
      }
    });

    // Esperamos a que todos los disparos terminen (ya sea con éxito o error)
    await Promise.allSettled(promesas);

    return { success: true, disparados: webhooksActivos.length };

  } catch (error) {
    console.error("Error crítico en el servicio principal de webhooks:", error);
    return { success: false, error: "Error interno al emitir los webhooks" };
  }
}
