// ============================================================
// dashboard/page-content.tsx — Sahara One CRM Dashboard
// ============================================================

import {
  DollarSign, MessageSquare, Users, Flame,
  Bot, User, ArrowRight, PackageSearch, Zap, CheckCircle2,
  Activity, Smartphone, Percent, BrainCircuit, Send,
  TrendingUp, Hash
} from "lucide-react"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"
import { KpiCardWrapper } from "./kpi-card-wrapper"
import { ActivityFeed } from "./activity-feed"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ── GLASS CARD BASE ─────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl ${className}`}>
      <div className="relative z-10 flex flex-col h-full">{children}</div>
    </div>
  )
}

// ── 1. STATS GENERALES ──────────────────────────────────────
async function getStats(rootOwnerId: string) {
  try {
    const [conversaciones, ingresos] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM conversaciones WHERE usuario_id = ${rootOwnerId}`,
      sql`SELECT COALESCE(SUM(amount), 0) as total FROM ventas WHERE usuario_id = ${rootOwnerId}`,
    ])
    return {
      conversaciones: Number(conversaciones[0]?.count || 0),
      ingresos: Number(ingresos[0]?.total || 0),
    }
  } catch { return { conversaciones: 0, ingresos: 0 } }
}

// ── 2. TAREAS PENDIENTES ─────────────────────────────────────
async function getMyPendingTasks(userId: string) {
  try {
    const res = await sql`SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ${userId} AND is_completed = false`
    return Number(res[0]?.count || 0)
  } catch { return 0 }
}

// ── 3. ACTIVIDAD RECIENTE ────────────────────────────────────
async function getRecentActivity(rootOwnerId: string, allowedLineIds: string[], isAgent: boolean) {
  try {
    if (isAgent && allowedLineIds.length === 0) return []
    if (isAgent) {
      return await sql`
        SELECT m.id, m.content, m.type, m.timestamp, m.is_incoming, m.conversation_id,
               c.contact_name, c.contact_phone, c.status,
               l.nombre as line_name, u.nombre as agent_name, co.tags
        FROM mensajes m
        JOIN conversaciones c ON m.conversation_id = c.id
        LEFT JOIN lineas_whatsapp l ON c."lineId" = l.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        LEFT JOIN "Contact" co ON c.contact_phone = co.phone AND co.usuario_id = ${rootOwnerId}
        WHERE m.id IN (
          SELECT DISTINCT ON (conversation_id) id FROM mensajes ORDER BY conversation_id, timestamp DESC
        )
        AND c.usuario_id = ${rootOwnerId} AND c.status != 'RESOLVED'
        AND c."lineId" = ANY(${allowedLineIds})
        ORDER BY m.timestamp DESC LIMIT 5`
    }
    return await sql`
      SELECT m.id, m.content, m.type, m.timestamp, m.is_incoming, m.conversation_id,
             c.contact_name, c.contact_phone, c.status,
             l.nombre as line_name, u.nombre as agent_name, co.tags
      FROM mensajes m
      JOIN conversaciones c ON m.conversation_id = c.id
      LEFT JOIN lineas_whatsapp l ON c."lineId" = l.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN "Contact" co ON c.contact_phone = co.phone AND co.usuario_id = ${rootOwnerId}
      WHERE m.id IN (
        SELECT DISTINCT ON (conversation_id) id FROM mensajes ORDER BY conversation_id, timestamp DESC
      )
      AND c.usuario_id = ${rootOwnerId} AND c.status != 'RESOLVED'
      ORDER BY m.timestamp DESC LIMIT 5`
  } catch (error) { console.error("Error getRecentActivity:", error); return [] }
}

