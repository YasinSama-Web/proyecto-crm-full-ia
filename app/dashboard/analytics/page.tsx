import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"
import { redirect } from "next/navigation"
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard"

export const dynamic = "force-dynamic"

// 1. KPIs OFICIALES (Leen de Ventas de TODA LA EMPRESA)
async function getKPIs(rootOwnerId: string, startDate: string, endDate: string) {
  try {
    const data = await sql`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM ventas WHERE usuario_id IN (SELECT id FROM usuarios WHERE owner_id = ${rootOwnerId} OR id = ${rootOwnerId}) AND created_at >= ${startDate} AND created_at <= ${endDate}) as total_ingresos,
        
        (SELECT COUNT(*) FROM ventas WHERE usuario_id IN (SELECT id FROM usuarios WHERE owner_id = ${rootOwnerId} OR id = ${rootOwnerId}) AND created_at >= ${startDate} AND created_at <= ${endDate}) as total_ventas,
        
        (SELECT COUNT(DISTINCT id) FROM conversaciones WHERE usuario_id = ${rootOwnerId} AND fecha_creacion >= ${startDate} AND fecha_creacion <= ${endDate}) as total_chats,
        
        (SELECT COUNT(DISTINCT id) FROM conversaciones WHERE status = 'RESOLVED' AND usuario_id = ${rootOwnerId} AND fecha_creacion >= ${startDate} AND fecha_creacion <= ${endDate}) as chats_resueltos,
        
        (SELECT COUNT(DISTINCT id) FROM conversaciones WHERE usuario_id = ${rootOwnerId} AND fecha_creacion >= ${startDate} AND fecha_creacion <= ${endDate}) as nuevos_contactos
    `
    return data[0]
  } catch (error) { 
    console.error("Error en getKPIs:", error)
    return { total_ingresos: 0, total_ventas: 0, total_chats: 0, chats_resueltos: 0, nuevos_contactos: 0 } 
  }
}

