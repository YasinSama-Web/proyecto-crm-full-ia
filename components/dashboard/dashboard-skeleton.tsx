"use client"

import { motion } from "framer-motion"

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200/80 rounded-2xl ${className}`} />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-14 w-14 rounded-2xl" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity sections skeleton */}
      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-6 w-6 rounded-lg" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className="h-6 w-6 rounded-lg" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
