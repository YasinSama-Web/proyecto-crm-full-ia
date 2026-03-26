// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Evita que Next.js cree múltiples instancias en desarrollo al recargar (hot-reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
