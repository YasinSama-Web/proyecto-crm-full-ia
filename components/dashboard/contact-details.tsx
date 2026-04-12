"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { X, User, Phone, Tag as TagIcon, StickyNote, Save, ExternalLink, Plus, Check, TrendingUp, Brain, Sparkles, Loader2 } from "lucide-react" // 🔥 Añadidos Brain, Sparkles y Loader2
import type { Conversacion } from "@/lib/db-types"
import Swal from "sweetalert2"
import { ContactPaymentWidget } from "./contact-payment-widget"
import { useRouter } from "next/navigation"
import { TagManager } from "@/components/dashboard/tag-manager" 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQueryClient } from "@tanstack/react-query"

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
  
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const [pipelineStageId, setPipelineStageId] = useState<string>("none")
  const [stages, setStages] = useState<{id: string, name: string}[]>([])
  const queryClient = useQueryClient()

const [aiProfile, setAiProfile] = useState<string | null>(null)
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false)
  
  const [leadScore, setLeadScore] = useState<number | null>(null)
  const [leadScoreReason, setLeadScoreReason] = useState<string | null>(null)
  const [isGeneratingScore, setIsGeneratingScore] = useState(false)

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

    setName(conversation.contact_name || "")
    setNotes(conversation.notes || "") 
    setTags(Array.isArray(conversation.tags) ? conversation.tags : [])
    setAiProfile(null) // Reseteamos perfil IA al cambiar de chat
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
        
        const res = await fetch(`/api/contacts?phone=${encodeURIComponent(phone)}&t=${Date.now()}`)
        if (!res.ok) throw new Error("API Error")
        
        const data = await res.json()
        const contact = data?.[0]

        if (currentPhoneRef.current !== phone) return

        if (contact) {
            setContactId(contact.id)
            if (contact.name) setName(contact.name)
            if (contact.notes) setNotes(contact.notes)
            if (Array.isArray(contact.tags)) setTags(contact.tags)
            
            // Datos de IA
            if (contact.ai_profile) setAiProfile(contact.ai_profile) 
            if (contact.lead_score !== undefined) setLeadScore(contact.lead_score)
            if (contact.lead_score_reason) setLeadScoreReason(contact.lead_score_reason)
            
            setPipelineStageId(contact.pipeline_stage_id || "none")
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
    setTags(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName])
  }

  const handleSave = async () => {
    if (!conversation?.contact_phone) return
    
    try {
      let targetId = contactId
      
      if (!targetId) {
          const resGet = await fetch(`/api/contacts?phone=${encodeURIComponent(conversation.contact_phone)}&t=${Date.now()}`)
          const contacts = await resGet.json()
          if (contacts?.[0]) {
             targetId = contacts[0].id
             setContactId(targetId)
          }
      }

      if (!targetId) {
          const resCreate = await fetch(`/api/contacts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: conversation.contact_phone, name: name || conversation.contact_phone })
          })
          
          if (resCreate.ok) {
              const newContact = await resCreate.json()
              targetId = newContact.id || newContact[0]?.id
              setContactId(targetId)
          } else {
              throw new Error("No se pudo auto-crear el contacto en la BD")
          }
      }
      
      const payload = { name, notes, tags, pipeline_stage_id: pipelineStageId === "none" ? null : pipelineStageId }

      const res = await fetch(`/api/contacts/${targetId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      })
        
      if (!res.ok) throw new Error("Failed to save patch")
        
      if (conversation.id) {
         if (onUpdateConversationTags) onUpdateConversationTags(conversation.id, tags)
         if (onUpdateContactData) onUpdateContactData(conversation.id, { name, notes })
      }
        
      Swal.fire({ icon: "success", title: "Guardado", toast: true, position: "top-end", timer: 1500, showConfirmButton: false })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })

    } catch (error) {
      console.error(error)
      Swal.fire({ icon: "error", title: "Error al guardar", toast: true, position: "top-end", timer: 2000 })
    }
  }

  // 🔥 FUNCIÓN DEL ADDON: GENERAR PERFIL PSICOLÓGICO 🔥
  const handleGenerateProfile = async () => {
      if (!conversation?.id || !contactId) {
          Swal.fire({ icon: "warning", title: "Falta información", text: "Guarda el contacto primero antes de perfilarlo." })
          return;
      }

      setIsGeneratingProfile(true)
      try {
          // Llamaremos a nuestro futuro endpoint de IA
          const res = await fetch('/api/ai/profile-lead', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: conversation.id, contactId: contactId })
          });

          const data = await res.json();

          if (!res.ok) throw new Error(data.error || "Error generando perfil");

          setAiProfile(data.profile);
          Swal.fire({ icon: "success", title: "Perfil generado", text: "Se descontaron 5 créditos.", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
          
      } catch (error: any) {
          console.error(error);
          Swal.fire({ icon: "error", title: "Operación fallida", text: error.message });
      } finally {
          setIsGeneratingProfile(false)
      }
  }

  const handleGenerateScore = async () => {
      if (!conversation?.id || !contactId) return Swal.fire({ icon: "warning", title: "Falta información", text: "Guarda el contacto primero." });
      
      setIsGeneratingScore(true)
      try {
          const res = await fetch('/api/ai/lead-score', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: conversation.id, contactId: contactId })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Error generando score");

          setLeadScore(data.score);
          setLeadScoreReason(data.reason);
          Swal.fire({ icon: "success", title: "Temperatura medida", text: "Se descontaron 3 créditos.", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } catch (error: any) {
          Swal.fire({ icon: "error", title: "Operación fallida", text: error.message });
      } finally { setIsGeneratingScore(false) }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-border w-80 shadow-xl overflow-hidden">
      <div className="flex-none flex items-center justify-between p-4 border-b border-border bg-card">
        <h3 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Detalles</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-6">
            
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
            
            {/* 🔥 WIDGET: PERFILADO PSICOLÓGICO IA 🔥 */}
            <div className="space-y-3 bg-blue-50/50 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
                <div className="flex items-center justify-between mb-1 pl-1">
                    <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <label className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">Radiografía IA</label>
                    </div>
                    <Badge variant="secondary" className="text-[9px] bg-white border border-blue-100 text-blue-700 font-bold px-1.5 py-0 shadow-sm">ADD-ON</Badge>
                </div>
                
                <div className="pl-1">
                    {aiProfile ? (
                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm font-medium leading-relaxed">
                            {aiProfile}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-blue-200 dark:border-blue-800">
                            Analiza la charla para descubrir cómo venderle a este cliente.
                        </p>
                    )}
                </div>

                <Button 
                    size="sm" 
                    className="w-full text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2 rounded-xl transition-all hover:scale-[1.02]" 
                    onClick={handleGenerateProfile}
                    disabled={isGeneratingProfile}
                >
                    {isGeneratingProfile ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Analizando Chat...</>
                    ) : (
                        <><Sparkles className="w-4 h-4 text-blue-200" /> Generar Perfil (5 Cr)</>
                    )}
                </Button>
            </div>

            <Separator />

            {/* 🔥 WIDGET: TERMÓMETRO DE VENTAS (LEAD SCORING) 🔥 */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Termómetro de Compra</label>
                    </div>
                </div>
                
                <div className="pt-2 pb-1">
                    {leadScore !== null ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className={`text-3xl font-black leading-none tracking-tighter ${leadScore < 40 ? 'text-blue-500' : leadScore < 75 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {leadScore}%
                                </span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {leadScore < 40 ? '❄️ Frío' : leadScore < 75 ? '☀️ Tibio' : '🔥 Caliente'}
                                </span>
                            </div>
                            
                            {/* Barra de progreso de temperatura */}
                            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${leadScore < 40 ? 'bg-blue-500' : leadScore < 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}
                                    style={{ width: `${leadScore}%` }}
                                />
                            </div>

                            {/* Razón dada por la IA */}
                            {leadScoreReason && (
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 italic leading-tight">
                                    "{leadScoreReason}"
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            Mide la temperatura del lead para saber si está listo para comprar.
                        </p>
                    )}
                </div>

                <Button 
                    size="sm" variant="outline"
                    className="w-full text-xs h-8 shadow-sm gap-2 rounded-xl transition-all" 
                    onClick={handleGenerateScore}
                    disabled={isGeneratingScore}
                >
                    {isGeneratingScore ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Midiendo...</>
                    ) : (
                        <><Sparkles className="w-3.5 h-3.5 text-amber-500" /> Medir Temperatura (3 Cr)</>
                    )}
                </Button>
            </div>
            
            <Separator />
            
            
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
            
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><TagIcon className="w-3 h-3" /> Etiquetas</label>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] text-blue-500 hover:text-blue-600 p-0" onClick={() => setIsManagerOpen(true)}>Administrar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {tags.map(tagName => {
                        const tagMeta = availableTags.find(t => t.name === tagName);
                        const color = tagMeta ? tagMeta.color : '#64748b'; 

                        return (
                            <Badge 
                            key={tagName} 
                            className="pl-2 pr-1 py-1 text-xs font-medium border-0 flex items-center gap-1 transition-all hover:opacity-80" 
                            style={{ backgroundColor: color, color: '#fff' }}
                            >
                                {tagName} 
                                <div className="cursor-pointer bg-white/20 rounded-full p-0.5 hover:bg-white/40 ml-1" onClick={() => toggleTag(tagName)}>
                                <X className="w-3 h-3" />
                                </div>
                            </Badge>
                        )
                    })}
                    
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
            
            {conversation.id && <div><ContactPaymentWidget contactPhone={conversation.contact_phone} conversationId={conversation.id} /></div>}
            
            <Separator />
            <div className="space-y-4 bg-violet-50/50 dark:bg-violet-950/10 p-3 rounded-xl border border-violet-100 dark:border-violet-900/30">
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
      
      <TagManager 
        availableTags={availableTags} 
        onUpdateTags={refreshTags} 
        open={isManagerOpen} 
        onOpenChange={setIsManagerOpen}
      />
    </div>
  )
}