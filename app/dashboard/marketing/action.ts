"use server"

import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"
import { createHash } from 'crypto'

const sql = neon(process.env.DATABASE_URL!)

// ==========================================
// 🔒 UTILS: HASHING PARA META (PII)
// ==========================================
function hashData(data: string | undefined | null): string | undefined {
  if (!data) return undefined;
  return createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

function generateRandomSlug() {
  return Math.random().toString(36).substring(2, 8);
}

// ==========================================
// 🔗 1. SMART LINKS
// ==========================================
export interface SmartLink {
  id: string
  slug: string
  name: string
  destination_url: string
  clicks: number
  is_active: boolean
  created_at: string
}

export interface FblLog {
  id: string;
  session_id: string;
  fbc: string | null;
  fbp: string | null;
  ip: string | null;
  user_agent: string | null;
  source: string | null;
  used: boolean;
  created_at: string;
}

export async function getFblLogs() {
  const user = await requireAuth();
  try {
      // Traemos las últimas 100 sesiones para no saturar la vista
      const logs = await sql`
        SELECT * FROM fbl_logs 
        WHERE owner_id = ${user.rootOwnerId} 
        ORDER BY created_at DESC 
        LIMIT 100
      `;
      return logs as unknown as FblLog[];
  } catch (e) { 
      return []; 
  }
}

export async function getSmartLinks() {
  const user = await requireAuth()
  const links = await sql`
    SELECT * FROM marketing_links 
    WHERE owner_id = ${user.rootOwnerId} 
    ORDER BY created_at DESC
  `
  return links as unknown as SmartLink[]
}

export async function createSmartLink(nombre: string, slug: string, url_destino: string) {
  try {
    const user = await requireAuth()
    if (!nombre || !url_destino) return { success: false, error: "Faltan datos" }

    let finalSlug = slug
    if (!finalSlug || finalSlug.trim() === "") {
        const cleanName = nombre.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5);
        finalSlug = `${cleanName}-${generateRandomSlug()}`;
    }

    await sql`
      INSERT INTO marketing_links (
        id, owner_id, name, slug, destination_url, clicks, is_active, created_at
      ) VALUES (
        ${`lnk_${Date.now()}_${generateRandomSlug()}`}, ${user.rootOwnerId}, ${nombre}, 
        ${finalSlug}, ${url_destino}, 0, true, NOW()
      )
    `
    revalidatePath("/dashboard/marketing")
    return { success: true }
  } catch (error: any) {
    if (error.code === '23505') return { success: false, error: "El slug ya existe." }
    return { success: false, error: `Error DB: ${error.message}` }
  }
}

export async function deleteSmartLink(id: string) {
  try {
    const user = await requireAuth()
    await sql`DELETE FROM marketing_links WHERE id = ${id} AND owner_id = ${user.rootOwnerId}`
    revalidatePath("/dashboard/marketing")
    return { success: true }
  } catch (e) { return { success: false } }
}

export async function trackSmartLinkClick(linkId: string) {
  if (!linkId) return
  try {
    await sql`UPDATE marketing_links SET clicks = clicks + 1 WHERE id = ${linkId}`
    return { success: true }
  } catch (error) { return { success: false } }
}

// ==========================================
// ⚙️ 2. CONFIGURACIÓN DE PIXELES
// ==========================================
export async function getPixelSettings() {
  const user = await requireAuth()
  try {
      const result = await sql`SELECT marketing_settings_json FROM usuarios WHERE id = ${user.rootOwnerId}`
      const settings = result[0]?.marketing_settings_json || {}
      return {
        meta_pixel_id: settings.meta_pixel_id || "",
        meta_access_token: settings.meta_access_token || "",
        tiktok_pixel_id: settings.tiktok_pixel_id || "",
        tiktok_access_token: settings.tiktok_access_token || ""
      }
  } catch (e) {
      return { meta_pixel_id: "", meta_access_token: "", tiktok_pixel_id: "", tiktok_access_token: "" }
  }
}

