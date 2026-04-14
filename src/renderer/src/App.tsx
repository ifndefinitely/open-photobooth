import Layout from '@/components/Layout/Layout'
import ScreenRouter from '@/components/ScreenRouter/ScreenRouter'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import AdminGestureOverlay from '@/components/AdminGestureOverlay/AdminGestureOverlay'
import { useCameraLifecycle } from '@/hooks/useCameraLifecycle'
import { useMusicLifecycle } from '@/hooks/useMusicLifecycle'
import { useSettingsPersistence } from '@/hooks/useSettingsPersistence'
import { useStressTest } from '@/hooks/useStressTest'

function App(): React.JSX.Element {
  const { ready } = useSettingsPersistence()
  useCameraLifecycle()
  useMusicLifecycle()
  useStressTest()

  if (!ready) {
    return <div />
  }

  return (
    <Layout>
      <ErrorBoundary>
        <ScreenRouter />
        <AdminGestureOverlay />
      </ErrorBoundary>
    </Layout>
  )
}

export default App
