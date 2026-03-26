import { notFound } from "next/navigation"
import { PublicLanding } from "@/components/public-landing"
import { neon } from "@neondatabase/serverless" // 🔥 Usamos la librería directa para descartar errores de import
import type { Metadata } from "next"

// Iniciamos la conexión directa aquí mismo para asegurar que funciona
const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// --- METADATA ---
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params
    
    // 🔥 CONSULTA SEGURA: Traemos TODO (*) para no fallar por nombres de columnas individuales
    const result = await sql`SELECT * FROM landings WHERE slug = ${slug}`
    const landing = result[0]
    
    // Si no existe, título por defecto
    if (!landing) return { title: "Página no encontrada" }
    
    const config = landing.configuracion_json || {}
    
    // Buscamos el título en orden de prioridad: 
    // 1. Configuración JSON (Headline)
    // 2. Columna 'title' (si existe)
    // 3. Columna 'nombre' (si existe)
    // 4. Default
    const pageTitle = config.headline || landing.title || landing.nombre || "Oferta Especial"
    
    return {
      title: pageTitle,
      description: config.subtitle || "Mira esta propuesta exclusiva.",
    }
  } catch (error) {
    console.error("⚠️ Error generando Metadata (pero cargamos la página igual):", error)
    // Fallback silencioso en vez de mostrar "Error"
    return { title: "Oferta Exclusiva" } 
  }
}

// --- PÁGINA PRINCIPAL ---
export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  console.log(`🔍 Buscando landing con slug: ${slug}`)

  let landing = null

  // 1. INTENTO DE BUSCAR LANDING
  try {
      // 🔥 IMPORTANTE: Quitamos filtros extra para ver si al menos encuentra algo
      const result = await sql`SELECT * FROM landings WHERE slug = ${slug}`
      landing = result[0]
      console.log("✅ Landing encontrada:", landing ? "SI" : "NO")
  } catch (error: any) {
      console.error("❌ CRITICAL ERROR DB (Landings):", error.message)
      // Si falla la DB, lanzamos error para ver el log en Vercel/Consola
      throw new Error(`DB Error Landings: ${error.message}`)
  }

  if (!landing) {
    notFound()
  }

  // 2. RESOLVER URL
  const config = landing.configuracion_json || landing.design_settings || {}
  let destinationUrl = ""

  // Lógica defensiva para la URL
  try {
      if (config.destination_type === 'custom') {
          destinationUrl = config.custom_url || "#"
      } 
      else if (config.destination_type === 'smart' && config.smart_link_id) {
          console.log(`🔗 Buscando Smart Link ID: ${config.smart_link_id}`)
          
          // Verificamos si la tabla marketing_links existe y consultamos
          const linkResult = await sql`
            SELECT destination_url 
            FROM marketing_links 
            WHERE id = ${config.smart_link_id}
          `
          
          if (linkResult.length > 0) {
              destinationUrl = linkResult[0].destination_url
              console.log(`🔗 URL Resuelta: ${destinationUrl}`)
          } else {
              console.warn("⚠️ Smart Link ID no encontrado en DB")
          }
      }
  } catch (error: any) {
      console.error("❌ ERROR RESOLVIENDO LINK:", error.message)
      // No rompemos la página por esto, solo dejamos el link vacío
      destinationUrl = "#" 
  }

  // 3. RENDERIZAR
  return <PublicLanding landing={landing} resolvedUrl={destinationUrl} />
}
