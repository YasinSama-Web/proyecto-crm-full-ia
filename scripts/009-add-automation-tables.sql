-- Script para agregar tablas de automatización

-- Tabla para reglas de bot y palabras clave
CREATE TABLE IF NOT EXISTS reglas_automaticas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    line_id TEXT NOT NULL,
    tipo TEXT NOT NULL, -- palabra clave
    mensaje TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reglas_line ON reglas_automaticas(line_id);
CREATE INDEX IF NOT EXISTS idx_reglas_activo ON reglas_automaticas(activo);

-- Tabla para respuestas rápidas (atajos con /)
CREATE TABLE IF NOT EXISTS respuestas_rapidas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    usuario_id TEXT NOT NULL,
    atajo TEXT NOT NULL, -- ej: /precio
    mensaje TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_respuestas_usuario ON respuestas_rapidas(usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_respuestas_usuario_atajo ON respuestas_rapidas(usuario_id, atajo);

-- Tabla para configuración general de bienvenida y ausencia
CREATE TABLE IF NOT EXISTS config_automatizacion (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    usuario_id TEXT NOT NULL UNIQUE,
    
    -- Bienvenida
    bienvenida_activa BOOLEAN DEFAULT FALSE,
    mensaje_bienvenida TEXT,
    
    -- Ausencia / Fuera de horario
    ausencia_activa BOOLEAN DEFAULT FALSE,
    hora_apertura TIME,
    hora_cierre TIME,
    mensaje_ausencia TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_config_usuario ON config_automatizacion(usuario_id);
