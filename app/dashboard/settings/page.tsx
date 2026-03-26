"use client"

import React, { useState, useEffect } from "react"
import {
  Bell, Clock, Globe, Lock, Save, User, Volume2, ShieldAlert,
  Loader2, CreditCard, Languages, Timer, Calendar, Receipt
} from "lucide-react"
import Swal from "sweetalert2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { motion, AnimatePresence } from "framer-motion"
import { getUserSettings, updateSettings, updateProfile, changePassword } from "./actions"
import { useSettings } from "@/hooks/use-settings"

import { getMyBillingHistory } from "@/app/dashboard/billing/actions" 
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// --- COMPONENTES VISUALES ---
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-card/60 backdrop-blur-xl rounded-3xl border border-border/50 shadow-xl overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 dark:from-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function GlassInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input 
      {...props}
      className={`bg-background/50 backdrop-blur-sm border-border/60 focus:border-blue-400/50 focus:ring-blue-400/20 rounded-xl text-foreground placeholder:text-muted-foreground ${className}`}
    />
  )
}

function PillTabs({ tabs, activeTab, onTabChange }: { tabs: { id: string; label: string; icon: React.ReactNode }[]; activeTab: string; onTabChange: (id: string) => void }) {
  return (
    <div className="flex gap-2 p-1.5 bg-muted/20 backdrop-blur-md rounded-2xl border border-border/50 w-fit">
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === tab.id ? "text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="settingsPill"
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-lg"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </motion.button>
      ))}
    </div>
  )
}

