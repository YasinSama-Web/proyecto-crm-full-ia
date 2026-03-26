// Aquí pondrás los IDs reales que te da Mercado Pago al crear las suscripciones en su panel
export const MP_PLANS = {
  starter: {
    monthly: process.env.MP_PLAN_STARTER_MONTHLY || "2c9380848...",
    annual: process.env.MP_PLAN_STARTER_ANNUAL || "2c9380848...",
  },
  pro: {
    monthly: process.env.MP_PLAN_PRO_MONTHLY || "2c9380848...",
    annual: process.env.MP_PLAN_PRO_ANNUAL || "2c9380848...",
  },
  enterprise: {
    monthly: process.env.MP_PLAN_ENT_MONTHLY || "2c9380848...",
    annual: process.env.MP_PLAN_ENT_ANNUAL || "2c9380848...",
  }
}

export type PlanType = keyof typeof MP_PLANS;
export type CycleType = "monthly" | "annual";

// Función útil para saber qué plan compró basándonos en el ID que nos devuelva MP
export function getPlanInfoByMpId(mpPlanId: string) {
  for (const [plan, cycles] of Object.entries(MP_PLANS)) {
    if (cycles.monthly === mpPlanId) return { plan, cycle: 'monthly' }
    if (cycles.annual === mpPlanId) return { plan, cycle: 'annual' }
  }
  return { plan: 'pro', cycle: 'monthly' } // Fallback por defecto
}
