"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Toaster } from "sileo"

export function SileoThemeProvider() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    // 🔥 ENVOLTORIO MAESTRO: Forzamos el z-index desde la raíz del contenedor de React
    <div className="fixed inset-0 z-[99999] pointer-events-none">
      <Toaster 
        position="top-center" 
        theme={resolvedTheme as "light" | "dark"} 
        // Pasamos clases extra directamente al componente si la librería lo permite
        className="pointer-events-auto"
        toastOptions={{
          // Forzamos el botón verde en la configuración nativa
          classNames: {
            actionButton: "!bg-emerald-500 hover:!bg-emerald-600 !text-white !border-0",
          }
        }}
      />
    </div>
  )
}


// "use client"

// import { useTheme } from "next-themes"
// import { useEffect, useState } from "react"
// import { Toaster } from "sileo"

// export function SileoThemeProvider() {
//   const { resolvedTheme } = useTheme()
//   const [mounted, setMounted] = useState(false)

//   useEffect(() => setMounted(true), [])

//   if (!mounted) return null

//   return (
//     <>
//       <style>{`
        
//         [data-sileo-button] {
//           z-index: 9999 !important;
//           background-color: #10b981 !important;
//           color: white !important;
//           border: none !important;
//           border-radius: 8px !important;
//         }
//         [data-sileo-button]:hover {
//           background-color: #059669 !important;
//         }
//       `}</style>
      
//       <Toaster position="top-center" theme={resolvedTheme as "light" | "dark"} />
//     </>
//   )
// }
