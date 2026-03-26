"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  User, Clock, ArrowLeft, X, Trash2, DollarSign,
  MessageSquare, ImageIcon, Save, CheckCircle2, ChevronRight, CreditCard, Plus, Check
} from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { motion } from "framer-motion"
import Swal from "sweetalert2"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

// 🔥 IMPORTS DEL GESTOR DE ETIQUETAS
import { TagManager, type Tag } from "@/components/dashboard/tag-manager"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

// --- TIPOS ---
interface Payment {
  id: string
  amount: number
  created_at: string | Date | null
  conversation_id: string
}

interface ContactMessage {
  id: string
  body: string
  from_me: boolean
  timestamp: string | Date
  media_type?: string
}

interface ContactDetailProps {
  contact: {
    id: string
    name: string | null
    phone: string
    notes: string | null
    tags: string[] | null // Array de IDs
    created_at: string | Date
    conversations: Array<{
      id: string
      line_id: string | null
      line_name: string | null
      last_activity: string | Date
      is_conversion: boolean
      message_count: number
      recent_messages: ContactMessage[]
    }>
  }
  initialPayments?: Payment[]
  availableTags?: Tag[] // Recibimos las etiquetas globales disponibles
}

function GlassCard({ children, className = "", gradient = "from-white to-slate-50/80" }: { children: React.ReactNode, className?: string, gradient?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-lg border border-white/50 overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function ContactDetail({ contact, initialPayments = [] }: ContactDetailProps) {
  const router = useRouter()
  const [name, setName] = useState(contact.name || "")
  const [notes, setNotes] = useState(contact.notes || "")

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const totalPayments = initialPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const lastPayment = initialPayments.length > 0 ? initialPayments[0] : null

  const [tags, setTags] = useState<string[]>(Array.isArray(contact.tags) ? contact.tags : [])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])

  // 🔥 EFECTO DE CARGA DE COLORES
  useEffect(() => {
    const fetchTags = async () => {
        try {
            const res = await fetch('/api/tags');
            if (res.ok) setAvailableTags(await res.json());
        } catch (e) { console.error(e) }
    };
    fetchTags();
  }, []);

  // Función para refrescar si el usuario abre el modal de crear tag desde este perfil
  const refreshTags = async () => {
      const res = await fetch('/api/tags');
      if (res.ok) setAvailableTags(await res.json());
  }

  // --- HELPERS ---
  const safeFormatDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "-"
    try {
        const d = new Date(dateInput)
        if (isNaN(d.getTime())) return "-"
        return formatDistanceToNow(d, { addSuffix: true, locale: es })
    } catch { return "-" }
  }

  const safeFullDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "-"
    try {
        const d = new Date(dateInput)
        if (isNaN(d.getTime())) return "-"
        return d.toLocaleDateString("es-ES", { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })
    } catch { return "-" }
  }

  const formatMessageContent = (msg: ContactMessage) => {
    if (msg.media_type === 'image') return <span className="flex items-center gap-1 text-blue-600"><ImageIcon className="w-3 h-3"/> Imagen</span>
    if (msg.body && msg.body.includes('supabase.co')) return <span className="flex items-center gap-1 text-blue-600"><ImageIcon className="w-3 h-3"/> Imagen</span>
    return <span className="truncate">{msg.body || "..."}</span>
  }

  // --- ACCIONES ---
  const handleSave = async () => {
    setSaving(true)
    try {
      // Limpiamos los tags para asegurar que solo enviamos IDs string válidos
      const cleanTags = tags.filter(t => typeof t === 'string' && t.length > 0);

      await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notes, tags: cleanTags }), // Enviamos Array de IDs
      })
      
      Swal.fire({ icon: "success", title: "Guardado", timer: 1500, showConfirmButton: false })
      router.refresh() // Actualiza la data del servidor
    } catch {
      Swal.fire({ icon: "error", title: "Error al guardar" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar contacto?', text: "Se borrarán sus datos del CRM.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#cbd5e1', confirmButtonText: 'Sí, eliminar'
    })
    if (result.isConfirmed) {
      setDeleting(true)
      try {
        const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
        if (res.ok) router.push('/dashboard/contacts')
        else throw new Error('Error')
      } catch {
        Swal.fire('Error', 'No se pudo eliminar', 'error')
        setDeleting(false)
      }
    }
  }

  // --- LÓGICA TAGS ---
