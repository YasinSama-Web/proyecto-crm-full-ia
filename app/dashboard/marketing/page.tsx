"use client"

import React from "react"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Activity, LinkIcon, Facebook, Target, Zap, SettingsIcon, Copy, Trash2, Plus, DollarSign, TrendingUp, Users } from "lucide-react"
import Swal from "sweetalert2"
import {
  getSmartLinks,
  createSmartLink,
  deleteSmartLink,
  getMarketingEvents,
  reportConversionCAPI,
  getPixelSettings,
  savePixelSettings,
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
}

interface PixelSettings {
  meta_pixel_id: string
  meta_access_token: string
  tiktok_pixel_id: string
  tiktok_access_token: string
}

// Glassmorphism Card Component
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl ${className}`}>
      {children}
    </div>
  )
}

// KPI Card with Gradient
function KpiCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient, 
  delay = 0 
}: { 
  title: string
  value: string | number
  subtitle: string
  icon: any
  gradient: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02, rotateY: 2 }}
      className="transform-gpu"
    >
      <div className={`${gradient} rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}>
        {/* Decorative SVG */}
        <svg className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20" viewBox="0 0 100 100">
          <path d="M20,80 Q40,60 60,70 T100,50" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M0,60 Q30,40 50,50 T100,30" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
        
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-white/70">{subtitle}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Icon className="h-6 w-6" />
          </div>
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
  const [pixelSettings, setPixelSettings] = useState<PixelSettings>({
    meta_pixel_id: "",
    meta_access_token: "",
    tiktok_pixel_id: "",
    tiktok_access_token: "",
  })

  const [showTikTok, setShowTikTok] = useState(false)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newLink, setNewLink] = useState({ nombre: "", slug: "", url_destino: "" })

  // Test CAPI state
  const [eventId, setEventId] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [linksData, eventsData, settingsData] = await Promise.all([
        getSmartLinks(),
        getMarketingEvents(),
        getPixelSettings(),
      ])
      setSmartLinks(linksData)
      setEvents(eventsData)
      if (settingsData) setPixelSettings(settingsData)
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  const handleCreateLink = async () => {
    if (!newLink.nombre || !newLink.slug || !newLink.url_destino) {
      Swal.fire({ icon: "error", title: "Campos requeridos", text: "Por favor completa todos los campos" })
      return
    }

    setIsLoading(true)
    try {
      await createSmartLink(newLink.nombre, newLink.slug, newLink.url_destino)
      await loadData()
      setIsDialogOpen(false)
      setNewLink({ nombre: "", slug: "", url_destino: "" })
      Swal.fire({ icon: "success", title: "Link creado", text: "El Smart Link fue creado exitosamente", timer: 2000, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo crear el link" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteLink = async (id: string) => {
    const result = await Swal.fire({
      title: "¿Eliminar link?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    })

    if (result.isConfirmed) {
      try {
        await deleteSmartLink(id)
        await loadData()
        Swal.fire({ icon: "success", title: "Eliminado", timer: 1500, showConfirmButton: false })
      } catch (error) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo eliminar el link" })
      }
    }
  }

  const handleCopyLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/l/${slug}`
    navigator.clipboard.writeText(fullUrl)
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Link copiado", showConfirmButton: false, timer: 2000 })
  }

  const handleReportCAPI = async (eventType: "LEAD" | "PURCHASE") => {
    if (!eventId.trim()) {
      Swal.fire({ icon: "error", title: "Event ID requerido", text: "Por favor pega un fbclid válido" })
      return
    }

    setIsLoading(true)
    try {
      await reportConversionCAPI(eventId, eventType, eventType === "PURCHASE" ? 100 : 0)
      Swal.fire({ icon: "success", title: `${eventType} enviado a Meta`, text: "El evento fue reportado exitosamente", timer: 2500, showConfirmButton: false })
      setEventId("")
      await loadData()
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo enviar el evento a Meta" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      await savePixelSettings(pixelSettings)
      Swal.fire({ icon: "success", title: "Configuración guardada", timer: 2000, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo guardar la configuración" })
    } finally {
      setIsLoading(false)
    }
  }

  // KPI calculations
  const totalEvents = events.length
  const pendingLeads = events.filter((e) => e.estado === "Pendiente").length
  const reportedEvents = events.filter((e) => e.estado === "Reportado").length
  const totalValue = events.reduce((sum, e) => sum + (e.valor || 0), 0)

  const tabs = [
    { id: "dashboard", label: "Dashboard & CAPI", icon: Activity },
    { id: "smart-links", label: "Smart Links", icon: LinkIcon },
    { id: "tracking", label: "Lead Tracking", icon: Target },
    { id: "settings", label: "Configuración", icon: SettingsIcon },
  ]

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Marketing Center</h1>
          <p className="text-slate-500 mt-1">Gestiona Pixeles, Smart Links y eventos CAPI</p>
        </div>
      </motion.div>

      {/* Pills Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                isActive 
                  ? "text-white" 
                  : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
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
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Eventos Totales"
                value={totalEvents}
                subtitle="Registrados"
                icon={Activity}
                gradient="bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600"
                delay={0}
              />
              <KpiCard
                title="Leads Pendientes"
                value={pendingLeads}
                subtitle="Por enviar"
                icon={Users}
                gradient="bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600"
                delay={0.1}
              />
              <KpiCard
                title="Enviados a Meta"
                value={reportedEvents}
                subtitle="Conversiones"
                icon={Facebook}
                gradient="bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600"
                delay={0.2}
              />
              <KpiCard
                title="Valor Total"
                value={`$${totalValue.toFixed(0)}`}
                subtitle="En conversiones"
                icon={DollarSign}
                gradient="bg-gradient-to-br from-orange-400 via-orange-500 to-red-500"
                delay={0.3}
              />
            </div>

            {/* Test Manual CAPI */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Test Manual de CAPI</h3>
                    <p className="text-sm text-slate-500">Envía eventos de conversión directamente a Meta Ads</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-id" className="text-slate-700">Event ID (fbclid)</Label>
                    <Input
                      id="event-id"
                      placeholder="Pegar fbclid aquí..."
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      className="bg-white/50 border-slate-200 focus:border-blue-400 rounded-xl"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleReportCAPI("LEAD")}
                      disabled={isLoading || !eventId.trim()}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl"
                    >
                      {isLoading ? "Enviando..." : "Enviar LEAD"}
                    </Button>
                    <Button
                      onClick={() => handleReportCAPI("PURCHASE")}
                      disabled={isLoading || !eventId.trim()}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl"
                    >
                      {isLoading ? "Enviando..." : "Enviar COMPRA"}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}

        {/* TAB 2: Smart Links */}
        {activeTab === "smart-links" && (
          <motion.div
            key="smart-links"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard>
              <div className="p-6 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Smart Links</h3>
                    <p className="text-sm text-slate-500">Crea links acortados que trackean usuarios antes de redirigir</p>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 rounded-xl">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 text-white border-slate-700">
                      <DialogHeader>
                        <DialogTitle>Crear Smart Link</DialogTitle>
                        <DialogDescription className="text-slate-400">Genera un link de seguimiento personalizado</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombre" className="text-slate-300">Nombre del Link</Label>
                          <Input
                            id="nombre"
                            placeholder="Ej: Promo Black Friday"
                            value={newLink.nombre}
                            onChange={(e) => setNewLink({ ...newLink, nombre: e.target.value })}
                            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slug" className="text-slate-300">Slug (URL Corta)</Label>
                          <Input
                            id="slug"
                            placeholder="Ej: promo-1"
                            value={newLink.slug}
                            onChange={(e) => setNewLink({ ...newLink, slug: e.target.value })}
                            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                          />
                          <p className="text-xs text-slate-500">Tu link: /l/{newLink.slug || "slug"}</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="destino" className="text-slate-300">URL Destino</Label>
                          <Input
                            id="destino"
                            placeholder="https://wa.me/..."
                            value={newLink.url_destino}
                            onChange={(e) => setNewLink({ ...newLink, url_destino: e.target.value })}
                            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800">
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateLink} disabled={isLoading} className="bg-white text-slate-900 hover:bg-slate-100">
                          {isLoading ? "Creando..." : "Crear Link"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="p-6">
                {smartLinks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No hay smart links creados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {smartLinks.map((link, index) => (
                      <motion.div
                        key={link.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                            <LinkIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{link.name}</p>
                            <code className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">/l/{link.slug}</code>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                            {link.clicks || 0} clics
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleCopyLink(link.slug)} className="h-8 w-8 rounded-lg">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteLink(link.id)} className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* TAB 3: Lead Tracking */}
        {activeTab === "tracking" && (
          <motion.div
            key="tracking"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard>
              <div className="p-6 border-b border-slate-200/50">
                <h3 className="text-lg font-semibold text-slate-800">Lead Tracking</h3>
                <p className="text-sm text-slate-500">Historial detallado de eventos capturados</p>
              </div>
              <div className="p-6">
                {events.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No hay eventos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/50 hover:bg-white/80 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl text-white ${
                            event.estado === "Reportado" 
                              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                              : "bg-gradient-to-br from-amber-500 to-orange-600"
                          }`}>
                            {event.estado === "Reportado" ? <TrendingUp className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                          </div>
                          <div>
                            <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{event.event_id.slice(0, 20)}...</code>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(event.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={event.fuente === "Meta" ? "border-blue-300 text-blue-600" : "border-slate-300"}>
                            {event.fuente}
                          </Badge>
                          <Badge className={event.estado === "Reportado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                            {event.estado}
                          </Badge>
                          <span className="font-semibold text-slate-800">${event.valor.toFixed(2)}</span>
                          {event.estado === "Pendiente" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEventId(event.event_id); setActiveTab("dashboard") }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Reenviar
                            </Button>
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

        {/* TAB 4: Configuración */}
        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* TikTok Toggle */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tiktok-toggle" className="text-base font-medium text-slate-800">
                    Habilitar TikTok Ads
                  </Label>
                  <p className="text-sm text-slate-500">
                    Activa esta opción si necesitas configurar TikTok Pixel
                  </p>
                </div>
                <Switch id="tiktok-toggle" checked={showTikTok} onCheckedChange={setShowTikTok} />
              </div>
            </GlassCard>

            <div className={`grid gap-6 ${showTikTok ? "md:grid-cols-2" : "md:grid-cols-1 max-w-2xl"}`}>
              {/* Meta Ads Config */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                    <Facebook className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Meta Ads (Facebook)</h3>
                    <p className="text-sm text-slate-500">Configuración del Pixel</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="meta-pixel" className="text-slate-700">Pixel ID</Label>
                    <Input
                      id="meta-pixel"
                      placeholder="123456789"
                      value={pixelSettings.meta_pixel_id}
                      onChange={(e) => setPixelSettings({ ...pixelSettings, meta_pixel_id: e.target.value })}
                      className="bg-white/50 border-slate-200 focus:border-blue-400 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-token" className="text-slate-700">Access Token (API)</Label>
                    <Input
                      id="meta-token"
                      type="password"
                      placeholder="EAAxxxxxx"
                      value={pixelSettings.meta_access_token}
                      onChange={(e) => setPixelSettings({ ...pixelSettings, meta_access_token: e.target.value })}
                      className="bg-white/50 border-slate-200 focus:border-blue-400 rounded-xl"
                    />
                  </div>
                </div>
              </GlassCard>

              {/* TikTok Ads Config */}
              {showTikTok && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <GlassCard className="p-6 h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl text-white">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">TikTok Ads</h3>
                        <p className="text-sm text-slate-500">Configuración del Pixel</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="tiktok-pixel" className="text-slate-700">Pixel ID</Label>
                        <Input
                          id="tiktok-pixel"
                          placeholder="ABCD123"
                          value={pixelSettings.tiktok_pixel_id}
                          onChange={(e) => setPixelSettings({ ...pixelSettings, tiktok_pixel_id: e.target.value })}
                          className="bg-white/50 border-slate-200 focus:border-slate-400 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tiktok-token" className="text-slate-700">Access Token</Label>
                        <Input
                          id="tiktok-token"
                          type="password"
                          placeholder="tk_xxx"
                          value={pixelSettings.tiktok_access_token}
                          onChange={(e) => setPixelSettings({ ...pixelSettings, tiktok_access_token: e.target.value })}
                          className="bg-white/50 border-slate-200 focus:border-slate-400 rounded-xl"
                        />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={isLoading}
                size="lg"
                className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 rounded-xl px-8"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                {isLoading ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
