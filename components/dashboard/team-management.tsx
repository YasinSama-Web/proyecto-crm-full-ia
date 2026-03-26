"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Plus, MoreVertical, MessageSquare, Shield, Briefcase, Headphones, Trash2, Key, Pencil, Users, Tag, ClipboardList, Handshake, Megaphone, Bot, TrendingUp, Globe, BarChart3, CheckCircle2, Loader2, Sparkles, ArrowRightLeft, Lock } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createAgent, updateAgent, deleteAgent, transferCredits } from "./actions/team-actions" // 🔥 Importaremos la nueva acción
import { sileo } from "sileo"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link" // 🔥 IMPORTANTE: Necesitamos Link
import { es } from "date-fns/locale"
import { TeamAnalytics } from "./team-analytics"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
interface Agent {
  id: string
  nombre: string
  email: string
  fecha_creacion: Date
  role: string
  permissions: any
  ia_credits: number
  ia_credits_extra: number
  last_active_at?: Date // 🔥 Nuevo
  chats_activos?: number // 🔥 Nuevo
}

interface WhatsAppLine {
  id: string
  nombre: string
  telefono: string | null
  estado: string
}

interface Props {
  agents: Agent[]
  ownerId: string
  whatsappLines: WhatsAppLine[]
  ownerCredits: number // 🔥 Saldo del jefe
  realSalesData: any[]
  usedAgents: number
  limitAgents: number
  isLimitReached: boolean
  plan: string
}

type RoleType = "ADMIN" | "MANAGER" | "HELPER"

