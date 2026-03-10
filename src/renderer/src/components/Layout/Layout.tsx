import type { ReactNode } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps): React.JSX.Element {
  const currentScreen = useNavigationStore((state) => state.currentScreen)
  const kioskFullscreenLock = useAppSettingsStore((state) => state.kioskFullscreenLock)

  // Only hide cursor when kiosk fullscreen lock is active,
  // and always show cursor on admin and error screens
  const hideCursor = kioskFullscreenLock && currentScreen !== 'admin' && currentScreen !== 'error'

  const className = [styles.layout, hideCursor && styles.cursorHidden].filter(Boolean).join(' ')

  return <div className={className}>{children}</div>
}

export default Layout
