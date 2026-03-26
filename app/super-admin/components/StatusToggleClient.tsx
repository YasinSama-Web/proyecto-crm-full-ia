"use client"
import Swal from 'sweetalert2'
import { toggleWorkspaceStatus } from '../actions'
import { useTransition } from 'react'

export function StatusToggleClient({ workspaceId, currentStatus }: { workspaceId: string, currentStatus: string }) {
  const [isPending, startTransition] = useTransition()
  const isActive = currentStatus === 'ACTIVE'

  const handleToggle = async () => {
    const result = await Swal.fire({
      title: isActive ? '¿Suspender Cuenta?' : '¿Reactivar Cuenta?',
      text: isActive ? 'El usuario perderá acceso inmediatamente.' : 'El usuario podrá volver a ingresar.',
      icon: isActive ? 'error' : 'question',
      showCancelButton: true,
      confirmButtonColor: isActive ? '#dc2626' : '#10b981',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: isActive ? 'Sí, Suspender' : 'Sí, Reactivar'
    })

    if (result.isConfirmed) {
      startTransition(async () => {
        const res = await toggleWorkspaceStatus(workspaceId, isActive);
        if (res.success) {
            Swal.fire(
                isActive ? '¡Suspendido!' : '¡Reactivado!', 
                isActive ? 'El acceso ha sido revocado.' : 'El acceso ha sido restaurado.', 
                'success'
            );
        }
      })
    }
  }

  return (
    <button 
      onClick={handleToggle}
      disabled={isPending}
      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-emerald-100 text-emerald-600 hover:bg-red-100 hover:text-red-600 group' : 'bg-red-100 text-red-600 hover:bg-emerald-100 hover:text-emerald-600 group'} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="group-hover:hidden">{isActive ? 'Activo' : 'Inactivo'}</span>
      <span className="hidden group-hover:inline">{isActive ? 'Desactivar' : 'Activar'}</span>
    </button>
  )
}
