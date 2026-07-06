import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set) => ({
      theme: 'light',
      notificationCount: 0,
      loading: false,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setNotificationCount: (count) => set({ notificationCount: count }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: 'cleanconnect-app-v2', partialize: (state) => ({ theme: state.theme }) }
  )
)
