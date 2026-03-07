import type { ReactNode } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import styles from './Layout.module.css'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps): React.JSX.Element {
  const currentScreen = useNavigationStore((state) => state.currentScreen)
  const hideCursor = currentScreen !== 'admin'

  const className = [styles.layout, hideCursor && styles.cursorHidden].filter(Boolean).join(' ')

  return <div className={className}>{children}</div>
}

export default Layout
