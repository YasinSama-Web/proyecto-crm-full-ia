"use client"

import { useEffect } from "react"
import { Crisp } from "crisp-sdk-web"

export const CrispProvider = () => {
  useEffect(() => {
    // REEMPLAZA CON TU ID DE CRISP
    Crisp.configure("60da7024-2bbe-4534-8254-48386a7be121") 
  }, [])

  return null
}
