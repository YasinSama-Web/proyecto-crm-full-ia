import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getEnrichedUser } from "@/lib/auth"

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const user = await getEnrichedUser(session.userId)

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ user })
}
