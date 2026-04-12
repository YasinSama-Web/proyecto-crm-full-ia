import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"
import ProductsPageClient from "./products-client" 
import { ShoppingCart, Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const user = await requireAuth()
  
  // 1. Verificamos en la BD si tiene el módulo comprado
  const userQuery = await sql`SELECT addon_ecommerce FROM usuarios WHERE id = ${user.rootOwnerId}`
  const hasEcommerce = userQuery[0]?.addon_ecommerce || false

  // 2. Si no lo tiene, mostramos el muro de Upsell
  if (!hasEcommerce) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <ShoppingCart className="w-12 h-12 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">Motor E-commerce Inactivo</h1>
        <p className="text-slate-500 max-w-md mb-8">
          Descubre el poder de vender en piloto automático. Caleb AI leerá transferencias, descontará stock y gestionará tu catálogo 24/7.
        </p>
        
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-[1px] rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1">
          <div className="bg-white px-8 py-5 rounded-2xl h-full w-full">
             <h3 className="font-bold text-indigo-900 flex items-center justify-center gap-2 mb-1 text-lg">
               <Sparkles className="w-5 h-5 text-yellow-500" /> Potencia tu CRM
             </h3>
             <p className="text-sm text-slate-500 mb-5">Adquiere el módulo en la sección de Facturación.</p>
             <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all w-full">
               Ver Planes y Addons
             </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. Si lo tiene, le abrimos la puerta al cliente
  return <ProductsPageClient />
}