-- CRM WhatsApp Database Schema
-- Create ENUM types first
CREATE TYPE estado_linea AS ENUM ('CONECTADA', 'DESCONECTADA', 'PENDIENTE');
CREATE TYPE tipo_mensaje AS ENUM ('texto', 'imagen', 'comprobante_detectado');
CREATE TYPE tipo_evento AS ENUM ('visita', 'clic', 'conversion');

-- Usuarios table
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

-- LineasWhatsApp table (WhatsApp lines connected via QR)
CREATE TABLE lineas_whatsapp (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL DEFAULT 'Línea Principal',
    telefono VARCHAR(20),
    estado estado_linea DEFAULT 'PENDIENTE',
    data_sesion TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultima_conexion TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_lineas_usuario ON lineas_whatsapp(usuario_id);
CREATE INDEX idx_lineas_estado ON lineas_whatsapp(estado);

-- Conversaciones table (Represents a unique chat with a contact)
CREATE TABLE conversaciones (
    id SERIAL PRIMARY KEY,
    linea_id INTEGER NOT NULL REFERENCES lineas_whatsapp(id) ON DELETE CASCADE,
    contacto_telefono VARCHAR(20) NOT NULL,
    contacto_nombre VARCHAR(255),
    agente_asignado_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ultima_actividad TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    es_conversion BOOLEAN DEFAULT FALSE,
    monto_conversion DECIMAL(10, 2),
    estado VARCHAR(50) DEFAULT 'activa',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversaciones_linea ON conversaciones(linea_id);
CREATE INDEX idx_conversaciones_ultima_actividad ON conversaciones(ultima_actividad DESC);
CREATE INDEX idx_conversaciones_contacto ON conversaciones(contacto_telefono);
CREATE UNIQUE INDEX idx_conversaciones_linea_contacto ON conversaciones(linea_id, contacto_telefono);

-- Mensajes table (Message history for each conversation)
CREATE TABLE mensajes (
    id SERIAL PRIMARY KEY,
    conversacion_id INTEGER NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
    tipo tipo_mensaje DEFAULT 'texto',
    contenido TEXT NOT NULL,
    es_entrante BOOLEAN NOT NULL,
    timestamp_mensaje TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_mensajes_conversacion ON mensajes(conversacion_id);
CREATE INDEX idx_mensajes_timestamp ON mensajes(timestamp_mensaje DESC);

-- Landings table (Dynamic landing pages)
CREATE TABLE landings (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
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

-- TrackingEventos table (Track visits and clicks with high precision)
CREATE TABLE tracking_eventos (
    id SERIAL PRIMARY KEY,
    landing_id INTEGER NOT NULL REFERENCES landings(id) ON DELETE CASCADE,
    tipo_evento tipo_evento NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    conversacion_id INTEGER REFERENCES conversaciones(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    timestamp_evento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracking_landing ON tracking_eventos(landing_id);
CREATE INDEX idx_tracking_tipo ON tracking_eventos(tipo_evento);
CREATE INDEX idx_tracking_timestamp ON tracking_eventos(timestamp_evento DESC);

-- Insert a demo user for testing
INSERT INTO usuarios (nombre, email, password_hash) 
VALUES ('Admin', 'admin@demo.com', '$2b$10$demo_hash_placeholder');
