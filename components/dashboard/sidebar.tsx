"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  MessageSquare, Smartphone, Globe, BarChart3, Settings, Home,
  Users, LogOut, UsersRound, Bot, ClipboardList, TrendingUp,
  Megaphone, CreditCard, HelpCircle, ChevronLeft, ChevronRight, ShieldCheck,
  Zap, Handshake, Tag, ChevronDown, Rocket, BrainCircuit, Settings2
} from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useNotifications } from "@/contexts/notification-context"

interface UserWithPermissions {
  nombre: string
  email: string
  role: string
  permissions: {
    tier: string
    features?: Record<string, boolean>
  }
}

// 🔥 ARQUITECTURA AGRUPADA
const navigationGroups = [
  {
    id: "main",
    isMain: true, // Se muestran sueltos, sin acordeón
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Mensajes", href: "/dashboard/messages", icon: MessageSquare, requiresFeature: "messages" },
      { name: "Contactos", href: "/dashboard/contacts", icon: Users, requiresFeature: "contacts" },
      { name: "Analíticas", href: "/dashboard/analytics", icon: BarChart3, requiresFeature: "metrics" },
    ]
  },
  {
    id: "growth",
    title: "Ventas & Crecimiento",
    icon: Rocket,
    items: [
      { name: "Ventas", href: "/dashboard/sales", icon: Handshake, requiresFeature: "sales" },
      { name: "Campañas", href: "/dashboard/campaigns", icon: Megaphone, requiresFeature: "campaigns" },
      { name: "Marketing", href: "/dashboard/marketing", icon: TrendingUp, requiresFeature: "marketing" },
      { name: "Websites", href: "/dashboard/pages", icon: Globe, requiresFeature: "landings" },
    ]
  },
  {
    id: "ai",
    title: "Inteligencia Artificial",
    icon: BrainCircuit,
    items: [
      { name: "Automatizaciones", href: "/dashboard/automations", icon: Bot, requiresFeature: "automations" },
      { name: "Auditoría IA", href: "/dashboard/ai-audit", icon: ShieldCheck, ownerOrAdmin: true },
    ]
  },
  {
    id: "admin",
    title: "Administración",
    icon: Settings2,
    items: [
      { name: "Líneas", href: "/dashboard/lines", icon: Smartphone, ownerOrAdmin: true },
      { name: "Tareas", href: "/dashboard/tasks", icon: ClipboardList, requiresFeature: "tasks" },
      { name: "Equipos", href: "/dashboard/team", icon: UsersRound, ownerOrAdmin: true },
      { name: "Etiquetas", href: "/dashboard/tags", icon: Tag, requiresFeature: "tags" },
      { name: "Integraciones", href: "/dashboard/integrations", icon: Zap, ownerOrAdmin: true },
      { name: "Configuración", href: "/dashboard/settings", icon: Settings, ownerOrAdmin: true },
      { name: "Suscripción", href: "/dashboard/billing", icon: CreditCard, ownerOnly: true },
    ]
  },
  {
    id: "support",
    isMain: true,
    items: [
      { name: "Soporte", href: "/dashboard/support", icon: HelpCircle },
    ]
  }
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserWithPermissions | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Estado para controlar qué grupos están abiertos
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    growth: false, ai: false, admin: false
  })

  const { unreadCount, unreadPaymentsCount } = useNotifications()

  useEffect(() => {
    fetch(`/api/auth/me?t=${new Date().getTime()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user)
      }).catch(console.error)
  }, [])

  // Auto-expandir el grupo si la ruta activa está dentro de él
  useEffect(() => {
    let activeGroupId: string | null = null;
    
    navigationGroups.forEach(group => {
      if (group.isMain) return;
      const hasActiveChild = group.items.some(item => 
        item.href === '/dashboard' ? pathname === '/dashboard' : (pathname === item.href || pathname.startsWith(item.href + "/"))
      );
      if (hasActiveChild) {
        activeGroupId = group.id;
      }
    });

    // Si encontramos que estamos dentro de un grupo, lo abrimos y cerramos los demás
    if (activeGroupId) {
      setExpandedGroups({
        growth: activeGroupId === 'growth',
        ai: activeGroupId === 'ai',
        admin: activeGroupId === 'admin'
      });
    }
  }, [pathname])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) { setLoggingOut(false) }
  }

 const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      growth: groupId === 'growth' ? !prev.growth : false,
      ai: groupId === 'ai' ? !prev.ai : false,
      admin: groupId === 'admin' ? !prev.admin : false,
    }));
  }

  // Filtrado de seguridad
  const visibleGroups = navigationGroups.map(group => {
    const filteredItems = group.items.filter((item) => {
      if (!user) return false; 
      const isOwner = user.role === "OWNER"
      const isAdmin = user.role === "AGENT" && user.permissions?.tier === "ADMIN"

      if (isOwner) return true;
      if (isAdmin) {
          if (item.ownerOnly) return false;
          return true;
      }

      if (item.ownerOnly || item.ownerOrAdmin) return false;
      if (item.href === "/dashboard/tasks") return true;
      if (item.href === "/dashboard/messages") return true;
      if (item.href === "/dashboard") return true;
      if (item.href === "/dashboard/support") return true;
      
      if (item.requiresFeature) {
          const featureKey = item.requiresFeature as string;
          if (!user.permissions?.features) return false;
          return user.permissions.features[featureKey] === true;
      }
      return true; 
    })
    return { ...group, items: filteredItems }
  }).filter(group => group.items.length > 0)

  // Sub-componente para renderizar un ítem (para no repetir código)
  const renderItem = (item: any) => {
    // 🔥 EL FIX DEL DASHBOARD: Diferenciamos la raíz exacta del resto
    const isActive = item.href === '/dashboard' 
      ? pathname === '/dashboard' 
      : (pathname === item.href || pathname.startsWith(item.href + "/"));

    return (
      <div key={item.name} className="relative w-full py-0.5">
        {isActive && (
          <motion.div
            layoutId="active-sidebar-tab"
            className="absolute inset-y-0.5 right-0 left-4 bg-background rounded-l-2xl z-0"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
             <div className="absolute right-0 -top-4 w-4 h-4 bg-transparent rounded-br-2xl pointer-events-none" style={{ boxShadow: "6px 6px 0 0 hsl(var(--background))" }} />
             <div className="absolute right-0 -bottom-4 w-4 h-4 bg-transparent rounded-tr-2xl pointer-events-none" style={{ boxShadow: "6px -6px 0 0 hsl(var(--background))" }} />
          </motion.div>
        )}

        <Link 
          href={item.href} 
          className={cn(
            "relative z-10 flex items-center gap-3 px-4 py-3 text-[14px] transition-all duration-300",
            isActive 
              ? "text-blue-700 dark:text-blue-400 pl-8 font-bold" 
              : "text-white/80 hover:text-white hover:bg-white/10 hover:pl-6 mx-4 rounded-xl font-semibold",
            isCollapsed && "justify-center px-0 pl-0 hover:pl-0 mx-0"
          )}
        >
          <div className="relative shrink-0 flex items-center justify-center">
              <item.icon className={cn("h-[20px] w-[20px] transition-transform duration-500", isActive && "scale-110", !isActive && "text-white/90")} />
              
              {isCollapsed && item.name === "Mensajes" && (unreadCount > 0 || unreadPaymentsCount > 0) && (
                  <div className="absolute -top-1.5 -right-2 flex gap-0.5">
                      {unreadPaymentsCount > 0 && (
                          <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-background"></span>
                          </span>
                      )}
                      {unreadCount > 0 && (
                          <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-background"></span>
                          </span>
                      )}
                  </div>
              )}
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <>
                  <motion.span 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} 
                      className={cn("truncate flex-1 tracking-wide", !isActive && "text-white/90")}
                  >
                      {item.name}
                  </motion.span>
                  
                  {item.name === "Mensajes" && (unreadCount > 0 || unreadPaymentsCount > 0) && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative flex items-center gap-1.5 ml-auto pr-4">
                          {unreadPaymentsCount > 0 && (
                              <span className="relative flex h-3 w-3" title="Ventas IA sin auditar">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                              </span>
                          )}
                          {unreadCount > 0 && (
                              <span className="relative flex h-3 w-3" title="Mensajes sin leer">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                              </span>
                          )}
                      </motion.div>
                  )}
              </>
            )}
          </AnimatePresence>
        </Link>
      </div>
    )
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 88 : 280 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "hidden lg:flex flex-col m-4 mr-9 rounded-l-3xl shadow-2xl shrink-0 z-50 overflow-hidden",
        "bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950"
      )}
      style={{ height: "calc(100vh - 2rem)" }}
    >
      <div className="flex items-center justify-between p-6 z-20">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/30">
            <Zap className="h-5 w-5 text-white" fill="currentColor" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="text-xl font-black text-white whitespace-nowrap tracking-wide">
                CRM Nexus
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 relative scrollbar-none z-10 pr-0">
        {visibleGroups.map((group, index) => (
          <div key={group.id} className={cn("mb-2", group.isMain ? "mt-0" : "mt-4")}>
            
            {/* Cabecera del Grupo (Oculta si está colapsado o si es el grupo principal) */}
            {!group.isMain && !isCollapsed && (
              <button 
                onClick={() => toggleGroup(group.id)} 
                className="w-full flex items-center justify-between px-6 py-2 mb-1 text-white/50 hover:text-white/90 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  {group.icon && <group.icon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />}
                  <span className="text-xs font-bold uppercase tracking-wider">{group.title}</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expandedGroups[group.id] && "rotate-180")} />
              </button>
            )}

            {/* Ítems del Grupo con Slide In (Si está colapsado, siempre muestra los íconos) */}
            <AnimatePresence initial={false}>
              {(group.isMain || isCollapsed || expandedGroups[group.id]) && (
                <motion.div
                  initial={group.isMain || isCollapsed ? false : { height: 0, opacity: 0, y: -10 }}
                  animate={{ height: "auto", opacity: 1, y: 0, transitionEnd: { overflow: "visible" } }}
                  exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="space-y-1"
                >
                  {group.items.map(item => renderItem(item))}
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        ))}
      </nav>

      {/* 🔥 PERFIL DE USUARIO */}
      <div className="z-20 p-4 pt-2 pb-6 mt-auto">
        <div className={cn("flex items-center gap-3 mb-4 bg-black/10 p-2.5 rounded-2xl border border-white/5 backdrop-blur-sm", isCollapsed && "justify-center bg-transparent border-0")}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shrink-0 border border-white/20 relative overflow-hidden">
            <span className="text-base font-bold text-white uppercase z-10">{user?.nombre?.[0] || "U"}</span>
            <div className="absolute inset-0 bg-white/20 animate-pulse mix-blend-overlay"></div>
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white truncate leading-tight">{user?.nombre || "Cargando..."}</p>
                <p className="text-[11px] text-blue-200 font-bold tracking-wider uppercase mt-1">{user?.role === 'OWNER' ? 'Admin Supremo' : user?.permissions?.tier?.toLowerCase()}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <Button onClick={handleLogout} disabled={loggingOut} variant="ghost" size="sm" className={cn("w-full rounded-xl bg-white/10 hover:bg-red-500/90 text-white/90 hover:text-white transition-all duration-300 cursor-pointer shadow-sm border border-white/10 hover:shadow-red-500/20 py-5", isCollapsed ? "justify-center px-3" : "justify-start gap-3 px-4")}>
          <LogOut className="h-5 w-5" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-semibold text-[14px]">
                {loggingOut ? "Desconectando..." : "Cerrar Sesión"}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </motion.aside>
  )
}
