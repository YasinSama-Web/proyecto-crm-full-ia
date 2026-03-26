"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  format, isToday, isTomorrow, isPast, addMinutes, addDays, nextFriday,
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, getDay
} from "date-fns"
import { es } from "date-fns/locale"
import { 
  Plus, Phone, Video, MessageSquare, Check, Trash2, 
  Calendar as CalendarIcon, Clock, History, LayoutDashboard,
  ChevronLeft, ChevronRight, Edit3
} from "lucide-react"
import Swal from "sweetalert2"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

import {
  getTasks,
  getTeamMembers,
  createTask,
  updateTask,
  toggleTaskCompletion,
  deleteTask,
  type Task,
  type TeamMember,
} from "./actions"

// --- GLASSMORPHISM CARD WRAPPER - DARK MODE READY ---
function GlassCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-border/50 dark:border-slate-700/50 shadow-xl ${className}`}
    >
      {children}
    </motion.div>
  )
}

// --- SELECTOR DE FECHA INTELIGENTE ---
function SmartDatePicker({ date, time, onDateChange, onTimeChange }: { 
  date: Date | undefined, 
  time: string, 
  onDateChange: (d: Date | undefined) => void, 
  onTimeChange: (t: string) => void 
}) {
  const setQuickDate = (type: 'today' | 'tomorrow' | '15min' | 'weekend') => {
    const now = new Date()
    if (type === 'today') {
      onDateChange(now)
    } else if (type === 'tomorrow') {
      onDateChange(addDays(now, 1))
    } else if (type === '15min') {
      const future = addMinutes(now, 15)
      onDateChange(future)
      onTimeChange(format(future, 'HH:mm'))
    } else if (type === 'weekend') {
      onDateChange(nextFriday(now))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate('15min')} 
          className="h-8 text-xs whitespace-nowrap bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 rounded-full px-4">
          En 15 min
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate('today')} 
          className="h-8 text-xs whitespace-nowrap rounded-full px-4">
          Hoy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate('tomorrow')} 
          className="h-8 text-xs whitespace-nowrap rounded-full px-4">
          Manana
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate('weekend')} 
          className="h-8 text-xs whitespace-nowrap rounded-full px-4">
          Fin de semana
        </Button>
      </div>

      <div className="flex gap-2 items-center border border-border/50 rounded-xl p-2 bg-background/80 dark:bg-slate-900/80 backdrop-blur shadow-sm">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-left font-normal h-9 px-3 hover:bg-muted rounded-lg",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={onDateChange} initialFocus locale={es} />
          </PopoverContent>
        </Popover>
        
        <div className="w-px h-6 bg-border" />
        
        <div className="w-[100px] flex items-center gap-1 px-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input 
            type="time" 
            value={time} 
            onChange={(e) => onTimeChange(e.target.value)} 
            className="border-0 focus-visible:ring-0 px-1 h-9 text-sm bg-transparent text-foreground"
          />
        </div>
      </div>
    </div>
  )
}

// --- TARJETA DE TAREA GLASSMORPHISM ---
function TaskCard({
  task,
  onComplete,
  onDelete,
  onEdit,
  isHistory = false 
}: {
  task: Task
  onComplete?: () => void
  onDelete?: () => void
  onEdit?: () => void
  isHistory?: boolean
}) {
  const getTaskIcon = () => {
    switch (task.task_type) {
      case "LLAMADA": return <Phone className="h-3 w-3" />
      case "REUNION": return <Video className="h-3 w-3" />
      case "WHATSAPP": return <MessageSquare className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const getTaskBadgeColor = () => {
    switch (task.task_type) {
      case "LLAMADA": return "bg-blue-100 text-blue-700 border-blue-200"
      case "REUNION": return "bg-purple-100 text-purple-700 border-purple-200"
      case "WHATSAPP": return "bg-green-100 text-green-700 border-green-200"
      default: return "bg-muted text-slate-700 border-slate-200"
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={() => !isHistory && onEdit?.()}
      className={cn(
        "group bg-white/80 backdrop-blur rounded-xl p-4 shadow-sm border border-white/50 hover:shadow-lg transition-all cursor-pointer",
        isHistory && "opacity-70 cursor-default"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={cn(
          "font-medium text-sm text-foreground flex-1",
          isHistory && "line-through text-muted-foreground"
        )}>
          {task.title}
        </h3>
        
        {!isHistory && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onComplete?.() }} 
              className="p-1.5 hover:bg-green-100 rounded-lg transition-colors" 
              title="Completar"
            >
              <Check className="h-4 w-4 text-green-600" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.() }} 
              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" 
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <Badge className={cn("text-[10px] px-2 py-0.5 font-medium border rounded-full", getTaskBadgeColor())} variant="outline">
          <span className="mr-1">{getTaskIcon()}</span>
          {task.task_type}
        </Badge>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <CalendarIcon className="h-3 w-3" />
          {task.completed_at 
            ? format(new Date(task.completed_at), "dd/MM HH:mm", { locale: es }) 
            : format(new Date(task.due_date), "dd MMM HH:mm", { locale: es })
          }
        </div>
      </div>

      {task.assigned_to_name && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
            {task.assigned_to_name.charAt(0).toUpperCase()}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{task.assigned_to_name}</p>
        </div>
      )}

      {task.result && isHistory && (
        <div className="mt-3 p-2 bg-green-50 border border-green-100 rounded-lg text-xs text-green-800">
          <strong>Resultado:</strong> {task.result}
        </div>
      )}
    </motion.div>
  )
}

// --- COLUMNA KANBAN GLASSMORPHISM ---
function TaskColumn({ 
  title, 
  gradientFrom, 
  gradientTo, 
  tasks, 
  onComplete, 
  onDelete,
  onEdit
}: { 
  title: string
  gradientFrom: string
  gradientTo: string
  tasks: Task[]
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  onEdit: (task: Task) => void
}) {
  return (
    <div className="flex-1 min-w-[280px]">
      <div className={`rounded-t-2xl px-4 py-3 bg-gradient-to-r ${gradientFrom} ${gradientTo}`}>
        <h2 className="font-semibold ml-7 text-white flex items-center justify-between text-sm">
          {title}
          <span className="text-xs font-medium bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
            {tasks.length}
          </span>
        </h2>
      </div>
      <div className="bg-white/30 backdrop-blur-md rounded-b-2xl p-3 min-h-[350px] space-y-3 border-x border-b border-white/30">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => onComplete(task.id)}
              onDelete={() => onDelete(task.id)}
              onEdit={() => onEdit(task)}
            />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground/70 text-sm">
            <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Sin tareas
          </div>
        )}
      </div>
    </div>
  )
}

// --- CALENDARIO VISUAL ARGON STYLE ---
// --- CALENDARIO VISUAL INTERACTIVO ---
function VisualCalendar({ 
  tasks, 
  currentMonth, 
  onMonthChange,
  onComplete,
  onDelete,
  onEdit 
}: { 
  tasks: Task[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  onEdit: (task: Task) => void
}) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = getDay(monthStart)
  const paddingDays = Array(startDay).fill(null)

  // ESTADO PARA EL MODAL DE TAREAS DEL DÍA
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.due_date), day))
  }

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  // Opciones visuales del Modal
  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : []

  return (
    <GlassCard className="p-6 relative">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-foreground">Agenda Mensual</h3>
          <p className="text-sm text-muted-foreground capitalize">{format(currentMonth, "MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onMonthChange(subMonths(currentMonth, 1))} className="h-9 w-9 rounded-xl">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onMonthChange(addMonths(currentMonth, 1))} className="h-9 w-9 rounded-xl">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {paddingDays.map((_, index) => (
          <div key={`pad-${index}`} className="min-h-[100px] p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-transparent" />
        ))}
        
        {days.map((day) => {
          const dayTasks = getTasksForDay(day)
          const isCurrentDay = isToday(day)
          const hasTasks = dayTasks.length > 0
          
          return (
            <motion.div
              key={day.toISOString()}
              whileHover={{ scale: 1.02 }}
              onClick={() => hasTasks && setSelectedDay(day)}
              className={cn(
                "min-h-[100px] p-3 rounded-2xl border transition-all flex flex-col relative",
                isCurrentDay 
                  ? "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm" 
                  : "bg-white/40 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800",
                hasTasks ? "cursor-pointer hover:shadow-md hover:border-blue-300" : "cursor-default"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-full text-sm font-bold",
                  isCurrentDay ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 dark:text-slate-300"
                )}>
                  {format(day, "d")}
                </span>
                
                {hasTasks && (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold shadow-sm">
                    {dayTasks.length}
                  </Badge>
                )}
              </div>

              {/* Vista Previa de las Tareas en el Cuadro */}
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {dayTasks.slice(0, 2).map((task) => (
                  <div key={task.id} className="text-[10px] leading-tight truncate px-2 py-1 rounded-md bg-white/60 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300">
                    <span className="mr-1 opacity-70">
                      {task.task_type === 'LLAMADA' ? '📞' : task.task_type === 'REUNION' ? '🎥' : '💬'}
                    </span>
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <p className="text-[10px] text-muted-foreground text-center font-medium pt-1">
                    + {dayTasks.length - 2} más
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* MODAL DE DETALLE DEL DÍA */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[600px] bg-slate-50 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                Agenda del día
                <p className="text-sm font-normal text-muted-foreground capitalize mt-0.5">
                  {selectedDay && format(selectedDay, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {selectedDayTasks.map(task => (
              <TaskCard 
                key={task.id}
                task={task}
                onComplete={() => { onComplete(task.id); setSelectedDay(null); }}
                onDelete={() => { onDelete(task.id); setSelectedDay(null); }}
                onEdit={() => { onEdit(task); setSelectedDay(null); }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          Llamada
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          Reunion
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          WhatsApp
        </div>
      </div>
    </GlassCard>
  )
}

// --- PAGINA PRINCIPAL ---
export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<"board" | "history">("board")
  const [tasks, setTasks] = useState<Task[]>([])
  const [historyTasks, setHistoryTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Form State
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState("09:00")
  const [taskType, setTaskType] = useState<"LLAMADA" | "REUNION" | "WHATSAPP">("LLAMADA")
  const [assignedTo, setAssignedTo] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [resultNote, setResultNote] = useState("")

  useEffect(() => { loadData() }, [activeTab])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [pending, completed, members] = await Promise.all([
        getTasks('pending'),
        getTasks('completed'),
        getTeamMembers()
      ])
      setTasks(pending)
      setHistoryTasks(completed)
      setTeamMembers(members)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingTask(null)
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setTitle(task.title)
    setDescription(task.description || "")
    const taskDate = new Date(task.due_date)
    setDate(taskDate)
    setTime(format(taskDate, "HH:mm"))
    setTaskType(task.task_type)
    setAssignedTo(task.assigned_to)
    setIsModalOpen(true)
  }

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return Swal.fire("Error", "Selecciona una fecha", "warning")

    setIsSaving(true)
    try {
      const [hours, minutes] = time.split(":").map(Number)
      const taskDueDate = new Date(date)
      taskDueDate.setHours(hours, minutes, 0, 0)

      const taskData = {
        title,
        description,
        due_date: taskDueDate,
        task_type: taskType,
        assigned_to: assignedTo,
      }

      let result
      if (editingTask) {
        result = await updateTask(editingTask.id, taskData)
      } else {
        result = await createTask(taskData)
      }

      if (result.success) {
        Swal.fire({ 
          icon: "success", 
          title: editingTask ? "Tarea actualizada" : "Tarea creada", 
          toast: true, 
          position: "top-end", 
          showConfirmButton: false, 
          timer: 2000 
        })
        setIsModalOpen(false)
        resetForm()
        loadData()
      } else { 
        throw new Error(result.error) 
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo guardar la tarea", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 })
    } finally { 
      setIsSaving(false) 
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setDate(new Date())
    setTime("09:00")
    setTaskType("LLAMADA")
    setAssignedTo("")
    setEditingTask(null)
  }

  const requestComplete = (taskId: string) => {
    setTaskToComplete(taskId)
    setResultNote("")
    setIsCompleteOpen(true)
  }

  const confirmComplete = async () => {
    if (!taskToComplete) return
    setTasks((prev) => prev.filter((t) => t.id !== taskToComplete))
    setIsCompleteOpen(false)

    const result = await toggleTaskCompletion(taskToComplete, true, resultNote)
    if (result.success) {
      Swal.fire({ icon: "success", title: "Tarea completada!", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 })
      loadData()
    } else {
      loadData()
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo completar", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 })
    }
  }

  const handleDelete = async (taskId: string) => {
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Eliminar tarea?",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    })

    if (confirmed.isConfirmed) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      const result = await deleteTask(taskId)
      if (result.success) {
        Swal.fire({ icon: "success", title: "Eliminada", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 })
      } else {
        loadData()
      }
    }
  }

  // Task filtering
  const overdueTasks = tasks.filter((task) => isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)))
  const todayTasks = tasks.filter((task) => isToday(new Date(task.due_date)))
  const tomorrowTasks = tasks.filter((task) => isTomorrow(new Date(task.due_date)))
  const futureTasks = tasks.filter((task) => {
    const taskDate = new Date(task.due_date)
    return !isPast(taskDate) && !isToday(taskDate) && !isTomorrow(taskDate)
  })

  if (isLoading && tasks.length === 0 && historyTasks.length === 0) {
    return (
      <div className="p-8 min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-200 rounded-xl w-1/4" />
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-[400px] bg-slate-200/50 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tareas</h1>
            <p className="text-muted-foreground mt-1">Gestiona tus tareas y seguimientos</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Toggle */}
            <div className="flex bg-white/60 backdrop-blur rounded-xl p-1 border border-white/50 shadow-sm">
              <button
                onClick={() => setActiveTab("board")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "board" 
                    ? "bg-white shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-slate-700"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Tablero
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "history" 
                    ? "bg-white shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-slate-700"
                )}
              >
                <History className="w-4 h-4" />
                Historial
              </button>
            </div>

            {/* New Task Button */}
            <Button 
              onClick={openCreateModal}
              size="lg" 
              className="gap-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Nueva Tarea
            </Button>
          </div>
        </motion.div>

        {/* Board View */}
        {activeTab === "board" && (
          <>
            {/* Kanban Columns */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
            >
              <TaskColumn 
                title="Vencidas" 
                gradientFrom="from-red-500" 
                gradientTo="to-rose-600" 
                tasks={overdueTasks} 
                onComplete={requestComplete} 
                onDelete={handleDelete}
                onEdit={openEditModal}
              />
              <TaskColumn 
                title="Hoy" 
                gradientFrom="from-emerald-500" 
                gradientTo="to-green-600" 
                tasks={todayTasks} 
                onComplete={requestComplete} 
                onDelete={handleDelete}
                onEdit={openEditModal}
              />
              <TaskColumn 
                title="Manana" 
                gradientFrom="from-blue-500" 
                gradientTo="to-indigo-600" 
                tasks={tomorrowTasks} 
                onComplete={requestComplete} 
                onDelete={handleDelete}
                onEdit={openEditModal}
              />
              <TaskColumn 
                title="Proximamente" 
                gradientFrom="from-slate-500" 
                gradientTo="to-slate-600" 
                tasks={futureTasks} 
                onComplete={requestComplete} 
                onDelete={handleDelete}
                onEdit={openEditModal}
              />
            </motion.div>

            {/* Visual Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <VisualCalendar 
              tasks={tasks} 
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onComplete={requestComplete}
              onDelete={handleDelete}
              onEdit={openEditModal}
              />
            </motion.div>
          </>
        )}

        {/* History View */}
        {activeTab === "history" && (
          <GlassCard className="p-6">
            <h3 className="font-semibold text-lg mb-6 text-foreground">Historial de tareas completadas</h3>
            {historyTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground/70">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay historial disponible</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {historyTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    isHistory={true} 
                    onDelete={() => handleDelete(task.id)} 
                  />
                ))}
              </AnimatePresence>
            </div>
          </GlassCard>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-white/50 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {editingTask ? (
                  <>
                    <Edit3 className="h-5 w-5 text-blue-500" />
                    Editar Tarea
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-green-500" />
                    Nueva Tarea
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSaveTask} className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titulo *</Label>
                <Input 
                  id="title" 
                  placeholder="Ej: Llamar a cliente" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                  className="rounded-xl bg-white/80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Nota</Label>
                <Textarea 
                  id="description" 
                  placeholder="Detalles adicionales..." 
                  rows={3} 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl bg-white/80"
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha y Hora *</Label>
                <SmartDatePicker date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taskType">Tipo *</Label>
                  <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
                    <SelectTrigger id="taskType" className="rounded-xl bg-white/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LLAMADA">
                        <span className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-500" />
                          Llamada
                        </span>
                      </SelectItem>
                      <SelectItem value="REUNION">
                        <span className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-purple-500" />
                          Reunion
                        </span>
                      </SelectItem>
                      <SelectItem value="WHATSAPP">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          WhatsApp
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Asignar a *</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo} required>
                    <SelectTrigger id="assignedTo" className="rounded-xl bg-white/80">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <span className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[9px] font-bold text-white">
                              {member.nombre.charAt(0).toUpperCase()}
                            </div>
                            {member.nombre}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving} 
                  className="flex-1 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900"
                >
                  {isSaving ? "Guardando..." : editingTask ? "Actualizar" : "Crear Tarea"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Complete Modal */}
        <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
          <DialogContent className="bg-white/95 backdrop-blur-xl border-white/50 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Completar Tarea
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Resultado (Opcional)</Label>
              <Textarea 
                placeholder="Ej: Cliente interesado, se agendo demo..." 
                value={resultNote} 
                onChange={e => setResultNote(e.target.value)}
                className="rounded-xl bg-white/80"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsCompleteOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button onClick={confirmComplete} className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                Finalizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
