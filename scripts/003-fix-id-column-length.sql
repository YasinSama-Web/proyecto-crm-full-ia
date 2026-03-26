-- Fix VARCHAR length for ID columns to support UUIDs (36 characters)
-- UUIDs are 36 characters but the column was only 30

ALTER TABLE usuarios ALTER COLUMN id TYPE VARCHAR(36);
ALTER TABLE lineas_whatsapp ALTER COLUMN id TYPE VARCHAR(36);
ALTER TABLE conversaciones ALTER COLUMN id TYPE VARCHAR(36);
ALTER TABLE mensajes ALTER COLUMN id TYPE VARCHAR(36);
ALTER TABLE landings ALTER COLUMN id TYPE VARCHAR(36);
ALTER TABLE tracking_eventos ALTER COLUMN id TYPE VARCHAR(36);

-- Also update foreign key columns
ALTER TABLE lineas_whatsapp ALTER COLUMN usuario_id TYPE VARCHAR(36);
ALTER TABLE conversaciones ALTER COLUMN linea_id TYPE VARCHAR(36);
ALTER TABLE conversaciones ALTER COLUMN agente_asignado_id TYPE VARCHAR(36);
ALTER TABLE mensajes ALTER COLUMN conversacion_id TYPE VARCHAR(36);
ALTER TABLE landings ALTER COLUMN usuario_id TYPE VARCHAR(36);
ALTER TABLE tracking_eventos ALTER COLUMN landing_id TYPE VARCHAR(36);
ALTER TABLE tracking_eventos ALTER COLUMN conversacion_id TYPE VARCHAR(36);
