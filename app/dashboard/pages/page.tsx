// app/dashboard/pages/page.tsx
import { sql } from "@/lib/db"
import { LandingsTable } from "@/components/dashboard/landings-table"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth-middleware"
import { Button } from "@/components/ui/button"
import { Plus, Lock, FileText } from "lucide-react"
import Link from "next/link"
import { getLandingsStats } from "./actions"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export const dynamic = "force-dynamic"

async function getLandings(userId: string) {
  try {
    return await sql`SELECT id, nombre, slug, activa, clics_boton, visitas, fecha_creacion FROM landings WHERE usuario_id = ${userId} ORDER BY fecha_creacion DESC`
  } catch { return [] }
}

export default async function PagesPage() {
  const user = await requireAuth()
  if (user.role !== "OWNER") redirect("/dashboard?error=unauthorized")

  const [landings, stats] = await Promise.all([
    getLandings(user.rootOwnerId),
    getLandingsStats()
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
              <FileText className="h-6 w-6 text-white" />
            </div>
            Landing Pages
          </h1>
          <p className="text-slate-500 mt-1">Gestiona tus paginas de venta y captura de leads.</p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div tabIndex={0}>
                {stats.isLimitReached ? (
                   <Button disabled className="gap-2 rounded-xl bg-slate-200 text-slate-500 cursor-not-allowed">
                     <Lock className="w-4 h-4" />
                     Limite Alcanzado ({stats.used}/{stats.limit})
                   </Button>
                ) : (
                   <Link href="/dashboard/pages/create">
                     <Button className="gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/30 transition-all px-6 py-5 font-semibold">
                       <Plus className="w-4 h-4" />
                       Crear Landing ({stats.used}/{stats.limit})
                     </Button>
                   </Link>
                )}
              </div>
            </TooltipTrigger>
            {stats.isLimitReached && (
              <TooltipContent>
                <p>Tu plan actual solo permite {stats.limit} landing.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <LandingsTable landings={landings} />
    </div>
  )
}
