import { getSession } from "@/lib/session"
import { getEnrichedUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PaymentRequiredScreen } from "@/components/billing/payment-required"

export default async function SuspendedPage() {
  const session = await getSession()
  if (!session || !session.userId) redirect("/login")
  
  const user = await getEnrichedUser(session.userId)
  
  // Si entra aquí pero en realidad ya pagó, lo devolvemos al CRM
  if (user?.subscription_status?.toUpperCase() !== 'SUSPENDED') {
    redirect("/SUSPENDED") 
  }

  return <PaymentRequiredScreen userId={user.rootOwnerId} status="SUSPENDED" />
}