const AVAILABLE_FEATURES = [
  { id: 'contacts', name: 'Contactos', icon: Users, desc: 'Gestión de agenda' },
  { id: 'tags', name: 'Etiquetas', icon: Tag, desc: 'Crear y editar' },
  { id: 'tasks', name: 'Tareas', icon: ClipboardList, desc: 'Kanban de equipo' },
  { id: 'sales', name: 'Ventas', icon: Handshake, desc: 'Registrar ingresos' },
  { id: 'campaigns', name: 'Campañas', icon: Megaphone, desc: 'Envíos masivos' },
  { id: 'automations', name: 'Automatizaciones', icon: Bot, desc: 'Flujos y bots' },
  { id: 'marketing', name: 'Marketing', icon: TrendingUp, desc: 'SEO y analítica' },
  { id: 'landings', name: 'Websites', icon: Globe, desc: 'Páginas web' },
  { id: 'metrics', name: 'Analíticas', icon: BarChart3, desc: 'KPIs globales' },
]

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card/60 backdrop-blur-xl rounded-3xl border border-border shadow-xl ${className}`}>{children}</div>
}

export function TeamManagement({ agents: initialAgents, ownerId, whatsappLines, ownerCredits, realSalesData, usedAgents, limitAgents, isLimitReached, plan 
}: Props) {
  const [open, setOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [loading, setLoading] = useState(false)
  const [currentOwnerCredits, setCurrentOwnerCredits] = useState(ownerCredits) // Saldo local para UI

  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<RoleType>("HELPER")
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([])
  const [customFeatures, setCustomFeatures] = useState<Record<string, boolean>>({})

  // 🔥 ESTADOS PARA CRÉDITOS
  const [creditsToTransfer, setCreditsToTransfer] = useState<string>("")
  const [transferType, setTransferType] = useState<"GIVE" | "TAKE">("GIVE")
  const [isTransferring, setIsTransferring] = useState(false)

  const roles = [
    { id: "ADMIN" as RoleType, icon: Shield, title: "Administrador", description: "Acceso total (excepto facturación)", gradient: "from-red-500 to-rose-600", bgColor: "bg-red-500/10", textColor: "text-red-600 dark:text-red-400" },
    { id: "MANAGER" as RoleType, icon: Briefcase, title: "Encargado", description: "Permisos personalizados", gradient: "from-blue-500 to-indigo-600", bgColor: "bg-blue-500/10", textColor: "text-blue-600 dark:text-blue-400" },
    { id: "HELPER" as RoleType, icon: Headphones, title: "Ayudante", description: "Solo responder mensajes", gradient: "from-emerald-500 to-teal-600", bgColor: "bg-emerald-500/10", textColor: "text-emerald-600 dark:text-emerald-400" },
  ]

  const handleRoleChange = (role: RoleType) => {
    setSelectedRole(role)
    if (role === "ADMIN") setSelectedLineIds(whatsappLines.map((line) => line.id))
  }

  const handleFeatureToggle = (featureId: string) => {
    setCustomFeatures(prev => ({ ...prev, [featureId]: !prev[featureId] }))
  }

  const handleLineToggle = (lineId: string) => {
    if (selectedRole === "ADMIN") return;
    setSelectedLineIds(prev => prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]);
  }

  const resetForm = () => {
    setNombre(""); setEmail(""); setPassword(""); setSelectedRole("HELPER"); setSelectedLineIds([]); setCustomFeatures({}); setEditingAgent(null); setCreditsToTransfer(""); setTransferType("GIVE")
  }

  const openCreateModal = () => { resetForm(); setOpen(true) }

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent)
    setNombre(agent.nombre)
    setEmail(agent.email)
    setPassword("")
    
    const permissions = agent.permissions || {}
    setSelectedRole((permissions.tier as RoleType) || "HELPER")
    setSelectedLineIds(permissions.allowedLineIds || [])
    
    if (permissions.tier === "MANAGER" && permissions.features) {
      setCustomFeatures(permissions.features)
    } else setCustomFeatures({})
    
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const baseFeatures: Record<string, boolean> = { messages: true, tasks: true }
      let finalFeatures: Record<string, boolean> = { ...baseFeatures }
      
      if (selectedRole === "ADMIN") AVAILABLE_FEATURES.forEach(f => { finalFeatures[f.id] = true })
      else if (selectedRole === "MANAGER") {
        Object.entries(customFeatures).forEach(([key, val]) => { if (val) finalFeatures[key] = true })
        finalFeatures.messages = true; finalFeatures.tasks = true
      }

      const permissions = { tier: selectedRole, allowedLineIds: selectedLineIds, features: finalFeatures }

      if (editingAgent) {
        const result = await updateAgent(editingAgent.id, { nombre, role: selectedRole, permissions })
        if (result.success) {
          // 🔥 CORREGIDO
          sileo.success({ title: "Agente actualizado", description: "Los cambios se aplicaron correctamente." })
          setAgents((prev) => prev.map((a) => (a.id === editingAgent.id ? { ...a, nombre, role: selectedRole, permissions } : a)))
          setOpen(false); resetForm()
        } else throw new Error(result.error)
      } else {
        const formData = new FormData()
        formData.append("nombre", nombre); formData.append("email", email); formData.append("password", password); formData.append("role", selectedRole); formData.append("permissions", JSON.stringify(permissions))

        const result = await createAgent(formData, ownerId)
        if (result.success) {
          // 🔥 CORREGIDO
          sileo.success({ title: "Agente creado", description: "El nuevo miembro ya puede iniciar sesión." })
          window.location.reload()
        } else throw new Error(result.error)
      }
    } catch (error: any) {
      // 🔥 CORREGIDO
      sileo.error({ title: "Error", description: error.message })
    } finally { setLoading(false) }
  }

 const handleDelete = async (agent: Agent) => {
      if(confirm(`¿Estás seguro de eliminar a ${agent.nombre}? Sus créditos volverán a tu cuenta.`)) {
          const deleteResult = await deleteAgent(agent.id)
          if (deleteResult.success) {
            setAgents((prev) => prev.filter((a) => a.id !== agent.id))
            // 🔥 CORREGIDO
            sileo.success({ title: "Agente eliminado" })
            window.location.reload() 
          } else {
             // 🔥 CORREGIDO
             sileo.error({ title: "Error", description: deleteResult.error })
          }
      }
  }

  // 🔥 LÓGICA DE TRANSFERENCIA DE CRÉDITOS
  const handleTransferCredits = async () => {
      if (!editingAgent) return;
      const amount = Number(creditsToTransfer)
      // 🔥 CORREGIDO
      if (amount <= 0 || isNaN(amount)) return sileo.error({ title: "Monto inválido", description: "Ingresa un número mayor a 0." })

      if (transferType === "GIVE" && amount > currentOwnerCredits) {
          // 🔥 CORREGIDO
          return sileo.error({ title: "Saldo insuficiente", description: "No tienes suficientes créditos para transferir." })
      }

      // Recordar: El agente ahora solo usa ia_credits, extra debería ser 0
      const agentTotalCredits = Number(editingAgent.ia_credits || 0) + Number(editingAgent.ia_credits_extra || 0)
      if (transferType === "TAKE" && amount > agentTotalCredits) {
          // 🔥 CORREGIDO
          return sileo.error({ title: "Monto inválido", className: "relative z-[9999]", style: { zIndex: 9999 }, description: "El agente no tiene tantos créditos para devolverte." })
      }

      setIsTransferring(true)
      try {
          const result = await transferCredits(ownerId, editingAgent.id, amount, transferType)
          
          if (result.success) {
              // 🔥 CORREGIDO
              sileo.success({ title: "Transferencia exitosa", description: `Se ${transferType === 'GIVE' ? 'asignaron' : 'retiraron'} ${amount} créditos.` })
              
              setAgents(prev => prev.map(a => {
                  if(a.id === editingAgent.id) {
                      // Ahora modificamos ia_credits (la billetera correcta del agente)
                      return { ...a, ia_credits: transferType === 'GIVE' ? Number(a.ia_credits) + amount : Number(a.ia_credits) - amount }
                  }
                  return a;
              }))
              
              setCurrentOwnerCredits(prev => transferType === 'GIVE' ? prev - amount : prev + amount)
              
              setEditingAgent(prev => prev ? { ...prev, ia_credits: transferType === 'GIVE' ? Number(prev.ia_credits) + amount : Number(prev.ia_credits) - amount } : null)
              setCreditsToTransfer("")
          } else {
              throw new Error(result.error)
          }
      } catch (error: any) {
          // 🔥 CORREGIDO
          sileo.error({ title: "Error de transferencia", description: error.message })
      } finally {
          setIsTransferring(false)
      }
  }

  const getRoleData = (role: string, permissions: any) => {
    const tier = permissions?.tier || role || "HELPER"
    return roles.find((r) => r.id === tier) || roles[2]
  }

  const displayLimit = plan === 'ENTERPRISE' ? '∞' : limitAgents;

  return (
 <div className="space-y-8">
      {/* HEADER CON SALDO GLOBAL Y BOTÓN LIMITADO */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Equipo</h1>
          <p className="text-muted-foreground mt-1">Administra accesos y asigna créditos de IA.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 🔥 BÓVEDA DEL DUEÑO */}
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
             <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-md">
                 <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Tu Bóveda de IA</p>
                <p className="text-sm font-bold text-foreground leading-none">{currentOwnerCredits.toLocaleString("es-AR")} créditos</p>
             </div>
          </div>
          
          {/* 🔥 BOTÓN DE CREAR AGENTE (CON TOOLTIP Y LÍMITES) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0} className="inline-block">
                  {isLimitReached ? (
                    <Button disabled className="gap-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 h-12 px-6 cursor-not-allowed font-semibold shadow-sm">
                      <Lock className="w-4 h-4" />
                      Límite Alcanzado ({usedAgents}/{displayLimit})
                    </Button>
                  ) : (
                    <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg h-12 px-6 font-semibold transition-all">
                      <Plus className="mr-2 h-4 w-4" /> 
                      Agregar Agente ({usedAgents}/{displayLimit})
                    </Button>
                  )}
                </div>
              </TooltipTrigger>
              
              {isLimitReached && (
                <TooltipContent className="bg-slate-900 text-white border-none shadow-xl p-3 rounded-xl z-50">
                  <p className="font-semibold text-sm">Límite de equipo alcanzado</p>
                  <p className="text-xs text-slate-300 mt-1">Tu plan actual permite un máximo de {limitAgents} agente{limitAgents !== 1 ? 's' : ''}.</p>
                  <Link href="/dashboard/billing" className="text-emerald-400 text-xs font-bold mt-2 inline-block hover:underline">
                    Comprar cupos adicionales &rarr;
                  </Link>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

        </div>
      </motion.div>

      {/* LISTA DE AGENTES */}
      {agents.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-muted rounded-2xl mb-4"><Users className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay agentes en tu equipo</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">Comienza agregando tu primer agente para delegar la atención.</p>
            <Button onClick={openCreateModal} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Agregar Primer Agente</Button>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="p-6 border-b border-border/50 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Users className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold text-foreground">Miembros del Equipo</h3>
              <p className="text-sm text-muted-foreground">{agents.length} agente(s)</p>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <AnimatePresence>
              {agents.map((agent) => {
                const roleData = getRoleData(agent.role, agent.permissions)
                const Icon = roleData.icon
                const lineCount = agent.permissions?.allowedLineIds?.length || 0
                // 🔥 Calculamos sus créditos
                const agentCredits = Number(agent.ia_credits || 0) + Number(agent.ia_credits_extra || 0)
                
                return (
                  <motion.div key={agent.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-all group border border-transparent hover:border-border">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                        <AvatarFallback className={`${roleData.bgColor} ${roleData.textColor} font-semibold text-lg`}>
                          {agent.nombre.split(" ").map((n) => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{agent.nombre}</p>
                        <p className="text-sm text-muted-foreground">{agent.email}</p>
                        <div className="flex items-center gap-1.5">
                            {agent.last_active_at && (new Date().getTime() - new Date(agent.last_active_at).getTime()) < 5 * 60 * 1000 ? (
                                <>
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                  </span>
                                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">En línea</span>
                                </>
                            ) : (
                                <>
                                  <span className="inline-flex rounded-full h-2 w-2 bg-slate-300 dark:bg-slate-600"></span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {agent.last_active_at 
                                      ? `Últ. vez ${formatDistanceToNow(new Date(agent.last_active_at), { addSuffix: true, locale: es })}`
                                      : 'Desconectado'}
                                  </span>
                                </>
                            )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      
                      {/* 🔥 BADGE DE CRÉDITOS DEL AGENTE */}
                      <Badge variant="secondary" className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/30">
                          <Sparkles className="w-3 h-3" />
                          {agentCredits.toLocaleString("es-AR")}
                      </Badge>

                      <div className="flex items-center gap-2">
                        <Badge className={`${roleData.bgColor} ${roleData.textColor} gap-1 border-0`}>
                          <Icon className="h-3 w-3" /> {roleData.title}
                        </Badge>

                        <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/30">
                          <MessageSquare className="w-3 h-3" />
                          {agent.chats_activos || 0} chats
                      </Badge>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => openEditModal(agent)} className="rounded-lg cursor-pointer"><Pencil className="mr-2 h-4 w-4" /> Configurar Agente</DropdownMenuItem>
                          <DropdownMenuItem disabled className="rounded-lg"><Key className="mr-2 h-4 w-4" /> Cambiar Contraseña</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(agent)} className="text-red-600 focus:text-red-600 rounded-lg cursor-pointer"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </GlassCard>
      )}
          <TeamAnalytics realSalesData={realSalesData} />

      {/* MODAL PRINCIPAL */}
      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm() }}>
        <DialogContent className="max-w-2xl  max-h-[90vh] overflow-y-auto bg-background text-foreground border-border rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingAgent ? "Configurar Agente" : "Crear Nuevo Agente"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Configura identidad, permisos y saldos de IA.</DialogDescription>
          </DialogHeader>

          {/* 🔥 MODIFICAMOS LOS TABS */}
          <Tabs defaultValue="profile" className="w-full mt-4">
            <TabsList className={`grid w-full bg-muted p-1 rounded-xl ${editingAgent ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="profile" className="rounded-lg">Perfil</TabsTrigger>
              <TabsTrigger value="permissions" className="rounded-lg">Permisos</TabsTrigger>
              {/* 🔥 PESTAÑA DE CRÉDITOS (Solo aparece al editar, no al crear) */}
              {editingAgent && <TabsTrigger value="credits" className="rounded-lg text-indigo-600 dark:text-indigo-400 data-[state=active]:bg-indigo-100 dark:data-[state=active]:bg-indigo-900/50">Créditos IA</TabsTrigger>}
            </TabsList>

            <form onSubmit={handleSubmit}>
              <TabsContent value="profile" className="space-y-4 mt-6">
                 {/* ... (Todo lo del profile queda igual, no lo toqué) */}
                 <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo</Label>
                    <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="rounded-xl bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required readOnly={!!editingAgent} className={`rounded-xl bg-background ${editingAgent ? 'opacity-50' : ''}`} />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="password" className="text-foreground">
                    {editingAgent ? "Nueva Contraseña (Opcional)" : "Contraseña Temporal"}
                  </Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required={!editingAgent} // Solo es obligatorio al crear
                    minLength={6} 
                    placeholder={editingAgent ? "Escribe aquí para cambiarla, o deja en blanco" : "Mínimo 6 caracteres"}
                    className="rounded-xl bg-background" 
                  />
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-6 mt-6">
                  {/* ... (Todo lo de permissions queda igual, no lo toqué) */}
                  <div className="space-y-3">
                  <Label>Nivel de Acceso</Label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {roles.map((role) => {
                      const RoleIcon = role.icon
                      const isSelected = selectedRole === role.id
                      return (
                        <div key={role.id} onClick={() => handleRoleChange(role.id)} 
                          className={`cursor-pointer p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}
                        >
                          {isSelected && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-primary" /></div>}
                          <div className={`p-2 w-fit rounded-lg mb-3 bg-gradient-to-br ${role.gradient} text-white shadow-sm`}><RoleIcon className="h-4 w-4" /></div>
                          <h4 className="font-bold text-foreground text-sm">{role.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-tight">{role.description}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <AnimatePresence>
                  {selectedRole === "MANAGER" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                      <Label>Módulos Permitidos</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {AVAILABLE_FEATURES.map((feature) => {
                          const FIcon = feature.icon;
                          const isEnabled = customFeatures[feature.id] || false;
                          return (
                            <div key={feature.id} onClick={() => handleFeatureToggle(feature.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isEnabled ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/50 border-border/50 hover:bg-muted"}`}
                            >
                               <div className={`p-1.5 rounded-md ${isEnabled ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}><FIcon className="w-4 h-4" /></div>
                               <div>
                                 <p className={`text-xs font-bold ${isEnabled ? "text-primary" : "text-foreground"}`}>{feature.name}</p>
                                 <p className="text-[10px] text-muted-foreground leading-tight">{feature.desc}</p>
                               </div>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  <Label>Líneas Asignadas</Label>
                  {whatsappLines.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-muted text-center"><p className="text-sm text-muted-foreground">No hay líneas configuradas</p></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {whatsappLines.map((line) => {
                        const isLineSelected = selectedLineIds.includes(line.id) || selectedRole === "ADMIN";
                        return (
                            <Label 
                                key={line.id} 
                                htmlFor={`line-${line.id}`}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedRole === "ADMIN" ? "opacity-60 cursor-not-allowed bg-muted border-border" : "hover:bg-muted/50"} ${isLineSelected ? "border-primary/50 bg-primary/5" : "border-border"}`}
                            >
                                <Checkbox 
                                    id={`line-${line.id}`}
                                    checked={isLineSelected} 
                                    onCheckedChange={() => handleLineToggle(line.id)}
                                    disabled={selectedRole === "ADMIN"} 
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{line.nombre}</p>
                                    {line.telefono && <p className="text-xs text-muted-foreground">{line.telefono}</p>}
                                </div>
                            </Label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* CONTROLES DEL FORMULARIO ORIGINAL (Solo visibles en perfil/permisos) */}
              <div className="flex gap-3 mt-8 pt-4 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1 rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={loading} className="flex-1 rounded-xl shadow-lg">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAgent ? "Guardar Cambios" : "Crear Agente"}
                </Button>
              </div>
            </form>

            {/* 🔥 NUEVA PESTAÑA: CRÉDITOS DE IA (Fuera del form original para tener su propio botón) */}
            {editingAgent && (
              <TabsContent value="credits" className="space-y-6 mt-6">
                 
                 <div className="bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                    <div>
                       <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-1">Saldo Actual de {editingAgent.nombre}</p>
                       <p className="text-3xl font-bold text-foreground">
                         {(Number(editingAgent.ia_credits || 0) + Number(editingAgent.ia_credits_extra || 0)).toLocaleString("es-AR")}
                       </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <Label className="text-base">Transferir Créditos</Label>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div 
                          onClick={() => setTransferType("GIVE")}
                          className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${transferType === "GIVE" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-border hover:border-indigo-200"}`}
                        >
                            <p className="font-semibold text-sm">Asignar a Agente</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Descuenta de tu saldo</p>
                        </div>
                        <div 
                          onClick={() => setTransferType("TAKE")}
                          className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${transferType === "TAKE" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" : "border-border hover:border-amber-200"}`}
                        >
                            <p className="font-semibold text-sm text-amber-700 dark:text-amber-500">Retirar a Agente</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Vuelve a tu saldo</p>
                        </div>
                    </div>

                    <div className="relative mt-2">
                        <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            type="number" 
                            min="1"
                            placeholder="Ej: 500" 
                            className="pl-10 h-12 text-lg rounded-xl" 
                            value={creditsToTransfer}
                            onChange={(e) => setCreditsToTransfer(e.target.value)}
                        />
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-right">
                       Tu bóveda actual: <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentOwnerCredits.toLocaleString("es-AR")}</span>
                    </p>

                    <Button 
                        type="button" 
                        disabled={isTransferring || !creditsToTransfer || Number(creditsToTransfer) <= 0} 
                        onClick={handleTransferCredits}
                        className={`w-full h-12 rounded-xl text-base shadow-lg ${transferType === "GIVE" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-amber-600 hover:bg-amber-700 text-white"}`}
                    >
                        {isTransferring ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                          transferType === "GIVE" ? "Confirmar Asignación" : "Confirmar Retiro"
                        }
                    </Button>

                 </div>
              </TabsContent>
            )}

          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
