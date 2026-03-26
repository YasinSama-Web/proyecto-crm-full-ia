-- Add LOGGED_OUT state to estado_linea ENUM
-- This allows the WhatsApp backend to save the LOGGED_OUT state without crashing

-- Add the new enum value if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'estado_linea' 
        AND e.enumlabel = 'LOGGED_OUT'
    ) THEN
        ALTER TYPE estado_linea ADD VALUE 'LOGGED_OUT';
    END IF;
END $$;

-- Verify the ENUM now has all required values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'estado_linea') 
ORDER BY enumsortorder;