function SettingRow({ icon, iconBg, title, description, children }: { 
  icon: React.ReactNode; iconBg: string; title: string; description: string; children: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-background/20 hover:bg-background/40 transition-colors border border-transparent hover:border-border/30">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// --- PÁGINA PRINCIPAL ---

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("general")

  const [billingHistory, setBillingHistory] = useState<any[]>([])
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    // 1. Traemos el historial de facturas
    getMyBillingHistory().then(history => {
        setBillingHistory(history);
    });

    // 2. Traemos los datos reales de Neon
    fetch('/api/auth/me?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data?.user) setUserData(data.user)
      })
      .catch(console.error)
  }, [])

  // Hook global para actualizar la app en tiempo real
  const globalSettings = useSettings()

  // Estado local del formulario
  const [settings, setSettings] = useState({
    language: "es",
    timezone: "america_argentina",
    soundEnabled: true,
    desktopNotifications: true,
    inactivityThreshold: 15,
    workStart: "09:00",
    workEnd: "18:00",
    weekendWork: false,
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  })

  // Función ayudante para calcular qué mostrar en la tarjeta de suscripción
  const getPlanInfo = () => {
    if (!userData) return { name: "Cargando...", price: "-", date: "-" }
    
    const plan = userData.plan?.toLowerCase() || "trial"
    const cycle = userData.billing_cycle?.toUpperCase() || "MONTHLY"
    
    const planNames: Record<string, string> = { trial: "Prueba Gratuita", starter: "Starter", pro: "Growth", enterprise: "Scale" }
    const name = planNames[plan] || plan
    
    let price = "Gratis"
    if (plan === "starter") price = cycle === "ANNUAL" ? "$250.000/año" : "$25.000/mes"
    if (plan === "pro") price = cycle === "ANNUAL" ? "$450.000/año" : "$45.000/mes"
    if (plan === "enterprise") price = cycle === "ANNUAL" ? "$850.000/año" : "$85.000/mes"

    const date = userData.plan_expires_at 
      ? new Date(userData.plan_expires_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' }) 
      : "Sin vencimiento"

    return { name, price, date }
  }

  const planInfo = getPlanInfo()

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getUserSettings()
        if (data) {
          const { theme, ...restSettings } = data.settings
          
          setSettings((prev) => ({
            ...prev,
            ...restSettings,
            name: data.profile.name,
            email: data.profile.email,
          }))

          // Sincronizar estado global inicial con DB
          globalSettings.toggleSound(data.settings.soundEnabled)
          globalSettings.toggleDesktop(data.settings.desktopNotifications)
          globalSettings.setAttentionTime(data.settings.inactivityThreshold)
        }
      } catch (error) {
        console.error("Error cargando configuración", error)
      } finally {
        setIsPageLoading(false)
      }
    }
    loadData()
  }, [])

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const settingsPayload = {
        language: settings.language,
        timezone: settings.timezone,
        soundEnabled: settings.soundEnabled,
        desktopNotifications: settings.desktopNotifications,
        inactivityThreshold: settings.inactivityThreshold,
        workStart: settings.workStart,
        workEnd: settings.workEnd,
        weekendWork: settings.weekendWork,
      }

      // 1. Guardar en Base de Datos
      const resSettings = await updateSettings(settingsPayload)
      const resProfile = await updateProfile(settings.name)

      if (!resSettings.success || !resProfile.success) {
        throw new Error("Error al guardar datos básicos")
      }

      // 2. 🔥 ACTUALIZAR ESTADO GLOBAL (Cables Conectados)
      globalSettings.toggleSound(settings.soundEnabled)
      globalSettings.toggleDesktop(settings.desktopNotifications)
      globalSettings.setAttentionTime(settings.inactivityThreshold)

      // 3. Cambio de Password (Opcional)
      if (settings.currentPassword && settings.newPassword) {
        const resPass = await changePassword(settings.currentPassword, settings.newPassword)
        if (!resPass.success) {
          Swal.fire({ icon: "error", title: "Error de seguridad", text: resPass.error })
          setIsLoading(false)
          return
        } else {
          setSettings((prev) => ({ ...prev, currentPassword: "", newPassword: "" }))
        }
      }

      Swal.fire({
        icon: "success",
        title: "Configuración actualizada",
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
        timer: 2000,
        background: "#1e293b", 
        color: "#fff"
      })
    } catch (error) {
      console.error(error)
      Swal.fire({ icon: "error", title: "Error", text: "No se pudieron guardar los cambios" })
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: "general", label: "General", icon: <Globe className="w-4 h-4" /> },
    { id: "notifications", label: "Notificaciones", icon: <Bell className="w-4 h-4" /> },
    { id: "schedule", label: "Horarios", icon: <Clock className="w-4 h-4" /> },
    { id: "account", label: "Cuenta", icon: <User className="w-4 h-4" /> },
  ]

  if (isPageLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            Configuración
          </h1>
          <p className="text-muted-foreground mt-1">Administra tus preferencias y alertas.</p>
        </div>
        
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="rounded-xl px-6 py-5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 font-semibold transition-all"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {isLoading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      {/* Tabs */}
      <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        
        {/* --- TAB: GENERAL --- */}
        {activeTab === "general" && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <GlassCard>
              <div className="p-6 border-b border-border/30">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Languages className="w-5 h-5 text-blue-500" />
                  Preferencias Regionales
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Ajusta el idioma y la zona horaria.</p>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Idioma</Label>
                  <Select value={settings.language} onValueChange={(v) => handleChange("language", v)}>
                    <SelectTrigger className="bg-background/50 border-border/60 rounded-xl">
                      <SelectValue placeholder="Seleccionar idioma" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-popover border-border">
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Zona Horaria</Label>
                  <Select value={settings.timezone} onValueChange={(v) => handleChange("timezone", v)}>
                    <SelectTrigger className="bg-background/50 border-border/60 rounded-xl">
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-popover border-border">
                      <SelectItem value="america_argentina">Argentina (GMT-3)</SelectItem>
                      <SelectItem value="america_mexico">México (GMT-6)</SelectItem>
                      <SelectItem value="europe_madrid">España (GMT+1)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* --- TAB: NOTIFICACIONES --- */}
        {activeTab === "notifications" && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <GlassCard>
              <div className="p-6 border-b border-border/30">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  Alertas
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Configura los avisos de nuevos mensajes.</p>
              </div>
              <div className="p-6 space-y-4">
                <SettingRow
                  icon={<Volume2 className="w-5 h-5 text-blue-400" />}
                  iconBg="bg-blue-500/20"
                  title="Sonidos"
                  description="Reproducir sonido al recibir mensaje."
                >
                  <Switch checked={settings.soundEnabled} onCheckedChange={(c) => handleChange("soundEnabled", c)} />
                </SettingRow>

                <SettingRow
                  icon={<Bell className="w-5 h-5 text-amber-400" />}
                  iconBg="bg-amber-500/20"
                  title="Notificaciones de Escritorio"
                  description="Mostrar popups del navegador."
                >
                  <Switch checked={settings.desktopNotifications} onCheckedChange={(c) => handleChange("desktopNotifications", c)} />
                </SettingRow>
              </div>
            </GlassCard>

            <GlassCard className="ring-1 ring-red-500/30">
              <div className="p-6 border-b border-border/30">
                <h3 className="font-semibold text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  Semáforo de Atención
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Alertar si un chat lleva mucho tiempo sin respuesta.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground">Tiempo máximo de espera:</Label>
                  <span className="font-bold text-red-400 bg-red-500/20 px-4 py-2 rounded-xl shadow-sm">
                    {settings.inactivityThreshold} min
                  </span>
                </div>
                <Slider
                  value={[settings.inactivityThreshold]}
                  max={60}
                  step={5}
                  onValueChange={(val) => handleChange("inactivityThreshold", val[0])}
                  className="cursor-pointer py-4"
                />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* --- TAB: HORARIOS --- */}
        {activeTab === "schedule" && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <GlassCard>
              <div className="p-6 border-b border-border/30">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Timer className="w-5 h-5 text-blue-500" />
                  Horario Laboral
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Tu jornada para automatizaciones y tareas.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Hora de Inicio</Label>
                    <GlassInput
                      type="time"
                      value={settings.workStart}
                      onChange={(e) => handleChange("workStart", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Hora de Fin</Label>
                    <GlassInput
                      type="time"
                      value={settings.workEnd}
                      onChange={(e) => handleChange("workEnd", e.target.value)}
                    />
                  </div>
                </div>

                <SettingRow
                  icon={<Calendar className="w-5 h-5 text-indigo-400" />}
                  iconBg="bg-indigo-500/20"
                  title="Trabajo fin de semana"
                  description="Tu equipo atiende Sábados y Domingos?"
                >
                  <Switch checked={settings.weekendWork} onCheckedChange={(c) => handleChange("weekendWork", c)} />
                </SettingRow>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* --- TAB: CUENTA --- */}
        {activeTab === "account" && (
          <motion.div
            key="account"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* 1. PERFIL */}
            <GlassCard>
              <div className="p-6 border-b border-border/30">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Perfil
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Datos personales visibles para el equipo.</p>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nombre Completo</Label>
                  <GlassInput value={settings.name} onChange={(e) => handleChange("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <GlassInput value={settings.email} disabled className="bg-muted/50 text-muted-foreground opacity-60" />
                </div>
              </div>
            </GlassCard>

            {/* 2. SUSCRIPCIÓN ACTUAL */}
            <GlassCard className="ring-1 ring-emerald-500/30">
              <div className="p-6 border-b border-border/30">
                <h3 className="font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Suscripción Actual
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Información sobre tu plan activo</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-semibold text-lg text-foreground">{planInfo.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Precio:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{planInfo.price}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">
                    {userData?.plan?.toUpperCase() === 'TRIAL' ? "Fin de prueba:" : "Próxima renovación:"}
                  </span>
                  <span className="font-semibold text-foreground">{planInfo.date}</span>
                </div>
              </div>
            </GlassCard>

         {/* 3. HISTORIAL DE FACTURAS (Condicionado solo a tener un plan activo) */}
            {userData?.plan?.toUpperCase() !== 'TRIAL' && (
              <GlassCard className="ring-1 ring-slate-500/20">
                <div className="p-6 border-b border-border/30">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-slate-400" />
                    Historial de Facturas
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Tus últimos pagos registrados.</p>
                </div>
                
                {billingHistory.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm bg-background/20">
                    Aún no tienes facturas registradas en este ciclo.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-background/40 text-muted-foreground text-xs uppercase tracking-wider border-b border-border/50">
                        <tr>
                          <th className="p-4 font-semibold">Fecha</th>
                          <th className="p-4 font-semibold">Monto</th>
                          <th className="p-4 font-semibold">Estado</th>
                          <th className="p-4 font-semibold text-right">Recibo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {billingHistory.map((invoice, idx) => (
                          <tr key={idx} className="hover:bg-background/40 transition-colors">
                            <td className="p-4 text-foreground font-medium">
                              {format(new Date(invoice.created_at), "d MMM yyyy", { locale: es })}
                            </td>
                            <td className="p-4 font-bold text-foreground">
                              ${Number(invoice.amount).toLocaleString('es-AR')}
                            </td>
                            <td className="p-4">
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-none shadow-none font-semibold">
                                Pagada
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              {invoice.mp_payment_id ? (
                                <span className="text-muted-foreground font-mono text-xs" title={`ID: ${invoice.mp_payment_id}`}>
                                  #{invoice.mp_payment_id.toString().slice(-6)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">Manual</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            )}

            {/* 4. SEGURIDAD */}
            <GlassCard>
              <div className="p-6 border-b border-border/30">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-500" />
                  Seguridad
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Actualiza tu contraseña.</p>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Contraseña Actual</Label>
                  <GlassInput
                    type="password"
                    value={settings.currentPassword}
                    onChange={(e) => handleChange("currentPassword", e.target.value)}
                    placeholder="********"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nueva Contraseña</Label>
                  <GlassInput
                    type="password"
                    value={settings.newPassword}
                    onChange={(e) => handleChange("newPassword", e.target.value)}
                    placeholder="********"
                  />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
