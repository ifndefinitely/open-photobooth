import Layout from '@/components/Layout/Layout'
import ScreenRouter from '@/components/ScreenRouter/ScreenRouter'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import { useCameraLifecycle } from '@/hooks/useCameraLifecycle'
import { useMusicLifecycle } from '@/hooks/useMusicLifecycle'
import { useSettingsPersistence } from '@/hooks/useSettingsPersistence'

function App(): React.JSX.Element {
  const { ready } = useSettingsPersistence()
  useCameraLifecycle()
  useMusicLifecycle()

  if (!ready) {
    return <div />
  }

  return (
    <Layout>
      <ErrorBoundary>
        <ScreenRouter />
      </ErrorBoundary>
    </Layout>
  )
}

export default App
