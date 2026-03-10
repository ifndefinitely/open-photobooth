import { create } from 'zustand'
import type { CaptureResult } from '@/services/cameraService'

export type SessionPhase = 'idle' | 'countdown' | 'capture' | 'flash' | 'pause' | 'complete'

interface SessionState {
  // Session data
  photos: CaptureResult[]
  currentPhotoIndex: number // 0-based: which photo we are on
  phase: SessionPhase
  countdownValue: number | null

  // Actions
  setPhase: (phase: SessionPhase) => void
  setCountdownValue: (value: number | null) => void
  addPhoto: (photo: CaptureResult) => void
  advancePhoto: () => void
  resetSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  photos: [],
  currentPhotoIndex: 0,
  phase: 'idle',
  countdownValue: null,

  setPhase: (phase) => set({ phase }),

  setCountdownValue: (value) => set({ countdownValue: value }),

  addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),

  advancePhoto: () => set((state) => ({ currentPhotoIndex: state.currentPhotoIndex + 1 })),

  resetSession: () =>
    set({
      photos: [],
      currentPhotoIndex: 0,
      phase: 'idle',
      countdownValue: null
    })
}))
