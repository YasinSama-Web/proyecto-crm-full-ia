-- Add usuario_id column to tables for multi-tenancy
-- This ensures each user only sees their own data

-- Add usuario_id to Contact table
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS usuario_id VARCHAR(255);

-- Add usuario_id to conversaciones table
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS usuario_id VARCHAR(255);

-- Add usuario_id to lineas_whatsapp table
ALTER TABLE lineas_whatsapp ADD COLUMN IF NOT EXISTS usuario_id VARCHAR(255);

-- Add usuario_id to landings table
ALTER TABLE landings ADD COLUMN IF NOT EXISTS usuario_id VARCHAR(255);

-- Update existing records to use demo admin user
UPDATE "Contact" SET usuario_id = 'usr_demo_admin_001' WHERE usuario_id IS NULL;
UPDATE conversaciones SET usuario_id = 'usr_demo_admin_001' WHERE usuario_id IS NULL;
UPDATE lineas_whatsapp SET usuario_id = 'usr_demo_admin_001' WHERE usuario_id IS NULL;
UPDATE landings SET usuario_id = 'usr_demo_admin_001' WHERE usuario_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_usuario_id ON "Contact"(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_usuario_id ON conversaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lineas_whatsapp_usuario_id ON lineas_whatsapp(usuario_id);
CREATE INDEX IF NOT EXISTS idx_landings_usuario_id ON landings(usuario_id);