// ── 4. CIERRES POR ORIGEN — FIX PRINCIPAL ───────────────────
// 'bot' o NULL = IA (perito automático, chatbot)
// 'crm_manual' o 'kanban' = Humano
async function getAutomationStats(rootOwnerId: string) {
  try {
    const data = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN origen IN ('bot', 'ia') OR origen IS NULL THEN amount ELSE 0 END), 0) as ia_money,
        COALESCE(SUM(CASE WHEN origen IN ('humano', 'kanban') THEN amount ELSE 0 END), 0) as human_money,
        COUNT(CASE WHEN origen IN ('bot', 'ia') OR origen IS NULL THEN 1 END) as ia_cierres,
        COUNT(CASE WHEN origen IN ('humano', 'kanban') THEN 1 END) as human_cierres
      FROM ventas
      WHERE usuario_id = ${rootOwnerId} AND created_at::date = CURRENT_DATE`

    const iaMoney     = Number(data[0]?.ia_money     ?? 0)
    const humanMoney  = Number(data[0]?.human_money  ?? 0)
    const iaCierres   = Number(data[0]?.ia_cierres   ?? 0)
    const humanCierres= Number(data[0]?.human_cierres?? 0)
    const total       = iaMoney + humanMoney
    const autoPercent = total > 0 ? Math.round((iaMoney / total) * 100) : 0

    return { iaMoney, humanMoney, iaCierres, humanCierres, autoPercent }
  } catch (error) {
    console.error("Error getAutomationStats:", error)
    return { iaMoney: 0, humanMoney: 0, iaCierres: 0, humanCierres: 0, autoPercent: 0 }
  }
}

// ── 5. AUTOMATIZACIÓN DE MENSAJES (NUEVO) ───────────────────
// Mensajes salientes de hoy: los de convs con bot activo = IA, resto = Humano
async function getMensajesStats(rootOwnerId: string) {
  try {
    const data = await sql`
      SELECT
        COUNT(CASE WHEN c.bot_enabled = true  THEN 1 END) as ia_msgs,
        COUNT(CASE WHEN c.bot_enabled = false OR c.bot_enabled IS NULL THEN 1 END) as human_msgs
      FROM mensajes m
      JOIN conversaciones c ON m.conversation_id = c.id
      WHERE m.usuario_id = ${rootOwnerId}
        AND m.is_incoming = false
        AND m.timestamp::date = CURRENT_DATE`

    const iaMsgs    = Number(data[0]?.ia_msgs    ?? 0)
    const humanMsgs = Number(data[0]?.human_msgs ?? 0)
    const total     = iaMsgs + humanMsgs
    const iaPercent = total > 0 ? Math.round((iaMsgs / total) * 100) : 0
    return { iaMsgs, humanMsgs, total, iaPercent }
  } catch (error) {
    console.error("Error getMensajesStats:", error)
    return { iaMsgs: 0, humanMsgs: 0, total: 0, iaPercent: 0 }
  }
}

// ── 6. TRANSACCIONES RECIENTES ───────────────────────────────
async function getRecentTransactions(rootOwnerId: string) {
  try {
    return await sql`
      SELECT v.id, v.amount, v.created_at as timestamp, v.origen, v.descripcion,
             c.name as contact_name, c.phone as contact_phone
      FROM ventas v JOIN "Contact" c ON v.contact_id = c.id
      WHERE v.usuario_id = ${rootOwnerId}
      ORDER BY v.created_at DESC LIMIT 6`
  } catch { return [] }
}

// ── 7. EQUIPO ────────────────────────────────────────────────
async function getTeamMemberCount(rootOwnerId: string) {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM usuarios WHERE owner_id = ${rootOwnerId} AND role = 'AGENT'`
    return Number(result[0]?.count || 0)
  } catch { return 0 }
}

// ── 8. TOP PRODUCTOS ─────────────────────────────────────────
async function getTopProducts(rootOwnerId: string) {
  try {
    const ventasConProductos = await sql`
      SELECT productos_skus FROM ventas
      WHERE usuario_id = ${rootOwnerId}
        AND productos_skus IS NOT NULL
        AND created_at >= date_trunc('month', CURRENT_DATE)`
    const productCounts: Record<string, number> = {}
    ventasConProductos.forEach((v: any) => {
      try {
        const skus = typeof v.productos_skus === 'string' ? JSON.parse(v.productos_skus) : v.productos_skus
        if (Array.isArray(skus)) skus.forEach((item: string) => {
          const partes = item.split('x ')
          if (partes.length === 2) productCounts[partes[1].trim()] = (productCounts[partes[1].trim()] || 0) + (parseInt(partes[0].trim()) || 1)
        })
      } catch {}
    })
    const topSkus = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    if (topSkus.length === 0) return []
    const dbProducts = await sql`SELECT sku, nombre FROM productos WHERE usuario_id = ${rootOwnerId} AND sku = ANY(${topSkus.map(t => t[0])})`
    return topSkus.map(([sku, cantidad]) => ({
      sku, cantidad,
      nombre: dbProducts.find((p: any) => p.sku === sku)?.nombre || 'Desconocido',
    }))
  } catch { return [] }
}

