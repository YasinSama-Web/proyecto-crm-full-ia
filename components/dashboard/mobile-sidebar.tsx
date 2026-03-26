"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  MessageSquare, Smartphone, FileText, BarChart3, Settings, Home,
  Users, LogOut, UsersRound, Bot, ClipboardList, TrendingUp,
  Megaphone, CreditCard, HelpCircle, Zap, Menu, Handshake, Tag
} from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/contexts/notification-context"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface UserWithPermissions {
  nombre: string
  email: string
  role: string
  permissions: {
    tier: string
    features: {
      metrics: boolean
      landings: boolean
      contacts: boolean
      messages: boolean
    }
  }
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Lineas", href: "/dashboard/lines", icon: Smartphone, ownerOnly: true },
  { name: "Mensajes", href: "/dashboard/messages", icon: MessageSquare, requiresFeature: "messages" },
  { name: "Contactos", href: "/dashboard/contacts", icon: Users, requiresFeature: "contacts" },
  { name: "Etiquetas", href: "/dashboard/tags", icon: Tag },
  { name: "Equipos", href: "/dashboard/team", icon: UsersRound, ownerOrAdmin: true },
  { name: "Tareas", href: "/dashboard/tasks", icon: ClipboardList },
  { name: "Ventas", href: "/dashboard/sales", icon: Handshake },
  { name: "Campanas masivas", href: "/dashboard/campaigns", icon: Megaphone, ownerOnly: true },
  { name: "Automatizaciones", href: "/dashboard/automations", icon: Bot, ownerOnly: true },
  { name: "Marketing", href: "/dashboard/marketing", icon: TrendingUp, ownerOnly: true },
  { name: "Landings", href: "/dashboard/pages", icon: FileText, requiresFeature: "landings" },
  { name: "Analiticas", href: "/dashboard/analytics", icon: BarChart3, requiresFeature: "metrics" },
  { name: "Suscripcion", href: "/dashboard/billing", icon: CreditCard, ownerOnly: true },
  { name: "Configuracion", href: "/dashboard/settings", icon: Settings, ownerOnly: true },
  { name: "Soporte", href: "/dashboard/support", icon: HelpCircle },
]

export function MobileSidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden h-10 w-10 shrink-0"
      onClick={onClick}
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserWithPermissions | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const { unreadCount } = useNotifications()

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user)
      })
      .catch(console.error)
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch {
      setLoggingOut(false)
    }
  }

  const visibleNavigation = navigation.filter((item) => {
    if (!user) return true
    const isOwner = user.role === "OWNER"
    const isAdmin = user.role === "AGENT" && user.permissions.tier === "ADMIN"
    if (item.ownerOnly && !isOwner) return false
    if (item.ownerOrAdmin && !isOwner && !isAdmin) return false
    if (item.requiresFeature && !isOwner) {
      const feature = item.requiresFeature as keyof typeof user.permissions.features
      return user.permissions.features[feature] === true
    }
    return true
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 border-r-0 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-white [&>button]:text-white [&>button]:hover:text-white"
      >
        <SheetHeader className="p-5 border-b border-white/10">
          <SheetTitle className="flex items-center gap-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">CRM WhatsApp</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-white/20 text-white shadow-md"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="relative shrink-0">
                  <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
                  {item.name === "Mensajes" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                  )}
                </div>
                <span className="flex-1 truncate">{item.name}</span>
                {item.name === "Mensajes" && unreadCount > 0 && (
                  <div className="relative flex h-3 w-3 ml-auto">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shrink-0 border-2 border-white/20">
              <span className="text-sm font-bold text-white uppercase">
                {user?.nombre?.[0] || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.nombre || "Cargando..."}
              </p>
              <p className="text-xs text-white/50 truncate">{user?.email || ""}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="ghost"
            size="sm"
            className="w-full rounded-xl bg-white/5 hover:bg-red-500/80 text-white/70 hover:text-white justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Cerrando..." : "Cerrar Sesion"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
