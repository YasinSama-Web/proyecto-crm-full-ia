-- Add qr_code column to lineas_whatsapp for storing QR codes
ALTER TABLE lineas_whatsapp ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Rename Spanish column names to English in mensajes table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mensajes' AND column_name = 'contenido') THEN
    ALTER TABLE mensajes RENAME COLUMN contenido TO content;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mensajes' AND column_name = 'es_entrante') THEN
    ALTER TABLE mensajes RENAME COLUMN es_entrante TO is_incoming;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mensajes' AND column_name = 'timestamp_mensaje') THEN
    ALTER TABLE mensajes RENAME COLUMN timestamp_mensaje TO message_timestamp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mensajes' AND column_name = 'leido') THEN
    ALTER TABLE mensajes RENAME COLUMN leido TO read;
  END IF;
END $$;