// ── 9. HOT LEADS ─────────────────────────────────────────────
async function getHotLeads(rootOwnerId: string, allowedLineIds: string[], isAgent: boolean) {
  try {
    if (isAgent && allowedLineIds.length > 0) {
      return await sql`
        SELECT c.id, c.contact_name, c.contact_phone, c.last_activity,
               COALESCE(c.unread_ia_furious, false) as unread_ia_furious,
               co.lead_score, co.lead_score_reason
        FROM conversaciones c
        INNER JOIN "Contact" co ON c.contact_phone = co.phone AND co.usuario_id = ${rootOwnerId}
        WHERE c.usuario_id = ${rootOwnerId}
          AND (c.status IS NULL OR (c.status != 'CLOSED' AND c.status != 'RESOLVED'))
          AND (co.lead_score >= 30 OR c.unread_ia_furious = true)
          AND c."lineId" = ANY(${allowedLineIds})
        ORDER BY c.unread_ia_furious DESC, co.lead_score DESC NULLS LAST
        LIMIT 3`
    }
    return await sql`
      SELECT c.id, c.contact_name, c.contact_phone, c.last_activity,
             COALESCE(c.unread_ia_furious, false) as unread_ia_furious,
             co.lead_score, co.lead_score_reason
      FROM conversaciones c
      INNER JOIN "Contact" co ON c.contact_phone = co.phone AND co.usuario_id = ${rootOwnerId}
      WHERE c.usuario_id = ${rootOwnerId}
        AND (c.status IS NULL OR (c.status != 'CLOSED' AND c.status != 'RESOLVED'))
        AND (co.lead_score >= 30 OR c.unread_ia_furious = true)
      ORDER BY c.unread_ia_furious DESC, co.lead_score DESC NULLS LAST
      LIMIT 3`
  } catch (e: any) { console.error("getHotLeads:", e?.message); return [] }
}

// ── 10. SALUD DEL SISTEMA ────────────────────────────────────
async function getSystemHealth(rootOwnerId: string) {
  try {
    const [lineas, usuario, convsHoy, ventasHoy] = await Promise.all([
      sql`SELECT id, nombre, status FROM lineas_whatsapp WHERE "userId" = ${rootOwnerId}`,
      sql`SELECT ia_credits FROM usuarios WHERE id = ${rootOwnerId}`,
      sql`SELECT COUNT(*) as total FROM conversaciones WHERE usuario_id = ${rootOwnerId} AND fecha_creacion::date = CURRENT_DATE`,
      sql`SELECT COUNT(*) as total FROM ventas WHERE usuario_id = ${rootOwnerId} AND created_at::date = CURRENT_DATE`,
    ])
    const totalHoy = Number(convsHoy[0]?.total || 0)
    const ventas   = Number(ventasHoy[0]?.total || 0)
    const conversionRate = totalHoy > 0 ? ((ventas / totalHoy) * 100).toFixed(1) : "0.0"
    return {
      lineasActivas:  lineas.filter(l => l.status === 'CONECTADA').length,
      lineasTotal:    lineas.length,
      creditosIA:     Number(usuario[0]?.ia_credits || 0),
      conversionRate,
      ventasHoy: ventas,
    }
  } catch { return { lineasActivas: 0, lineasTotal: 0, creditosIA: 0, conversionRate: "0.0", ventasHoy: 0 } }
}

