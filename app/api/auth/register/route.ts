import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: Request) {
  try {
    const { nombre, email, password } = await req.json()

    if (!nombre || !email || !password) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const id = randomUUID()

    await sql`
      INSERT INTO usuarios (id, nombre, email, password_hash)
      VALUES (${id}, ${nombre}, ${email}, ${passwordHash})
    `

    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error("Error creating user:", error)

    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}
