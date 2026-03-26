"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { 
  DollarSign, TrendingUp, Users, MessageSquare, Globe, MapPin, Smartphone, 
  Calendar, Filter, ArrowUpRight, ArrowDownRight, Eye, MousePointerClick, Percent
} from "lucide-react"
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from "recharts"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import { scaleLinear } from "d3-scale"
import { Tooltip as ReactTooltip } from "react-tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KpiCard } from "@/components/dashboard/kpi-card"

// IMPORTANTE: Aquí están los imports de fechas que faltaban
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

const GEO_URL = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json"

const ISO_MAP: Record<string, string> = {
    "AR": "ARG", "US": "USA", "ES": "ESP", "MX": "MEX", "CO": "COL", "CL": "CHL", 
    "PE": "PER", "BR": "BRA", "UY": "URY", "PY": "PRY", "BO": "BOL", "EC": "ECU", 
    "VE": "VEN", "CA": "CAN", "AU": "AUS", "GB": "GBR", "FR": "FRA", "DE": "DEU", 
    "IT": "ITA", "PT": "PRT", "RU": "RUS", "CN": "CHN", "JP": "JPN", "IN": "IND",
    "ZA": "ZAF", "NZ": "NZL", "KR": "KOR", "SG": "SGP", "IE": "IRL", "CH": "CHE",
    "NL": "NLD", "BE": "BEL", "SE": "SWE", "NO": "NOR", "DK": "DNK", "FI": "FIN",
    "TR": "TUR", "IL": "ISR", "SA": "SAU", "AE": "ARE", "EG": "EGY", "MA": "MAR"
}

