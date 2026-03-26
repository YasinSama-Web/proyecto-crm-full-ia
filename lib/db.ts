import { Pool, neonConfig } from '@neondatabase/serverless';
import { env } from 'process';

// Configuración para entornos serverless (Vercel/Railway)
neonConfig.fetchConnectionCache = true;

// 🔥 POOL DE CONEXIONES REUTILIZABLES
const globalForDb = globalThis as unknown as { 
  pool: Pool | undefined;
  sql: any;
};

// Crear pool solo una vez (singleton)
const pool = globalForDb.pool || new Pool({ 
  connectionString: env.DATABASE_URL!,
  max: 10,                    // Máximo 10 conexiones simultáneas
  idleTimeoutMillis: 30000,   // Cerrar inactivas a los 30s
  connectionTimeoutMillis: 5000, // Timeout de conexión 5s
});

// Guardar en global para hot-reload en dev
if (env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

// 🔥 FUNCIÓN SQL CON POOL (reemplaza la anterior)
export const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
  const client = await pool.connect();
  try {
    // Construir query con parámetros numerados
    let query = '';
    for (let i = 0; i < strings.length; i++) {
      query += strings[i];
      if (i < values.length) {
        query += `$${i + 1}`;
      }
    }
    
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release(); // 🔥 SIEMPRE liberar al pool
  }
};

// 🔥 FUNCIÓN SQL SIMPLE (para queries sin parámetros)
export const sqlRaw = async (query: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

// 🔥 TRANSACCIÓN (múltiples queries atómicas)
export const transaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Interfaces (sin cambios)
export interface Usuario {
  id: string
  nombre: string
  email: string
  fecha_creacion: Date
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
