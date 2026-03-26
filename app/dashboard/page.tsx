import { Suspense } from "react"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
export const dynamic = "force-dynamic";
export default function DashboardPage() {
  return (
    // 🔥 CAMBIO CLAVE: Usamos 'bg-background'.
    // Esto le dice al componente: "Usa el color que diga el archivo globals.css".
    // Ya no forzamos colores fijos aquí.
    <div className="w-full min-h-full bg-background transition-colors duration-300 p-4 md:p-6">
      
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
      
    </div>
  )
}
