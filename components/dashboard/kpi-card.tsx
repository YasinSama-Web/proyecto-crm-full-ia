"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

interface KpiCardProps {
  title: string
  value: number | string
  subtitle: string
  icon: LucideIcon
  href: string
  gradient: string
  iconBg: string
  delay?: number
  prefix?: string
}

function useCountUp(end: number, duration = 1500, delay = 0) {
  const countRef = useRef(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        countRef.current = Math.floor(eased * end)
        setCount(countRef.current)
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, delay)
    return () => clearTimeout(timeout)
  }, [end, duration, delay])

  return count
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  gradient,
  iconBg,
  delay = 0,
  prefix = "",
}: KpiCardProps) {
  const numericValue = typeof value === "number" ? value : 0
  const displayValue = typeof value === "string" ? value : useCountUp(numericValue, 1500, delay * 1000)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Link href={href} className="block">
        <div
          className={`relative overflow-hidden rounded-3xl p-6 shadow-xl transition-shadow duration-300 ${gradient} ${isHovered ? "shadow-2xl" : ""}`}
          style={{
            transform: isHovered ? "perspective(1000px) rotateX(2deg) rotateY(-2deg)" : "none",
            transition: "transform 0.3s ease",
          }}
        >
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm pointer-events-none" />
          
          {/* Mini decorative chart background */}
          <svg
            className="absolute bottom-0 right-0 w-32 h-20 text-white/20 pointer-events-none"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
          >
            <path
              d="M0,40 L10,35 L20,38 L30,30 L40,32 L50,25 L60,28 L70,20 L80,22 L90,15 L100,10 L100,40 Z"
              fill="currentColor"
            />
          </svg>

          {/* Glow effect on hover */}
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-3xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-white/80 uppercase tracking-wide">{title}</p>
              <p className="text-3xl font-bold text-white">
                {prefix}
                {typeof displayValue === "number" ? displayValue.toLocaleString() : displayValue}
              </p>
              <p className="text-sm text-white/70 flex items-center gap-1">{subtitle}</p>
            </div>
            
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} shadow-lg`}>
              <Icon className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
