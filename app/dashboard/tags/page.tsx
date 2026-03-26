"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Search, Plus, Pencil, Trash2, Loader2, Tag, Palette, X, User, MessageCircle, UserCircle, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import Swal from "sweetalert2"
import { useRouter } from "next/navigation"

interface TagItem { id: string; name: string; color: string; usage_count?: number }
interface ContactItem { id: string; name: string; phone: string; last_message: string }

const PRESET_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
]

function getContrastColor(hex: string): string {
  const c = hex.replace("#", "")
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? "#000000" : "#ffffff"
}

export default function TagManagerPage() {
  const router = useRouter()
  const [tags, setTags] = useState<TagItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Modal Crear/Editar
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [formName, setFormName] = useState("")
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])
  const [isSaving, setIsSaving] = useState(false)

  // 🔥 ESTADOS DEL MODAL PRO DE CONTACTOS
  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [activeTabTag, setActiveTabTag] = useState<TagItem | null>(null)
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [contactsPage, setContactsPage] = useState(1)
  const [hasMoreContacts, setHasMoreContacts] = useState(true)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setTags(Array.isArray(data) ? data : [])
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron cargar las etiquetas", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadTags() }, [loadTags])

  const filteredTags = tags.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const activeUsageTags = tags.filter(t => Number(t.usage_count || 0) > 0)

  // ── Modales CRUD ──
  const openCreateDialog = () => { setEditingTag(null); setFormName(""); setFormColor(PRESET_COLORS[0]); setDialogOpen(true) }
  const openEditDialog = (tag: TagItem) => { setEditingTag(tag); setFormName(tag.name); setFormColor(tag.color); setDialogOpen(true) }

  const handleSave = async () => {
    if (!formName.trim()) return Swal.fire("Error", "El nombre es obligatorio", "warning")
    setIsSaving(true)
    try {
      const isEditing = !!editingTag
      const res = await fetch("/api/tags", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: editingTag.id, name: formName.trim(), color: formColor } : { name: formName.trim(), color: formColor }),
      })
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "Error desconocido") }
      loadTags(); // Recargamos para traer el usage_count correcto
      setDialogOpen(false)
      Swal.fire({ icon: "success", title: isEditing ? "Etiqueta actualizada" : "Etiqueta creada", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 })
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error.message || "No se pudo guardar la etiqueta", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (tag: TagItem) => {
    const confirmed = await Swal.fire({ icon: "warning", title: "Eliminar etiqueta?", html: `<p>La etiqueta <strong>"${tag.name}"</strong> desaparecera de todos los chats.</p>`, showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Si, eliminar", cancelButtonText: "Cancelar" })
    if (!confirmed.isConfirmed) return
    try {
      const res = await fetch(`/api/tags?id=${tag.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setTags((prev) => prev.filter((t) => t.id !== tag.id))
      Swal.fire({ icon: "success", title: "Etiqueta eliminada", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 })
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo eliminar la etiqueta", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 })
    }
  }

  // 🔥 LÓGICA DEL MODAL DE CONTACTOS PRO
  const openContactsModal = () => {
      if (activeUsageTags.length === 0) return;
      setActiveTabTag(activeUsageTags[0]);
      setContactsModalOpen(true);
  }

  useEffect(() => {
      if (!contactsModalOpen || !activeTabTag) return;
      
      const fetchContacts = async () => {
          setIsLoadingContacts(true);
          try {
              const res = await fetch(`/api/tags/contacts?tag=${encodeURIComponent(activeTabTag.name)}&page=${contactsPage}`)
              if (res.ok) {
                  const data = await res.json()
                  if (data.length < 15) setHasMoreContacts(false)
                  else setHasMoreContacts(true)

                  if (contactsPage === 1) setContacts(data)
                  else setContacts(prev => [...prev, ...data])
              }
          } catch (e) {}
          setIsLoadingContacts(false)
      }

      fetchContacts();
  }, [activeTabTag, contactsPage, contactsModalOpen])

  const handleTabChange = (tag: TagItem) => {
      setActiveTabTag(tag);
      setContactsPage(1); // Reseteamos paginación
      setContacts([]);    // Limpiamos pantalla
  }

  return (
    <div className="min-h-full bg-background p-4 md:p-6 lg:p-8">
      {/* ── Header ──────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground text-balance">
              Gestion de Etiquetas
            </h1>
            <p className="text-sm text-muted-foreground">Administra las etiquetas de tu CRM</p>
          </div>
        </div>
      </div>

      {/* 🔥 BARRA DE ESTADÍSTICAS (Clickeable) */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><Tag className="w-5 h-5" /></div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Etiquetas Creadas</p>
                    <p className="text-2xl font-bold text-foreground">{tags.length}</p>
                </div>
            </div>
            {/* ESTA TARJETA ABRE EL MODAL */}
            <div 
               onClick={openContactsModal}
               className="bg-card/60 backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-900/50 rounded-2xl p-4 flex items-center gap-4 shadow-md cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all group"
            >
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform"><User className="w-5 h-5" /></div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">Asignaciones Activas</p>
                    <p className="text-2xl font-bold text-foreground">
                        {tags.reduce((acc, tag) => acc + Number(tag.usage_count || 0), 0)}
                    </p>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </div>
      )}

      {/* ── Toolbar: Search + Create Button ─────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar etiqueta..." className="pl-9 h-10 bg-card/60 backdrop-blur-sm border-border/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/20 h-10">
          <Plus className="h-4 w-4 mr-2" />
          Crear Etiqueta
        </Button>
      </div>

      {/* ── Loading State & Grid ... ──────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-muted-foreground">Cargando etiquetas...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center"><Tag className="h-8 w-8 text-muted-foreground/50" /></div>
          <div className="text-center">
            <p className="font-medium text-foreground">{searchQuery ? "Sin resultados" : "No hay etiquetas"}</p>
          </div>
        </div>
      ) : (
        <LayoutGroup>
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" layout>
            <AnimatePresence mode="popLayout">
         {filteredTags.map((tag) => {
  const isFacebookTag = tag.name === 'Facebook Ads' || tag.name === 'Facebook Lead';

  return (
    <motion.div key={tag.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="group relative">
      <div className={`relative backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 
        ${isFacebookTag ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 hover:shadow-blue-500/10' : 'bg-card/70 border-border/50 hover:border-border'} hover:shadow-lg`}
      >
        <div className="flex items-center gap-3 mb-3">
          {/* Si es Facebook, forzamos el color azul de Meta, sino el color normal */}
          <div className="h-5 w-5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card" style={{ backgroundColor: isFacebookTag ? '#2563eb' : tag.color, ringColor: isFacebookTag ? '#2563eb' : tag.color }} />
          <span className="font-medium text-sm text-foreground truncate">{tag.name}</span>
        </div>
        
        <div className="mb-3">
          {isFacebookTag ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/30">
              {/* Importa 'Star' de lucide-react arriba junto a las otras */}
              <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
              {tag.name} <span className="ml-1 opacity-90">({tag.usage_count || 0})</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: tag.color + "20", color: tag.color, border: `1px solid ${tag.color}40` }}>
              {tag.name} <span className="ml-1 opacity-70">({tag.usage_count || 0})</span>
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button onClick={() => openEditDialog(tag)} className="h-7 w-7 rounded-lg bg-muted/80 hover:bg-muted flex items-center justify-center"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
          <button onClick={() => handleDelete(tag)} className="h-7 w-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
        </div>
      </div>
    </motion.div>
  )
})}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}

      {/* ── Modal de CREAR/EDITAR ───────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-indigo-500" /> {editingTag ? "Editar Etiqueta" : "Crear Etiqueta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input placeholder="Ej: Cliente VIP..." value={formName} onChange={(e) => setFormName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave() }} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setFormColor(color)} className={`h-8 w-8 rounded-full transition-all ${formColor === color ? "ring-2 ring-offset-2 scale-110" : "hover:scale-110"}`} style={{ backgroundColor: color, ringColor: formColor === color ? color : undefined }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !formName.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">{isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 MODAL DE CONTACTOS PRO 🔥 */}
      <Dialog open={contactsModalOpen} onOpenChange={setContactsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#0f172a] gap-0">
          
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
             <DialogTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" /> 
                Contactos Etiquetados
             </DialogTitle>
             <DialogDescription className="text-xs mt-1">Navega por tus etiquetas y gestiona tus clientes directamente.</DialogDescription>
          </div>

          {/* TABS HORIZONTALES (Scrolleables) */}
          <div className="border-b border-slate-100 dark:border-slate-800 px-2">
             <ScrollArea className="w-full whitespace-nowrap">
               <div className="flex w-max space-x-2 p-2">
                 {activeUsageTags.map(tag => (
                   <button
                     key={tag.id}
                     onClick={() => handleTabChange(tag)}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                       activeTabTag?.id === tag.id 
                         ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 ring-1 ring-indigo-500/50' 
                         : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                     }`}
                   >
                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                     {tag.name} 
                     <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTabTag?.id === tag.id ? 'bg-indigo-200 dark:bg-indigo-900/50' : 'bg-slate-200 dark:bg-slate-800'}`}>
                        {tag.usage_count}
                     </span>
                   </button>
                 ))}
               </div>
               <ScrollBar orientation="horizontal" className="h-1" />
             </ScrollArea>
          </div>

          {/* LISTA DE CONTACTOS */}
          <ScrollArea className="flex-1 p-4 bg-slate-50/30 dark:bg-[#0f172a]">
             <div className="space-y-2">
                {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                               {(contact.name?.[0] || contact.phone?.[0] || "#").toUpperCase()}
                           </div>
                           <div className="truncate">
                               <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
                               <p className="text-[11px] font-medium text-indigo-500 mb-0.5 tracking-wide">
           {contact.phone}
       </p>
       
       <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-48 sm:w-64 md:w-96">
           {contact.last_message || "Sin mensajes aún"}
       </p>
                               {/* <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-48 sm:w-64 md:w-96">{contact.last_message || "Sin mensajes aún"}</p> */}
                           </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Ver Perfil" onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}>
                                <UserCircle className="w-4 h-4" />
                            </Button> */}
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Ir al Chat" onClick={() => router.push(`/dashboard/messages?id=${contact.id}`)}>
                                <MessageCircle className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {isLoadingContacts && (
                    <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                )}

                {hasMoreContacts && !isLoadingContacts && contacts.length > 0 && (
                    <div className="pt-4 pb-2">
                        <Button variant="outline" className="w-full border-dashed" onClick={() => setContactsPage(p => p + 1)}>
                            Cargar más contactos...
                        </Button>
                    </div>
                )}
             </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
