"use client"

import { motion } from "framer-motion"
import { KpiCard } from "./kpi-card"
// 1. IMPORTAMOS LOS ICONOS AQUÍ (En el Cliente)
import { 
  DollarSign, 
  MessageSquare, 
  ClipboardList, 
  UserCheck 
} from "lucide-react"

// 2. DEFINIMOS PROPS DE DATOS PUROS (Sin funciones/iconos)
interface KpiCardWrapperProps {
  userName: string
  today: string
  isAgent: boolean
  stats: {
    ingresos: number
    conversaciones: number
    tareas: number
    equipo: number
  }
}

export function KpiCardWrapper({ userName, today, isAgent, stats }: KpiCardWrapperProps) {
  
  // 3. CONSTRUIMOS LA CONFIGURACIÓN VISUAL AQUÍ ADENTRO
  // Esto evita el error de "Functions cannot be passed directly"
  const kpiCards = [
    // TARJETA 1: INGRESOS (Solo si no es agente)
    ...(!isAgent ? [{
        title: "Ingresos Totales",
        value: stats.ingresos,
        subtitle: "Ver analíticas",
        icon: DollarSign, // El icono se asigna aquí, localmente
        href: "/dashboard/analytics",
        gradient: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
        iconBg: "bg-white/20",
        prefix: "$",
      }] : []),

    // TARJETA 2: CONVERSACIONES
    {
      title: "Conversaciones",
      value: !isAgent ? stats.conversaciones : "Ir al Chat",
      subtitle: "Bandeja de entrada",
      icon: MessageSquare,
      href: "/dashboard/messages",
      gradient: "bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600",
      iconBg: "bg-white/20",
    },

    // TARJETA 3: TAREAS
    {
      title: "Mis Tareas",
      value: stats.tareas,
      subtitle: stats.tareas > 0 ? "Pendientes" : "¡Todo al día!",
      icon: ClipboardList,
      href: "/dashboard/tasks",
      gradient: "bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600",
      iconBg: "bg-white/20",
    },

    // TARJETA 4: EQUIPO (Solo si no es agente)
    ...(!isAgent ? [{
        title: "Equipo",
        value: stats.equipo,
        subtitle: "Miembros activos",
        icon: UserCheck,
        href: "/dashboard/team",
        gradient: "bg-gradient-to-br from-orange-400 via-orange-500 to-red-500",
        iconBg: "bg-white/20",
      }] : []),
  ]

  return (
    <>
      {/* Header with staggered animation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-1"
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground text-balance">
          Bienvenido, {userName}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => (
          <KpiCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            href={card.href}
            gradient={card.gradient}
            iconBg={card.iconBg}
            delay={0.1 + index * 0.1}
            prefix={card.prefix}
          />
        ))}
      </div>
    </>
  )
}
