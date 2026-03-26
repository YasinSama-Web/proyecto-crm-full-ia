"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"

export function CreateLandingButton() {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState("")
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleNameChange = (value: string) => {
    setNombre(value)
    setSlug(generateSlug(value))
  }

  const handleCreate = async () => {
    if (!nombre.trim() || !slug.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/landings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, slug }),
      })

      if (res.ok) {
        const landing = await res.json()
        setOpen(false)
        setNombre("")
        setSlug("")
        router.push(`/dashboard/pages/edit/${landing.slug}`)
      }
    } catch (error) {
      console.error("Error creating landing:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Crear landing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear nueva landing</DialogTitle>
          <DialogDescription>Crea una nueva página de destino para captar leads</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la landing</Label>
            <Input
              id="nombre"
              placeholder="Ej: Promoción Verano 2025"
              value={nombre}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL de la landing</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/p/</span>
              <Input id="slug" placeholder="promocion-verano" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading || !nombre.trim() || !slug.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear landing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
