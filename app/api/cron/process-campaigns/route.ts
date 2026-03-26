import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Inicializar base de datos
const sql = neon(process.env.DATABASE_URL!);

// --- CONFIGURACIÓN DE TU SERVIDOR BAILEYS (RAILWAY) ---
const SERVER_URL = process.env.CRM_URL || process.env.WHATSAPP_SERVER_URL || process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "";
const API_SECRET = process.env.SECRET || process.env.WHATSAPP_SERVER_SECRET || process.env.WHATSAPP_SECRET || "";

// --- CONFIGURACIÓN VERCEL ---
export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

// --- FUNCIONES AUXILIARES ---
function processSpintax(text: string): string {
  if (!text) return "";
  return text.replace(/\{([^{}]+)\}/g, (_, options) => {
    const choices = options.split("|");
    return choices[Math.floor(Math.random() * choices.length)];
  });
}

function replaceVariables(template: string, vars: Record<string, string>): string {
  if (!template) return "";
  // Soporta {{name}} (estándar) y también {name} por si acaso (siempre que no sea spintax)
  let result = template;
  
  // Reemplazar {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
  
  return result;
}

// --- MANEJADOR DEL CRON ---
export async function GET(req: Request) {
  // 1. SEGURIDAD
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. BUSCAR CAMPAÑA
    const pendingCampaigns = await sql`
      SELECT * FROM campaigns 
      WHERE status = 'scheduled' 
      AND scheduled_at <= NOW()
      LIMIT 1 
    `;
    
    if (pendingCampaigns.length === 0) {
      return NextResponse.json({ message: "Nada pendiente" }, { status: 200 });
    }

    const campaign = pendingCampaigns[0];
    const campaignId = campaign.id;
    const userId = campaign.owner_id;

    console.log(`🚀 [CRON] Arrancando: ${campaign.name} (${campaignId})`);

    // 3. ACTUALIZAR ESTADO
    await sql`UPDATE campaigns SET status = 'running' WHERE id = ${campaignId}`;

    // 4. OBTENER TARGETS
    let targets = [];
    const audienceType = campaign.filters?.audience_type || 'crm';

    if (audienceType === 'csv' || campaign.filters?.targets) {
        targets = (campaign.filters.targets || []).map((t: any) => ({
            phone: t.number || t.phone,
            name: t.name || "",
            vars: t
        }));
    } else {
        // Aseguramos traer 'name' (o 'nombre' si tu tabla es diferente)
        let query = sql`SELECT phone, name FROM "Contact" WHERE usuario_id = ${userId}`;
        if (campaign.filters?.phonePrefix) {
            const prefix = `${campaign.filters.phonePrefix}%`;
            query = sql`SELECT phone, name FROM "Contact" WHERE usuario_id = ${userId} AND phone LIKE ${prefix}`;
        }
        targets = await query;
    }

    // 5. FILTRAR YA ENVIADOS
    const existingLogs = await sql`SELECT contact_phone FROM campaign_logs WHERE campaign_id = ${campaignId}`;
    const sentSet = new Set(existingLogs.map((l: any) => l.contact_phone));
    const pendingTargets = targets.filter((t: any) => !sentSet.has(t.phone));

    // 6. PREPARAR ENVÍO
    const railwayUrl = SERVER_URL.startsWith("http") ? SERVER_URL : `https://${SERVER_URL}`;
    const lineId = campaign.filters?.lineId;
    
    // --- LÓGICA DE VELOCIDAD ---
    // Leemos la config de la campaña. Si no existe, usamos valores seguros por defecto (10s - 20s)
    const speedConfig = campaign.filters?.speedConfig || { min: 10, max: 20 };
    console.log(`⏱️ Velocidad configurada: Min ${speedConfig.min}s - Max ${speedConfig.max}s`);

    let sentCount = 0;
    let failedCount = 0;

    for (const target of pendingTargets) {
        // Calcular Delay Aleatorio (en milisegundos)
        const randomDelaySec = Math.floor(Math.random() * (speedConfig.max - speedConfig.min + 1) + speedConfig.min);
        const delayMs = randomDelaySec * 1000;

        // Procesar Texto
        // Primero Spintax {Hola|Buenas}, luego Variables {{name}}
        const spintaxText = processSpintax(campaign.template);
        const finalText = replaceVariables(spintaxText, { 
            name: target.name || "", 
            phone: target.phone,
            ...target.vars 
        });

        const cleanPhone = target.phone.toString().replace(/\D/g, "");
        
        // Log para depurar si falla el nombre
        console.log(`📨 Enviando a: ${cleanPhone}. Nombre: "${target.name}". Mensaje Final: "${finalText.substring(0, 20)}..."`);

        try {
            // ESPERA (Delay) ANTES DE ENVIAR (Humanización real)
            // Esperamos ANTES del fetch para separar los envíos
            console.log(`⏳ Esperando ${randomDelaySec}s...`);
            await new Promise(r => setTimeout(r, delayMs));

            const payloadRailway = {
                lineId: lineId,
                contactPhone: cleanPhone,
                content: finalText,
                userId: userId, 
                type: "text"
            };

            const res = await fetch(`${railwayUrl}/api/send-message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-secret": API_SECRET,
                },
                body: JSON.stringify(payloadRailway),
            });

            const status = res.ok ? 'sent' : 'failed';
            
            if (!res.ok) {
                const errTxt = await res.text();
                console.error(`❌ Railway Error:`, errTxt);
            }

            if (res.ok) sentCount++; else failedCount++;

            await sql`
                INSERT INTO campaign_logs (campaign_id, contact_phone, status, owner_id)
                VALUES (${campaignId}, ${target.phone}, ${status}, ${userId})
            `;

        } catch (e) {
            console.error(`❌ Error fatal enviando a ${target.phone}`, e);
            failedCount++;
            await sql`
                INSERT INTO campaign_logs (campaign_id, contact_phone, status, owner_id)
                VALUES (${campaignId}, ${target.phone}, 'failed', ${userId})
            `;
        }
    }

    // FINALIZAR
    await sql`
        UPDATE campaigns 
        SET status = 'completed', 
            sent_count = sent_count + ${sentCount}, 
            failed_count = failed_count + ${failedCount}
        WHERE id = ${campaignId}
    `;

    return NextResponse.json({ 
        success: true, 
        sent: sentCount, 
        failed: failedCount 
    });

  } catch (error) {
    console.error("🔥 [CRON ERROR]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
