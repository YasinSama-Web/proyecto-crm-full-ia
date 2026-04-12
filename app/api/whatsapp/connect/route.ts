export const runtime = "nodejs"

import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    console.log("ENV CHECK (runtime):", {
      url: process.env.WHATSAPP_SERVER_URL,
      secret: process.env.WHATSAPP_SECRET ? "SET" : "MISSING",
    })

    const body = await req.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      )
    }

    const serverUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL
    const secret = process.env.WHATSAPP_SECRET

    if (!serverUrl || !secret) {
      console.error("[v0] Missing WHATSAPP_SERVER_URL or WHATSAPP_SECRET")
      return NextResponse.json(
        { error: "Server configuration missing" },
        { status: 500 }
      )
    }

    const url = serverUrl.startsWith("http")
      ? serverUrl
      : `https://${serverUrl}`

    console.log("[v0] Forwarding connection request to Railway:", url)

    const res = await fetch(`${url}/api/lineas/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": secret,
      },
      body: JSON.stringify({ phone }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("[v0] Railway backend error:", errorText)
      return NextResponse.json(
        { error: "Connection failed" },
        { status: res.status }
      )
    }

    const data = await res.json()
    console.log("[v0] Railway response:", data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Proxy error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
