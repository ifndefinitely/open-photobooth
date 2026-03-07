import { create } from 'zustand'
import type { CaptureResult } from '@/services/cameraService'

export type SessionPhase = 'idle' | 'countdown' | 'capture' | 'flash' | 'pause' | 'complete'

interface SessionState {
  // Session data
  photos: CaptureResult[]
  currentPhotoIndex: number // 0-based: which photo we are on
  phase: SessionPhase
  countdownValue: number | null
  lastError: { message: string; details?: string } | null

  // Actions
  setPhase: (phase: SessionPhase) => void
  setCountdownValue: (value: number | null) => void
  addPhoto: (photo: CaptureResult) => void
  advancePhoto: () => void
  setLastError: (error: { message: string; details?: string } | null) => void
  resetSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  photos: [],
  currentPhotoIndex: 0,
  phase: 'idle',
  countdownValue: null,
  lastError: null,

  setPhase: (phase) => set({ phase }),

  setCountdownValue: (value) => set({ countdownValue: value }),

  addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),

  advancePhoto: () => set((state) => ({ currentPhotoIndex: state.currentPhotoIndex + 1 })),

  setLastError: (error) => set({ lastError: error }),

  resetSession: () =>
    set({
      photos: [],
      currentPhotoIndex: 0,
      phase: 'idle',
      countdownValue: null,
      lastError: null
    })
}))
