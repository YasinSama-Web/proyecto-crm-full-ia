import { Suspense } from "react"
import { ContactsTable } from "@/components/dashboard/contacts-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { requireAuth } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

// 🔥 LÓGICA DE SEGURIDAD PARA CONTACTOS
async function getContacts(rootOwnerId: string, allowedLineIds: string[], isAgent: boolean) {
  try {
    // A. SI ES AGENTE: Filtramos por las líneas que tiene permitidas
    if (isAgent) {
      if (allowedLineIds.length === 0) return [] // Si no tiene líneas, no ve nada

      // Hacemos JOIN con conversaciones para ver solo contactos que hablaron por líneas permitidas
      // Usamos DISTINCT para no repetir contactos si hablaron varias veces
      return await sql`
        SELECT DISTINCT c.*
        FROM "Contact" c
        JOIN conversaciones conv ON c.phone = conv.contact_phone
        WHERE c.usuario_id = ${rootOwnerId}
          AND conv."lineId" = ANY(${allowedLineIds})
        ORDER BY c.created_at DESC
        LIMIT 100
      `
    }

    // B. SI ES DUEÑO: Ve todo
    return await sql`
      SELECT * FROM "Contact" 
      WHERE usuario_id = ${rootOwnerId}
      ORDER BY created_at DESC
      LIMIT 100
    `
  } catch (e) {
    console.error("Error fetching contacts:", e)
    return []
  }
}

export default async function ContactsPage() {
  const user = await requireAuth()
  
  const isAgent = user.role === 'AGENT'
  const allowedLineIds = user.permissions?.allowedLineIds || []

  // Traemos los datos seguros desde el servidor
  const contacts = await getContacts(user.rootOwnerId, allowedLineIds, isAgent)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Contactos</h1>
        <p className="text-muted-foreground">Gestiona todos los contactos de tu CRM</p>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Cargando contactos...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        }
      >
        {/* Pasamos los datos iniciales a la tabla */}
        <ContactsTable initialContacts={contacts} />
      </Suspense>
    </div>
  )
}
