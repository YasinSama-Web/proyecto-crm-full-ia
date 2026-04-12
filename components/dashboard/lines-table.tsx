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
import { MoreHorizontal, QrCode, Trash2, RefreshCw, Smartphone, Wifi, WifiOff, Bot, Pencil, Loader2, Plus, Lock, CheckCircle2, XCircle, Info, Zap, ArrowRight } from "lucide-react"
import { QRModal } from "./qr-modal"
import { useRouter } from "next/navigation"
import Swal from "sweetalert2"

interface Chatbot { id: string; nombre: string; color: string }

// 🔥 NUEVA INTERFAZ: Límite Unificado Omnicanal
interface LinesTableProps {
  lines: any[]             
  omniChannels?: any[]     
  chatbots: Chatbot[]
  unifiedLimit: { used: number; max: number } // <-- Reemplazamos los límites separados
}

const PLATFORM_META: Record<string, any> = {
  whatsapp:  { 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/3840px-WhatsApp.svg.png", 
      color: "#25D366", bg: "bg-[#25D366]/5", border: "border-[#25D366]/20 hover:border-[#25D366]/50", label: "WhatsApp" 
  },
  telegram:  { 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/960px-Telegram_logo.svg.png", 
      color: "#229ED9", bg: "bg-[#229ED9]/5", border: "border-[#229ED9]/20 hover:border-[#229ED9]/50", label: "Telegram" 
  },
  instagram: { 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/960px-Instagram_logo_2022.svg.png", 
      color: "#E1306C", bg: "bg-[#E1306C]/5", border: "border-[#E1306C]/20 hover:border-[#E1306C]/50", label: "Instagram" 
  },
  line:      { 
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/LINE_logo.svg/960px-LINE_logo.svg.png", 
      color: "#00C300", bg: "bg-[#00C300]/5", border: "border-[#00C300]/20 hover:border-[#00C300]/50", label: "LINE" 
  },
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl ${className}`}>{children}</div>
}

export function LinesTable({ lines = [], omniChannels = [], chatbots = [], unifiedLimit }: LinesTableProps) {
  const router = useRouter()
  
  const [localWa, setLocalWa] = useState<any[]>(lines)
  const [localOmni, setLocalOmni] = useState<any[]>(omniChannels)

  const activeConnections = [
    ...localWa.filter(l => !l.is_archived).map(l => ({ ...l, _type: 'whatsapp', _id: l.id, _name: l.nombre, _identifier: l.phone, _status: l.status, _bot: l.chatbot_id, _date: l.fecha_creacion })),
    ...localOmni.map(o => ({ ...o, _type: o.platform, _id: o.id, _name: o.name, _identifier: o.platform === 'telegram' ? 'Bot Token' : o.platform === 'instagram' ? 'IG Connected' : 'LINE Channel', _status: o.status, _bot: o.chatbot_id, _date: o.fecha_creacion }))
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  const assignedBotIds = activeConnections.map(c => c._bot).filter(id => id && id !== "none");
  
  // 🔥 LÓGICA DE BLOQUEO GLOBAL
  const isAllLimitsReached = unifiedLimit.used >= unifiedLimit.max;

  const [selectedWaLine, setSelectedWaLine] = useState<any | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingConn, setEditingConn] = useState<any | null>(null)
  const [editName, setEditName] = useState("")
  const [editBotId, setEditBotId] = useState<string>("none")
  const [isSaving, setIsSaving] = useState(false)

  const [isAddWaModalOpen, setIsAddWaModalOpen] = useState(false); const [newWaPhone, setNewWaPhone] = useState(""); const [newWaName, setNewWaName] = useState("");
  const [isAddTgModalOpen, setIsAddTgModalOpen] = useState(false); const [newTgToken, setNewTgToken] = useState(""); const [newTgName, setNewTgName] = useState("");
  const [isAddIgModalOpen, setIsAddIgModalOpen] = useState(false); const [newIgToken, setNewIgToken] = useState(""); const [newIgName, setNewIgName] = useState(""); const [newIgPageId, setNewIgPageId] = useState("");
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState(false); const [newLineToken, setNewLineToken] = useState(""); const [newLineName, setNewLineName] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONECTADA": case "ACTIVE": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 gap-1 shadow-sm"><Wifi className="h-3 w-3" />Conectada</Badge>
      case "DESCONECTADA": return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 gap-1 shadow-sm"><WifiOff className="h-3 w-3" />Desconectada</Badge>
      case "PENDING": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 gap-1 shadow-sm"><QrCode className="h-3 w-3" />Pendiente</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleShowQR = (line: any) => { setSelectedWaLine(line); setShowQR(true); }

  const openEditModal = (conn: any) => {
    setEditingConn(conn)
    setEditName(conn._name)
    setEditBotId(conn._bot || "none")
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingConn || !editName.trim()) return
    setIsSaving(true)
    try {
      const finalBotId = editBotId === "none" ? null : editBotId;
      const endpoint = editingConn._type === 'whatsapp' ? `/api/lineas/${editingConn._id}` : `/api/omni-channels/${editingConn._id}`;
      
      const res = await fetch(endpoint, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editName, name: editName, chatbot_id: finalBotId })
      })
      if (!res.ok) throw new Error("Error")

      if (editingConn._type === 'whatsapp') {
          setLocalWa(prev => prev.map(l => l.id === editingConn._id ? { ...l, nombre: editName, chatbot_id: finalBotId } : l));
      } else {
          setLocalOmni(prev => prev.map(o => o.id === editingConn._id ? { ...o, name: editName, chatbot_id: finalBotId } : o));
      }

      Swal.fire({ icon: 'success', title: 'Actualizado', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false })
      setIsEditModalOpen(false)
      router.refresh()
    } catch (error) { Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar.' }) } 
    finally { setIsSaving(false) }
  }

  const handleDelete = async (conn: any) => {
    const result = await Swal.fire({
        title: `¿Eliminar conexión?`, text: "Dejarás de recibir mensajes de este canal.",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, eliminar',
        customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
    })
    if (!result.isConfirmed) return
    try {
      const endpoint = conn._type === 'whatsapp' ? `/api/lineas/${conn._id}` : `/api/omni-channels/${conn._id}`;
      const res = await fetch(endpoint, { method: "DELETE" })
      
      if (res.ok) {
         if (conn._type === 'whatsapp') setLocalWa(prev => prev.filter(l => l.id !== conn._id));
         else setLocalOmni(prev => prev.filter(o => o.id !== conn._id));

         Swal.fire({ icon: 'success', title: 'Eliminado', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false })
         router.refresh()
      } else { throw new Error("Error al eliminar"); }
    } catch (error: any) { Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'No se pudo eliminar.' }) }
  }

  const handleCreateWaLine = async () => {
    if (!newWaPhone.trim()) return;
    setIsSaving(true)
    try {
      const res = await fetch("/api/lineas", { 
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: newWaPhone, nombre: newWaName })
      })
      if (!res.ok) throw new Error("Error al crear");
      const newLine = await res.json();
      setLocalWa(prev => [newLine, ...prev]);
      Swal.fire({ icon: 'success', title: 'Línea creada', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false })
      setIsAddWaModalOpen(false); setNewWaPhone(""); setNewWaName("");
      router.refresh()
    } catch (error: any) { Swal.fire({ icon: 'error', title: 'Error', text: error.message }) } 
    finally { setIsSaving(false) }
  }

  const handleAddNewOmniChannel = async (platform: string, name: string, token: string, pageId?: string) => {
    setIsSaving(true)
    try {
        const res = await fetch(`/api/omni-channels`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform, name, token, page_id: pageId })
        })
        if (!res.ok) throw new Error("Error al agregar canal")
        
        const newChannel = await res.json();
        setLocalOmni(prev => [newChannel, ...prev]);

        Swal.fire({ icon: 'success', title: 'Canal agregado', text: 'El canal fue configurado correctamente.', timer: 3000 })
        
        if(platform === 'telegram') { setIsAddTgModalOpen(false); setNewTgToken(""); setNewTgName(""); }
        if(platform === 'instagram') { setIsAddIgModalOpen(false); setNewIgToken(""); setNewIgName(""); setNewIgPageId(""); }
        if(platform === 'line') { setIsAddLineModalOpen(false); setNewLineToken(""); setNewLineName(""); }
        
        router.refresh();
    } catch (error) { Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar el canal.' }) }
    finally { setIsSaving(false) }
  }

  return (
    <>
      <GlassCard className="mb-8 overflow-hidden">
        <div className="p-6 bg-white/50 border-b border-slate-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl text-white shadow-lg">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-800 tracking-tight">Ecosistema Activo</h3>
              <p className="text-sm text-slate-500 font-medium">{activeConnections.length} conexiones funcionando</p>
            </div>
          </div>

          <div className="p-6 bg-white/50 border-b border-slate-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* LADO IZQUIERDO: TEXTO */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl text-white shadow-lg">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-800 tracking-tight">Ecosistema Activo</h3>
              <p className="text-sm text-slate-500 font-medium">{activeConnections.length} conexiones funcionando</p>
            </div>
          </div>

          {/* 🔥 LADO DERECHO: BOTÓN + LINK DEBAJO (ARREGLADO) */}
          <div className="flex flex-col items-center sm:items-end gap-2 min-w-[180px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button 
                    disabled={isAllLimitsReached} 
                    className={`w-full sm:w-auto rounded-2xl font-bold shadow-md h-12 px-6 transition-all duration-300 ${
                      isAllLimitsReached 
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white hover:scale-105'
                    }`}
                  >
                    {isAllLimitsReached ? <Lock className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    {isAllLimitsReached ? "Límites Alcanzados" : "Agregar Canal"}
                  </Button>
              </DropdownMenuTrigger>
              
              

        <DropdownMenuContent align="end" className="w-72 rounded-3xl p-3 shadow-2xl border-slate-100/50 bg-white/90 backdrop-blur-xl">
                
                {/* 🔥 ENCABEZADO OMNICANAL */}
                <div className="px-4 py-3 mb-2 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conexiones</span>
                    <Badge variant={isAllLimitsReached ? "destructive" : "secondary"} className="font-black text-sm">
                        {unifiedLimit.used} / {unifiedLimit.max}
                    </Badge>
                </div>

                {/* WHATSAPP */}
                <DropdownMenuItem disabled={isAllLimitsReached}
                    className={`cursor-pointer rounded-2xl py-3 px-4 font-semibold flex justify-between transition-colors duration-200 ${isAllLimitsReached ? 'opacity-50' : 'focus:bg-[#25D366]/10 hover:bg-[#25D366]/10'}`} 
                    onClick={() => { if(!isAllLimitsReached) setIsAddWaModalOpen(true) }}>
                    <div className="flex items-center gap-3">
                        <img src={PLATFORM_META.whatsapp.logo} alt="WA" className="w-6 h-6 object-contain drop-shadow-sm" />
                        <span className="text-slate-700">WhatsApp QR</span>
                    </div>
                </DropdownMenuItem>
                
                <div className="h-px bg-slate-100/50 my-1 mx-4" />

                {/* TELEGRAM */}
                <DropdownMenuItem disabled={isAllLimitsReached}
                    className={`cursor-pointer rounded-2xl py-3 px-4 font-semibold flex justify-between transition-colors duration-200 ${isAllLimitsReached ? 'opacity-50' : 'focus:bg-[#229ED9]/10 hover:bg-[#229ED9]/10'}`} 
                    onClick={() => { if(!isAllLimitsReached) setIsAddTgModalOpen(true) }}>
                    <div className="flex items-center gap-3">
                        <img src={PLATFORM_META.telegram.logo} alt="TG" className="w-6 h-6 object-contain drop-shadow-sm" />
                        <span className="text-slate-700">Telegram Bot</span>
                    </div>
                </DropdownMenuItem>

                {/* INSTAGRAM */}
                <DropdownMenuItem disabled={isAllLimitsReached}
                    className={`cursor-pointer rounded-2xl py-3 px-4 font-semibold flex justify-between transition-colors duration-200 ${isAllLimitsReached ? 'opacity-50' : 'focus:bg-[#E1306C]/10 hover:bg-[#E1306C]/10'}`} 
                    onClick={() => { if(!isAllLimitsReached) setIsAddIgModalOpen(true) }}>
                    <div className="flex items-center gap-3">
                        <img src={PLATFORM_META.instagram.logo} alt="IG" className="w-6 h-6 object-contain drop-shadow-sm" />
                        <span className="text-slate-700">Instagram Direct</span>
                    </div>
                </DropdownMenuItem>

                {/* LINE */}
                <DropdownMenuItem disabled={isAllLimitsReached}
                    className={`cursor-pointer rounded-2xl py-3 px-4 font-semibold flex justify-between transition-colors duration-200 ${isAllLimitsReached ? 'opacity-50' : 'focus:bg-[#00C300]/10 hover:bg-[#00C300]/10'}`} 
                    onClick={() => { if(!isAllLimitsReached) setIsAddLineModalOpen(true) }}>
                    <div className="flex items-center gap-3">
                        <img src={PLATFORM_META.line.logo} alt="LINE" className="w-6 h-6 object-contain drop-shadow-sm" />
                        <span className="text-slate-700">LINE Official</span>
                    </div>
                </DropdownMenuItem>

            </DropdownMenuContent>

            </DropdownMenu>

            {/* LINK DE UPGRADE CON POSICIÓN ABSOLUTA O CONTROLADA */}
            <AnimatePresence>
              {isAllLimitsReached && (
                <motion.button
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  onClick={() => router.push('/dashboard/billing?tab=ADDONS')}
                  className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Zap className="w-3 h-3 fill-emerald-600" />
                  ¿Necesitas más conexiones?
                  <ArrowRight className="w-3 h-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
          
        </div>



        <div className="p-6 space-y-4">
          {activeConnections.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <div className="flex justify-center mb-4 gap-2 opacity-50">
                  <img src={PLATFORM_META.whatsapp.logo} className="w-8 h-8 grayscale" />
                  <img src={PLATFORM_META.instagram.logo} className="w-8 h-8 grayscale" />
                  <img src={PLATFORM_META.telegram.logo} className="w-8 h-8 grayscale" />
              </div>
              <h3 className="text-xl font-bold text-slate-700">Ecosistema Vacío</h3>
              <p className="text-slate-500 font-medium mt-1">Conecta tu primer canal multicanal para darle vida a tu CRM.</p>
            </motion.div>
          ) : (
          <AnimatePresence mode="popLayout">
            {activeConnections.map((conn) => {
              const meta = PLATFORM_META[conn._type] || PLATFORM_META.whatsapp;
              const assignedBot = chatbots?.find(b => b.id === conn._bot);

              return (
              <motion.div key={conn._id} layout initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-3xl transition-all duration-300 group border bg-white ${meta.bg} ${meta.border}`}
              >
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div className={`p-3 rounded-2xl shadow-sm bg-white border border-slate-100`}>
                    <img src={meta.logo} alt={meta.label} className="w-8 h-8 object-contain drop-shadow-sm" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-lg text-slate-800">{conn._name}</p>
                        {assignedBot && (
                           <Badge variant="outline" className="text-xs h-6 bg-white/80 backdrop-blur-sm text-slate-700 border-slate-200 shadow-sm gap-1.5 px-2.5 hidden sm:flex">
                              <Bot className="h-3.5 w-3.5" style={{ color: assignedBot.color }} />{assignedBot.nombre}
                           </Badge>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white shadow-sm font-bold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
                        {conn._identifier || "Sin ID"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-16 sm:pl-0">
                  {getStatusBadge(conn._status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-400 hover:text-slate-700 hover:bg-slate-50">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl shadow-xl border-slate-100 p-2 w-52">
                      <DropdownMenuItem onClick={() => openEditModal(conn)} className="rounded-xl cursor-pointer font-semibold py-2.5">
                        <Pencil className="mr-3 h-4 w-4 text-blue-500" /> Editar Canal
                      </DropdownMenuItem>
                      
                      {conn._type === 'whatsapp' && (
                          <>
                            <div className="h-px bg-slate-100 my-1 mx-2" />
                            <DropdownMenuItem onClick={() => handleShowQR(conn)} className="rounded-xl cursor-pointer font-semibold py-2.5">
                                <QrCode className="mr-3 h-4 w-4 text-slate-600" /> {conn._status === "CONECTADA" ? "Ver conexión QR" : "Conectar WhatsApp"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShowQR(conn)} className="rounded-xl cursor-pointer font-semibold py-2.5">
                                <RefreshCw className="mr-3 h-4 w-4 text-slate-600" /> Reconectar
                            </DropdownMenuItem>
                          </>
                      )}

                      <div className="h-px bg-slate-100 my-1 mx-2" />
                      <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 rounded-xl cursor-pointer font-semibold py-2.5" onClick={() => handleDelete(conn)}>
                        <Trash2 className="mr-3 h-4 w-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            )})}
          </AnimatePresence>
          )}
        </div>
      </GlassCard>

      {/* 📚 SECCIÓN EDUCATIVA INTACTA ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* WA Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <img src={PLATFORM_META.whatsapp.logo} className="w-7 h-7" />
                <h4 className="font-bold text-slate-800">WhatsApp</h4>
            </div>
            <p className="text-sm text-slate-500 mb-4 h-10">Vincula tu número escaneando el código QR directamente desde la app oficial.</p>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Texto, Imágenes y Audio</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Envío de Documentos</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> IA / Mega Cerebro Full</div>
            </div>
        </div>

        {/* TG Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <img src={PLATFORM_META.telegram.logo} className="w-7 h-7" />
                <h4 className="font-bold text-slate-800">Telegram</h4>
            </div>
            <p className="text-sm text-slate-500 mb-4 h-10">Crea tu bot con <span className="font-semibold">@BotFather</span> y pega el Token HTTP en el CRM.</p>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mensajería de Texto</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> IA / Mega Cerebro Base</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><XCircle className="w-4 h-4 text-slate-300" /> Leer Imágenes (Pronto)</div>
            </div>
        </div>

        {/* IG Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-gradient-to-r from-[#833AB4] to-[#FD1D1D] text-white text-[10px] px-2 py-1 rounded-full font-bold">PRÓXIMAMENTE</div>
            <div className="flex items-center gap-3 mb-4">
                <img src={PLATFORM_META.instagram.logo} className="w-7 h-7" />
                <h4 className="font-bold text-slate-800">Instagram</h4>
            </div>
            <p className="text-sm text-slate-500 mb-4 h-10">Conecta tu cuenta Business mediante el inicio de sesión oficial de Meta.</p>
            <div className="space-y-2 opacity-60">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Zap className="w-4 h-4 text-amber-500" /> Respuestas a Stories</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Zap className="w-4 h-4 text-amber-500" /> Mensajes Directos (DM)</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Zap className="w-4 h-4 text-amber-500" /> IA / Mega Cerebro Full</div>
            </div>
        </div>

        {/* LINE Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <img src={PLATFORM_META.line.logo} className="w-7 h-7" />
                <h4 className="font-bold text-slate-800">LINE</h4>
            </div>
            <p className="text-sm text-slate-500 mb-4 h-10">Obtén el <span className="font-semibold">Channel Token</span> desde la consola de LINE Developers.</p>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mensajería de Texto</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> IA / Mega Cerebro Base</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><XCircle className="w-4 h-4 text-slate-300" /> Leer Imágenes (Pronto)</div>
            </div>
        </div>
      </div>

      {/* ================= MODALES ================= */}
      
      <QRModal open={showQR} onOpenChange={setShowQR} line={selectedWaLine} />

      {/* MODAL EDICIÓN GENÉRICO */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-0 shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-800"><Pencil className="h-6 w-6 text-blue-500" /> Ajustes del Canal</DialogTitle></DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">Nombre interno</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 flex items-center gap-2"><Bot className="h-4 w-4 text-blue-500" /> Cerebro IA Asignado</Label>
              <Select value={editBotId} onValueChange={setEditBotId}>
                <SelectTrigger className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-medium"><SelectValue placeholder="Seleccionar un chatbot" /></SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl border-slate-100">
                  <SelectItem value="none" className="italic text-slate-500 font-medium py-3">Modo Manual (Sin IA)</SelectItem>
                  {chatbots?.map(bot => {
                      const isAssignedToOther = assignedBotIds.includes(bot.id) && editingConn?._bot !== bot.id;
                      return (
                          <SelectItem key={bot.id} value={bot.id} disabled={isAssignedToOther} className="py-3 cursor-pointer">
                              <div className="flex items-center justify-between w-full min-w-[200px]">
                                  <div className="flex items-center gap-3 font-bold">
                                      <div className={`w-3 h-3 rounded-full shadow-sm ${isAssignedToOther ? 'opacity-50' : ''}`} style={{ backgroundColor: bot.color }} />
                                      <span className={isAssignedToOther ? "text-slate-400" : "text-slate-700"}>{bot.nombre}</span>
                                  </div>
                                  {isAssignedToOther && (
                                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-lg ml-3 font-extrabold uppercase tracking-wider">En uso</span>
                                  )}
                              </div>
                          </SelectItem>
                      )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-2xl font-bold hover:bg-slate-100">Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editName.trim()} className="rounded-2xl font-bold bg-slate-900 hover:bg-slate-800 text-white px-6">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR WHATSAPP */}
      <Dialog open={isAddWaModalOpen} onOpenChange={setIsAddWaModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-0 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#25D366]/10 mb-4 mx-auto">
                <img src={PLATFORM_META.whatsapp.logo} className="w-7 h-7" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-slate-800">Conectar WhatsApp</DialogTitle>
            <DialogDescription className="text-center font-medium">Ingresa el número oficial con código de país.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">Número de WhatsApp</Label>
              <Input placeholder="Ej: 5491123456789" value={newWaPhone} onChange={(e) => setNewWaPhone(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-medium" type="number" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">Nombre interno</Label>
              <Input placeholder="Ej: Ventas Principal" value={newWaName} onChange={(e) => setNewWaName(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-medium" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button onClick={handleCreateWaLine} disabled={isSaving || !newWaPhone.trim()} className="w-full rounded-2xl h-12 font-bold bg-[#25D366] hover:bg-[#1fa952] text-white text-md shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.02]">
              {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <QrCode className="w-5 h-5 mr-2" />} Generar Código QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR TELEGRAM */}
      <Dialog open={isAddTgModalOpen} onOpenChange={setIsAddTgModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-0 shadow-2xl">
          <DialogHeader>
             <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#229ED9]/10 mb-4 mx-auto">
                <img src={PLATFORM_META.telegram.logo} className="w-7 h-7" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-slate-800">Conectar Telegram</DialogTitle>
            <DialogDescription className="text-center font-medium">Pega el token generado por @BotFather.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">Nombre del Canal</Label>
              <Input placeholder="Ej: Soporte VIP" value={newTgName} onChange={(e) => setNewTgName(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Token HTTP API</Label>
              <Input placeholder="123456789:ABCdefGhIJKlmNoPQRstUVwxyZ" value={newTgToken} onChange={(e) => setNewTgToken(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-mono text-sm" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button onClick={() => handleAddNewOmniChannel('telegram', newTgName, newTgToken)} disabled={isSaving || !newTgName.trim() || !newTgToken.trim()} className="w-full rounded-2xl h-12 font-bold bg-[#229ED9] hover:bg-[#1c84b6] text-white text-md shadow-lg shadow-[#229ED9]/20 transition-all hover:scale-[1.02]">
              {isSaving && <Loader2 className="w-5 h-5 mr-2 animate-spin" />} Conectar Bot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR INSTAGRAM */}
      <Dialog open={isAddIgModalOpen} onOpenChange={setIsAddIgModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-0 shadow-2xl">
          <DialogHeader>
             <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] mb-4 mx-auto shadow-md">
                <img src={PLATFORM_META.instagram.logo} className="w-7 h-7 filter brightness-0 invert" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-slate-800">Conectar Instagram</DialogTitle>
            <DialogDescription className="text-center font-medium">Conexión manual vía Graph API.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">Nombre interno</Label>
              <Input placeholder="Ej: IG Principal" value={newIgName} onChange={(e) => setNewIgName(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Access Token</Label>
              <Input placeholder="EAABwz..." value={newIgToken} onChange={(e) => setNewIgToken(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Facebook Page ID</Label>
              <Input placeholder="10456..." value={newIgPageId} onChange={(e) => setNewIgPageId(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-mono text-sm" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button onClick={() => handleAddNewOmniChannel('instagram', newIgName, newIgToken, newIgPageId)} disabled={isSaving || !newIgName.trim() || !newIgToken.trim() || !newIgPageId.trim()} className="w-full rounded-2xl h-12 font-bold bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white text-md shadow-lg shadow-[#FD1D1D]/20 transition-all hover:scale-[1.02] border-0">
              {isSaving && <Loader2 className="w-5 h-5 mr-2 animate-spin" />} Sincronizar Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CREAR LINE */}
      <Dialog open={isAddLineModalOpen} onOpenChange={setIsAddLineModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-0 shadow-2xl">
          <DialogHeader>
             <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#00C300]/10 mb-4 mx-auto">
                <img src={PLATFORM_META.line.logo} className="w-7 h-7" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-slate-800">Conectar LINE</DialogTitle>
            <DialogDescription className="text-center font-medium">Pega el Channel Access Token de Developers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1">Nombre del Canal</Label>
              <Input placeholder="Ej: LINE Japón" value={newLineName} onChange={(e) => setNewLineName(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 ml-1 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Channel Token</Label>
              <Input placeholder="Token largo..." value={newLineToken} onChange={(e) => setNewLineToken(e.target.value)} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-mono text-sm" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button onClick={() => handleAddNewOmniChannel('line', newLineName, newLineToken)} disabled={isSaving || !newLineName.trim() || !newLineToken.trim()} className="w-full rounded-2xl h-12 font-bold bg-[#00C300] hover:bg-[#00A300] text-white text-md shadow-lg shadow-[#00C300]/20 transition-all hover:scale-[1.02]">
              {isSaving && <Loader2 className="w-5 h-5 mr-2 animate-spin" />} Conectar Messaging API
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}