// 2. VENTAS DIARIAS (Toda la empresa)
async function getDailySales(rootOwnerId: string, startDate: string, endDate: string) {
  try {
    return await sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM ventas
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE owner_id = ${rootOwnerId} OR id = ${rootOwnerId}) 
      AND created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY date ORDER BY date ASC
    `
  } catch (e) { return [] }
}

// 3. VENTAS RECIENTES (Toda la empresa)
async function getRecentSales(rootOwnerId: string, startDate: string, endDate: string) {
  try {
    return await sql`
      SELECT v.id, v.amount, v.created_at, c.name as contact_name, c.phone as contact_phone
      FROM ventas v
      JOIN "Contact" c ON v.contact_id = c.id
      WHERE v.usuario_id IN (SELECT id FROM usuarios WHERE owner_id = ${rootOwnerId} OR id = ${rootOwnerId}) 
      AND v.created_at >= ${startDate} AND v.created_at <= ${endDate}
      ORDER BY v.created_at DESC LIMIT 5
    `
  } catch (e) { return [] }
}

// 4. MÉTRICAS DE CHAT (Se mantiene igual)
async function getChatMetrics(rootOwnerId: string, startDate: string, endDate: string) {
  try {
    return await sql`
      SELECT TO_CHAR(fecha_creacion, 'YYYY-MM-DD') as date, COUNT(*) as nuevos, COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resueltos
      FROM conversaciones 
      WHERE usuario_id = ${rootOwnerId} AND fecha_creacion >= ${startDate} AND fecha_creacion <= ${endDate}
      GROUP BY date ORDER BY date ASC
    `
  } catch (e) { return [] }
}

// 5. LANDINGS
async function getLandings(rootOwnerId: string) {
  try {
    return await sql`
      SELECT id, nombre, slug, visitas, clics_boton 
      FROM landings WHERE usuario_id = ${rootOwnerId} ORDER BY visitas DESC
    `
  } catch { return [] }
}

// 6. ANALÍTICAS GEOGRÁFICAS
async function getGeoAnalytics(rootOwnerId: string) {
  try {
    const countries = await sql`
      SELECT la.country, COUNT(*) as visits
      FROM landing_analytics la
      JOIN landings l ON la.landing_id = l.id
      WHERE l.usuario_id = ${rootOwnerId} AND la.country IS NOT NULL AND la.country != 'Unknown'
      GROUP BY la.country ORDER BY visits DESC
    `
    const cities = await sql`
      SELECT la.country, la.city, COUNT(*) as visits
      FROM landing_analytics la
      JOIN landings l ON la.landing_id = l.id
      WHERE l.usuario_id = ${rootOwnerId} AND la.city IS NOT NULL AND la.city != 'Unknown'
      GROUP BY la.country, la.city ORDER BY visits DESC LIMIT 200
    `
    return { countries, cities }
  } catch (e) {
    return { countries: [], cities: [] }
  }
}

// 9. TIEMPO PROMEDIO DE RESPUESTA
async function getResponseTime(rootOwnerId: string, startDate: string, endDate: string) {
  try {
    const data = await sql`
      WITH FirstIncoming AS (
          SELECT conversation_id, MIN(timestamp) as first_msg_time
          FROM mensajes
          WHERE usuario_id = ${rootOwnerId} AND is_incoming = true 
            AND timestamp >= ${startDate} AND timestamp <= ${endDate}
          GROUP BY conversation_id
      ),
      FirstResponse AS (
          SELECT m.conversation_id, MIN(m.timestamp) as first_resp_time
          FROM mensajes m
          JOIN FirstIncoming fi ON m.conversation_id = fi.conversation_id
          WHERE m.usuario_id IN (SELECT id FROM usuarios WHERE owner_id = ${rootOwnerId} OR id = ${rootOwnerId}) 
          AND m.is_incoming = false AND m.timestamp > fi.first_msg_time
          GROUP BY m.conversation_id
      )
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fr.first_resp_time - fi.first_msg_time))), 0) as avg_seconds
      FROM FirstIncoming fi
      JOIN FirstResponse fr ON fi.conversation_id = fr.conversation_id
    `;
    const seconds = Number(data[0]?.avg_seconds || 0);
    if (seconds === 0) return "0m";
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = (seconds / 60).toFixed(1);
    return `${minutes}m`;
  } catch (error) { return "0m"; }
}

async function getDeviceAnalytics(rootOwnerId: string) {
  try {
    return await sql`
      SELECT la.device_type, COUNT(*) as count
      FROM landing_analytics la
      JOIN landings l ON la.landing_id = l.id
      WHERE l.usuario_id = ${rootOwnerId} AND la.device_type IS NOT NULL
      GROUP BY la.device_type ORDER BY count DESC
    `
  } catch (e) { return [] }
}

// 7. META MENSUAL Y PROGRESO (Toda la empresa)
async function getGoalData(rootOwnerId: string) {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const goalRes = await sql`
      SELECT monto FROM "MetaMensual" 
      WHERE usuario_id = ${rootOwnerId} AND mes = ${currentMonth} AND anio = ${currentYear}
    `;
    const goal = goalRes.length > 0 ? Number(goalRes[0].monto) : 1000000;

    const currentTotalRes = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM ventas 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE owner_id = ${rootOwnerId} OR id = ${rootOwnerId}) 
      AND EXTRACT(MONTH FROM created_at) = ${currentMonth} AND EXTRACT(YEAR FROM created_at) = ${currentYear}
    `;
    const currentTotal = Number(currentTotalRes[0].total);

    const lastMonthTotalRes = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM ventas 
      WHERE usuario_id IN (SELECT id FROM usuarios WHERE owner_id = ${rootOwnerId} OR id = ${rootOwnerId}) 
      AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at <= CURRENT_DATE - INTERVAL '1 month'
    `;
    const lastMonthTotal = Number(lastMonthTotalRes[0].total);

    let trendPercentage = 0;
    if (lastMonthTotal > 0) trendPercentage = ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100;
    else if (currentTotal > 0) trendPercentage = 100;

    return { goal, currentTotal, trendPercentage };
  } catch (e) { return { goal: 1000000, currentTotal: 0, trendPercentage: 0 } }
}

// 8. HISTORIAL DE METAS VS REALIDAD (Toda la empresa)
async function getMonthlyHistory(rootOwnerId: string) {
  try {
    const history = await sql`
      WITH months AS (
          SELECT generate_series(
            date_trunc('month', current_date - interval '5 months'), 
            date_trunc('month', current_date), 
            '1 month'::interval
          ) AS month_date
      )
      SELECT 
          TO_CHAR(m.month_date, 'Mon') AS name,
          COALESCE(SUM(v.amount), 0) AS "Realidad",
          COALESCE(
            (SELECT monto FROM "MetaMensual" 
             WHERE usuario_id = ${rootOwnerId} 
             AND mes = EXTRACT(MONTH FROM m.month_date) 
             AND anio = EXTRACT(YEAR FROM m.month_date)), 
            1000000
          ) AS "Meta"
      FROM months m
      LEFT JOIN ventas v ON date_trunc('month', v.created_at) = m.month_date 
        AND v.usuario_id IN (SELECT id FROM usuarios WHERE owner_id = ${rootOwnerId} OR id = ${rootOwnerId})
      GROUP BY m.month_date
      ORDER BY m.month_date ASC
    `;
    return history.map(h => ({
      name: h.name,
      Realidad: Number(h.Realidad),
      Meta: Number(h.Meta)
    }));
  } catch (e) { return []; }
}

export default async function AnalyticsPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  const user = await requireAuth()
  if (user.role !== "OWNER") redirect("/dashboard?error=unauthorized")
    
  const todayArg = new Date().toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).split(' ')[0];
  const toStr = searchParams.to || todayArg;
  const fromStr = searchParams.from || toStr; 
  const startDate = `${fromStr}T00:00:00-03:00`;
  const endDate = `${toStr}T23:59:59-03:00`;

  const [kpis, goalData, monthlyHistory, avgResponseTime] = await Promise.all([
    getKPIs(user.rootOwnerId, startDate, endDate),
    getGoalData(user.rootOwnerId),
    getMonthlyHistory(user.rootOwnerId),
    getResponseTime(user.rootOwnerId, startDate, endDate)
  ]);

  const [dailySales, recentSales] = await Promise.all([
    getDailySales(user.rootOwnerId, startDate, endDate),
    getRecentSales(user.rootOwnerId, startDate, endDate)
  ]);

  const [chatMetrics, landings, geoData, deviceData] = await Promise.all([
    getChatMetrics(user.rootOwnerId, startDate, endDate),
    getLandings(user.rootOwnerId),
    getGeoAnalytics(user.rootOwnerId),
    getDeviceAnalytics(user.rootOwnerId)
  ]);

  return (
    <AnalyticsDashboard
      kpis={kpis}
      dailySales={dailySales}
      recentSales={recentSales}
      chatMetrics={chatMetrics}
      landings={landings}
      geoData={geoData}
      deviceData={deviceData}
      goalData={goalData}
      monthlyHistory={monthlyHistory}
      avgResponseTime={avgResponseTime} 
    />
  )
}
