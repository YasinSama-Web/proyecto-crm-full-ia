"use client"

import type { LandingConfig } from "@/lib/db-types"
import { MessageCircle } from "lucide-react"

interface LandingPreviewProps {
  config: LandingConfig
}

export function LandingPreview({ config }: LandingPreviewProps) {
  const getContrastColor = (hex: string) => {
    const r = Number.parseInt(hex.slice(1, 3), 16)
    const g = Number.parseInt(hex.slice(3, 5), 16)
    const b = Number.parseInt(hex.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#ffffff"
  }

  const textColor = getContrastColor(config.color_fondo || "#ffffff")

  return (
    <div className="h-full overflow-auto" style={{ backgroundColor: config.color_fondo }}>
      <div className="min-h-full flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          {config.imagen_hero && (
            <img
              src={config.imagen_hero || "/placeholder.svg"}
              alt="Hero"
              className="w-full max-w-md h-48 object-cover rounded-lg mb-8"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          )}

          <h1 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
            {config.titulo || "Tu Título Aquí"}
          </h1>

          <p className="text-lg mb-6" style={{ color: textColor, opacity: 0.8 }}>
            {config.subtitulo || "Subtítulo descriptivo"}
          </p>

          <p className="max-w-md mb-8" style={{ color: textColor, opacity: 0.7 }}>
            {config.descripcion || "Descripción de tu oferta"}
          </p>

          <button
            className="flex items-center gap-2 px-8 py-4 rounded-full text-lg font-semibold transition-transform hover:scale-105 shadow-lg"
            style={{
              backgroundColor: config.color_primario,
              color: getContrastColor(config.color_primario || "#22c55e"),
            }}
          >
            <MessageCircle className="h-5 w-5" />
            {config.boton_texto || "Contactar por WhatsApp"}
          </button>
        </div>

        {/* Footer */}
        <footer className="py-4 px-6 text-center text-xs" style={{ color: textColor, opacity: 0.5 }}>
          Creado con CRM WhatsApp
        </footer>
      </div>
    </div>
  )
}
