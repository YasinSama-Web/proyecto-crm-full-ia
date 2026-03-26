"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, X, Tag as TagIcon, AlertCircle } from "lucide-react"
import Swal from "sweetalert2"

// --- PALETA DE COLORES ---
export const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", 
  "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#64748b",
]

// --- TIPOS ---
export type Tag = {
  id: string
  name: string
  color: string
}

// 🔥 IDs ACTUALIZADOS: Ahora coinciden con el nombre para que el Wizard no falle
export const DEFAULT_TAGS: Tag[] = [
  { id: "Nuevo Cliente", name: "Nuevo Cliente", color: "#3b82f6" }, 
  { id: "Pagado", name: "Pagado", color: "#10b981" },         
  { id: "Pendiente", name: "Pendiente", color: "#f59e0b" },    
  { id: "Urgente", name: "Urgente", color: "#ef4444" },        
]

interface TagManagerProps {
  availableTags: Tag[]
  onUpdateTags: (newTags: Tag[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagManager({ availableTags, onUpdateTags, open, onOpenChange }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("")
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[5]) 

  const handleCreate = () => {
    const trimmedName = newTagName.trim()
    if (!trimmedName) return

    // 🛡️ VALIDACIÓN: Evitar duplicados (Ignora mayúsculas/minúsculas)
    const exists = availableTags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())
    if (exists) {
      Swal.fire({
        title: "Etiqueta duplicada",
        text: "Ya existe una etiqueta con ese nombre.",
        icon: "warning",
        confirmButtonColor: "#3b82f6"
      })
      return
    }

    const newTag: Tag = {
      // 🚀 LA MAGIA: El ID es el nombre. Así Neon guarda "VIP" y el Wizard busca "VIP".
      id: trimmedName, 
      name: trimmedName,
      color: selectedColor
    }

    onUpdateTags([...availableTags, newTag])
    setNewTagName("")
  }

  const handleDelete = (id: string) => {
    onUpdateTags(availableTags.filter(t => t.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden p-0 shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
             <TagIcon className="w-6 h-6" />
             Gestión de Etiquetas
          </DialogTitle>
          <p className="text-blue-100 text-sm mt-1">Crea y organiza las categorías de tus contactos.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Crear Nueva</label>
            <div className="flex gap-2">
               <Input 
                 value={newTagName} 
                 onChange={(e) => setNewTagName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                 placeholder="Ej: Cliente VIP..."
                 className="bg-white dark:bg-slate-800 rounded-xl border-slate-200 dark:border-slate-700 h-11"
               />
               <Button onClick={handleCreate} disabled={!newTagName.trim()} size="icon" className="shrink-0 h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                  <Plus className="w-5 h-5" />
               </Button>
            </div>
            
            <div className="flex flex-wrap gap-2.5 mt-2 justify-center py-2">
               {TAG_COLORS.map(color => (
                 <button
                   key={color}
                   onClick={() => setSelectedColor(color)}
                   className={`w-6 h-6 rounded-full transition-all border-2 ${selectedColor === color ? 'border-slate-600 dark:border-white scale-125 shadow-md' : 'border-transparent hover:scale-110'}`}
                   style={{ backgroundColor: color }}
                 />
               ))}
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etiquetas Activas</label>
             <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto p-1 custom-scrollbar">
                {availableTags.length > 0 ? (
                  availableTags.map(tag => (
                    <div key={tag.id} className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:border-blue-400 transition-all">
                       <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: tag.color }} />
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{tag.name}</span>
                       <button onClick={() => handleDelete(tag.id)} className="text-slate-300 hover:text-red-500 ml-1 transition-colors">
                          <X className="w-4 h-4" />
                       </button>
                    </div>
                  ))
                ) : (
                  <div className="w-full py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    <p className="text-sm text-slate-400 italic">No hay etiquetas creadas aún.</p>
                  </div>
                )}
             </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-slate-500">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
