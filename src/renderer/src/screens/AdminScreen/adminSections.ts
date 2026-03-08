import type { ComponentType } from 'react'
import WebcamSection from './sections/WebcamSection/WebcamSection'
import PhotoSessionSection from './sections/PhotoSessionSection/PhotoSessionSection'
import PrinterSection from './sections/PrinterSection/PrinterSection'
import AppearanceSection from './sections/AppearanceSection/AppearanceSection'
import FilterSection from './sections/FilterSection/FilterSection'
import PinSection from './sections/PinSection/PinSection'
import KioskSection from './sections/KioskSection/KioskSection'
import LanguageSection from './sections/LanguageSection/LanguageSection'
import GallerySection from './sections/GallerySection/GallerySection'

export interface AdminSection {
  id: string
  label: string
  component?: ComponentType
}

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { id: 'appearance', label: 'Appearance', component: AppearanceSection },
  { id: 'webcam', label: 'Webcam', component: WebcamSection },
  { id: 'printer', label: 'Printer', component: PrinterSection },
  { id: 'photo-session', label: 'Photo Session', component: PhotoSessionSection },
  { id: 'filters', label: 'Filters', component: FilterSection },
  { id: 'audio', label: 'Audio' },
  { id: 'pin', label: 'PIN', component: PinSection },
  { id: 'gallery', label: 'Gallery', component: GallerySection },
  { id: 'kiosk', label: 'Kiosk', component: KioskSection },
  { id: 'language', label: 'Language', component: LanguageSection }
] as const
