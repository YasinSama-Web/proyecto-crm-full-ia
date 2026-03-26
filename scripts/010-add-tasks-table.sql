-- Crear tabla de tareas
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  task_type VARCHAR(50) NOT NULL, -- 'LLAMADA', 'REUNION', 'WHATSAPP'
  assigned_to VARCHAR(255) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  owner_id VARCHAR(255) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, -- Para multi-tenancy
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
