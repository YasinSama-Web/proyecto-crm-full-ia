"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, QrCode, Trash2, RefreshCw, Smartphone, Wifi, WifiOff, Bot, Pencil, Loader2 } from "lucide-react"
import type { LineaWhatsApp } from "@/lib/db-types"
import { QRModal } from "./qr-modal"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"

// Extendemos el tipo localmente por si aún no has actualizado db-types.ts
type LineaExtended = LineaWhatsApp & { chatbot_id?: string | null }

interface Chatbot {
  id: string
  nombre: string
  color: string
}

interface LinesTableProps {
  lines: LineaExtended[]
  chatbots: Chatbot[] // 🔥 NUEVO: Recibimos los bots disponibles
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl ${className}`}>
      {children}
    </div>
  )
}

export function LinesTable({ lines: initialLines, chatbots }: LinesTableProps) {
  const [lines, setLines] = useState<LineaExtended[]>(initialLines)
  const [selectedLine, setSelectedLine] = useState<LineaExtended | null>(null)
  const [showQR, setShowQR] = useState(false)
  const router = useRouter()

  // 🔥 ESTADOS PARA EL MODAL DE EDICIÓN
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<LineaExtended | null>(null)
  const [editName, setEditName] = useState("")
  const [editBotId, setEditBotId] = useState<string>("none")
  const [isSaving, setIsSaving] = useState(false)

  const activeLines = lines.filter(line => !line.is_archived)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONECTADA": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 gap-1"><Wifi className="h-3 w-3" />Conectada</Badge>
      case "DESCONECTADA": return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 gap-1"><WifiOff className="h-3 w-3" />Desconectada</Badge>
      case "PENDING": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 gap-1"><QrCode className="h-3 w-3" />Pendiente</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleShowQR = (line: LineaExtended) => {
    setSelectedLine(line)
    setShowQR(true)
  }

  // 🔥 ABRIR MODAL DE EDICIÓN
  const openEditModal = (line: LineaExtended) => {
    setEditingLine(line)
    setEditName(line.nombre)
    setEditBotId(line.chatbot_id || "none")
    setIsEditModalOpen(true)
  }

  // 🔥 GUARDAR CAMBIOS EN LA LÍNEA
  const handleSaveEdit = async () => {
    if (!editingLine || !editName.trim()) return
    setIsSaving(true)

    try {
      const finalBotId = editBotId === "none" ? null : editBotId;

      const res = await fetch(`/api/lineas/${editingLine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editName, chatbot_id: finalBotId })
      })

      if (!res.ok) throw new Error("Error al actualizar la línea")

      // Actualización optimista en la UI
      setLines(prev => prev.map(l => l.id === editingLine.id ? { ...l, nombre: editName, chatbot_id: finalBotId } : l))
      
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
      Toast.fire({ icon: 'success', title: 'Línea actualizada' })
      
      setIsEditModalOpen(false)
      router.refresh()
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la configuración.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (lineId: string) => {
    const result = await Swal.fire({
        title: '¿Eliminar línea?',
        text: "La línea se desconectará y desaparecerá de tu vista.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
    })

    if (!result.isConfirmed) return

    setLines((prev) => prev.filter((line) => line.id !== lineId))

    try {
      const res = await fetch(`/api/lineas/${lineId}`, { method: "DELETE" })
      if (res.ok) {
         const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 })
         Toast.fire({ icon: 'success', title: 'Línea eliminada' })
         router.refresh()
      } else throw new Error("Error")
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar la línea.' })
      router.refresh() 
    }
  }

  if (activeLines.length === 0) {
    return (
      <GlassCard className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-4 text-white">
            <Smartphone className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No hay líneas</h3>
          <p className="text-sm text-slate-500">Crea tu primera línea de WhatsApp para comenzar</p>
        </div>
      </GlassCard>
    )
  }

  return (
    <>
      <GlassCard>
        <div className="p-6 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Líneas Conectadas</h3>
              <p className="text-sm text-slate-500">
                {activeLines.length} línea{activeLines.length !== 1 ? 's' : ''} configurada{activeLines.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <AnimatePresence mode="popLayout">
            {activeLines.map((line, index) => {
              // Buscamos si la línea tiene un bot asignado para mostrar un badge sutil
              const assignedBot = chatbots?.find(b => b.id === line.chatbot_id);

              return (
              <motion.div
                key={line.id}
                layout 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-all duration-200 group border border-transparent hover:border-emerald-100/50"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl shadow-sm ${
                    line.status === "CONECTADA" 
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
                      : line.status === "PENDING"
                      ? "bg-gradient-to-br from-amber-400 to-orange-500"
                      : "bg-gradient-to-br from-slate-400 to-slate-500"
                  } text-white`}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{line.nombre}</p>
                        {/* 🔥 BADGE DEL BOT ASIGNADO */}
                        {assignedBot && (
                           <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 text-slate-600 border-slate-200 gap-1 px-1.5 hidden sm:flex">
                              <Bot className="h-3 w-3" style={{ color: assignedBot.color }} />
                              {assignedBot.nombre}
                           </Badge>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 font-mono">{line.phone || "Sin número"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {getStatusBadge(line.status)}
                  
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {new Date(line.fecha_creacion).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-slate-100 p-1 w-48">
                      {/* 🔥 NUEVO BOTÓN DE EDICIÓN */}
                      <DropdownMenuItem onClick={() => openEditModal(line)} className="rounded-lg cursor-pointer focus:bg-slate-100">
                        <Pencil className="mr-2 h-4 w-4 text-blue-600" />
                        Editar y Asignar Bot
                      </DropdownMenuItem>
                      
                      <div className="h-px bg-slate-100 my-1 mx-2" />

                      <DropdownMenuItem onClick={() => handleShowQR(line)} className="rounded-lg cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                        <QrCode className="mr-2 h-4 w-4" />
                        {line.status === "CONECTADA" ? "Ver conexión" : "Conectar WhatsApp"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShowQR(line)} className="rounded-lg cursor-pointer focus:bg-slate-100">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reconectar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg cursor-pointer" 
                        onClick={() => handleDelete(line.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            )})}
          </AnimatePresence>
        </div>
      </GlassCard>

      <QRModal open={showQR} onOpenChange={setShowQR} line={selectedLine} />

      {/* 🔥 MODAL DE EDICIÓN DE LÍNEA Y BOT */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => { setIsEditModalOpen(open); if(!open) setEditingLine(null); }}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-slate-500" />
                Configurar Línea
            </DialogTitle>
            <DialogDescription>
              Personaliza el nombre interno y asigna el Chatbot que gestionará las nuevas solicitudes de esta línea.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Nombre de la línea</Label>
              <Input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="Ej: Ventas Principal, Soporte Técnico..."
                className="rounded-xl border-slate-200 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Chatbot (Departamento) Asignado
              </Label>
              <Select value={editBotId} onValueChange={setEditBotId}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Seleccionar un chatbot" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none" className="text-slate-500 italic">No usar Chatbot (Humano directo)</SelectItem>
                  {chatbots?.map(bot => (
                      <SelectItem key={bot.id} value={bot.id}>
                          <div className="flex items-center gap-2 font-medium">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bot.color }} />
                              {bot.nombre}
                          </div>
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                  El Chatbot solo responderá a clientes que escriban por primera vez (Bandeja de Solicitudes). Al asignar el chat a un agente, el bot se pausará automáticamente.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editName.trim()} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Guardar Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