const toggleTag = (tagId: string) => {
    // tagId AHORA es el nombre del tag
    setTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId) 
        : [...prev, tagId]
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="hover:bg-slate-100 rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <div className="flex flex-wrap gap-2">
          {contact.conversations.length > 0 && (
             <Button onClick={() => router.push(`/dashboard/messages?id=${contact.conversations[0].id}`)} variant="outline" className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 rounded-xl shadow-sm">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-500" /> Ir al Chat
             </Button>
          )}
          <Button onClick={handleDelete} disabled={deleting || saving} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4 mr-2" /> Eliminar</Button>
          <Button onClick={handleSave} disabled={saving || deleting} className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md text-white"><Save className="h-4 w-4 mr-2" /> {saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* COLUMNA IZQ */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard>
            <div className="p-6 border-b border-slate-100/50 bg-slate-50/50 flex items-center gap-3">
               <User className="h-5 w-5 text-blue-600" />
               <h2 className="font-semibold text-slate-800">Perfil del Contacto</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-blue-500/20">
                   {name ? name[0].toUpperCase() : (contact.phone[0] || "#")}
                </div>
                <div className="flex-1">
                   <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nombre</label>
                   <Input value={name} onChange={e => setName(e.target.value)} className="text-lg font-semibold h-12 bg-white/50 border-slate-200 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Teléfono</label><Input value={contact.phone} disabled className="bg-slate-100/50 rounded-xl text-slate-600" /></div>
                 <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Fecha Alta</label><Input value={safeFormatDate(contact.created_at)} disabled className="bg-slate-100/50 rounded-xl text-slate-600" /></div>
              </div>

              {/* 🔥 SECCIÓN ETIQUETAS ARREGLADA (USA IDs) 🔥 */}
              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase block">Etiquetas</label>
                    <Button variant="link" size="sm" className="h-auto p-0 text-blue-500 text-xs" onClick={() => setIsManagerOpen(true)}>Administrar</Button>
                 </div>
                 
                 <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tagName => {
      // 1. Buscamos el color en la base de datos (ignorando mayúsculas)
      const cleanTagName = tagName.trim().toLowerCase();
      const tagInfo = availableTags.find(t => t.name.trim().toLowerCase() === cleanTagName);
      
      // 2. 🔥 AQUÍ DEFINIMOS bgColor PARA QUE NO TIRE ERROR 🔥
      const bgColor = tagInfo ? tagInfo.color : '#94a3b8'; 

      return (
          <Badge 
              key={tagName} 
              variant="secondary" 
              className="px-2 py-1 text-xs text-white border-0 flex items-center gap-1"
              style={{ backgroundColor: bgColor }} /* <-- Aquí es donde lo pedía */
          >
              {tagName}
          </Badge>
      )
  })}
                    {/* {tags.map(tagName => {
    // Buscamos por nombre o ID
    const tagInfo = availableTags.find(t => t.name.trim().toLowerCase() === tagName.trim().toLowerCase());
    const color = tagInfo ? tagInfo.color : '#94a3b8';
    const displayName = tagInfo?.name || tagName
    
    return (
        <Badge key={tagName} className="pl-2 pr-1 py-1 border-0 flex items-center gap-1" style={{ backgroundColor: bgColor, color: '#fff' }}>
            {displayName} 
            <div className="cursor-pointer bg-white/20 rounded-full p-0.5 hover:bg-white/40 ml-1" onClick={() => toggleTag(tagName)}>
                <X className="w-3 h-3" />
            </div>
        </Badge>
    )
})} */}

                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs border-dashed border-slate-300 text-slate-500 bg-white/50">
                           <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-52" align="start">
                         <Command>
                            <CommandInput placeholder="Buscar..." className="h-9" />
                            <CommandList>
                               <CommandEmpty className="py-2 px-2 text-xs text-center text-slate-500">
                                  No existe. <span className="text-blue-500 cursor-pointer ml-1 underline" onClick={() => {setIsPopoverOpen(false); setIsManagerOpen(true)}}>Crear nueva</span>
                               </CommandEmpty>
                               <CommandGroup>
                                {availableTags.map(tag => {
    const isSelected = tags.includes(tag.name)
    return (
        <CommandItem key={tag.id} value={tag.name} onSelect={() => toggleTag(tag.name)} className="flex items-center gap-2 cursor-pointer">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
            <span className={`flex-1 truncate ${isSelected ? 'font-bold' : ''}`}>{tag.name}</span>
            {isSelected && <Check className="w-4 h-4 text-slate-500" />}
        </CommandItem>
    )
})}
                               </CommandGroup>
                            </CommandList>
                         </Command>
                      </PopoverContent>
                    </Popover>
                 </div>
              </div>

              <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Notas Internas</label><Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-white/50 rounded-xl resize-none" rows={4} placeholder="Escribe detalles..." /></div>
            </div>
          </GlassCard>
        </div>

        {/* COLUMNA DERECHA (Widgets) */}
        <div className="space-y-6">
          <GlassCard gradient="from-emerald-50 to-white">
              <div className="p-4 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50">
                 <div className="flex items-center gap-2"><div className="p-1.5 bg-emerald-100 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div><span className="font-semibold text-emerald-900">Facturación</span></div>
              </div>
              <div className="p-5">
                 <div className="mb-4"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Cobrado</p><p className="text-3xl font-bold text-emerald-600">${totalPayments.toLocaleString("es-ES")}</p></div>
                 {lastPayment ? (
                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 mb-4">
                        <div className="flex justify-between items-center text-sm mb-1"><span className="text-slate-600 font-medium">Último pago:</span><span className="text-emerald-700 font-bold">+${lastPayment.amount.toLocaleString()}</span></div>
                        <p className="text-xs text-slate-400 text-right">{safeFormatDate(lastPayment.created_at)}</p>
                    </div>
                 ) : <p className="text-sm text-slate-400 mb-4 italic">No hay registros recientes.</p>}
                 {initialPayments.length > 0 && <Button variant="ghost" className="w-full text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 group" onClick={() => setIsPaymentModalOpen(true)}>Ver historial ({initialPayments.length}) <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" /></Button>}
              </div>
          </GlassCard>

          <GlassCard>
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50"><MessageSquare className="h-4 w-4 text-slate-500" /><h3 className="font-semibold text-slate-700">Conversaciones</h3></div>
              <div className="p-3 space-y-3">
                 {contact.conversations.map(conv => (
                    <motion.div key={conv.id} whileHover={{ scale: 1.02 }} onClick={() => router.push(`/dashboard/messages?id=${conv.id}`)} className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all">
                      <div className="flex justify-between mb-2"><Badge variant="secondary" className="text-[10px] h-5 bg-slate-100 text-slate-600">{conv.line_name || "Sistema"}</Badge><span className="text-[10px] text-slate-400">{safeFormatDate(conv.last_activity)}</span></div>
                      <div className="text-[11px] text-slate-500 truncate">{conv.recent_messages?.[0] ? formatMessageContent(conv.recent_messages[0]) : "Sin mensajes..."}</div>
                    </motion.div>
                 ))}
              </div>
          </GlassCard>
        </div>
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-emerald-100/50 shadow-2xl rounded-3xl max-w-md p-0 overflow-hidden outline-none">
            <DialogHeader className="p-6 pb-2 border-b border-emerald-50 bg-emerald-50/30">
                <DialogTitle className="flex items-center gap-3 text-xl text-slate-800"><div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm"><CreditCard className="h-5 w-5 text-emerald-600" /></div>Historial de Pagos</DialogTitle>
                <DialogDescription className="text-slate-500 ml-1">Listado completo de ingresos para {name || "este contacto"}.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] w-full bg-white/50">
                <div className="p-4 space-y-3">
                    {initialPayments.map((p, index) => (
                        <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition-colors"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-sm font-bold text-slate-700">Ingreso Confirmado</p><p className="text-xs text-slate-400 capitalize flex items-center gap-1"><Clock className="h-3 w-3" /> {safeFullDate(p.created_at)}</p></div></div>
                            <div className="text-right"><span className="block text-lg font-bold text-emerald-600">+${p.amount.toLocaleString("es-ES")}</span><Badge variant="outline" className="text-[10px] px-2 py-0 h-5 bg-emerald-50 text-emerald-700 border-emerald-200 mt-1">Aprobado</Badge></div>
                        </motion.div>
                    ))}
                </div>
            </ScrollArea>
            <DialogFooter className="bg-slate-50 border-t border-slate-200 p-6"><div className="w-full flex items-center justify-between"><span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Acumulado</span><span className="text-2xl font-bold text-emerald-600">${totalPayments.toLocaleString("es-ES")}</span></div></DialogFooter>
        </DialogContent>
      </Dialog>

      <TagManager 
         availableTags={availableTags} 
         onUpdateTags={refreshTags} 
         open={isManagerOpen} 
         onOpenChange={setIsManagerOpen} 
      />
    </div>
  )
}
