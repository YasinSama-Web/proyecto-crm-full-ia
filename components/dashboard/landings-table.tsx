"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, ExternalLink, Copy, FileText, Globe, Eye, MousePointerClick, TrendingUp } from "lucide-react"
import type { Landing } from "@/lib/db-types" 
import Swal from "sweetalert2"
import { deleteLanding } from "@/app/dashboard/pages/actions"
import { motion } from "framer-motion"

interface LandingsTableProps {
  landings: Landing[]
}

export function LandingsTable({ landings }: LandingsTableProps) {
  const router = useRouter()

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
        title: "Eliminar landing?",
        text: "Esta accion no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Si, eliminar",
        cancelButtonText: "Cancelar"
    })

    if (result.isConfirmed) {
      try {
        await deleteLanding(id) 
        Swal.fire("Eliminado", "La landing ha sido eliminada.", "success")
        router.refresh()
      } catch (error) {
        console.error("Error deleting landing:", error)
        Swal.fire("Error", "No se pudo eliminar.", "error")
      }
    }
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`)
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Enlace copiado',
        showConfirmButton: false,
        timer: 1500
    })
  }

  if (landings.length === 0) {
    return (
      <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center justify-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <FileText className="h-8 w-8 text-violet-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800">No hay landing pages</h3>
          <p className="mt-2 text-slate-500">Crea tu primera landing page para empezar a captar leads</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      
      <div className="overflow-x-auto">
      {/* Table Header */}
      <div className="relative z-10 grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/50 bg-white/30 min-w-[800px]">
        <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</div>
        <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">URL</div>
        <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Visitas</div>
        <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Clics WA</div>
        <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">CTR</div>
        <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Ventas Est.</div>
        <div className="col-span-1 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Estado</div>
        <div className="col-span-1"></div>
      </div>

      {/* Table Body */}
      <div className="relative z-10 divide-y divide-white/30">
        {landings.map((landing, idx) => {
          const ctr = landing.visitas > 0 ? ((landing.clics_boton / landing.visitas) * 100).toFixed(1) : "0"
          const salesAmount = 0

          return (
            <motion.div
              key={landing.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-white/40 transition-colors group min-w-[800px]"
            >
              {/* Nombre */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-violet-500" />
                </div>
                <span className="font-semibold text-slate-800 truncate">{landing.title || landing.nombre}</span>
              </div>

              {/* URL */}
              <div className="col-span-2">
                <Badge variant="outline" className="font-mono text-xs bg-white/50 border-white/60 text-slate-600">
                  /p/{landing.slug}
                </Badge>
              </div>

              {/* Visitas */}
              <div className="col-span-1 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Eye className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-700">{landing.visitas}</span>
                </div>
              </div>

              {/* Clics WA */}
              <div className="col-span-1 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <MousePointerClick className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{landing.clics_boton}</span>
                </div>
              </div>

              {/* CTR */}
              <div className="col-span-1 text-center">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                  Number(ctr) > 10 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <TrendingUp className="h-3 w-3" />
                  {ctr}%
                </span>
              </div>

              {/* Ventas Est. */}
              <div className="col-span-2 text-center">
                <span className="font-mono font-semibold text-emerald-600">${salesAmount.toFixed(2)}</span>
              </div>

              {/* Estado */}
              <div className="col-span-1 text-center">
                <Badge className={`${
                  landing.activa 
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-0 shadow-md shadow-emerald-500/30' 
                    : 'bg-slate-200 text-slate-600 border-0'
                }`}>
                  {landing.activa ? "Online" : "Pausada"}
                </Badge>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/60">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-white/50 bg-white/80 backdrop-blur-xl shadow-xl">
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/pages/edit/${landing.id}`)} className="rounded-lg">
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyLink(landing.slug)} className="rounded-lg">
                      <Copy className="mr-2 h-4 w-4" /> Copiar Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(`/p/${landing.slug}`, '_blank')} className="rounded-lg">
                      <ExternalLink className="mr-2 h-4 w-4" /> Ver Online
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 rounded-lg" onClick={() => handleDelete(landing.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          )
        })}
      </div>
      </div>{/* close overflow-x-auto */}
    </div>
  )
}
