import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth-middleware"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req as any)
    const rootOwnerId = user.rootOwnerId

    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "7d" 

    let stats, recentSales, ventasConProductos;

    // 🔥 QUERIES 100% ESTÁTICAS: Evita cualquier error del Driver SQL
    if (range === 'today') {
        const metricsQuery = await sql`SELECT COUNT(*) as total_count, COALESCE(SUM(v.amount), 0) as total_amount, COALESCE(SUM(CASE WHEN v.origen = 'ia' THEN v.amount ELSE 0 END), 0) as ai_amount, COALESCE(SUM(CASE WHEN v.origen != 'ia' OR v.origen IS NULL THEN v.amount ELSE 0 END), 0) as human_amount FROM ventas v WHERE v.usuario_id = ${rootOwnerId} AND v.created_at >= CURRENT_DATE`;
        stats = metricsQuery[0];
        recentSales = await sql`SELECT v.id, v.created_at, v.amount, v.origen, c.name as contact_name FROM ventas v LEFT JOIN "Contact" c ON v.contact_id = c.id WHERE v.usuario_id = ${rootOwnerId} AND v.created_at >= CURRENT_DATE ORDER BY v.created_at DESC LIMIT 50`;
        ventasConProductos = await sql`SELECT productos_skus FROM ventas v WHERE v.usuario_id = ${rootOwnerId} AND v.productos_skus IS NOT NULL AND v.created_at >= CURRENT_DATE`;
    } else if (range === 'yesterday') {
        const metricsQuery = await sql`SELECT COUNT(*) as total_count, COALESCE(SUM(v.amount), 0) as total_amount, COALESCE(SUM(CASE WHEN v.origen = 'ia' THEN v.amount ELSE 0 END), 0) as ai_amount, COALESCE(SUM(CASE WHEN v.origen != 'ia' OR v.origen IS NULL THEN v.amount ELSE 0 END), 0) as human_amount FROM ventas v WHERE v.usuario_id = ${rootOwnerId} AND v.created_at >= CURRENT_DATE - INTERVAL '1 day' AND v.created_at < CURRENT_DATE`;
        stats = metricsQuery[0];
        recentSales = await sql`SELECT v.id, v.created_at, v.amount, v.origen, c.name as contact_name FROM ventas v LEFT JOIN "Contact" c ON v.contact_id = c.id WHERE v.usuario_id = ${rootOwnerId} AND v.created_at >= CURRENT_DATE - INTERVAL '1 day' AND v.created_at < CURRENT_DATE ORDER BY v.created_at DESC LIMIT 50`;
        ventasConProductos = await sql`SELECT productos_skus FROM ventas v WHERE v.usuario_id = ${rootOwnerId} AND v.productos_skus IS NOT NULL AND v.created_at >= CURRENT_DATE - INTERVAL '1 day' AND v.created_at < CURRENT_DATE`;
    } else if (range === '30d') {
        const metricsQuery = await sql`SELECT COUNT(*) as total_count, COALESCE(SUM(v.amount), 0) as total_amount, COALESCE(SUM(CASE WHEN v.origen = 'ia' THEN v.amount ELSE 0 END), 0) as ai_amount, COALESCE(SUM(CASE WHEN v.origen != 'ia' OR v.origen IS NULL THEN v.amount ELSE 0 END), 0) as human_amount FROM ventas v WHERE v.usuario_id = ${rootOwnerId} AND v.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
        stats = metricsQuery[0];
        recentSales = await sql`SELECT v.id, v.created_at, v.amount, v.origen, c.name as contact_name FROM ventas v LEFT JOIN "Contact" c ON v.contact_id = c.id WHERE v.usuario_id = ${rootOwnerId} AND v.created_at >= CURRENT_DATE - INTERVAL '30 days' ORDER BY v.created_at DESC LIMIT 50`;
        ventasConProductos = await sql`SELECT productos_skus FROM ventas v WHERE v.usuario_id = ${rootOwnerId} AND v.productos_skus IS NOT NULL AND v.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    } else {
        const metricsQuery = await sql`SELECT COUNT(*) as total_count, COALESCE(SUM(v.amount), 0) as total_amount, COALESCE(SUM(CASE WHEN v.origen = 'ia' THEN v.amount ELSE 0 END), 0) as ai_amount, COALESCE(SUM(CASE WHEN v.origen != 'ia' OR v.origen IS NULL THEN v.amount ELSE 0 END), 0) as human_amount FROM ventas v WHERE v.usuario_id = ${rootOwnerId} AND v.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
        stats = metricsQuery[0];
        recentSales = await sql`SELECT v.id, v.created_at, v.amount, v.origen, c.name as contact_name FROM ventas v LEFT JOIN "Contact" c ON v.contact_id = c.id WHERE v.usuario_id = ${rootOwnerId} AND v.created_at >= CURRENT_DATE - INTERVAL '7 days' ORDER BY v.created_at DESC LIMIT 50`;
        ventasConProductos = await sql`SELECT productos_skus FROM ventas v WHERE v.usuario_id = ${rootOwnerId} AND v.productos_skus IS NOT NULL AND v.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    }

    const totalAmount = Number(stats?.total_amount || 0);
    const aiAmount = Number(stats?.ai_amount || 0);
    const humanAmount = Number(stats?.human_amount || 0);
    const totalSalesCount = Number(stats?.total_count || 0);

    const aiPercentage = totalAmount > 0 ? Math.round((aiAmount / totalAmount) * 100) : 0;
    const humanPercentage = totalAmount > 0 ? 100 - aiPercentage : 0;

    // ==========================================
    // PROCESAR TOP PRODUCTOS
    // ==========================================
    const productCounts: Record<string, number> = {};

    ventasConProductos.forEach((venta: any) => {
      try {
        const skus = typeof venta.productos_skus === 'string' ? JSON.parse(venta.productos_skus) : venta.productos_skus;
        if (Array.isArray(skus)) {
          skus.forEach((item: string) => {
            const partes = item.split('x ');
            if (partes.length === 2) {
              const cantidad = parseInt(partes[0].trim()) || 1;
              const sku = partes[1].trim();
              productCounts[sku] = (productCounts[sku] || 0) + cantidad;
            }
          });
        }
      } catch (e) {} 
    });

    const topSkus = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    let topProducts: any[] = [];
    if (topSkus.length > 0) {
      const justSkus = topSkus.map(t => t[0]);
      const dbProducts = await sql`SELECT sku, nombre FROM productos WHERE usuario_id = ${rootOwnerId} AND sku = ANY(${justSkus})`;

      topProducts = topSkus.map(([sku, cantidad]) => {
        const prod = dbProducts.find((p: any) => p.sku === sku);
        return { sku, nombre: prod ? prod.nombre : 'Producto Desconocido', cantidad };
      });
    }

    return NextResponse.json({
      totalAmount, totalSalesCount, aiAmount, humanAmount,
      aiPercentage, humanPercentage, recentSales, topProducts
    });

  } catch (error) {
    console.error("❌ Error en Métricas de Ventas:", error);
    return NextResponse.json({ error: "Error calculando métricas" }, { status: 500 });
  }
}