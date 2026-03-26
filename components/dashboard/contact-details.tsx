"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { X, User, Phone, Tag as TagIcon, StickyNote, Save, ExternalLink, Plus, Check, TrendingUp, DollarSign  } from "lucide-react"
import type { Conversacion } from "@/lib/db-types"
import Swal from "sweetalert2"
import { ContactPaymentWidget } from "./contact-payment-widget"
import { useRouter } from "next/navigation"
// Asegúrate de que la ruta a tu nuevo TagManager de v0 sea correcta
import { TagManager } from "@/components/dashboard/tag-manager" 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQueryClient } from "@tanstack/react-query"
// Definimos el tipo Tag aquí si no lo exporta el TagManager
export type Tag = { id: string; name: string; color: string };

interface ContactDetailsProps {
  conversation: (Conversacion & { 
    unread_count: number
    last_message: string | null 
    contact_name?: string
    contact_phone?: string
    id: string
    tags?: string[]
  }) | null
  onClose: () => void
  // 🔥 LIMPIEZA: Eliminamos availableTags y onUpdateGlobalTags de las props
  onUpdateConversationTags?: (conversationId: string, newTags: string[]) => void
  onUpdateContactData?: (conversationId: string, data: { name?: string, notes?: string }) => void
}

export function ContactDetails({ conversation, onClose, onUpdateConversationTags, onUpdateContactData }: ContactDetailsProps) {
  const router = useRouter()
  
  const currentPhoneRef = useRef<string | null>(null)

  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([]) 
  const [contactId, setContactId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // 🔥 NUEVO ESTADO LOCAL: Las etiquetas globales de la BD
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const [pipelineStageId, setPipelineStageId] = useState<string>("none")
  const [stages, setStages] = useState<{id: string, name: string}[]>([])
  const queryClient = useQueryClient()
  // 🔥 NUEVO EFECTO: Cargar etiquetas globales al iniciar el componente
  useEffect(() => {
    async function fetchGlobalTags() {
        try {
            const res = await fetch('/api/tags');
            if (res.ok) {
                const data = await res.json();
                setAvailableTags(data);
            }
        } catch (e) {
            console.error("Error cargando etiquetas globales:", e);
        }
    }
    fetchGlobalTags();
  }, []);

  // Función para refrescar etiquetas después de usar el Manager
  const refreshTags = async () => {
      const res = await fetch('/api/tags');
      if (res.ok) {
          const data = await res.json();
          setAvailableTags(data);
      }
  }


  useEffect(() => {
    if (!conversation) return

    const phone = conversation.contact_phone
    currentPhoneRef.current = phone 

    console.log(`🔵 [ContactDetails] Iniciando carga para: ${phone}`)

    setName(conversation.contact_name || "")
    setNotes(conversation.notes || "") 
    setTags(Array.isArray(conversation.tags) ? conversation.tags : [])
    setContactId(null) 
    setIsLoading(true)

    async function fetchFromDB() {
      if (!phone) return

      try {
        const stagesRes = await fetch('/api/pipeline')
        if (stagesRes.ok) {
            const stagesData = await stagesRes.json()
            if (stagesData.stages) setStages(stagesData.stages)
        }
        
        const res = await fetch(`/api/contacts?phone=${encodeURIComponent(phone)}`)
        if (!res.ok) throw new Error("API Error")
        
        const data = await res.json()
        const contact = data?.[0]

        if (currentPhoneRef.current !== phone) {
            console.warn("⚠️ [ContactDetails] Descartando respuesta vieja.")
            return
        }

        if (contact) {
            console.log(`✅ [ContactDetails] Datos recibidos para ${contact.phone}:`, contact.name)
            
            setContactId(contact.id)
            if (contact.name) setName(contact.name)
            if (contact.notes) setNotes(contact.notes)
            if (Array.isArray(contact.tags)) setTags(contact.tags)

            setPipelineStageId(contact.pipeline_stage_id || "none")
        } else {
            console.log("ℹ️ [ContactDetails] Contacto no existe en DB aún.")
        }
      } catch (error) {
        console.error("❌ [ContactDetails] Error fetch:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFromDB()

  }, [conversation?.id, conversation]) 

  if (!conversation) return null

  const toggleTag = (tagName: string) => {
    setTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName) 
        : [...prev, tagName]
    )
  }

const handleSave = async () => {
    if (!conversation?.contact_phone) return
    
    try {
      let targetId = contactId
      
      // 1. Si no tenemos ID, buscamos
      if (!targetId) {
          console.log("⚠️ [Save] No hay ID, buscando al vuelo...")
          const resGet = await fetch(`/api/contacts?phone=${encodeURIComponent(conversation.contact_phone)}`)
          const contacts = await resGet.json()
          if (contacts?.[0]) {
             targetId = contacts[0].id
             setContactId(targetId)
          }
      }

      // 2. Si SIGUE sin existir, lo CREAMOS (Auto-Upsert)
      if (!targetId) {
          console.log("🚀 [Save] Creando Contacto Fantasma en la Base de Datos...")
          const resCreate = await fetch(`/api/contacts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  phone: conversation.contact_phone, 
                  name: name || conversation.contact_phone 
              })
          })
          
          if (resCreate.ok) {
              const newContact = await resCreate.json()
              targetId = newContact.id || newContact[0]?.id
              setContactId(targetId)
          } else {
              throw new Error("No se pudo auto-crear el contacto en la BD")
          }
      }
      
      console.log(`💾 [Save] Guardando en ID ${targetId} | Nombre: ${name}`)

      const payload = { 
        name, 
        notes, 
        tags,
        pipeline_stage_id: pipelineStageId === "none" ? null : pipelineStageId
      }

      const res = await fetch(`/api/contacts/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        
      if (!res.ok) throw new Error("Failed to save patch")
        
      if (conversation.id) {
         if (onUpdateConversationTags) onUpdateConversationTags(conversation.id, tags)
         if (onUpdateContactData) onUpdateContactData(conversation.id, { name, notes })
      }
        
      Swal.fire({ icon: "success", title: "Guardado", toast: true, position: "top-end", timer: 1500, showConfirmButton: false })

      // 🔥 AQUÍ ES EL LUGAR CORRECTO PARA EL REFRESH MÁGICO 🔥
      // Le avisamos a la ConversationList que la base de datos acaba de cambiar
      queryClient.invalidateQueries({ queryKey: ['conversations'] })

    } catch (error) {
      console.error(error)
      Swal.fire({ icon: "error", title: "Error al guardar", toast: true, position: "top-end", timer: 2000 })
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-border w-80 shadow-xl overflow-hidden">
      {/* Header ... (sin cambios) */}
      <div className="flex-none flex items-center justify-between p-4 border-b border-border bg-card">
        <h3 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Detalles</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-6">
            {/* Avatar y Nombre ... (sin cambios) */}
            <div className="flex flex-col items-center gap-3 pt-2">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-2 border-primary/20">
                {(name?.[0] || conversation.contact_phone?.[0] || "#").toUpperCase()}
                </div>
                <div className="text-center w-full">
                    <h2 className="font-bold text-lg truncate px-2" title={name || conversation.contact_phone}>
                        {name || conversation.contact_phone}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {conversation.contact_phone}
                        {isLoading && <span className="ml-2 text-xs animate-pulse text-blue-500">Cargando...</span>}
                    </p>
                </div>
            </div>
            <Separator />
            {/* Inputs de Nombre y Teléfono ... (sin cambios) */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Nombre</label>
                    <div className="flex gap-2">
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del contacto" className="h-8" />
                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 bg-transparent" onClick={handleSave}><Save className="w-3 h-3" /></Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</label>
                    <Input value={conversation.contact_phone} disabled className="h-8 bg-muted/50" />
                </div>
            </div>
            <Separator />
            
            {/* 🔥 SECCIÓN DE ETIQUETAS ACTUALIZADA 🔥 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><TagIcon className="w-3 h-3" /> Etiquetas</label>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] text-blue-500 hover:text-blue-600 p-0" onClick={() => setIsManagerOpen(true)}>Administrar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {tags.map(tagName => {
                        // 🔥 Búsqueda resiliente del color en la nueva lista de la API
                        const tagMeta = availableTags.find(t => t.name === tagName);
                        // Si no existe el tag global, usamos un gris por defecto
                        const color = tagMeta ? tagMeta.color : '#64748b'; 

                        return (
                            <Badge 
                            key={tagName} 
                            className="pl-2 pr-1 py-1 text-xs font-medium border-0 flex items-center gap-1 transition-all hover:opacity-80" 
                            style={{ backgroundColor: color, color: '#fff' }}
                            >
                                {tagName} 
                                <div 
                                className="cursor-pointer bg-white/20 rounded-full p-0.5 hover:bg-white/40 ml-1" 
                                onClick={() => toggleTag(tagName)}
                                >
                                <X className="w-3 h-3" />
                                </div>
                            </Badge>
                        )
                    })}
                    
                    {/* Popover de Autocompletado ... (actualizado para usar availableTags local) */}
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs border-dashed border-slate-300 dark:border-slate-700 text-slate-500 bg-transparent"><Plus className="w-3.5 h-3.5 mr-1" /> Agregar</Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-52" align="start">
                          <Command>
                             <CommandInput placeholder="Buscar..." className="h-9" />
                             <CommandList>
                                <CommandEmpty className="py-2 px-2 text-xs text-center text-slate-500">No existe.</CommandEmpty>
                                <CommandGroup>
                                {availableTags.map(tag => {
                                    const isSelected = tags.includes(tag.name)
                                    return (
                                        <CommandItem 
                                            key={tag.id} 
                                            value={tag.name} 
                                            onSelect={() => toggleTag(tag.name)} 
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
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
                <Button size="sm" variant="ghost" className="w-full text-xs h-6 text-muted-foreground hover:bg-muted" onClick={handleSave}>Guardar etiquetas</Button>
            </div>
            <Separator />
            
            {/* Widget de Pagos, Pipeline y Notas ... (sin cambios) */}
            {conversation.id && <div><ContactPaymentWidget contactPhone={conversation.contact_phone} conversationId={conversation.id} /></div>}
            <Separator />
            <div className="space-y-4 bg-violet-50/50 dark:bg-violet-950/10 p-3 rounded-xl border border-violet-100 dark:border-violet-900/30">
                {/* ... Pipeline Select ... */}
                <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-violet-600" />
                    <label className="text-xs font-bold text-violet-900 dark:text-violet-300 uppercase">Proceso de Venta</label>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-medium text-muted-foreground">Mover a la etapa:</label>
                    <Select value={pipelineStageId} onValueChange={(val) => { setPipelineStageId(val); }}>
                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-violet-200">
                            <SelectValue placeholder="Sin asignar a ventas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-muted-foreground italic">No aplica / Quitar del Pipeline</SelectItem>
                            {stages.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button size="sm" className="w-full text-xs h-7 bg-violet-600 hover:bg-violet-700 text-white shadow-sm" onClick={handleSave}>
                    Actualizar Etapa
                </Button>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notas Internas</label>
                <Textarea placeholder="Escribe notas sobre este cliente..." className="resize-none h-32 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)}/>
                <Button size="sm" className="w-full text-xs h-7 mt-2" onClick={handleSave}>Guardar Notas</Button>
            </div>
            <Separator />
            {contactId && (
              <div className="pb-6">
                <Button variant="outline" className="w-full h-9 text-sm gap-2 bg-transparent hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => router.push(`/dashboard/contacts/${contactId}`)}><ExternalLink className="w-4 h-4" /> Ver Perfil Completo</Button>
              </div>
            )}
            </div>
        </ScrollArea>
      </div>
      
      {/* 🔥 TagManager conectado al refresco local */}
      <TagManager 
        availableTags={availableTags} 
        onUpdateTags={refreshTags} // Cuando el manager cambie algo, refrescamos la lista local
        open={isManagerOpen} 
        onOpenChange={setIsManagerOpen}
      />
    </div>
  )
}
