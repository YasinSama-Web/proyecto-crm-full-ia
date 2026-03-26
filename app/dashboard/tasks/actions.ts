"use server"

import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth-middleware"
import { revalidatePath } from "next/cache"
import { emitirWebhook } from "@/lib/webhook-service" 

const sql = neon(process.env.DATABASE_URL!)

export interface Task {
  id: string
  title: string
  description: string | null
  due_date: string
  task_type: "LLAMADA" | "REUNION" | "WHATSAPP"
  assigned_to: string
  assigned_to_name?: string
  created_by: string
  owner_id: string
  is_completed: boolean
  completed_at: string | null
  result?: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  nombre: string
  email: string
}

// --- OBTENER TAREAS (Con filtros y corrección de NULLs) ---
export async function getTasks(filter: 'pending' | 'completed' = 'pending'): Promise<Task[]> {
  try {
    const user = await requireAuth()
    
    // Si es ADMIN u OWNER ve todo, si no, solo lo suyo
    const isBoss = user.role === 'OWNER' || user.role === 'ADMIN' || (user.permissions && user.permissions.tier === 'ADMIN')

    // Construimos la query base
    let tasks: any[] = []

    // LÓGICA: (is_completed IS FALSE OR is_completed IS NULL) para asegurar que traiga las nuevas
    const pendingCondition = sql`AND (t.is_completed = false OR t.is_completed IS NULL)`
    const completedCondition = sql`AND t.is_completed = true`

    if (isBoss) {
        // --- JEFE: VE TODO ---
        if (filter === 'pending') {
            tasks = await sql`
              SELECT t.*, u.nombre as assigned_to_name
              FROM tasks t
              LEFT JOIN usuarios u ON t.assigned_to = u.id
              WHERE t.owner_id = ${user.rootOwnerId}
              ${pendingCondition}
              ORDER BY t.due_date ASC
            `
        } else {
            tasks = await sql`
              SELECT t.*, u.nombre as assigned_to_name
              FROM tasks t
              LEFT JOIN usuarios u ON t.assigned_to = u.id
              WHERE t.owner_id = ${user.rootOwnerId}
              ${completedCondition}
              ORDER BY t.completed_at DESC
              LIMIT 50
            `
        }
    } else {
        // --- AGENTE: VE SOLO LO SUYO ---
        if (filter === 'pending') {
            tasks = await sql`
              SELECT t.*, u.nombre as assigned_to_name
              FROM tasks t
              LEFT JOIN usuarios u ON t.assigned_to = u.id
              WHERE t.owner_id = ${user.rootOwnerId}
              ${pendingCondition}
                AND (t.assigned_to = ${user.id} OR t.created_by = ${user.id})
              ORDER BY t.due_date ASC
            `
        } else {
            tasks = await sql`
              SELECT t.*, u.nombre as assigned_to_name
              FROM tasks t
              LEFT JOIN usuarios u ON t.assigned_to = u.id
              WHERE t.owner_id = ${user.rootOwnerId}
              ${completedCondition}
                AND (t.assigned_to = ${user.id} OR t.created_by = ${user.id})
              ORDER BY t.completed_at DESC
              LIMIT 50
            `
        }
    }

    return tasks as Task[]
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return []
  }
}

// --- OBTENER MIEMBROS DEL EQUIPO ---
export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const user = await requireAuth()
    const members = await sql`
        SELECT id, nombre, email
        FROM usuarios
        WHERE id = ${user.rootOwnerId} OR owner_id = ${user.rootOwnerId}
        ORDER BY nombre ASC
    `
    return members as TeamMember[]
  } catch (e) { return [] }
}

// --- CREAR TAREA (Forzando is_completed = false) ---
// --- CREAR TAREA (Con Webhook hacia Google Calendar) ---
export async function createTask(data: {
  title: string
  description?: string
  due_date: Date
  task_type: "LLAMADA" | "REUNION" | "WHATSAPP"
  assigned_to: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 1. Guardamos en Neon (Tu código original)
    await sql`
      INSERT INTO tasks (
        id, title, description, due_date, task_type, 
        assigned_to, created_by, owner_id, is_completed
      ) VALUES (
        ${taskId}, ${data.title}, ${data.description || null}, ${data.due_date.toISOString()}, ${data.task_type}, 
        ${data.assigned_to}, ${user.id}, ${user.rootOwnerId}, false
      )
    `

    // 🔥 2. MAGIA: Le avisamos al mundo que hay una nueva tarea
    await emitirWebhook(user.rootOwnerId, 'tarea_creada', {
        tarea_id: taskId,
        titulo: data.title,
        descripcion: data.description || "Sin descripción",
        fecha_vencimiento: data.due_date.toISOString(),
        tipo: data.task_type,
        asignado_id: data.assigned_to
    }).catch(e => console.error("Error disparando webhook de tarea:", e)); // El catch evita que un error de red rompa la creación

    revalidatePath("/dashboard/tasks")
    return { success: true }
  } catch (error) {
    console.error("Error creating task:", error)
    return { success: false, error: "Error al crear la tarea" }
  }
}

// --- COMPLETAR TAREA ---
export async function toggleTaskCompletion(
  taskId: string,
  isCompleted: boolean,
  resultNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()

    await sql`
      UPDATE tasks
      SET is_completed = ${isCompleted},
          completed_at = ${isCompleted ? new Date().toISOString() : null},
          result = ${resultNote || null},
          updated_at = NOW()
      WHERE id = ${taskId}
        AND owner_id = ${user.rootOwnerId}
    `

    revalidatePath("/dashboard/tasks")
    return { success: true }
  } catch (error) {
    console.error("Error toggling task completion:", error)
    return { success: false, error: "Error al actualizar la tarea" }
  }
}

// --- ELIMINAR TAREA ---
export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    await sql`DELETE FROM tasks WHERE id = ${taskId} AND owner_id = ${user.rootOwnerId}`
    revalidatePath("/dashboard/tasks")
    return { success: true }
  } catch (error) {
    console.error("Error deleting task:", error)
    return { success: false, error: "Error al eliminar la tarea" }
  }
}

// --- ACTUALIZAR FECHA ---
export async function updateTaskDate(taskId: string, newDate: Date): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    await sql`
      UPDATE tasks
      SET due_date = ${newDate.toISOString()}, updated_at = NOW()
      WHERE id = ${taskId} AND owner_id = ${user.rootOwnerId}
    `
    revalidatePath("/dashboard/tasks")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Error al actualizar fecha" }
  }
}

// --- ACTUALIZAR TAREA COMPLETA ---
export async function updateTask(taskId: string, data: {
  title: string
  description?: string
  due_date: Date
  task_type: "LLAMADA" | "REUNION" | "WHATSAPP"
  assigned_to: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    await sql`
      UPDATE tasks
      SET title = ${data.title},
          description = ${data.description || null},
          due_date = ${data.due_date.toISOString()},
          task_type = ${data.task_type},
          assigned_to = ${data.assigned_to},
          updated_at = NOW()
      WHERE id = ${taskId} AND owner_id = ${user.rootOwnerId}
    `
    revalidatePath("/dashboard/tasks")
    return { success: true }
  } catch (error) {
    console.error("Error updating task:", error)
    return { success: false, error: "Error al actualizar la tarea" }
  }
}
