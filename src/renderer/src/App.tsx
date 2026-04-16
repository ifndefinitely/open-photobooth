import { useEffect } from 'react'
import Layout from '@/components/Layout/Layout'
import ScreenRouter from '@/components/ScreenRouter/ScreenRouter'
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary'
import { useCameraLifecycle } from '@/hooks/useCameraLifecycle'
import { useMusicLifecycle } from '@/hooks/useMusicLifecycle'
import { useSettingsPersistence } from '@/hooks/useSettingsPersistence'
import { useStressTest } from '@/hooks/useStressTest'
import { usePrinterStatusPolling } from './hooks/usePrinterStatusPolling'
import { installLogMirror } from './bootstrap/logMirror'

function App(): React.JSX.Element {
  const { ready } = useSettingsPersistence()
  useCameraLifecycle()
  useMusicLifecycle()
  useStressTest()
  usePrinterStatusPolling()

  useEffect(() => {
    return installLogMirror()
  }, [])

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
