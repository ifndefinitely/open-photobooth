export interface AdminSection {
  id: string
  label: string
}

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'webcam', label: 'Webcam' },
  { id: 'printer', label: 'Printer' },
  { id: 'photo-session', label: 'Photo Session' },
  { id: 'filters', label: 'Filters' },
  { id: 'audio', label: 'Audio' },
  { id: 'pin', label: 'PIN' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'kiosk', label: 'Kiosk' },
  { id: 'language', label: 'Language' }
] as const
