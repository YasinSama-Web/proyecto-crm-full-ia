import { createClient } from '@supabase/supabase-js'

// Eliminamos la creación del cliente global para evitar el error en el navegador
// const supabase = createClient(...)  <-- ESTO ERA LO QUE FALLABA

export async function uploadWhatsAppMedia(buffer: Buffer, fileName: string, mimeType: string) {
  // 1. Leemos las claves DENTRO de la función (solo se ejecutará en el servidor)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 2. Validación de seguridad: Si estamos en el navegador, esto será undefined y paramos.
  if (!serviceRoleKey || !supabaseUrl) {
    console.error("❌ ERROR CRÍTICO: Intentando subir archivo sin Service Role Key.")
    console.error("Asegúrate de que esta función solo se llame desde una API Route (Servidor), no desde un componente React.")
    return null
  }

  try {
    // 3. Inicializamos Supabase "On Demand" (Solo cuando se necesita)
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase.storage
      .from('whatsapp-media') 
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      })

    if (error) {
        console.error("Error subiendo a Supabase:", error)
        throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error("Error general en storage:", error)
    return null
  }
}