const DEVICE_COLORS = { desktop: "#6366F1", mobile: "#10B981", tablet: "#F59E0B", unknown: "#94A3B8" }

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl">
      <p className="text-white/70 text-xs mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-white text-sm font-medium">{entry.name}: {entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// Glass Card Container
function GlassCard({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

interface AnalyticsDashboardProps {
  kpis: any
  dailySales: any[]
  recentSales: any[]
  chatMetrics: any[]
  landings: any[]
  geoData: { countries: { country: string, visits: number }[], cities: { country: string, city: string, visits: number }[] }
  deviceData: { device_type: string, count: number }[]
  goalData: { goal: number, currentTotal: number, trendPercentage: number }
  monthlyHistory: any[]
  avgResponseTime: string // 
}

export function AnalyticsDashboard({ kpis, dailySales, recentSales, chatMetrics, landings, geoData, deviceData, goalData, monthlyHistory, avgResponseTime }: AnalyticsDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const [activeTab, setActiveTab] = useState<"ventas" | "chat" | "landings">("ventas")
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  // =========================================================================
  // 🔥 INICIO DEL BLOQUE DE FECHAS (Anti-Lag y Anti-Espejo)
  // =========================================================================

  const [isNavigating, setIsNavigating] = useState(false);

  const parseDateLocal = (dateStr: string | null, isEndDate = false) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
  }

  const [date, setDate] = useState<DateRange | undefined>({
    from: fromParam ? parseDateLocal(fromParam) : new Date(),
    to: toParam ? parseDateLocal(toParam, true) : new Date(),
  })

  useEffect(() => {
    if (fromParam && toParam) {
      setDate({ from: parseDateLocal(fromParam), to: parseDateLocal(toParam, true) })
      setIsNavigating(false);
    }
  }, [fromParam, toParam])

  const pushWithDebounce = (fromStr: string, toStr: string) => {
    setIsNavigating(true); 
    if ((window as any).dateTimeout) clearTimeout((window as any).dateTimeout);
    
    (window as any).dateTimeout = setTimeout(() => {
      router.push(`/dashboard/analytics?from=${fromStr}&to=${toStr}`);
    }, 400); 
  }

  const handleCalendarSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
    if (newDate?.from && newDate?.to) {
      pushWithDebounce(format(newDate.from, 'yyyy-MM-dd'), format(newDate.to, 'yyyy-MM-dd'));
    }
  }

  const applyQuickFilter = (fromD: Date, toD: Date) => {
    setDate({ from: new Date(fromD), to: new Date(toD) })
    pushWithDebounce(format(fromD, 'yyyy-MM-dd'), format(toD, 'yyyy-MM-dd'));
  }

  // =========================================================================
  // 🔥 FIN DEL BLOQUE DE FECHAS
  // =========================================================================

  // Map Data
  const countryMap = useMemo(() => {
    const map: Record<string, number> = {}
    geoData.countries.forEach(d => { map[ISO_MAP[d.country] || d.country] = Number(d.visits) })
    return map
  }, [geoData.countries])

  const maxVisits = Math.max(...geoData.countries.map(c => Number(c.visits)), 1)
  const colorScale = scaleLinear<string>().domain([0, maxVisits]).range(["#E0E7FF", "#4F46E5"])
  const filteredCities = selectedCountry ? geoData.cities.filter(c => (ISO_MAP[c.country] || c.country) === selectedCountry) : geoData.cities.slice(0, 10)

  // Chart Data (Usamos parseDateLocal para los gráficos también)
  const deviceChartData = deviceData.map(d => ({
    name: d.device_type === 'desktop' ? 'Escritorio' : d.device_type === 'mobile' ? 'Movil' : d.device_type === 'tablet' ? 'Tablet' : 'Otro',
    value: Number(d.count), type: d.device_type
  }))
  
  const salesChartData = dailySales.map(day => ({ 
    date: format(parseDateLocal(day.date), "dd MMM", { locale: es }), 
    ingresos: Number(day.total), 
    ventas: Number(day.count) 
  }))
  
  const chatChartData = chatMetrics.map(day => ({ 
    date: format(parseDateLocal(day.date), "dd MMM", { locale: es }), 
    nuevos: Number(day.nuevos), 
    resueltos: Number(day.resueltos) 
  }))

  const totalVisits = landings.reduce((a, l) => a + l.visitas, 0)
  const totalClicks = landings.reduce((a, l) => a + l.clics_boton, 0)
  const globalCTR = totalVisits > 0 ? ((totalClicks / totalVisits) * 100).toFixed(1) : "0"

  const tabs = [
    { id: "ventas", label: "Ventas & Conversiones" },
    { id: "chat", label: "Rendimiento de Chat" },
    { id: "landings", label: "Landing Pages" }
  ]

// ------------------------------------------
// AQUÍ ABAJO EMPIEZA TU "return ("
// ------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/50">
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-xl border-b border-white/50">
        <div className="px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-right md:justify-between">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Analiticas</h1>
              <p className="text-slate-500 text-sm">Panel de control y metricas de rendimiento</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex gap-2">
              
              {/* 🔥 FILTROS RÁPIDOS (Conectados a applyQuickFilter) */}
              <Select onValueChange={(val) => {
                const t = new Date()
                if (val === "today") applyQuickFilter(t, t)
                if (val === "yesterday") applyQuickFilter(subDays(t, 1), subDays(t, 1))
                if (val === "7") applyQuickFilter(subDays(t, 7), t)
                if (val === "30") applyQuickFilter(subDays(t, 30), t)
                if (val === "month") applyQuickFilter(new Date(t.getFullYear(), t.getMonth(), 1), t)
              }}>
                <SelectTrigger className="w-[140px] bg-white/70 backdrop-blur-sm border-white/50 rounded-xl">
                  <SelectValue placeholder="Rápido..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="yesterday">Ayer</SelectItem>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                </SelectContent>
              </Select>

              {/* 🔥 CALENDARIO AVANZADO (Conectado a handleCalendarSelect) */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className={`flex items-center gap-2 px-4 py-2 w-[260px] justify-start text-left font-medium bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl transition-all hover:bg-white/90 ${!date && "text-slate-500"}`}>
                    <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate text-sm text-slate-700">
                      {date?.from ? (
                        date.to ? `${format(date?.from, "dd LLL", { locale: es })} - ${format(date?.to, "dd LLL, y", { locale: es })}` : format(date?.from, "dd LLL, y", { locale: es })
                      ) : "Elegir fechas..."}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-white/60 shadow-xl" align="end">
                  <CalendarComponent 
                    initialFocus 
                    mode="range" 
                    defaultMonth={date?.from} 
                    selected={date} 
                    onSelect={handleCalendarSelect} 
                    numberOfMonths={2} 
                    locale={es} 
                    showOutsideDays={false}
                    className="bg-white/90 backdrop-blur-md rounded-2xl" 
                  />
                </PopoverContent>
              </Popover>
              
            </motion.div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 🔥 LA ESTRELLA POLAR: BARRA DE META GIGANTE */}
        <GlassCard delay={0}>
          <div className="p-6 md:p-8 relative overflow-hidden">
            {/* Efecto de luz de fondo */}
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Objetivo Mensual de Facturación</h2>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${goalData.trendPercentage >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {goalData.trendPercentage >= 0 ? "🔼" : "🔽"} {Math.abs(goalData.trendPercentage).toFixed(1)}% vs mes pasado
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter">
                    ${goalData.currentTotal.toLocaleString("es-AR")}
                  </span>
                  <span className="text-xl md:text-2xl font-bold text-slate-400">
                    / ${goalData.goal.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
              
              <div className="text-left md:text-right bg-white/50 px-4 py-3 rounded-2xl border border-white/60 shadow-sm backdrop-blur-md">
                <p className="text-3xl font-black bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  {Math.min((goalData.currentTotal / goalData.goal) * 100, 100).toFixed(1)}%
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Completado</p>
              </div>
            </div>
            
            {/* LA BARRA DE PROGRESO */}
            <div className="h-4 w-full bg-slate-200/50 rounded-full overflow-hidden relative z-10 shadow-inner">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${Math.min((goalData.currentTotal / goalData.goal) * 100, 100)}%` }} 
                transition={{ duration: 1.5, ease: "easeOut" }} 
                className={`h-full rounded-full relative ${
                  (goalData.currentTotal / goalData.goal) >= 1 
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_15px_rgba(52,211,153,0.6)]" 
                    : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                }`}
              >
                {/* Brillo animado interior */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
              </motion.div>
            </div>
          </div>
        </GlassCard>
        {/* KPI CARDS - Reutilizando el componente existente */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Ingresos Totales"
            value={Number(kpis.total_ingresos)}
            subtitle={`${kpis.total_ventas} ventas completadas`}
            icon={DollarSign}
            href="/dashboard/analytics"
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            iconBg="bg-emerald-400/30"
            delay={0}
            prefix="$"
          />
          <KpiCard
            title="Conversiones"
            value={Number(kpis.total_ventas)}
            subtitle="Clientes compradores"
            icon={TrendingUp}
            href="/dashboard/analytics"
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            iconBg="bg-violet-400/30"
            delay={0.1}
          />
          <KpiCard
            title="Nuevos Contactos"
            value={Number(kpis.nuevos_contactos)}
            subtitle="Ultimos 30 dias"
            icon={Users}
            href="/dashboard/contacts"
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            iconBg="bg-blue-400/30"
            delay={0.2}
          />
          <KpiCard
            title="Chats Activos"
            value={Number(kpis.total_chats - kpis.chats_resueltos)}
            subtitle="Pendientes de cierre"
            icon={MessageSquare}
            href="/dashboard/messages"
            gradient="bg-gradient-to-br from-orange-500 to-amber-600"
            iconBg="bg-orange-400/30"
            delay={0.3}
          />
        </div>

        {/* TABS */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="flex gap-2 p-1.5 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/50 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id 
                  ? "bg-slate-800 text-white shadow-lg" 
                  : "text-slate-600 hover:bg-white/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* TAB: VENTAS */}
        {activeTab === "ventas" && (
          <div className="space-y-6">
            {/* Area Chart - Ingresos */}
            <GlassCard delay={0.1}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Ingresos por Dia</h3>
                    <p className="text-sm text-slate-500">Evolucion de ingresos en el periodo</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                    <ArrowUpRight className="w-4 h-4" /> +12.5%
                  </div>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData}>
                      <defs>
                        <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                      <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="ingresos" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" name="Ingresos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>

            {/* 🔥 NUEVO GRÁFICO: HISTORIAL DE METAS VS REALIDAD */}
            <GlassCard delay={0.15}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Crecimiento Histórico</h3>
                    <p className="text-sm text-slate-500">Comparativa: Meta planificada vs Facturación real (Últimos 6 meses)</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      
                      {/* Barra de la Meta (Gris suave de fondo) */}
                      <Bar dataKey="Meta" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Objetivo Mensual" barSize={32} />
                      
                      {/* Barra Real (Color principal que se superpone visualmente) */}
                      <Bar dataKey="Realidad" fill="#10B981" radius={[4, 4, 0, 0]} name="Ingresos Reales" barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>

            {/* Recent Sales */}
            <div className="grid gap-6 lg:grid-cols-2">
              <GlassCard delay={0.2}>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Ultimas Ventas</h3>
                  {recentSales.length === 0 ? (
                    <p className="text-center py-8 text-slate-500">Sin ventas recientes</p>
                  ) : (
                    <div className="space-y-3">
                      {recentSales.map((sale, i) => (
                        <motion.div 
                          key={sale.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                              {sale.contact_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{sale.contact_name || "Sin nombre"}</p>
                              <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-emerald-600">${Number(sale.amount).toLocaleString()}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard delay={0.3}>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Volumen de Ventas</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                        <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Bar dataKey="ventas" fill="#6366F1" radius={[4, 4, 0, 0]} name="Ventas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB: CHAT */}
        {activeTab === "chat" && (
          <div className="space-y-6">
            <GlassCard delay={0.1}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Actividad de Chat</h3>
                    <p className="text-sm text-slate-500">Nuevos vs resueltos por dia</p>
                  </div>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chatChartData}>
                      <defs>
                        <linearGradient id="colorNuevos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorResueltos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                      <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="nuevos" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorNuevos)" name="Nuevos" />
                      <Area type="monotone" dataKey="resueltos" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorResueltos)" name="Resueltos" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>

            <div className="grid gap-6 md:grid-cols-2">
              <GlassCard delay={0.2}>
                <div className="p-6 text-center">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Tasa de Resolucion</h3>
                  <div className="text-5xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                    {kpis.total_chats > 0 ? Math.round((kpis.chats_resueltos / kpis.total_chats) * 100) : 0}%
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{kpis.chats_resueltos} de {kpis.total_chats} chats</p>
                </div>
              </GlassCard>
             <GlassCard delay={0.3}>
                <div className="p-6 text-center">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Tiempo Promedio</h3>
                  
                  
                  <div className="text-5xl font-bold text-slate-800">{avgResponseTime}</div>
                  
                  <p className="text-sm text-slate-500 mt-2">Primera respuesta</p>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* TAB: LANDINGS */}
        {activeTab === "landings" && (
          <div className="space-y-6">
            {/* Landing KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
              <GlassCard delay={0.1} className="bg-gradient-to-br from-violet-500/10 to-purple-500/10">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                      <Eye className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Trafico Total</p>
                      <p className="text-2xl font-bold text-slate-800">{totalVisits.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard delay={0.2} className="bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center">
                      <MousePointerClick className="w-6 h-6 text-fuchsia-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Clics WhatsApp</p>
                      <p className="text-2xl font-bold text-slate-800">{totalClicks.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard delay={0.3} className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                      <Percent className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">CTR Global</p>
                      <p className="text-2xl font-bold text-slate-800">{globalCTR}%</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Map + Cities */}
            <div className="grid gap-6 lg:grid-cols-7">
              <GlassCard delay={0.4} className="lg:col-span-4 overflow-hidden">
                <div className="p-4 border-b border-white/30">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-800">Mapa de Audiencia</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Haz clic en un pais para ver ciudades</p>
                </div>
                <div className="h-[400px] bg-gradient-to-br from-slate-100 to-indigo-100/50">
                  {geoData.countries.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-500">Esperando datos...</div>
                  ) : (
                    <>
                      <ComposableMap projectionConfig={{ scale: 140 }} className="w-full h-full">
                        <ZoomableGroup>
                          <Geographies geography={GEO_URL}>
                            {({ geographies }) => geographies.map((geo) => {
                              const mapCode = geo.id
                              const visits = countryMap[mapCode] || 0
                              return (
                                <Geography
                                  key={geo.rsmKey}
                                  geography={geo}
                                  fill={visits > 0 ? colorScale(visits) : "#E2E8F0"}
                                  stroke="#FFF"
                                  strokeWidth={0.5}
                                  style={{ 
                                    default: { outline: "none" }, 
                                    hover: { fill: "#4F46E5", outline: "none", cursor: "pointer" }, 
                                    pressed: { fill: "#3730A3", outline: "none" } 
                                  }}
                                  onClick={() => { if(mapCode) setSelectedCountry(mapCode === selectedCountry ? null : mapCode) }}
                                  data-tooltip-id="geo-tooltip" 
                                  data-tooltip-content={`${geo.properties.name}: ${visits} visitas`}
                                />
                              )
                            })}
                          </Geographies>
                        </ZoomableGroup>
                      </ComposableMap>
                      <ReactTooltip id="geo-tooltip" className="!bg-slate-900 !rounded-xl !px-3 !py-2 !text-sm" />
                    </>
                  )}
                </div>
              </GlassCard>

              <GlassCard delay={0.5} className="lg:col-span-3 flex flex-col">
                <div className="p-4 border-b border-white/30 shrink-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-slate-800">{selectedCountry ? "Detalle del Pais" : "Top Ciudades"}</h3>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {filteredCities.length === 0 ? (
                    <p className="text-center py-8 text-slate-500 text-sm">Sin datos de ubicacion</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredCities.map((item, i) => {
                        const maxCityVisits = Math.max(...filteredCities.map(c => Number(c.visits)), 1)
                        const percentage = (Number(item.visits) / maxCityVisits) * 100
                        return (
                          <motion.div 
                            key={`${item.country}-${item.city}-${i}`} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                  {item.country}
                                </div>
                                <span className="font-medium text-slate-700 text-sm">{item.city || "Desconocida"}</span>
                              </div>
                              <span className="font-bold text-indigo-600">{item.visits}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                              />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Devices + Landing Performance */}
            <div className="grid gap-6 lg:grid-cols-7">
              <GlassCard delay={0.6} className="lg:col-span-3">
                <div className="p-4 border-b border-white/30">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-violet-500" />
                    <h3 className="font-bold text-slate-800">Dispositivos</h3>
                  </div>
                </div>
                <div className="h-[280px] p-4">
                  {deviceChartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-500 text-sm">Sin datos</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deviceChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                          {deviceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={DEVICE_COLORS[entry.type as keyof typeof DEVICE_COLORS] || DEVICE_COLORS.unknown} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>

              <GlassCard delay={0.7} className="lg:col-span-4 flex flex-col">
                <div className="p-4 border-b border-white/30 shrink-0">
                  <h3 className="font-bold text-slate-800">Rendimiento por Pagina</h3>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {landings.length === 0 ? (
                    <p className="text-center py-8 text-slate-500 text-sm">No tienes Landing Pages activas</p>
                  ) : (
                    <div className="space-y-3">
                      {landings.map((landing, i) => {
                        const rate = landing.visitas > 0 ? ((landing.clics_boton / landing.visitas) * 100).toFixed(1) : "0"
                        return (
                          <motion.div 
                            key={landing.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="p-4 rounded-xl bg-white/50 hover:bg-white/80 transition-colors border border-white/30"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-semibold text-slate-800">{landing.nombre}</span>
                              <span className={`text-sm font-bold px-2 py-1 rounded-full ${Number(rate) > 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {rate}% Conv.
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(Number(rate), 100)}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full"
                              />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {landing.visitas} Visitas</span>
                              <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {landing.clics_boton} Clics</span>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