export async function savePixelSettings(data: any) {
  try {
    const user = await requireAuth()
    const result = await sql`SELECT marketing_settings_json FROM usuarios WHERE id = ${user.rootOwnerId}`
    const currentSettings = result[0]?.marketing_settings_json || {}
    
    await sql`
        UPDATE usuarios 
        SET marketing_settings_json = ${JSON.stringify({ ...currentSettings, ...data })} 
        WHERE id = ${user.rootOwnerId}
    `
    revalidatePath("/dashboard/marketing")
    return { success: true }
  } catch (e) { return { success: false } }
}

// ==========================================
// 🎯 3. EVENTOS CAPI & LEAD TRACKING (LA COLA DE ESPERA)
// ==========================================
export async function getMarketingEvents() {
  const user = await requireAuth()
  try {
      const events = await sql`
        SELECT * FROM marketing_events 
        WHERE owner_id = ${user.rootOwnerId} 
        ORDER BY created_at DESC 
        LIMIT 50
      `
      return events
  } catch (e) { return [] }
}

// CREAR EVENTO CON DELAY (Se dispara al cobrar en el chat)
export async function createPendingCAPIEvent(data: {
  eventName?: string;
  value?: number;
  contentIds?: string[];
  fbc?: string;
  marketingLinkId?: string; // 🔥 NUEVO: Para saber de qué link vino
  userData: {
    phone: string;
    name?: string;
    email?: string;
    city?: string;
  };
  metadata?: any;
}) {
  const user = await requireAuth();
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const delayMinutes = 5; // ⏳ El famoso Countdown
  
  // Calculamos la hora exacta en la que se debe liberar el evento
  const processingUntil = new Date(Date.now() + delayMinutes * 60 * 1000);
  
  await sql`
    INSERT INTO marketing_events (
      id, event_id, event_name, source, status, processing_until,
      conversion_value, currency, contact_phone, contact_name, contact_email, 
      contact_city, fbc, content_ids, metadata, owner_id, marketing_link_id
    ) VALUES (
      ${eventId}, ${eventId}, ${data.eventName || 'Purchase'}, 'whatsapp_bot', 'processing',
      ${processingUntil.toISOString()}, ${data.value || 0}, 'ARS',
      ${data.userData.phone}, ${data.userData.name || null}, ${data.userData.email || null},
      ${data.userData.city || null}, ${data.fbc || null}, ${data.contentIds || []},
      ${data.metadata ? JSON.stringify(data.metadata) : null}, ${user.rootOwnerId}, ${data.marketingLinkId || null}
    )
  `;
  
  revalidatePath("/dashboard/marketing");
  return { success: true, eventId, processingUntil };
}

// BOTÓN ROJO DE PÁNICO (Cancelar)
export async function cancelCAPIEvent(eventId: string) {
  const user = await requireAuth();
  await sql`
    UPDATE marketing_events 
    SET status = 'cancelled'
    WHERE id = ${eventId} AND owner_id = ${user.rootOwnerId} AND status = 'processing'
  `;
  revalidatePath("/dashboard/marketing");
  return { success: true };
}

// EL MOTOR QUE ENVÍA A META (Debe llamarse por un CRON o al cargar la vista)
export async function processPendingEvents() {
  const user = await requireAuth();
  
  // Buscamos los que están en 'processing' y su tiempo ya expiró
  const pending = await sql`
    SELECT * FROM marketing_events 
    WHERE owner_id = ${user.rootOwnerId} 
    AND status = 'processing' 
    AND processing_until <= NOW()
  `;
  
  const results = [];
  for (const event of pending) {
    const result = await sendMetaCAPIEvent({
      eventId: event.id,
      eventName: event.event_name,
      value: Number(event.conversion_value),
      currency: event.currency,
      contentIds: event.content_ids || [],
      fbc: event.fbc,
      userData: {
        phone: event.contact_phone,
        name: event.contact_name,
        email: event.contact_email,
        city: event.contact_city,
        country: event.contact_country,
      }
    });
    results.push({ eventId: event.id, result });
  }
  
  if (results.length > 0) revalidatePath("/dashboard/marketing");
  return results;
}

