import { useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { useAdminGesture } from '@/hooks/useAdminGesture'
import PinDialog from '@/components/PinDialog/PinDialog'
import styles from './AdminGestureOverlay.module.css'

function AdminGestureOverlay(): React.JSX.Element | null {
  const currentScreen = useNavigationStore((state) => state.currentScreen)
  const navigateTo = useNavigationStore((state) => state.navigateTo)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const { handleTap } = useAdminGesture(() => setShowPinDialog(true))

  if (currentScreen === 'admin' || currentScreen === 'error') {
    return null
  }

  return (
    <>
      <div className={styles.gestureTarget} onPointerDown={handleTap} aria-hidden="true" />
      {showPinDialog && (
        <PinDialog
          onSuccess={() => {
            setShowPinDialog(false)
            navigateTo('admin')
          }}
          onCancel={() => setShowPinDialog(false)}
        />
      )}
    </>
  )
}

export default AdminGestureOverlay
