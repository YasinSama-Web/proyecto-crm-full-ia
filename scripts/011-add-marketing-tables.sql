-- Smart Links table
CREATE TABLE IF NOT EXISTS smart_links (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_links_usuario_id ON smart_links(usuario_id);
CREATE INDEX IF NOT EXISTS idx_smart_links_slug ON smart_links(slug);

-- Marketing Events table
CREATE TABLE IF NOT EXISTS marketing_events (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  source VARCHAR(50) DEFAULT 'meta',
  status VARCHAR(50) DEFAULT 'pending',
  value DECIMAL(10, 2),
  reported_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_usuario_id ON marketing_events(usuario_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_event_id ON marketing_events(event_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_status ON marketing_events(status);

-- Pixel Settings table
CREATE TABLE IF NOT EXISTS pixel_settings (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(255) NOT NULL UNIQUE,
  meta_pixel_id VARCHAR(255),
  meta_access_token TEXT,
  tiktok_pixel_id VARCHAR(255),
  tiktok_access_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pixel_settings_usuario_id ON pixel_settings(usuario_id);
