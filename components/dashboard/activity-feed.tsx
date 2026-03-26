"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Activity, ArrowUpRight, User, Smartphone, Tag as TagIcon } from "lucide-react"
import Link from "next/link"

interface ActivityFeedProps {
  recentActivity: any[]
  isAgent: boolean
}

const formatTimeAgo = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} d`
}

const formatMessagePreview = (content: string, type?: string) => {
  // 1. Tipos explícitos
  if (type === "audio") return "🎤 Audio"
  if (type === "image" || type === "imagen") return "📷 Imagen adjunta"

  // 2. Fallback de URLs de Supabase (Si no vino el type)
  if (content && content.startsWith("http") && content.includes("supabase")) {
      // Si la URL es de un audio (.ogg) lo atajamos
      if (content.includes(".ogg") || content.includes("inbound-audio")) return "🎤 Audio"
      return "📷 Imagen adjunta"
  }
  
  return content
}

export function ActivityFeed({ recentActivity, isAgent }: ActivityFeedProps) {
  
  // 🔥 ESTADO DE ETIQUETAS GLOBALES
  const [availableTags, setAvailableTags] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.ok ? res.json() : [])
      .then(data => setAvailableTags(data))
      .catch(console.error)
  }, [])

  // 1. FILTRADO: Solo mostramos lo que NO esté resuelto/archivado
  const activeItems = recentActivity.filter((item) => item.status !== "RESOLVED")

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={!isAgent ? "lg:col-span-3" : "lg:col-span-1"}
    >
      <div className="rounded-3xl bg-card/80 dark:bg-card/60 backdrop-blur-sm shadow-xl overflow-hidden border border-border/50 h-full flex flex-col">
        
        {/* HEADER */}
        <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/50 to-card flex-none">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Feed de Actividad</h3>
              <p className="text-sm text-muted-foreground">Chats activos y solicitudes pendientes</p>
            </div>
          </div>
        </div>

        {/* LISTA SCROLLEABLE */}
        <div className="p-0 flex-1 overflow-y-auto max-h-[600px]"> {/* Altura máxima para scroll si es muy largo */}
          {activeItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">Todo al día</p>
              <p className="text-sm text-muted-foreground mt-1">No tienes mensajes pendientes de respuesta.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {activeItems.map((msg: any, index: number) => {
                // Determinar estado
                const isInbox = !msg.status || msg.status === "INBOX" || msg.status === "PENDING"
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Link
                      href={`/dashboard/messages?id=${msg.conversation_id}`}
                      className="flex items-start gap-4 p-5 hover:bg-muted/30 transition-all duration-300 group relative"
                    >
                      {/* AVATAR + INDICADOR */}
                      <div className="relative shrink-0">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white font-bold text-lg shadow-lg ${
                            isInbox 
                            ? "bg-gradient-to-br from-blue-400 to-blue-600" // Azul para Solicitud
                            : "bg-gradient-to-br from-emerald-400 to-emerald-600" // Verde para Principal
                        }`}>
                          {(msg.contact_name || msg.contact_phone || "#").charAt(0).toUpperCase()}
                        </div>
                        {/* Puntito de estado online/active */}
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${
                            isInbox ? "bg-blue-400" : "bg-emerald-400"
                        }`} />
                      </div>

                      {/* CONTENIDO */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        
                        {/* 1. PRIMERA FILA: Nombre + Badge Estado + Tiempo */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              {msg.contact_name || msg.contact_phone}
                            </p>
                            {isInbox ? (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-600 border-blue-200 shrink-0">
                                    Solicitud
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-50 text-emerald-600 border-emerald-200 shrink-0">
                                    Principal
                                </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                            {formatTimeAgo(msg.timestamp)}
                          </span>
                        </div>

                        {/* 2. SEGUNDA FILA: Preview del mensaje */}
                        <p className="text-sm text-muted-foreground line-clamp-1 font-medium">
                            {msg.is_incoming ? '' : 'Tú: '} 
                            {formatMessagePreview(msg.content, msg.type)}
                        </p>

                        {/* 3. TERCERA FILA: Etiquetas (Tags) 🔥 ACTUALIZADAS */}
                        {msg.tags && msg.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {msg.tags.map((tagName: string) => {
                                    const cleanTagName = tagName.trim().toLowerCase();
                                    const tagInfo = availableTags.find((t: any) => t.name.trim().toLowerCase() === cleanTagName);
                                    const color = tagInfo?.color || "#94a3b8"

                                    return (
                                        <span 
                                            key={tagName} 
                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border"
                                            style={{ 
                                                backgroundColor: `${color}15`, 
                                                color: color, 
                                                borderColor: `${color}30` 
                                            }}
                                        >
                                            <TagIcon className="w-2 h-2 mr-1" />
                                            {tagName}
                                        </span>
                                    )
                                })}
                            </div>
                        )}

                        {/* 4. CUARTA FILA: Info Técnica (Línea y Agente) */}
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground/70">
                            <div className="flex items-center gap-1 truncate max-w-[120px]">
                                <Smartphone className="w-3 h-3 opacity-70" />
                                <span className="truncate" title={msg.line_name || "Línea desconocida"}>
                                    {msg.line_name || "Línea desconocida"}
                                </span>
                            </div>
                            <div className="w-px h-3 bg-border" /> {/* Separador */}
                            <div className="flex items-center gap-1 truncate max-w-[120px]">
                                <User className="w-3 h-3 opacity-70" />
                                <span className="truncate" title={msg.agent_name || "Sin asignar"}>
                                    {msg.agent_name || "Sin asignar"}
                                </span>
                            </div>
                        </div>

                      </div>

                      {/* Icono Hover */}
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0 mt-1" />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
