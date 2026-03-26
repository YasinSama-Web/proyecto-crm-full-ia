"use client"

import { Bell, Home, CheckCheck, Trash2, Moon, Sun, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/contexts/notification-context"
import { useRouter, usePathname } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import { MobileSidebar } from "./mobile-sidebar"
import { IACreditsModal } from "@/components/ia-credits-modal"

export function DashboardHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  
  // 🔥 ESTADOS PARA LOS CRÉDITOS Y ROLES
  const [isLowCredits, setIsLowCredits] = useState(false)
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(true) // Por defecto true para evitar parpadeos al dueño
  
  const { notifications, unreadCount, clearNotificationsByConversation } = useNotifications()
  // const clearAllNotifications = ... // Si la tienes en el context extráela aquí
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [creditosPlan, setCreditosPlan] = useState(0)
  const [creditosExtra, setCreditosExtra] = useState(0)
  
  useEffect(() => {
    setMounted(true)
    
    // 🔥 Buscamos Auth (para saber el rol) y Créditos en paralelo
    Promise.all([
      fetch('/api/auth/me?t=' + Date.now()).then(res => res.json()).catch(() => ({})),
      fetch('/api/user/credits?t=' + Date.now()).then(res => res.json()).catch(() => ({}))
    ]).then(([authData, creditsData]) => {
         const user = authData?.user;
         const isPrivileged = user?.role === 'OWNER' || (user?.role === 'AGENT' && user?.permissions?.tier === 'ADMIN');
         setIsAdminOrOwner(isPrivileged);

         const saldoPlan = creditsData.ia_credits || 0;
         const saldoExtra = creditsData.ia_credits_extra || 0;
         
         setCreditosPlan(saldoPlan);
         setCreditosExtra(saldoExtra);
         
         // Lógica de alerta roja depende del rol
         if (isPrivileged) {
             setIsLowCredits((saldoPlan + saldoExtra) < 20);
         } else {
             // Al agente solo le importa su saldo extra asignado
             setIsLowCredits((saldoPlan + saldoExtra) < 20);
         }
    });

    const handleOpenModal = () => setShowCreditsModal(true);
    window.addEventListener('open-ia-modal', handleOpenModal);
    
    return () => window.removeEventListener('open-ia-modal', handleOpenModal);
  }, [])

  const getPageTitle = () => {
    const path = pathname.split("/").pop()
    if (!path || path === "dashboard") return "Dashboard"
    
    if (path.length > 20 || (path.length > 10 && /\d/.test(path))) {
        if (pathname.includes("contacts")) return "Perfil del Contacto"
        if (pathname.includes("conversations")) return "Chat"
        if (pathname.includes("messages")) return "Chat"
        return "Detalle"
    }
    
    const formatted = path.charAt(0).toUpperCase() + path.slice(1)
    const translations: Record<string, string> = {
        Messages: "Mensajes",
        Contacts: "Contactos",
        Campaigns: "Campañas",
        Settings: "Configuración",
        Team: "Equipos",
        Lines: "Líneas",
        Support: "Soporte",
        Billing: "Suscripción",
        Automations: "Automatización",
        Marketing: "Marketing Center"
    }
    return translations[formatted] || formatted
  }

  const notificationList = Array.isArray(notifications) ? notifications : []

  const handleNotificationClick = (conversationId: string) => {
    clearNotificationsByConversation(conversationId)
    setOpen(false)
    router.push(`/dashboard/messages?id=${conversationId}`)
  }

  const formatNotificationContent = (msg: any) => {
    if (!msg) return "Nuevo mensaje"
    if (typeof msg === "string") {
        if (msg.includes("supabase") || msg.startsWith("http")) return "📷 Imagen adjunta"
        return msg
    }
    const type = msg.type || ""
    const content = msg.content || ""
    if (type === "image" || type === "imagen") return "📷 Imagen"
    if (type === "audio") return "🎤 Audio"
    if (type === "document") return "📄 Documento"
    if (content.includes("supabase") && content.startsWith("http")) return "📷 Imagen adjunta"
    return content || "Nuevo mensaje"
  }

  const buttonStyles = "relative h-10 w-10 rounded-xl mr-3 bg-card/80 dark:bg-card/60 hover:bg-card border border-border/50 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10 flex items-center justify-center group"

  return (
    <header className="sticky top-0 z-40 flex h-14 md:h-16 lg:h-20 w-full items-center justify-between px-3 md:px-4 lg:ml-6 lg:px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all">      
      
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 shrink-0"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex flex-col justify-center">
          <nav className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Home className="h-3 w-3" />
            <span>/</span>
            <span className="hover:text-foreground transition-colors cursor-default">Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-medium">{getPageTitle()}</span>
          </nav>
          <h1 className="text-base lg:text-lg font-bold text-foreground tracking-tight">{getPageTitle()}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">

        <div className={`flex items-center gap-1.5 p-1 border rounded-full shadow-sm transition-colors duration-300
            ${isLowCredits 
              ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50' 
              : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}
          `}>
            
            {isAdminOrOwner ? (
              // 🔥 VISTA DE DUEÑO / ADMIN: Ve el desglose completo y puede comprar
              <>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-colors
                  ${isLowCredits 
                    ? 'bg-white dark:bg-red-900/40 text-red-700 dark:text-red-300' 
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}
                `}>
                  <span className={isLowCredits ? "text-red-500 animate-pulse" : "text-amber-500"}>✨</span>
                  Plan: {creditosPlan}
                </div>

                <div className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold
                  ${isLowCredits ? 'text-red-600 dark:text-red-400' : 'text-violet-600 dark:text-violet-400'}
                `}>
                  <span className="text-[10px] opacity-70">➕</span>
                  Extra: {creditosExtra}
                </div>

                <button 
                  onClick={() => setShowCreditsModal(true)}
                  className={`w-6 h-6 flex items-center justify-center text-white rounded-full transition-colors shadow-sm ml-1 mr-0.5
                    ${isLowCredits 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-violet-600 hover:bg-violet-700'}
                  `}
                  title="Recargar Créditos IA"
                >
                  +
                </button>
              </>
            ) : (
              // 🔥 VISTA DE AGENTE: Solo ve su propio monedero (extra) y no puede comprar
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-colors
                ${isLowCredits 
                  ? 'bg-white dark:bg-red-900/40 text-red-700 dark:text-red-300' 
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'}
              `}>
                <span className={isLowCredits ? "text-red-500 animate-pulse" : "text-violet-500"}>✨</span>
                Créditos: {creditosPlan + creditosExtra} 
              </div>
            )}
        </div>

        {mounted && (
          <Button variant="ghost" size="icon" className={buttonStyles} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
             <Sun className="h-5 w-5 text-orange-500 absolute rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0" />
             <Moon className="h-5 w-5 text-blue-500 absolute rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100" />
          </Button>
        )}

        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={buttonStyles}>
                <Bell className="h-5 w-5 text-muted-foreground" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-[10px] font-bold text-white shadow-lg shadow-red-500/30 border-2 border-background"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[90vw] max-w-96 p-0 border-white/10 bg-slate-900/95 backdrop-blur-2xl text-white shadow-2xl rounded-2xl overflow-hidden mt-2 mr-2 md:mr-4" align="end">
               <div className="flex items-center justify-between border-b border-white/10 p-4 bg-white/5">
                 <div className="flex items-center gap-2">
                     <Bell className="h-4 w-4 text-blue-400" />
                     <h3 className="font-semibold text-sm">Notificaciones</h3>
                 </div>
               </div>
               <ScrollArea className="h-[350px]">
                {notificationList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                    <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Bell className="h-8 w-8 text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">Sin novedades</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[180px]">Estás al día con todos tus mensajes.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notificationList.map((notification, idx) => {
                      const contactName = notification.contactName || "Desconocido"
                      const isPhoneNumber = /^\d+$/.test(contactName)
                      const displayName = isPhoneNumber ? `+${contactName}` : contactName
                      const messageContent = formatNotificationContent(notification.message)

                      return (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={`${notification.conversationId}-${idx}`}
                          className="group flex items-start gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors relative"
                          onClick={() => handleNotificationClick(notification.conversationId)}
                        >
                          {/* Avatar Gradiente */}
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shrink-0 shadow-lg shadow-blue-500/20 text-white font-bold text-sm">
                            {displayName[0]?.toUpperCase() || "?"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: es })}
                              </span>
                            </div>
                            
                            {!isPhoneNumber && notification.contactName && (
                              <p className="text-xs text-blue-300/80 mb-1">+{notification.contactName}</p>
                            )}
                            
                            <p className="text-sm text-slate-300 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                                {messageContent}
                            </p>
                          </div>

                          {/* Botón borrar individual */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              clearNotificationsByConversation(notification.conversationId)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          
                          {/* Indicador de "No leído" azul */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            {notificationList.length > 0 && (
                <div className="border-t border-white/10 p-2 bg-slate-900/50">
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      // if (clearAllNotifications) clearAllNotifications() 
                    }}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Marcar todas como leídas
                  </Button>
                </div>
              )}
            </PopoverContent>
        </Popover>
        <IACreditsModal open={showCreditsModal} onOpenChange={setShowCreditsModal} />
      </div>
    </header>
  )
}