// LA CONEXIÓN DIRECTA CON FACEBOOK
export async function sendMetaCAPIEvent(eventData: any) {
  try {
    const user = await requireAuth();
    const result = await sql`SELECT marketing_settings_json FROM usuarios WHERE id = ${user.rootOwnerId}`;
    const settings = result[0]?.marketing_settings_json || {};
    const pixelId = settings.meta_pixel_id;
    const accessToken = settings.meta_access_token;

    if (!pixelId || !accessToken) throw new Error("Pixel o Token no configurados");

    // Hashear PII para Meta
    const userData = {
      ph: hashData(eventData.userData.phone),
      em: hashData(eventData.userData.email),
      fn: hashData(eventData.userData.name?.split(' ')[0]),
      ln: hashData(eventData.userData.name?.split(' ').slice(1).join(' ')),
      ct: hashData(eventData.userData.city),
      country: hashData(eventData.userData.country || 'ar'),
      fbc: eventData.fbc, 
      fbp: eventData.fbp, 
    };

    // Limpiar nulos
    Object.keys(userData).forEach(key => { if (userData[key as keyof typeof userData] === undefined) delete userData[key as keyof typeof userData] });

    const payload = {
      data: [{
        event_name: eventData.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventData.eventId,
        action_source: "chat", 
        user_data: userData,
        custom_data: {
          value: eventData.value,
          currency: eventData.currency,
          content_ids: eventData.contentIds,
          content_type: "product",
        }
      }]
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );

    const responseData = await response.json();
    if (!response.ok) throw new Error(responseData.error?.message || "Error Meta API");

    await sql`
      UPDATE marketing_events 
      SET status = 'sent', sent_at = NOW(), error_message = NULL
      WHERE id = ${eventData.eventId} AND owner_id = ${user.rootOwnerId}
    `;

    return { success: true, fbResponse: responseData };

  } catch (error: any) {
    await sql`
      UPDATE marketing_events 
      SET status = 'failed', error_message = ${error.message}
      WHERE id = ${eventData.eventId}
    `;
    return { success: false, error: error.message };
  }
}

// =========================================================
// PUENTE MANUAL: Conecta el formulario UI con el motor CAPI
// =========================================================
export async function reportConversionCAPI(data: {
  eventId: string;
  type: 'LEAD' | 'PURCHASE';
  value?: number;
  currency?: string;
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
}) {
  try {
    const user = await requireAuth();
    
    // Llamamos directamente a tu motor (sendMetaCAPIEvent)
    const result = await sendMetaCAPIEvent({
      // Si pegan solo el fbclid, le inventamos un eventId para la base de datos
      eventId: data.eventId.includes('fbclid') ? data.eventId : `manual_${Date.now()}`,
      eventName: data.type === 'PURCHASE' ? 'Purchase' : 'Lead',
      value: data.value || (data.type === 'PURCHASE' ? 100 : 0),
      currency: data.currency || 'ARS',
      contentIds: ['manual_entry'],
      fbc: data.eventId, // Aquí viaja el fbclid que pegaste en la UI
      userData: {
        phone: data.phone,
        name: data.name,
        email: data.email,
        city: data.city,
        country: data.country,
      }
    });

    if (!result.success) throw new Error(result.error);

    revalidatePath("/dashboard/marketing");
    return { success: true };
  } catch (e: any) { 
    console.error("Error en reporte manual:", e);
    return { success: false, error: e.message || "Error de conexión" };
  }
}

// FORZAR EL ENVÍO INMEDIATO (Botón "Enviar Ahora")
export async function forceSendCAPIEvent(eventId: string) {
  const user = await requireAuth();
  
  // 1. Buscamos el evento específico que esté en 'processing'
  const event = await sql`
    SELECT * FROM marketing_events 
    WHERE id = ${eventId} AND owner_id = ${user.rootOwnerId} AND status = 'processing'
  `;
  
  if (event.length === 0) return { success: false, error: "Evento no encontrado o ya procesado" };

  // 2. Lo enviamos usando la función que ya tenemos
  const result = await sendMetaCAPIEvent({
    eventId: event[0].id,
    eventName: event[0].event_name,
    value: Number(event[0].conversion_value),
    currency: event[0].currency,
    contentIds: event[0].content_ids || [],
    fbc: event[0].fbc,
    userData: {
      phone: event[0].contact_phone,
      name: event[0].contact_name,
      email: event[0].contact_email,
      city: event[0].contact_city,
      country: event[0].contact_country,
    }
  });

  revalidatePath("/dashboard/marketing");
  return result;
}