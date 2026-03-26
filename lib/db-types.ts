// Shared type definitions - safe to import from client components.
// These were extracted from lib/db.ts so that "use client" modules
// never need to touch the file that creates the Neon Pool.

export interface Usuario {
  id: string
  nombre: string
  email: string
  fecha_creacion: Date
  plan?: string
  subscription_status?: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED"
  plan_expires_at?: Date | null
  mp_subscription_id?: string | null
}

export interface LineaWhatsApp {
  id: string
  usuario_id: string | null
  phone: string
  nombre: string
  status: "CONECTADA" | "DESCONECTADA" | "PENDING" | "ERROR" | "QR_EXPIRED" | "RETRY_REQUIRED" | "RETRYING" | "LOGGED_OUT"
  session_data: Record<string, any> | null
  qr_code: string | null
  fecha_creacion: Date
}

export interface Conversacion {
  id: string
  line_id: string
  contact_phone: string
  contact_name?: string | null
  last_activity: Date
  is_conversion: boolean
  conversion_amount: number | null
  fecha_creacion: Date
}

export interface Mensaje {
  id: string
  conversation_id: string
  media_url?: string | null
  type: string
  content: string
  is_incoming: boolean
  timestamp: Date
}

export interface Landing {
  id: string
  usuario_id: string
  slug: string
  nombre: string
  configuracion_json: {
    titulo?: string
    subtitulo?: string
    descripcion?: string
    color_primario?: string
    color_fondo?: string
    imagen_hero?: string
    whatsapp_numero?: string
    whatsapp_mensaje?: string
    meta_pixel_id?: string
    boton_texto?: string
  }
  visitas: number
  clics_boton: number
  activa: boolean
  fecha_creacion: Date
  fecha_actualizacion: Date
}

export interface TrackingEvento {
  id: string
  landing_id: string
  tipo_evento: "visita" | "clic" | "conversion"
  ip_address: string | null
  user_agent: string | null
  referrer: string | null
  metadata: Record<string, unknown>
  timestamp_evento: Date
}

export interface Contact {
  id: string
  phone: string
  name: string | null
  created_at: Date
  last_message: Date | null
  tags: string[] | null
  notes: string | null
}

export interface LandingConfig {
  titulo?: string
  subtitulo?: string
  descripcion?: string
  color_primario?: string
  color_fondo?: string
  imagen_hero?: string
  whatsapp_numero?: string
  whatsapp_mensaje?: string
  meta_pixel_id?: string
  boton_texto?: string
}
