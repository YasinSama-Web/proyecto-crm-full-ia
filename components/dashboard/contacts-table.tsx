"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Download, Users, Tag, Calendar, ChevronRight, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import Swal from "sweetalert2"
import type { Contact } from "@/lib/db-types"

interface Props {
  initialContacts?: Contact[];
  is_group?: boolean;
}

export function ContactsTable({ initialContacts = [] }: Props) {
  const [allContacts] = useState<Contact[]>(initialContacts)
  const [displayedContacts, setDisplayedContacts] = useState<Contact[]>(initialContacts)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedTag, setSelectedTag] = useState("")
  const router = useRouter()

useEffect(() => {
    setLoading(true)
    
    const timeout = setTimeout(() => {
      let result = allContacts

      // 🔥 FILTRO MAESTRO DE LIMPIEZA UI 🔥
      // Filtramos cualquier cosa que sea grupo o tenga ID largo
      result = result.filter(c => {
          const isGroup = c.is_group === true;
          const isLongId = c.phone.length > 13;
          return !isGroup && !isLongId;
      });

      if (search) {
        const query = search.toLowerCase()
        result = result.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.phone && c.phone.includes(query))
        )
      }

      if (selectedTag) {
        result = result.filter((c) => c.tags && c.tags.includes(selectedTag))
      }

      setDisplayedContacts(result)
      setLoading(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [search, selectedTag, allContacts])

  async function handleExportCSV() {
    try {
      const csv = [
        ["Nombre", "Telefono", "Fecha Creacion", "Ultimo Mensaje", "Tags", "Notas"],
        ...displayedContacts.map((c) => [
          c.name || "",
          c.phone,
          format(new Date(c.created_at), "dd/MM/yyyy HH:mm"),
          c.last_message ? format(new Date(c.last_message), "dd/MM/yyyy HH:mm") : "",
          (c.tags || []).join(", "),
          c.notes || "",
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n")

      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `contactos-${format(new Date(), "yyyy-MM-dd")}.csv`
      a.click()
      URL.revokeObjectURL(url)

      await Swal.fire({
        icon: "success",
        title: "Exportado",
        text: "Los contactos se han exportado correctamente",
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      console.error("[v0] Error exporting:", error)
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo exportar el archivo",
      })
    }
  }

  const allTags = Array.from(new Set(allContacts.flatMap((c) => c.tags || [])))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contactos</h1>
            <p className="text-sm text-muted-foreground">{displayedContacts.length} contactos encontrados</p>
          </div>
        </div>
        <Button 
          onClick={handleExportCSV} 
          className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 rounded-xl"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Glass Container - DARK MODE READY */}
      <div className="rounded-3xl bg-card/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-xl border border-border/50 dark:border-slate-700/50 overflow-hidden">
        {/* Search & Filters */}
        <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/50 to-card/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o telefono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 bg-background/80 dark:bg-slate-900/80 backdrop-blur-sm border-border/50 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            {allTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="h-12 rounded-xl border border-border/50 bg-background/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-2 text-sm text-foreground ring-offset-background shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-w-[180px]"
              >
                <option value="">Todos los tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="h-20 bg-gradient-to-r from-muted/50 to-muted/30 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : displayedContacts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center mb-6 shadow-inner">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                {search || selectedTag ? "No se encontraron resultados" : "No hay contactos"}
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                {search || selectedTag ? "Prueba con otros filtros" : "Los contactos se crean automaticamente al recibir mensajes"}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {displayedContacts.map((contact, index) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                    className="group flex items-center justify-between p-4 rounded-2xl bg-background/40 dark:bg-slate-800/40 hover:bg-background/80 dark:hover:bg-slate-700/60 border border-transparent hover:border-blue-500/20 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Avatar with glow effect */}
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 blur-md opacity-0 group-hover:opacity-40 transition-opacity" />
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-background shadow-lg">
                          <span className="text-lg font-bold text-white">
                            {contact.name ? contact.name[0].toUpperCase() : contact.phone[0]}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate group-hover:text-blue-500 transition-colors">
                          {contact.name || "Sin nombre"}
                        </p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(contact.created_at), "dd MMM yyyy", { locale: es })}
                        </div>
                        {contact.last_message && (
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            Ultimo: {format(new Date(contact.last_message), "dd MMM HH:mm", { locale: es })}
                          </p>
                        )}
                      </div>
                      
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 text-purple-700 dark:text-purple-300">
                          <Tag className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{contact.tags.length}</span>
                        </div>
                      )}
                      
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  )
}
