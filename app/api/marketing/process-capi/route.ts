import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

// ==========================================
// 🔒 UTILS: HASHING PARA META (PII)
// ==========================================
function hashData(data: string | undefined | null, isPhone = false): string | undefined {
  if (!data) return undefined;
  let clean = data.trim().toLowerCase();
  if (isPhone) {
    clean = clean.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = clean.substring(1);
  }
  return createHash("sha256").update(clean).digest("hex");
}

// ==========================================
// 🕐 CRON: Procesar eventos CAPI pending
// ==========================================
export async function GET(req: NextRequest) {
  // 1. Seguridad por Bearer token
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET_CAPI}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Buscar eventos cuyo delay de 5min expiró (máx 50 por batch)
    const pending = await sql`
      SELECT 
        id, event_id, event_name, owner_id, conversion_value, currency,
        contact_phone, contact_name, contact_email, contact_city, contact_country,
        fbc, fbp, content_ids, content_type, num_items, created_at
      FROM marketing_events 
      WHERE status = 'processing' 
      AND processing_until <= NOW()
      ORDER BY created_at ASC
      LIMIT 50
    `;

    if (pending.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        message: "No hay eventos pendientes",
      });
    }

    // 3. Cachear settings de Meta por owner (evita N+1 queries)
    const ownerIds = [...new Set(pending.map((e: any) => e.owner_id))];
    const settingsMap = new Map();

    for (const ownerId of ownerIds) {
      const res = await sql`
        SELECT marketing_settings_json FROM usuarios WHERE id = ${ownerId}
      `;
      settingsMap.set(ownerId, res[0]?.marketing_settings_json || {});
    }

    let processed = 0;
    let failed = 0;
    const results: any[] = [];

    // 4. Procesar evento por evento
    for (const event of pending) {
      const settings = settingsMap.get(event.owner_id);
      const pixelId = settings?.meta_pixel_id;
      const accessToken = settings?.meta_access_token;

      if (!pixelId || !accessToken) {
        await sql`
          UPDATE marketing_events 
          SET status = 'failed', error_message = ${"Pixel o Access Token no configurados"}
          WHERE id = ${event.id}
        `;
        failed++;
        results.push({ eventId: event.id, status: "failed", reason: "no_pixel_config" });
        continue;
      }

      try {
        // Preparar user_data con PII hasheado
        const userData: Record<string, any> = {
          ph: hashData(event.contact_phone, true),
          em: hashData(event.contact_email),
          fn: hashData(event.contact_name?.split(" ")[0]),
          ln: hashData(event.contact_name?.split(" ").slice(1).join(" ")),
          ct: hashData(event.contact_city),
          country: hashData(event.contact_country || "ar"),
        };

        // fbc/fbp van en claro (no hasheados)
        if (event.fbc) userData.fbc = event.fbc;
        if (event.fbp) userData.fbp = event.fbp;

        // Limpiar campos undefined/null
        Object.keys(userData).forEach((key) => {
          if (userData[key] === undefined || userData[key] === null) {
            delete userData[key];
          }
        });

        const payload = {
          data: [
            {
              event_name: event.event_name,
              event_time: Math.floor(new Date(event.created_at).getTime() / 1000), // ⏰ Momento real de la venta
              event_id: event.event_id,
              action_source: "chat",
              user_data: userData,
              custom_data: {
                value: Number(event.conversion_value),
                currency: event.currency || "ARS",
                content_ids: event.content_ids || [],
                content_type: event.content_type || "product",
                num_items: event.num_items || 1,
              },
            },
          ],
        };

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error?.message || "Error Meta API");
        }

        await sql`
          UPDATE marketing_events 
          SET status = 'sent', sent_at = NOW(), error_message = NULL
          WHERE id = ${event.id}
        `;

        processed++;
        results.push({ eventId: event.id, status: "sent" });

      } catch (error: any) {
        await sql`
          UPDATE marketing_events 
          SET status = 'failed', error_message = ${error.message?.substring(0, 500) || "Unknown error"}
          WHERE id = ${event.id}
        `;
        failed++;
        results.push({ eventId: event.id, status: "failed", error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: pending.length,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error: any) {
    console.error("[CRON-CAPI] Error global:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}