import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  soundEnabled: boolean
  desktopNotifications: boolean
  attentionTimeMinutes: number
  toggleSound: (val: boolean) => void
  toggleDesktop: (val: boolean) => void
  setAttentionTime: (min: number) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      desktopNotifications: true,
      attentionTimeMinutes: 15, // Default 15 min
      
      toggleSound: (val) => set({ soundEnabled: val }),
      toggleDesktop: (val) => set({ desktopNotifications: val }),
      setAttentionTime: (min) => set({ attentionTimeMinutes: min }),
    }),
    {
      name: 'crm-settings-storage', // Nombre en localStorage
    }
  )
)
