import type { ComponentType } from 'react'
import WebcamSection from './sections/WebcamSection/WebcamSection'
import PhotoSessionSection from './sections/PhotoSessionSection/PhotoSessionSection'

export interface AdminSection {
  id: string
  label: string
  component?: ComponentType
}

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'webcam', label: 'Webcam', component: WebcamSection },
  { id: 'printer', label: 'Printer' },
  { id: 'photo-session', label: 'Photo Session', component: PhotoSessionSection },
  { id: 'filters', label: 'Filters' },
  { id: 'audio', label: 'Audio' },
  { id: 'pin', label: 'PIN' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'kiosk', label: 'Kiosk' },
  { id: 'language', label: 'Language' }
] as const
