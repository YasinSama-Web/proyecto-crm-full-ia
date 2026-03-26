-- Add team management columns to usuarios table
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'OWNER';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"all": true}'::jsonb;

-- Create enum type for roles if needed
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('OWNER', 'AGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update role column to use enum (if not already)
-- ALTER TABLE usuarios ALTER COLUMN role TYPE user_role USING role::user_role;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_usuarios_owner_id ON usuarios(owner_id);

-- Add foreign key constraint (optional)
-- ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_owner
--   FOREIGN KEY (owner_id) REFERENCES usuarios(id) ON DELETE CASCADE;
