-- Migrar de IDs numéricos a IDs string (cuid) para coincidir con Prisma del backend
-- Eliminar tablas antiguas y recrear con IDs string
DROP TABLE IF EXISTS tracking_eventos CASCADE;
DROP TABLE IF EXISTS mensajes CASCADE;
DROP TABLE IF EXISTS conversaciones CASCADE;
DROP TABLE IF EXISTS landings CASCADE;
DROP TABLE IF EXISTS lineas_whatsapp CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Eliminar tipos enum antiguos
DROP TYPE IF EXISTS tipo_evento CASCADE;
DROP TYPE IF EXISTS tipo_mensaje CASCADE;
DROP TYPE IF EXISTS estado_linea CASCADE;

-- Crear tipos enum
CREATE TYPE estado_linea AS ENUM ('CONECTADA', 'DESCONECTADA', 'PENDING');
CREATE TYPE tipo_mensaje AS ENUM ('texto', 'imagen', 'comprobante_detectado');
CREATE TYPE tipo_evento AS ENUM ('visita', 'clic', 'conversion');

-- Tabla usuarios con ID string
CREATE TABLE usuarios (
  id VARCHAR(30) PRIMARY KEY DEFAULT ('usr_' || substr(md5(random()::text), 1, 24)),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

-- Tabla lineas_whatsapp con ID string (coincide con Prisma)
CREATE TABLE lineas_whatsapp (
  id VARCHAR(30) PRIMARY KEY DEFAULT ('line_' || substr(md5(random()::text), 1, 24)),
  usuario_id VARCHAR(30) REFERENCES usuarios(id) ON DELETE SET NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL DEFAULT 'Línea Principal',
  status estado_linea DEFAULT 'PENDING',
  session_data JSONB,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lineas_usuario ON lineas_whatsapp(usuario_id);
CREATE INDEX idx_lineas_phone ON lineas_whatsapp(phone);
CREATE INDEX idx_lineas_status ON lineas_whatsapp(status);

-- Tabla conversaciones
CREATE TABLE conversaciones (
  id VARCHAR(30) PRIMARY KEY DEFAULT ('conv_' || substr(md5(random()::text), 1, 24)),
  line_id VARCHAR(30) NOT NULL REFERENCES lineas_whatsapp(id) ON DELETE CASCADE,
  contact_phone VARCHAR(20) NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_conversion BOOLEAN DEFAULT FALSE,
  conversion_amount DECIMAL(10, 2),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversaciones_line ON conversaciones(line_id);
CREATE INDEX idx_conversaciones_last_activity ON conversaciones(last_activity DESC);
CREATE UNIQUE INDEX idx_conversaciones_line_contact ON conversaciones(line_id, contact_phone);

-- Tabla mensajes
CREATE TABLE mensajes (
  id VARCHAR(30) PRIMARY KEY DEFAULT ('msg_' || substr(md5(random()::text), 1, 24)),
  conversation_id VARCHAR(30) NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'texto',
  content TEXT NOT NULL,
  is_incoming BOOLEAN NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mensajes_conversation ON mensajes(conversation_id);
CREATE INDEX idx_mensajes_timestamp ON mensajes(timestamp DESC);

-- Tabla landings
CREATE TABLE landings (
  id VARCHAR(30) PRIMARY KEY DEFAULT ('land_' || substr(md5(random()::text), 1, 24)),
  usuario_id VARCHAR(30) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  configuracion_json JSONB NOT NULL DEFAULT '{}',
  visitas INTEGER DEFAULT 0,
  clics_boton INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_landings_usuario ON landings(usuario_id);
CREATE INDEX idx_landings_slug ON landings(slug);

-- Tabla tracking_eventos
CREATE TABLE tracking_eventos (
  id VARCHAR(30) PRIMARY KEY DEFAULT ('evt_' || substr(md5(random()::text), 1, 24)),
  landing_id VARCHAR(30) NOT NULL REFERENCES landings(id) ON DELETE CASCADE,
  tipo_evento tipo_evento NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp_evento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracking_landing ON tracking_eventos(landing_id);
CREATE INDEX idx_tracking_tipo ON tracking_eventos(tipo_evento);
CREATE INDEX idx_tracking_timestamp ON tracking_eventos(timestamp_evento DESC);

-- Insertar usuario demo
INSERT INTO usuarios (id, nombre, email, password_hash) 
VALUES ('usr_demo_admin_001', 'Admin', 'admin@demo.com', '$2b$10$demo_hash_placeholder');
