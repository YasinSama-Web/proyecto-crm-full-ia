"use client"
import Swal from 'sweetalert2'
import { updatePlanReal } from '../actions'
import { useTransition } from 'react'

export function PlanSelectClient({ workspaceId, currentPlan }: { workspaceId: string, currentPlan: string }) {
  const [isPending, startTransition] = useTransition()

  const handlePlanChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlan = e.target.value;
    
    // Alerta de confirmación
    const result = await Swal.fire({
      title: '¿Cambiar Plan?',
      text: `Estás a punto de cambiar el plan a ${newPlan.toUpperCase()}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      startTransition(async () => {
        const response = await updatePlanReal(workspaceId, newPlan);
        if (response?.success) {
            Swal.fire('¡Actualizado!', 'El plan ha sido cambiado.', 'success');
        } else {
            Swal.fire('Error', 'No se pudo cambiar el plan.', 'error');
        }
      })
    } else {
      // Si cancela, devolvemos el select a su valor original
      e.target.value = currentPlan; 
    }
  }

  return (
    <select 
      defaultValue={currentPlan} 
      onChange={handlePlanChange}
      disabled={isPending}
      className={`text-[10px] font-black bg-slate-100 rounded-lg p-2 uppercase outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${isPending ? 'opacity-50' : ''}`}
    >
      <option value="STARTER">Starter</option>
      <option value="PRO">Growth</option>
      <option value="ENTERPRISE">Scale</option>
      <option value="TRIAL">Trial</option>
    </select>
  )
}
