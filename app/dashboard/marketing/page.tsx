"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Activity, LinkIcon, Facebook, Target, Zap, SettingsIcon, Copy, Trash2, Plus, DollarSign, TrendingUp, Users, Loader2, CheckCircle2, XCircle, Database } from "lucide-react"
import Swal from "sweetalert2"
import { getFblLogs } from "./action"
import {
  getSmartLinks,
  createSmartLink,
  deleteSmartLink,
  getMarketingEvents,
  reportConversionCAPI,
  getPixelSettings,
  savePixelSettings,
  cancelCAPIEvent,
  forceSendCAPIEvent // 🔥 Asegúrate de exportar esto desde tu actions.ts
} from "./action"

interface SmartLink {
  id: string
  nombre: string
  slug: string
  url_destino: string
  clics: number
  created_at: string
}

interface MarketingEvent {
  id: string
  event_id: string
  fuente: string
  estado: string
  valor: number
  created_at: string
  processing_until?: string // 🔥 Agregado para el contador
}

interface PixelSettings {
  meta_pixel_id: string
  meta_access_token: string
  tiktok_pixel_id: string
  tiktok_access_token: string
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl ${className}`}>
      {children}
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon: Icon, gradient, delay = 0 }: { title: string, value: string | number, subtitle: string, icon: any, gradient: string, delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, delay }} whileHover={{ scale: 1.02, rotateY: 2 }} className="transform-gpu">
      <div className={`${gradient} rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}>
        <svg className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20" viewBox="0 0 100 100"><path d="M20,80 Q40,60 60,70 T100,50" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M0,60 Q30,40 50,50 T100,30" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-white/70">{subtitle}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><Icon className="h-6 w-6" /></div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MarketingCenter() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isLoading, setIsLoading] = useState(false)
  const [smartLinks, setSmartLinks] = useState<SmartLink[]>([])
  const [events, setEvents] = useState<MarketingEvent[]>([])
  const [pixelSettings, setPixelSettings] = useState<PixelSettings>({ meta_pixel_id: "", meta_access_token: "", tiktok_pixel_id: "", tiktok_access_token: "" })
  const [showTikTok, setShowTikTok] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newLink, setNewLink] = useState({ nombre: "", slug: "", url_destino: "" })
  const [eventId, setEventId] = useState("")
  const [manualCapiForm, setManualCapiForm] = useState({
  eventId: "", value: "", currency: "ARS", name: "", phone: "", email: "", city: "", country: "ar"});
  const [showAdvancedCapi, setShowAdvancedCapi] = useState(false);
  const [fblLogs, setFblLogs] = useState<any[]>([]);
  // 🔥 ESTADO DEL COUNTDOWN
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  useEffect(() => { loadData() }, [])

  // 🔥 LÓGICA DEL COUNTDOWN
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns: Record<string, number> = {};
      events.forEach(event => {
        if (event.estado === 'processing' && event.processing_until) {
          const diff = new Date(event.processing_until).getTime() - Date.now();
          newCountdowns[event.id] = Math.max(0, Math.ceil(diff / 1000));
          
          // Auto-recargar si llega a 0 para que la UI se actualice
          if (newCountdowns[event.id] === 0) {
            setTimeout(() => loadData(), 2000); 
          }
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [events]);

  const loadData = async () => {
    try {
      const [linksData, eventsData, settingsData, logsData] = await Promise.all([
        getSmartLinks(), getMarketingEvents(), getPixelSettings(), getFblLogs()
      ])
      setSmartLinks(linksData)
      setEvents(eventsData as any)
      setFblLogs(logsData) // <-- Guardamos los logs
      if (settingsData) setPixelSettings(settingsData)
    } catch (error) { console.error("Error loading data:", error) }
  }

  // --- Handlers Básicos ---
  const handleCreateLink = async () => {
    if (!newLink.nombre || !newLink.url_destino) { Swal.fire({ icon: "error", title: "Campos requeridos", text: "Por favor completa el nombre y la URL" }); return }
    setIsLoading(true)
    try {
      await createSmartLink(newLink.nombre, newLink.slug, newLink.url_destino)
      await loadData()
      setIsDialogOpen(false)
      setNewLink({ nombre: "", slug: "", url_destino: "" })
      Swal.fire({ icon: "success", title: "Link creado", timer: 2000, showConfirmButton: false })
    } catch (error) { Swal.fire({ icon: "error", title: "Error", text: "No se pudo crear el link" }) } finally { setIsLoading(false) }
  }

  const handleDeleteLink = async (id: string) => {
    const result = await Swal.fire({ title: "¿Eliminar link?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444" })
    if (result.isConfirmed) {
      try { await deleteSmartLink(id); await loadData(); Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false }) } catch (error) { Swal.fire({ icon: "error", title: "Error" }) }
    }
  }

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/l/${slug}`)
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Link copiado", showConfirmButton: false, timer: 2000 })
  }

  const handleReportCAPI = async (eventType: "LEAD" | "PURCHASE") => {
  if (!manualCapiForm.eventId.trim()) { Swal.fire({ icon: "error", title: "Event ID / fbclid requerido" }); return }
  setIsLoading(true)
  try {
    const res = await reportConversionCAPI({
      eventId: manualCapiForm.eventId,
      type: eventType,
      value: Number(manualCapiForm.value) || 0,
      currency: manualCapiForm.currency,
      name: manualCapiForm.name,
      phone: manualCapiForm.phone,
      email: manualCapiForm.email,
      city: manualCapiForm.city,
      country: manualCapiForm.country
    });
    
    if (res.success) {
      Swal.fire({ icon: "success", title: `${eventType} enviado a Meta`, timer: 2500, showConfirmButton: false });
      setManualCapiForm({ eventId: "", value: "", currency: "ARS", name: "", phone: "", email: "", city: "", country: "ar" });
      await loadData();
    } else { throw new Error(res.error) }
  } catch (error) { Swal.fire({ icon: "error", title: "Error", text: "No se pudo enviar el evento a Meta" }) } 
  finally { setIsLoading(false) }
}

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try { await savePixelSettings(pixelSettings); Swal.fire({ icon: "success", title: "Guardado", timer: 2000, showConfirmButton: false }) } catch (error) { Swal.fire({ icon: "error", title: "Error" }) } finally { setIsLoading(false) }
  }

  // 🔥 HANDLERS DEL LEAD TRACKING
  const handleCancelEvent = async (id: string) => {
    try {
      await cancelCAPIEvent(id);
      await loadData();
      Swal.fire({ toast: true, position: "bottom-end", icon: "info", title: "Envío cancelado", showConfirmButton: false, timer: 2000 });
    } catch (e) { console.error(e) }
  }

  const handleSendNow = async (id: string) => {
    Swal.fire({ title: 'Enviando a Meta...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await forceSendCAPIEvent(id);
      await loadData();
      if (res?.success) Swal.fire('¡Enviado!', 'El evento se procesó correctamente.', 'success');
      else throw new Error("Error de API");
    } catch (e) { Swal.fire('Error', 'Fallo al forzar el envío', 'error') }
  }


  // KPI calculations
  const totalEvents = events.length
  const pendingLeads = events.filter((e) => e.estado === "processing" || e.estado === "Pendiente").length
  const reportedEvents = events.filter((e) => e.estado === "sent" || e.estado === "Reportado").length
  const totalValue = events.reduce((sum, e) => sum + (e.valor || 0), 0)

  const tabs = [
    { id: "dashboard", label: "Dashboard & CAPI", icon: Activity },
    { id: "smart-links", label: "Smart Links", icon: LinkIcon },
    { id: "tracking", label: "Lead Tracking", icon: Target },
    { id: "fbl-logs", label: "Sesiones (FBL)", icon: Database },
    { id: "settings", label: "Configuración", icon: SettingsIcon },
  ]

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Marketing Center</h1>
          <p className="text-slate-500 mt-1">Gestiona Pixeles, Smart Links y eventos CAPI</p>
        </div>
      </motion.div>

      {/* Pills Navigation */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon; const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? "text-white" : "text-slate-600 hover:text-slate-800 hover:bg-white/50"}`}>
              {isActive && <motion.div layoutId="activeTab" className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
              <Icon className={`h-4 w-4 relative z-10 ${isActive ? "text-white" : ""}`} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          )
        })}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: Dashboard & CAPI */}
        {activeTab === "dashboard" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white"><Zap className="h-6 w-6" /></div>
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Cajero CAPI Manual</h3>
                      <p className="text-sm text-slate-500">Envía eventos offline enriquecidos directamente a Meta Ads</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowAdvancedCapi(!showAdvancedCapi)} className="text-xs">
                      {showAdvancedCapi ? "Ocultar PII" : "Enriquecer PII (Avanzado)"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Event ID (OBLIGATORIO) <span className="font-normal text-xs text-slate-400">- fbclid, código o ID único</span></Label>
                    <Input placeholder="Pegar fbclid o código aquí..." value={manualCapiForm.eventId} onChange={(e) => setManualCapiForm({...manualCapiForm, eventId: e.target.value})} className="bg-white/50 border-slate-200 focus:border-blue-400 rounded-xl" />
                  </div>

                  <AnimatePresence>
                    {showAdvancedCapi && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pb-4 border-t border-slate-200/50 mt-4">
                          
                          <div className="space-y-2">
                            <Label className="text-slate-600 text-xs">Monto ($)</Label>
                            <div className="flex gap-2">
                              <Input type="number" placeholder="Ej: 15000" value={manualCapiForm.value} onChange={(e) => setManualCapiForm({...manualCapiForm, value: e.target.value})} className="bg-white/50 rounded-xl" />
                              <Input placeholder="ARS" value={manualCapiForm.currency} onChange={(e) => setManualCapiForm({...manualCapiForm, currency: e.target.value})} className="bg-white/50 rounded-xl w-24 uppercase" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-600 text-xs">Nombre Completo</Label>
                            <Input placeholder="Juan Pérez" value={manualCapiForm.name} onChange={(e) => setManualCapiForm({...manualCapiForm, name: e.target.value})} className="bg-white/50 rounded-xl" />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-600 text-xs">Teléfono (+54...)</Label>
                            <Input placeholder="54911..." value={manualCapiForm.phone} onChange={(e) => setManualCapiForm({...manualCapiForm, phone: e.target.value})} className="bg-white/50 rounded-xl" />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-600 text-xs">Email</Label>
                            <Input type="email" placeholder="cliente@email.com" value={manualCapiForm.email} onChange={(e) => setManualCapiForm({...manualCapiForm, email: e.target.value})} className="bg-white/50 rounded-xl" />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-600 text-xs">Ciudad</Label>
                            <Input placeholder="Mendoza" value={manualCapiForm.city} onChange={(e) => setManualCapiForm({...manualCapiForm, city: e.target.value})} className="bg-white/50 rounded-xl" />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-600 text-xs">Código de País (ar, cl, mx)</Label>
                            <Input placeholder="ar" value={manualCapiForm.country} onChange={(e) => setManualCapiForm({...manualCapiForm, country: e.target.value})} className="bg-white/50 rounded-xl" />
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => handleReportCAPI("LEAD")} disabled={isLoading || !manualCapiForm.eventId.trim()} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-700 rounded-xl text-white shadow-sm">
                      Enviar LEAD
                    </Button>
                    <Button onClick={() => handleReportCAPI("PURCHASE")} disabled={isLoading || !manualCapiForm.eventId.trim()} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-700 rounded-xl text-white shadow-sm">
                      Enviar COMPRA
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
        )}

        {/* TAB 2: Smart Links (Acortado por brevedad, es igual al tuyo) */}
        {activeTab === "smart-links" && (
            // ... Mismo código de Smart Links que tenías ...
            <motion.div key="smart-links" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <GlassCard>
              <div className="p-6 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Smart Links</h3>
                    <p className="text-sm text-slate-500">Crea links acortados que trackean usuarios antes de redirigir</p>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 rounded-xl text-white">
                        <Plus className="h-4 w-4 mr-2" /> Crear Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 text-white border-slate-700">
                      <DialogHeader>
                        <DialogTitle>Crear Smart Link</DialogTitle>
                        <DialogDescription className="text-slate-400">Genera un link de seguimiento personalizado</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Nombre del Link</Label>
                          <Input placeholder="Ej: Promo Black Friday" value={newLink.nombre} onChange={(e) => setNewLink({ ...newLink, nombre: e.target.value })} className="bg-slate-800 border-slate-600 text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Slug (URL Corta)</Label>
                          <Input placeholder="Ej: promo-1" value={newLink.slug} onChange={(e) => setNewLink({ ...newLink, slug: e.target.value })} className="bg-slate-800 border-slate-600 text-white" />
                          <p className="text-xs text-slate-500">Tu link: /l/{newLink.slug || "slug"}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">URL Destino</Label>
                          <Input placeholder="https://wa.me/..." value={newLink.url_destino} onChange={(e) => setNewLink({ ...newLink, url_destino: e.target.value })} className="bg-slate-800 border-slate-600 text-white" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800">Cancelar</Button>
                        <Button onClick={handleCreateLink} disabled={isLoading} className="bg-white text-slate-900 hover:bg-slate-100">{isLoading ? "Creando..." : "Crear Link"}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="p-6">
                {smartLinks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500"><LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>No hay smart links creados</p></div>
                ) : (
                  <div className="space-y-3">
                    {smartLinks.map((link, index) => (
                      <motion.div key={link.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 hover:bg-white/80 group">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white"><LinkIcon className="h-4 w-4" /></div>
                          <div><p className="font-medium text-slate-800">{link.nombre}</p><code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">/l/{link.slug}</code></div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className="bg-emerald-100 text-emerald-700">{link.clics || 0} clics</Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleCopyLink(link.slug)} className="h-8 w-8 rounded-lg"><Copy className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteLink(link.id)} className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* 🔥 TAB 3: LEAD TRACKING ACTUALIZADO CON COUNTDOWN 🔥 */}
        {activeTab === "tracking" && (
          <motion.div key="tracking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <GlassCard>
              <div className="p-6 border-b border-slate-200/50">
                <h3 className="text-lg font-semibold text-slate-800">Lead Tracking</h3>
                <p className="text-sm text-slate-500">Historial detallado de eventos capturados. Los eventos en cola se envían automáticamente al expirar el tiempo.</p>
              </div>
              <div className="p-6">
                {events.length === 0 ? (
                  <div className="text-center py-12 text-slate-500"><Target className="h-12 w-12 mx-auto mb-4 opacity-30" /><p>No hay eventos registrados</p></div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event, index) => (
                      <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-all duration-200">
                        
                        {/* Izquierda: Info del evento */}
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl text-white shadow-sm ${
                            event.estado === "sent" || event.estado === "Reportado" ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                            event.estado === "processing" ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                            "bg-gradient-to-br from-slate-400 to-slate-500"
                          }`}>
                            {event.estado === "sent" ? <TrendingUp className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{event.event_id.slice(0, 16)}...</code>
                                {event.fuente && <Badge variant="outline" className="text-[10px] h-5 border-slate-300">{event.fuente}</Badge>}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(event.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>

                        {/* Derecha: Estado, Countdown y Acciones */}
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-slate-800">${(event.valor || 0).toLocaleString()}</span>
                          
                          {/* ESTADOS ESTÁTICOS */}
                          {(event.estado === "sent" || event.estado === "Reportado") && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none border-none">Enviado</Badge>}
                          {event.estado === "cancelled" && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 shadow-none border-none">Cancelado</Badge>}
                          {event.estado === "failed" && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 shadow-none border-none">Error de API</Badge>}

                          {/* EL FAMOSO COUNTDOWN (ESTADO PROCESSING) */}
                          {event.estado === 'processing' && (
                            <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-xl border shadow-sm">
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                {countdowns[event.id] > 0 
                                  ? `${Math.floor(countdowns[event.id] / 60)}:${String(countdowns[event.id] % 60).padStart(2, '0')}`
                                  : "Enviando..."}
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleCancelEvent(event.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-7 px-2 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancelar
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleSendNow(event.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs h-7 px-2 cursor-pointer bg-blue-50/50 font-semibold">
                                Forzar Envío
                              </Button>
                            </div>
                          )}
                        </div>

                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* 🔥 TAB 5: FBL LOGS (FIRST-PARTY DATA) 🔥 */}
        {activeTab === "fbl-logs" && (
          <motion.div key="fbl-logs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <GlassCard>
              <div className="p-6 border-b border-slate-200/50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Sesiones Registradas (Vault)</h3>
                  <p className="text-sm text-slate-500">Historial crudo de tráfico con captura de cookies de Meta.</p>
                </div>
                <Badge className="bg-slate-800 text-white">{fblLogs.length} sesiones</Badge>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/50 text-slate-600 font-semibold border-b border-slate-200/50">
                    <tr>
                      <th className="px-6 py-4">ID Sesión</th>
                      <th className="px-6 py-4">Fecha (ARG)</th>
                      <th className="px-6 py-4">IP</th>
                      <th className="px-6 py-4">FBC (Clic)</th>
                      <th className="px-6 py-4 text-center">FBP (Browser)</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {fblLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">
                          <Database className="h-8 w-8 mx-auto mb-3 opacity-30" />
                          No hay sesiones registradas aún
                        </td>
                      </tr>
                    ) : (
                      fblLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/40 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs text-slate-600">{log.session_id.replace('sess_', '')}</td>
                          <td className="px-6 py-3 text-slate-500">
                            {new Date(log.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-3 text-slate-500">{log.ip || '-'}</td>
                          <td className="px-6 py-3 font-mono text-xs text-slate-500" title={log.fbc || ''}>
                            {log.fbc ? `${log.fbc.substring(0, 25)}...` : '-'}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {log.fbp ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" title="FBP Capturado" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {log.used ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none shadow-none">Convertido</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none shadow-none">Pendiente</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* TAB 4: Configuración (Acortado por brevedad, es igual al tuyo) */}
        {activeTab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                {/* ... Tus cards de TikTok y Meta ... */}
                <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                    <Facebook className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Meta Ads (Facebook)</h3>
                    <p className="text-sm text-slate-500">Configuración del Pixel para CAPI</p>
                  </div>
                </div>
                <div className="space-y-4 max-w-2xl">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Pixel ID</Label>
                    <Input placeholder="123456789" value={pixelSettings.meta_pixel_id} onChange={(e) => setPixelSettings({ ...pixelSettings, meta_pixel_id: e.target.value })} className="bg-white/50 border-slate-200 focus:border-blue-400 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Access Token (API)</Label>
                    <Input type="password" placeholder="EAAxxxxxx" value={pixelSettings.meta_access_token} onChange={(e) => setPixelSettings({ ...pixelSettings, meta_access_token: e.target.value })} className="bg-white/50 border-slate-200 focus:border-blue-400 rounded-xl" />
                  </div>
                </div>
              </GlassCard>
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={isLoading} size="lg" className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 rounded-xl px-8 text-white">
                  <SettingsIcon className="h-4 w-4 mr-2" /> {isLoading ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}