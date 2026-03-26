-- Add media support columns to mensajes table
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS usuario_id VARCHAR(255);

-- Create index for media queries
CREATE INDEX IF NOT EXISTS idx_mensajes_media_url ON mensajes(media_url) WHERE media_url IS NOT NULL;