// ── 11. META EVENTOS — SOLO SI HAY EXISTENCIAS (NUEVO) ───────
async function getMetaEventsStats(rootOwnerId: string): Promise<null | {
  total: number; enviados: number; pendientes: number; valorTotal: number
}> {
  try {
    const data = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as enviados,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendientes,
        COALESCE(SUM(conversion_value), 0) as valor_total
      FROM marketing_events
      WHERE owner_id = ${rootOwnerId}`

    const total = Number(data[0]?.total ?? 0)
    if (total === 0) return null   // ← columna oculta si no hay eventos

    return {
      total,
      enviados:    Number(data[0]?.enviados    ?? 0),
      pendientes:  Number(data[0]?.pendientes  ?? 0),
      valorTotal:  Number(data[0]?.valor_total ?? 0),
    }
  } catch { return null }
}


// ════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════
export async function DashboardContent() {
  const user = await requireAuth()
  if (!user) return <div className="p-8 text-center text-red-500">No autorizado</div>

  const isAgent        = user.role === "AGENT"
  const allowedLineIds = user.permissions?.allowedLineIds || []

  const userQuery        = await sql`SELECT addon_ecommerce FROM usuarios WHERE id = ${user.rootOwnerId}`
  const hasEcommerceAddon = userQuery[0]?.addon_ecommerce || false

  const [
    stats, recentActivity, recentTransactions, teamCount,
    myTasksCount, topProducts, hotLeads, systemHealth,
    autoStats, mensajesStats, metaEvents,
  ] = await Promise.all([
    !isAgent ? getStats(user.rootOwnerId)               : { conversaciones: 0, ingresos: 0 },
    getRecentActivity(user.rootOwnerId, allowedLineIds, isAgent),
    !isAgent ? getRecentTransactions(user.rootOwnerId)   : [],
    !isAgent ? getTeamMemberCount(user.rootOwnerId)      : 0,
    getMyPendingTasks(user.id),
    (!isAgent && hasEcommerceAddon) ? getTopProducts(user.rootOwnerId) : [],
    getHotLeads(user.rootOwnerId, allowedLineIds, isAgent),
    !isAgent ? getSystemHealth(user.rootOwnerId)         : null,
    !isAgent ? getAutomationStats(user.rootOwnerId)      : null,
    !isAgent ? getMensajesStats(user.rootOwnerId)        : null,
    !isAgent ? getMetaEventsStats(user.rootOwnerId)      : null,
  ])

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  // ¿Cuántas columnas tiene la sección media? (depende si Meta Events existe)
  const hasMetaCol   = metaEvents !== null && !isAgent
  const midColsClass = hasMetaCol ? "lg:grid-cols-4" : "lg:grid-cols-3"
  const CARD_HEIGHT  = "h-[480px]"

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-10">

      {/* ── CABECERA ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            Hola, {user.nombre.split(' ')[0]} <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-slate-500 mt-1 capitalize">{today}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/pipeline">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl h-11 px-6 font-bold">
              <DollarSign className="w-4 h-4 mr-1.5" /> Nueva Venta
            </Button>
          </Link>
          <Link href="/dashboard/campaigns">
            <Button variant="outline" className="rounded-xl h-11 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 font-bold">
              <Zap className="w-4 h-4 mr-1.5" /> Campaña
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI CARDS ────────────────────────────────────────── */}
      <KpiCardWrapper
        userName={user.nombre || "Usuario"}
        today={today}
        isAgent={isAgent}
        stats={{
          ingresos: stats.ingresos,
          conversaciones: stats.conversaciones,
          tareas: myTasksCount,
          equipo: teamCount,
        }}
      />

      {/* ══════════════════════════════════════════════════════
          SECCIÓN MEDIA — ALTURA UNIFORME + OVERFLOW SCROLL
      ══════════════════════════════════════════════════════ */}
      <div className={`grid gap-6 ${midColsClass}`}>

        {/* COL 1: FEED DE ACTIVIDAD */}
        <GlassCard className="lg:col-span-1">
          <div className={`flex flex-col ${CARD_HEIGHT}`}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" /> Feed de Actividad
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Chats activos y solicitudes</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              <ActivityFeed recentActivity={recentActivity as any} isAgent={isAgent} />
            </div>
          </div>
        </GlassCard>

        {/* COL 2: MONITOR DE LEADS */}
        <GlassCard className="lg:col-span-1">
          <div className={`flex flex-col ${CARD_HEIGHT}`}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-orange-50/40 dark:bg-orange-950/10">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" /> Monitor de Leads
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Oportunidades y alertas urgentes</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {hotLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <CheckCircle2 className="w-9 h-9 mb-3 opacity-30 text-emerald-500" />
                  <p className="text-sm font-medium">Bandeja al día. ¡A prospectar!</p>
                </div>
              ) : hotLeads.map((chat: any) => (
                <div key={chat.id} className={`group p-4 rounded-2xl border transition-all ${
                  chat.unread_ia_furious
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 hover:border-rose-400'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-orange-300 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate pr-2">
                      {chat.contact_name || chat.contact_phone}
                    </h4>
                    {chat.unread_ia_furious ? (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md animate-pulse border border-rose-200 shrink-0">⚠️ URGENTE</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md border border-orange-200 shrink-0 flex items-center gap-1">
                        {chat.lead_score}% <Flame className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {chat.unread_ia_furious
                      ? '🚨 Cliente frustrado o solicitó agente humano.'
                      : `"${chat.lead_score_reason || 'Interés detectado por actividad reciente.'}"`}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Link href={`/dashboard/messages?id=${chat.id}`}>
                      <Button size="sm" className={`h-7 px-3 text-xs text-white font-bold rounded-xl ${
                        chat.unread_ia_furious ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-500 hover:bg-orange-600'
                      }`}>
                        Atender <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* COL 3: MÉTRICAS COMBINADAS (Cierres + Mensajes + Sistema) */}
        {!isAgent && systemHealth && autoStats && mensajesStats && (
          <GlassCard className="lg:col-span-1">
            <div className={`flex flex-col ${CARD_HEIGHT}`}>

              {/* ── A. CIERRES POR ORIGEN ─── */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cierres por Origen — Hoy</p>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                      <Bot className="w-3 h-3 text-blue-500" /> Caleb AI
                    </div>
                    <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                      ${autoStats.iaMoney.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[9px] text-slate-400">{autoStats.iaCierres} cierre{autoStats.iaCierres !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                      <User className="w-3 h-3 text-orange-500" /> Humanos
                    </div>
                    <p className="text-xl font-black text-orange-600 dark:text-orange-400">
                      ${autoStats.humanMoney.toLocaleString('es-AR')}
                    </p>
                    <p className="text-[9px] text-slate-400">{autoStats.humanCierres} cierre{autoStats.humanCierres !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {/* Barra IA / Humano */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${autoStats.autoPercent}%` }} />
                  <div className="h-full bg-orange-400 transition-all duration-700" style={{ width: `${100 - autoStats.autoPercent}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-blue-500 font-bold">{autoStats.autoPercent}% IA</span>
                  <span className="text-[9px] text-orange-500 font-bold">{100 - autoStats.autoPercent}% Humano</span>
                </div>
              </div>

              {/* ── B. MENSAJES AUTOMATIZADOS ─── */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mensajes Enviados — Hoy</p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-800 dark:text-slate-100">{mensajesStats.iaMsgs.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-400">por la IA</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-slate-800 dark:text-slate-100">{mensajesStats.humanMsgs.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-400">por humanos</p>
                    </div>
                  </div>
                </div>
                {/* Mini barra de mensajes */}
                {mensajesStats.total > 0 && (
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mt-1">
                    <div className="h-full bg-blue-400" style={{ width: `${mensajesStats.iaPercent}%` }} />
                    <div className="h-full bg-orange-300" style={{ width: `${100 - mensajesStats.iaPercent}%` }} />
                  </div>
                )}
              </div>

              {/* ── C. SALUD DEL SISTEMA ─── */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sistema</p>
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {/* Conversión */}
                  <div className="flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900">
                    <Percent className="w-4 h-4 text-emerald-500 mb-1" />
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{systemHealth.conversionRate}%</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center mt-0.5">Conversión</p>
                  </div>
                  {/* Créditos IA */}
                  <div className="flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl p-3 border border-indigo-100 dark:border-indigo-900">
                    <BrainCircuit className="w-4 h-4 text-indigo-500 mb-1" />
                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{systemHealth.creditosIA}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center mt-0.5">Créditos</p>
                  </div>
                  {/* Líneas */}
                  <div className={`flex flex-col items-center justify-center rounded-2xl p-3 border ${
                    systemHealth.lineasActivas < systemHealth.lineasTotal
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                      : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
                  }`}>
                    <Smartphone className={`w-4 h-4 mb-1 ${systemHealth.lineasActivas < systemHealth.lineasTotal ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100">{systemHealth.lineasActivas}/{systemHealth.lineasTotal}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center mt-0.5">Líneas</p>
                  </div>
                </div>
              </div>

            </div>
          </GlassCard>
        )}

        {/* COL 4: META EVENTS — SOLO SI HAY DATOS (NUEVO) */}
        {hasMetaCol && metaEvents && (
          <GlassCard className="lg:col-span-1">
            <div className={`flex flex-col ${CARD_HEIGHT}`}>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-violet-50/40 dark:bg-violet-950/10">
                <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-violet-500" /> Eventos Meta
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Conversiones enviadas a Meta Ads</p>
              </div>

              <div className="p-5 flex flex-col gap-5 flex-1">
                {/* Total */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900">
                  <div>
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Total Eventos</p>
                    <p className="text-3xl font-black text-violet-700 dark:text-violet-400">{metaEvents.total.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-violet-600" />
                  </div>
                </div>

                {/* Enviados / Pendientes */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 text-center">
                    <p className="text-xl font-black text-emerald-600">{metaEvents.enviados.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Enviados</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 text-center">
                    <p className="text-xl font-black text-amber-600">{metaEvents.pendientes.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Pendientes</p>
                  </div>
                </div>

                {/* Valor total */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Valor Total Conversiones</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    ${metaEvents.valorTotal.toLocaleString('es-AR')}
                  </p>
                </div>

                {/* Barra de progreso */}
                {metaEvents.total > 0 && (
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1.5">
                      <span>Progreso de envío</span>
                      <span>{Math.round((metaEvents.enviados / metaEvents.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all duration-700"
                        style={{ width: `${(metaEvents.enviados / metaEvents.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-auto">
                  <Link href="/dashboard/marketing">
                    <Button variant="outline" size="sm" className="w-full rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 text-xs font-bold">
                      Ver Marketing Center <ArrowRight className="w-3 h-3 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

      </div>{/* fin sección media */}

      {/* ══════════════════════════════════════════════════════
          SECCIÓN INFERIOR — TRANSACCIONES + PRODUCTOS
      ══════════════════════════════════════════════════════ */}
      {!isAgent && (
        <div className={`grid gap-6 ${hasEcommerceAddon && topProducts.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>

          {/* ÚLTIMAS TRANSACCIONES */}
          <GlassCard className={hasEcommerceAddon && topProducts.length > 0 ? "lg:col-span-2" : "lg:col-span-1"}>
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Últimas Transacciones
              </h2>
              <Link href="/dashboard/analytics">
                <span className="text-xs font-bold text-emerald-600 hover:underline bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full">Ver todas</span>
              </Link>
            </div>
            <div className="p-5 overflow-y-auto max-h-[340px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentTransactions.length === 0 ? (
                  <p className="col-span-full text-center py-8 text-slate-400 text-sm">Sin ventas recientes</p>
                ) : recentTransactions.map((sale: any) => {
                  const isIA = !sale.origen || sale.origen === 'bot' || sale.origen === 'ia'
                  return (
                    <div key={sale.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-emerald-200 transition-all shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner ${
                          isIA ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-orange-400 to-rose-500'
                        }`}>
                          {sale.contact_name?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{sale.contact_name || "Sin nombre"}</p>
                          {sale.descripcion && sale.descripcion.includes(':') && (
                            <p className="text-[10px] text-violet-600 dark:text-violet-400 bg-violet-100/50 px-1.5 py-0.5 rounded w-fit my-0.5 truncate max-w-[160px] border border-violet-200/50">
                              {sale.descripcion.split(':')[1].trim()}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isIA ? (
                              <span className="flex items-center text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase"><Bot className="w-2.5 h-2.5 mr-0.5"/>IA</span>
                            ) : (
                              <span className="flex items-center text-[9px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded uppercase"><User className="w-2.5 h-2.5 mr-0.5"/>Humano</span>
                            )}
                            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
  {new Date(sale.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })},{' '}
  {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-base font-black text-emerald-600 shrink-0 ml-2">+${Number(sale.amount).toLocaleString('es-AR')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </GlassCard>

          {/* TOP PRODUCTOS */}
          {hasEcommerceAddon && topProducts.length > 0 && (
            <GlassCard className="lg:col-span-1">
              <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <PackageSearch className="w-4 h-4 text-indigo-500" /> Lo más vendido
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Mes actual</p>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {topProducts.map((prod: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs shrink-0 border border-indigo-200">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate">{prod.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{prod.sku}</p>
                    </div>
                    <Badge variant="secondary" className="bg-white dark:bg-slate-900 text-slate-700 border-slate-200 text-xs px-2 py-1 shadow-sm shrink-0">
                      {prod.cantidad} unid.
                    </Badge>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

        </div>
      )}
    </div>
  )
}